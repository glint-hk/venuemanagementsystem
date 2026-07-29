import prisma from '../prisma.js';
import { Prisma } from '@prisma/client';

/**
 * Helper to transform DB booking record into BookingDTO contract shape
 * (contracts.js -> BookingDTO)
 */
const formatBookingDTO = (booking) => ({
  id: booking.id,
  venue: booking.venue
    ? {
        id: booking.venue.id,
        name: booking.venue.name,
        location: booking.venue.location,
      }
    : undefined,
  booker: booking.booker
    ? {
        id: booking.booker.id,
        name: booking.booker.name,
      }
    : undefined,
  purpose: booking.purpose,
  timeslot: {
    startAt: booking.startAt,
    endAt: booking.endAt,
  },
  status: booking.status,
  currentStepIndex: booking.currentStepIndex,
});

/**
 * Helper to identify PostgreSQL exclusion constraint violations (23P01)
 */
const isExclusionViolation = (error) => {
  return (
    (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2004' || error.code === 'P2010')) ||
    error?.message?.includes('23P01') ||
    error?.meta?.code === '23P01'
  );
};

/**
 * CREATE a new booking (Submitted directly as PENDING)
 * POST /api/bookings
 */
export const createBooking = async (req, res, next) => {
  try {
    const bookerId = req.user.id;
    // Extract per CreateBookingRequest contract: { venueId, purpose, timeslot: { startAt, endAt } }
    const { venueId, purpose, timeslot } = req.body;

    if (!timeslot?.startAt || !timeslot?.endAt) {
      return res.status(400).json({ error: 'Missing timeslot.startAt or timeslot.endAt' });
    }

    const start = new Date(timeslot.startAt);
    const end = new Date(timeslot.endAt);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return res.status(400).json({ error: 'Invalid timeslot timeframe' });
    }

    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      include: { approvalChain: true },
    });

    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          venueId,
          bookerId,
          purpose,
          startAt: start,
          endAt: end,
          status: 'PENDING',
          approvalChainSnapshot: venue.approvalChain?.steps || [],
          currentStepIndex: 0,
        },
        include: {
          venue: true,
          booker: { select: { id: true, name: true } },
        },
      });

      await tx.notificationOutbox.create({
        data: {
          bookingId: newBooking.id,
          recipientId: bookerId,
          templateKey: 'BOOKING_SUBMITTED',
          payload: { bookingId: newBooking.id, venueName: venue.name },
        },
      });

      // Audit Log Entity per entities.js: 'booking'
      await tx.auditLog.create({
        data: {
          entityType: 'booking',
          entityId: newBooking.id,
          action: 'SUBMIT_BOOKING',
          actorId: bookerId,
          metadata: { initialStatus: 'PENDING', venueId },
        },
      });

      return newBooking;
    });

    return res.status(201).json(formatBookingDTO(result));
  } catch (error) {
    if (isExclusionViolation(error)) {
      return res.status(409).json({ error: 'The requested slot is already booked for this venue.' });
    }
    next(error);
  }
};

/**
 * READ / List bookings
 * GET /api/bookings
 */
export const getBookings = async (req, res, next) => {
  try {
    const { venueId, status, bookerId } = req.query;
    const whereClause = {};

    if (venueId) whereClause.venueId = venueId;
    if (status) whereClause.status = status;
    if (bookerId) whereClause.bookerId = bookerId;

    if (req.user.role === 'BOOKER') {
      whereClause.bookerId = req.user.id;
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        venue: true,
        booker: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json(bookings.map(formatBookingDTO));
  } catch (error) {
    next(error);
  }
};

/**
 * READ single booking by ID
 * GET /api/bookings/:id
 */
export const getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        venue: true,
        booker: { select: { id: true, name: true } },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const isBooker = booking.bookerId === userId;
    const isAdmin = userRole === 'ADMIN';

    const currentStep = booking.approvalChainSnapshot?.[booking.currentStepIndex];
    const isCurrentApprover = currentStep && (currentStep.approverId === userId || currentStep.role === userRole);

    if (!isBooker && !isAdmin && !isCurrentApprover) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to view this booking' });
    }

    return res.status(200).json(formatBookingDTO(booking));
  } catch (error) {
    next(error);
  }
};

/**
 * UPDATE / Modify an existing booking
 * PUT /api/bookings/:id
 */
export const updateBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const actorId = req.user.id;
    // Extract per ModifyBookingRequest contract
    const { purpose, timeslot, venueId } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findUnique({
        where: { id },
        include: { venue: { include: { approvalChain: true } } },
      });

      if (!existing) throw { status: 404, message: 'Booking not found' };

      if (req.user.role !== 'ADMIN' && existing.bookerId !== actorId) {
        throw { status: 403, message: 'Forbidden: Cannot modify another user booking' };
      }

      if (['REJECTED', 'COMPLETED', 'CANCELLED'].includes(existing.status)) {
        throw { status: 400, message: `Cannot modify booking in terminal status: ${existing.status}` };
      }

      const updatedStart = timeslot?.startAt ? new Date(timeslot.startAt) : existing.startAt;
      const updatedEnd = timeslot?.endAt ? new Date(timeslot.endAt) : existing.endAt;
      const updatedVenueId = venueId || existing.venueId;

      if (isNaN(updatedStart.getTime()) || isNaN(updatedEnd.getTime()) || updatedEnd <= updatedStart) {
        throw { status: 400, message: 'Invalid startAt or endAt timeframe' };
      }

      const isSlotChanged =
        updatedStart.getTime() !== existing.startAt.getTime() ||
        updatedEnd.getTime() !== existing.endAt.getTime() ||
        updatedVenueId !== existing.venueId;

      let nextStatus = existing.status;
      let freshSnapshot = existing.approvalChainSnapshot;
      let resetStepIndex = false;

      if (isSlotChanged) {
        if (['PENDING', 'APPROVED', 'MODIFIED'].includes(existing.status)) {
          nextStatus = 'PENDING';
          freshSnapshot = existing.venue.approvalChain?.steps || [];
          resetStepIndex = true;
        }
      }

      const updatedCount = await tx.booking.updateMany({
        where: {
          id,
          status: existing.status,
        },
        data: {
          venueId: updatedVenueId,
          purpose: purpose || existing.purpose,
          startAt: updatedStart,
          endAt: updatedEnd,
          status: nextStatus,
          currentStepIndex: resetStepIndex ? 0 : existing.currentStepIndex,
          approvalChainSnapshot: freshSnapshot,
        },
      });

      if (updatedCount.count === 0) {
        throw { status: 409, message: 'Conflict: Booking status was modified concurrently by another request.' };
      }

      if (isSlotChanged) {
        await tx.notificationOutbox.create({
          data: {
            bookingId: id,
            recipientId: existing.bookerId,
            templateKey: 'BOOKING_MODIFIED',
            payload: { bookingId: id, venueName: existing.venue.name },
          },
        });
      }

      await tx.auditLog.create({
        data: {
          entityType: 'booking',
          entityId: id,
          action: 'MODIFY_BOOKING',
          actorId,
          metadata: {
            previousStatus: existing.status,
            newStatus: nextStatus,
            slotChanged: isSlotChanged,
          },
        },
      });

      return await tx.booking.findUnique({
        where: { id },
        include: {
          venue: true,
          booker: { select: { id: true, name: true } },
        },
      });
    });

    return res.status(200).json(formatBookingDTO(result));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    if (isExclusionViolation(error)) {
      return res.status(409).json({ error: 'The requested slot is already booked for this venue.' });
    }
    next(error);
  }
};

/**
 * CANCEL a booking
 * PATCH /api/bookings/:id/cancel
 */
export const cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const actorId = req.user.id;

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findUnique({ where: { id } });

      if (!existing) throw { status: 404, message: 'Booking not found' };

      if (req.user.role !== 'ADMIN' && existing.bookerId !== actorId) {
        throw { status: 403, message: 'Forbidden: Cannot cancel another user booking' };
      }

      if (['COMPLETED', 'CANCELLED', 'REJECTED'].includes(existing.status)) {
        throw { status: 400, message: 'Booking is already closed or terminal' };
      }

      const cancelled = await tx.booking.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: {
          venue: true,
          booker: { select: { id: true, name: true } },
        },
      });

      await tx.notificationOutbox.create({
        data: {
          bookingId: id,
          recipientId: existing.bookerId,
          templateKey: 'BOOKING_CANCELLED',
          payload: { bookingId: id },
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: 'booking',
          entityId: id,
          action: 'CANCEL_BOOKING',
          actorId,
          metadata: { previousStatus: existing.status, newStatus: 'CANCELLED' },
        },
      });

      return cancelled;
    });

    return res.status(200).json(formatBookingDTO(result));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    next(error);
  }
};

export default {
  createBooking,
  getBookings,
  getBookingById,
  updateBooking,
  cancelBooking,
};