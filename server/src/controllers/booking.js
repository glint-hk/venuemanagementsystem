// Booking controller — create, view, modify, cancel bookings.
// Shared between Team 1 (lifecycle) and Team 2 (UI integration).
// See US-A2 for lifecycle rules and US-B3 for client integration.
import prisma from "../lib/prisma.js";
import { BookingStatus } from "shared";

/**
 * POST /api/bookings — create a new booking request.
 * Body: CreateBookingRequest from shared/contracts.js
 *
 * Rules:
 * - The database exclusion constraint prevents double-booking (AGENTS.md rule 1)
 * - Catches constraint violation and returns 409
 * - Snapshots the approval chain at creation time (AGENTS.md rule 5)
 * - Writes audit_log in the same transaction
 */
export async function createBooking(req, res, next) {
  try {
    const { venueId, purpose, timeslot } = req.body;
    if (!venueId || !purpose || !timeslot?.startAt || !timeslot?.endAt) {
      return res.status(400).json({ error: "venueId, purpose, and timeslot (startAt, endAt) are required" });
    }

    // Fetch venue and its approval chain for snapshotting
    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      include: { approvalChain: true },
    });
    if (!venue) {
      return res.status(404).json({ error: "Venue not found" });
    }

    const chainSnapshot = venue.approvalChain?.steps || [];

    // Create booking + audit log in transaction
    const booking = await prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          venueId,
          bookerId: req.user.id,
          purpose,
          startAt: new Date(timeslot.startAt),
          endAt: new Date(timeslot.endAt),
          status: BookingStatus.PENDING,
          approvalChainSnapshot: chainSnapshot,
          currentStepIndex: 0,
        },
        include: {
          venue: { select: { id: true, name: true, location: true } },
          booker: { select: { id: true, name: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: "booking",
          entityId: newBooking.id,
          action: "BOOKING_CREATED",
          actorId: req.user.id,
          metadata: { venueId, purpose, timeslot },
        },
      });

      return newBooking;
    });

    return res.status(201).json({
      id: booking.id,
      venue: booking.venue,
      booker: booking.booker,
      purpose: booking.purpose,
      timeslot: { startAt: booking.startAt, endAt: booking.endAt },
      status: booking.status,
      currentStepIndex: booking.currentStepIndex,
    });
  } catch (err) {
    // Catch PostgreSQL exclusion constraint violation → 409 Conflict
    if (err.code === "P2002" || err.code === "23P01" || err.message?.includes("exclusion")) {
      return res.status(409).json({
        error: "This venue is already booked for the requested time slot",
      });
    }
    next(err);
  }
}

/**
 * GET /api/bookings — list the authenticated user's bookings ("My Bookings").
 */
export async function listMyBookings(req, res, next) {
  try {
    const bookings = await prisma.booking.findMany({
      where: { bookerId: req.user.id },
      include: {
        venue: { select: { id: true, name: true, location: true } },
        approvals: {
          select: {
            stepIndex: true,
            decision: true,
            comment: true,
            decidedAt: true,
            approver: { select: { id: true, name: true } },
          },
          orderBy: { stepIndex: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(
      bookings.map((b) => ({
        id: b.id,
        venue: b.venue,
        booker: { id: req.user.id, name: req.user.name },
        purpose: b.purpose,
        timeslot: { startAt: b.startAt, endAt: b.endAt },
        status: b.status,
        currentStepIndex: b.currentStepIndex,
        approvalChainSnapshot: b.approvalChainSnapshot,
        approvals: b.approvals,
      })),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/bookings/:bookingId — single booking detail.
 */
export async function getBooking(req, res, next) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.bookingId },
      include: {
        venue: { select: { id: true, name: true, location: true } },
        booker: { select: { id: true, name: true } },
        approvals: {
          select: {
            stepIndex: true,
            decision: true,
            comment: true,
            decidedAt: true,
            approver: { select: { id: true, name: true } },
          },
          orderBy: { stepIndex: "asc" },
        },
      },
    });

    if (!booking) return res.status(404).json({ error: "Booking not found" });

    return res.json({
      id: booking.id,
      venue: booking.venue,
      booker: booking.booker,
      purpose: booking.purpose,
      timeslot: { startAt: booking.startAt, endAt: booking.endAt },
      status: booking.status,
      currentStepIndex: booking.currentStepIndex,
      approvals: booking.approvals,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/bookings/:bookingId — modify a booking.
 * Body: ModifyBookingRequest from shared/contracts.js
 *
 * US-A2/US-B3 rules:
 * - Changing date, time, or venue re-triggers approval (status → MODIFIED → PENDING)
 * - Fresh chain snapshot on re-approval
 */
export async function modifyBooking(req, res, next) {
  try {
    const { bookingId } = req.params;
    const { venueId, purpose, timeslot } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { venue: { include: { approvalChain: true } } },
    });
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // Only the booker or an admin may modify
    if (booking.bookerId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Can only modify PENDING or APPROVED bookings
    if (![BookingStatus.PENDING, BookingStatus.APPROVED].includes(booking.status)) {
      return res.status(400).json({ error: `Cannot modify a ${booking.status} booking` });
    }

    const dateChanged = timeslot && (
      timeslot.startAt !== booking.startAt.toISOString() ||
      timeslot.endAt !== booking.endAt.toISOString()
    );
    const venueChanged = venueId && venueId !== booking.venueId;
    const needsReapproval = dateChanged || venueChanged;

    // If venue is changing, get the new venue's chain
    let newChainSnapshot = booking.approvalChainSnapshot;
    if (venueChanged) {
      const newVenue = await prisma.venue.findUnique({
        where: { id: venueId },
        include: { approvalChain: true },
      });
      if (!newVenue) return res.status(404).json({ error: "Venue not found" });
      newChainSnapshot = newVenue.approvalChain?.steps || [];
    } else if (needsReapproval) {
      // Fresh snapshot from current venue's chain
      const currentChain = booking.venue.approvalChain;
      newChainSnapshot = currentChain?.steps || [];
    }

    const updated = await prisma.$transaction(async (tx) => {
      const data = {};
      if (venueId) data.venueId = venueId;
      if (purpose) data.purpose = purpose;
      if (timeslot) {
        data.startAt = new Date(timeslot.startAt);
        data.endAt = new Date(timeslot.endAt);
      }

      if (needsReapproval) {
        data.status = BookingStatus.PENDING;
        data.approvalChainSnapshot = newChainSnapshot;
        data.currentStepIndex = 0;
      }

      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data,
        include: {
          venue: { select: { id: true, name: true, location: true } },
          booker: { select: { id: true, name: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: "booking",
          entityId: bookingId,
          action: needsReapproval ? "BOOKING_MODIFIED_REAPPROVAL" : "BOOKING_MODIFIED",
          actorId: req.user.id,
          metadata: { changes: { venueId, purpose, timeslot }, needsReapproval },
        },
      });

      return updatedBooking;
    });

    return res.json({
      id: updated.id,
      venue: updated.venue,
      booker: updated.booker,
      purpose: updated.purpose,
      timeslot: { startAt: updated.startAt, endAt: updated.endAt },
      status: updated.status,
      currentStepIndex: updated.currentStepIndex,
    });
  } catch (err) {
    if (err.code === "P2002" || err.code === "23P01" || err.message?.includes("exclusion")) {
      return res.status(409).json({
        error: "This venue is already booked for the requested time slot",
      });
    }
    next(err);
  }
}

/**
 * DELETE /api/bookings/:bookingId — cancel a booking.
 * Releases the slot immediately.
 */
export async function cancelBooking(req, res, next) {
  try {
    const { bookingId } = req.params;
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // Only the booker or admin can cancel
    if (booking.bookerId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Forbidden" });
    }

    if ([BookingStatus.CANCELLED, BookingStatus.COMPLETED, BookingStatus.REJECTED].includes(booking.status)) {
      return res.status(400).json({ error: `Cannot cancel a ${booking.status} booking` });
    }

    await prisma.$transaction([
      prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CANCELLED },
      }),
      prisma.auditLog.create({
        data: {
          entityType: "booking",
          entityId: bookingId,
          action: "BOOKING_CANCELLED",
          actorId: req.user.id,
          metadata: { previousStatus: booking.status },
        },
      }),
    ]);

    return res.json({ message: "Booking cancelled", id: bookingId, status: BookingStatus.CANCELLED });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/bookings/pending-approvals — list bookings awaiting the current user's approval.
 * US-B4: Only shows bookings where this approver matches the current step.
 * Filtered server-side — never fetch-all-then-filter in the browser.
 */
export async function pendingApprovals(req, res, next) {
  try {
    const user = req.user;
    if (user.role !== "APPROVER" && user.role !== "ADMIN") {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Find all PENDING bookings where the current step tier matches this approver's tier
    const bookings = await prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDING,
      },
      include: {
        venue: { select: { id: true, name: true, location: true } },
        booker: { select: { id: true, name: true } },
        approvals: {
          select: { stepIndex: true, decision: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Filter to bookings where the current step's tier matches this approver
    const filtered = bookings.filter((booking) => {
      const chain = booking.approvalChainSnapshot;
      if (!Array.isArray(chain) || chain.length === 0) return false;

      const currentStep = chain[booking.currentStepIndex];
      if (!currentStep) return false;

      // Check if this approver's tier matches the current step's tier, or if user is ADMIN
      return user.role === "ADMIN" || user.approverTier === currentStep.tier;
    });

    return res.json(
      filtered.map((b) => ({
        id: b.id,
        venue: b.venue,
        booker: b.booker,
        purpose: b.purpose,
        timeslot: { startAt: b.startAt, endAt: b.endAt },
        status: b.status,
        currentStepIndex: b.currentStepIndex,
        approvalChainSnapshot: b.approvalChainSnapshot,
        approvals: b.approvals,
      })),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/bookings/:bookingId/approve — record an approval/rejection decision.
 * Body: ApprovalDecisionRequest from shared/contracts.js
 *
 * US-B4/US-C2 rules:
 * - Only the approver at the lowest undecided step (or an ADMIN) may act
 * - Rejection requires a comment
 * - Approval on last step → APPROVED
 * - Rejection at any step → REJECTED
 */
export async function approveBooking(req, res, next) {
  try {
    const { bookingId } = req.params;
    const { decision, comment } = req.body;
    const user = req.user;

    if (!["APPROVE", "REJECT"].includes(decision)) {
      return res.status(400).json({ error: "decision must be APPROVE or REJECT" });
    }
    if (decision === "REJECT" && !comment) {
      return res.status(400).json({ error: "comment is required when rejecting" });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { approvals: true },
    });

    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.status !== BookingStatus.PENDING) {
      return res.status(400).json({ error: "Booking is not pending approval" });
    }

    const chain = booking.approvalChainSnapshot;
    if (!Array.isArray(chain) || chain.length === 0) {
      return res.status(400).json({ error: "No approval chain configured" });
    }

    const currentStep = chain[booking.currentStepIndex];
    if (!currentStep) {
      return res.status(400).json({ error: "Invalid current step" });
    }

    // Verify this approver is the right tier for the current step (or is ADMIN)
    if (user.role !== "ADMIN" && user.approverTier !== currentStep.tier) {
      return res.status(403).json({ error: "You are not the approver for the current step" });
    }

    // Check no duplicate decision for this step
    const existingDecision = booking.approvals.find(
      (a) => a.stepIndex === booking.currentStepIndex,
    );
    if (existingDecision) {
      return res.status(409).json({ error: "This step has already been decided" });
    }

    const isLastStep = booking.currentStepIndex >= chain.length - 1;

    const result = await prisma.$transaction(async (tx) => {
      // Record the approval decision
      await tx.approval.create({
        data: {
          bookingId,
          stepIndex: booking.currentStepIndex,
          approverId: user.id,
          decision,
          comment: comment || null,
        },
      });

      let newStatus = booking.status;
      let newStepIndex = booking.currentStepIndex;

      if (decision === "REJECT") {
        newStatus = BookingStatus.REJECTED;
      } else if (decision === "APPROVE" && isLastStep) {
        newStatus = BookingStatus.APPROVED;
      } else {
        // Move to next step
        newStepIndex = booking.currentStepIndex + 1;
      }

      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { status: newStatus, currentStepIndex: newStepIndex },
        include: {
          venue: { select: { id: true, name: true, location: true } },
          booker: { select: { id: true, name: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: "booking",
          entityId: bookingId,
          action: decision === "APPROVE" ? "BOOKING_STEP_APPROVED" : "BOOKING_REJECTED",
          actorId: user.id,
          metadata: {
            stepIndex: booking.currentStepIndex,
            decision,
            comment,
            resultingStatus: newStatus,
          },
        },
      });

      return updated;
    });

    return res.json({
      id: result.id,
      venue: result.venue,
      booker: result.booker,
      purpose: result.purpose,
      timeslot: { startAt: result.startAt, endAt: result.endAt },
      status: result.status,
      currentStepIndex: result.currentStepIndex,
    });
  } catch (err) {
    next(err);
  }
}
