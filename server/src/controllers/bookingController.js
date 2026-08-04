import prisma from "../lib/prisma.js";
import { BookingStatus, Role } from "../../../shared/index.js";
import { formatBookingDTO, isExclusionViolation } from "../lib/bookingHelpers.js";
import { assertTransition } from "../lib/stateMachine.js";
import { isVenueBlocked } from "../lib/venueHelpers.js";

const TERMINAL_STATUSES = [
  BookingStatus.REJECTED,
  BookingStatus.COMPLETED,
  BookingStatus.CANCELLED,
];

const bookingInclude = {
  venue: true,
  booker: { select: { id: true, name: true } },
};

/**
 * POST /api/bookings — create booking (submitted as PENDING).
 */
export async function createBooking(req, res, next) {
  try {
    const bookerId = req.user.id;
    const { venueId, purpose, timeslot } = req.body;

    if (!venueId || !purpose) {
      return res
        .status(400)
        .json({ error: "venueId and purpose are required." });
    }

    if (!timeslot?.startAt || !timeslot?.endAt) {
      return res
        .status(400)
        .json({ error: "Missing timeslot.startAt or timeslot.endAt" });
    }

    const start = new Date(timeslot.startAt);
    const end = new Date(timeslot.endAt);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return res.status(400).json({ error: "Invalid timeslot timeframe" });
    }

    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      include: { approvalChain: true },
    });

    if (!venue) {
      return res.status(404).json({ error: "Venue not found" });
    }

    if (await isVenueBlocked(venueId, start, end)) {
      return res
        .status(409)
        .json({ error: "Venue is blocked for the requested timeslot." });
    }

    const result = await prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          venueId,
          bookerId,
          purpose,
          startAt: start,
          endAt: end,
          status: BookingStatus.PENDING,
          approvalChainSnapshot: venue.approvalChain?.steps ?? [],
          currentStepIndex: 0,
        },
        include: bookingInclude,
      });

      await tx.notificationOutbox.create({
        data: {
          bookingId: newBooking.id,
          recipientId: bookerId,
          templateKey: "BOOKING_SUBMITTED",
          payload: { bookingId: newBooking.id, venueName: venue.name },
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: "booking",
          entityId: newBooking.id,
          action: "BOOKING_CREATED",
          actorId: bookerId,
          metadata: { initialStatus: BookingStatus.PENDING, venueId },
        },
      });

      return newBooking;
    });

    return res.status(201).json(formatBookingDTO(result));
  } catch (error) {
    if (isExclusionViolation(error)) {
      return res.status(409).json({
        error: "The requested slot is already booked for this venue.",
      });
    }
    next(error);
  }
}

/** GET /api/bookings — list bookings (scoped by role). */
export async function getBookings(req, res, next) {
  try {
    const { venueId, status, bookerId } = req.query;
    const whereClause = {};

    if (venueId) whereClause.venueId = venueId;
    if (status) whereClause.status = status;

    if (req.user.role === Role.BOOKER) {
      whereClause.bookerId = req.user.id;
    } else if (bookerId) {
      whereClause.bookerId = bookerId;
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: bookingInclude,
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(bookings.map(formatBookingDTO));
  } catch (error) {
    next(error);
  }
}

/** GET /api/bookings/:id — single booking with access control. */
export async function getBookingById(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: bookingInclude,
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const isBooker = booking.bookerId === userId;
    const isAdmin = userRole === Role.ADMIN;

    const snapshot = booking.approvalChainSnapshot;
    const currentStep = Array.isArray(snapshot)
      ? snapshot[booking.currentStepIndex]
      : null;
    const isCurrentApprover =
      userRole === Role.APPROVER &&
      currentStep &&
      req.user.approverTier === currentStep.tier;

    if (!isBooker && !isAdmin && !isCurrentApprover) {
      return res.status(403).json({
        error: "Forbidden: You do not have permission to view this booking",
      });
    }

    return res.status(200).json(formatBookingDTO(booking));
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/bookings/:id — modify booking.
 * Slot/venue changes re-enter approval: → MODIFIED → PENDING with fresh snapshot.
 */
export async function updateBooking(req, res, next) {
  try {
    const { id } = req.params;
    const actorId = req.user.id;
    const { purpose, timeslot, venueId } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findUnique({
        where: { id },
        include: { venue: { include: { approvalChain: true } } },
      });

      if (!existing) {
        throw { status: 404, message: "Booking not found" };
      }

      if (req.user.role !== Role.ADMIN && existing.bookerId !== actorId) {
        throw {
          status: 403,
          message: "Forbidden: Cannot modify another user booking",
        };
      }

      if (TERMINAL_STATUSES.includes(existing.status)) {
        throw {
          status: 400,
          message: `Cannot modify booking in terminal status: ${existing.status}`,
        };
      }

      const updatedStart = timeslot?.startAt
        ? new Date(timeslot.startAt)
        : existing.startAt;
      const updatedEnd = timeslot?.endAt
        ? new Date(timeslot.endAt)
        : existing.endAt;
      const updatedVenueId = venueId ?? existing.venueId;
      const updatedPurpose = purpose ?? existing.purpose;

      if (
        Number.isNaN(updatedStart.getTime()) ||
        Number.isNaN(updatedEnd.getTime()) ||
        updatedEnd <= updatedStart
      ) {
        throw { status: 400, message: "Invalid timeslot timeframe" };
      }

      const targetVenue =
        updatedVenueId !== existing.venueId
          ? await tx.venue.findUnique({
              where: { id: updatedVenueId },
              include: { approvalChain: true },
            })
          : existing.venue;

      if (!targetVenue) {
        throw { status: 404, message: "Venue not found" };
      }

      const isSlotChanged =
        updatedStart.getTime() !== existing.startAt.getTime() ||
        updatedEnd.getTime() !== existing.endAt.getTime() ||
        updatedVenueId !== existing.venueId;

      if (isSlotChanged && (await isVenueBlocked(updatedVenueId, updatedStart, updatedEnd, tx))) {
        throw {
          status: 409,
          message: "Venue is blocked for the requested timeslot.",
        };
      }

      let workingStatus = existing.status;
      let freshSnapshot = existing.approvalChainSnapshot;
      let stepIndex = existing.currentStepIndex;

      const baseData = {
        venueId: updatedVenueId,
        purpose: updatedPurpose,
        startAt: updatedStart,
        endAt: updatedEnd,
      };

      if (isSlotChanged) {
        if (
          existing.status === BookingStatus.PENDING ||
          existing.status === BookingStatus.APPROVED
        ) {
          assertTransition(existing.status, BookingStatus.MODIFIED);
          workingStatus = BookingStatus.MODIFIED;
          freshSnapshot = targetVenue.approvalChain?.steps ?? [];
        } else if (existing.status === BookingStatus.MODIFIED) {
          freshSnapshot = targetVenue.approvalChain?.steps ?? [];
        }

        assertTransition(workingStatus, BookingStatus.PENDING);
        workingStatus = BookingStatus.PENDING;
        stepIndex = 0;
      }

      const updatedCount = await tx.booking.updateMany({
        where: { id, status: existing.status },
        data: {
          ...baseData,
          status: workingStatus,
          currentStepIndex: stepIndex,
          approvalChainSnapshot: freshSnapshot,
        },
      });

      if (updatedCount.count === 0) {
        throw {
          status: 409,
          message:
            "Conflict: Booking status was modified concurrently by another request.",
        };
      }

      if (isSlotChanged) {
        await tx.notificationOutbox.create({
          data: {
            bookingId: id,
            recipientId: existing.bookerId,
            templateKey: "BOOKING_MODIFIED",
            payload: { bookingId: id, venueName: targetVenue.name },
          },
        });
      }

      await tx.auditLog.create({
        data: {
          entityType: "booking",
          entityId: id,
          action: "BOOKING_MODIFIED",
          actorId,
          metadata: {
            previousStatus: existing.status,
            newStatus: workingStatus,
            slotChanged: isSlotChanged,
          },
        },
      });

      return tx.booking.findUnique({
        where: { id },
        include: bookingInclude,
      });
    });

    return res.status(200).json(formatBookingDTO(result));
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    if (isExclusionViolation(error)) {
      return res.status(409).json({
        error: "The requested slot is already booked for this venue.",
      });
    }
    next(error);
  }
}

/** PATCH /api/bookings/:id/cancel — cancel booking and release slot. */
export async function cancelBooking(req, res, next) {
  try {
    const { id } = req.params;
    const actorId = req.user.id;

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findUnique({ where: { id } });

      if (!existing) {
        throw { status: 404, message: "Booking not found" };
      }

      if (req.user.role !== Role.ADMIN && existing.bookerId !== actorId) {
        throw {
          status: 403,
          message: "Forbidden: Cannot cancel another user booking",
        };
      }

      if (TERMINAL_STATUSES.includes(existing.status)) {
        throw { status: 400, message: "Booking is already closed or terminal" };
      }

      assertTransition(existing.status, BookingStatus.CANCELLED);

      const cancelled = await tx.booking.update({
        where: { id },
        data: { status: BookingStatus.CANCELLED },
        include: bookingInclude,
      });

      await tx.notificationOutbox.create({
        data: {
          bookingId: id,
          recipientId: existing.bookerId,
          templateKey: "BOOKING_CANCELLED",
          payload: { bookingId: id },
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: "booking",
          entityId: id,
          action: "BOOKING_CANCELLED",
          actorId,
          metadata: {
            previousStatus: existing.status,
            newStatus: BookingStatus.CANCELLED,
          },
        },
      });

      return cancelled;
    });

    return res.status(200).json(formatBookingDTO(result));
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
}
