// Team 3 (Sprint & Tonic) owned — the approval-routing controller (US-C2),
// per the ownership map in README.md. Adopted from Team 2's original draft
// of this endpoint (it shipped ahead of us, on their branch, wired to
// Prodnova's ApprovalsPage.jsx) and extended here with the notification_outbox
// write their draft was missing.
import prisma from "../lib/prisma.js";
import { BookingStatus } from "../../../shared/index.js";

/**
 * GET /api/bookings/pending-approvals — bookings where the signed-in user is
 * the CURRENT step's approver. Filtered server-side (US-B4) -- the client
 * never fetches everything and filters in the browser.
 *
 * ADMIN sees every pending booking, regardless of tier. An APPROVER sees only
 * bookings whose current step tier matches their own approverTier.
 */
export async function pendingApprovals(req, res, next) {
  try {
    const { user } = req;
    if (user.role !== "ADMIN" && user.role !== "APPROVER") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const pending = await prisma.booking.findMany({
      where: { status: BookingStatus.PENDING },
      include: {
        venue: { select: { id: true, name: true, location: true } },
        booker: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const mine = pending.filter((booking) => {
      const step = booking.approvalChainSnapshot?.[booking.currentStepIndex];
      if (!step) return false;
      if (user.role === "ADMIN") return true;
      // A step with a specific assignedApproverId is visible ONLY to that
      // user; a step without one falls back to the old tier-wide match.
      return step.assignedApproverId
        ? step.assignedApproverId === user.id
        : step.tier === user.approverTier;
    });

    return res.json(
      mine.map((b) => ({
        id: b.id,
        venue: b.venue,
        booker: b.booker,
        purpose: b.purpose,
        timeslot: { startAt: b.startAt, endAt: b.endAt },
        status: b.status,
        currentStepIndex: b.currentStepIndex,
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
 * US-C2 rules:
 * - Only the approver at the lowest undecided step (or an ADMIN) may act
 * - Rejection requires a comment
 * - Approval on last step → APPROVED
 * - Rejection at any step → REJECTED
 * - Every decision writes exactly one notification_outbox row, in the same
 *   transaction as the status change (US-C2/US-C4 — never call the mailer
 *   directly from here)
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

    // Verify this approver is the right person for the current step (or is
    // ADMIN). A step with assignedApproverId requires that exact user; a
    // step without one falls back to the old tier-wide match.
    const isAuthorized =
      user.role === "ADMIN" ||
      (currentStep.assignedApproverId
        ? currentStep.assignedApproverId === user.id
        : user.approverTier === currentStep.tier);
    if (!isAuthorized) {
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

      // Every decision notifies exactly one recipient, in this same
      // transaction. Templates render from `payload` only (US-C4) — no
      // hard-coded name/URL belongs in the template itself.
      const notifyPayload = {
        bookingId,
        venueName: updated.venue.name,
        purpose: updated.purpose,
        timeslot: { startAt: updated.startAt, endAt: updated.endAt },
      };

      if (decision === "REJECT") {
        await tx.notificationOutbox.create({
          data: {
            bookingId,
            recipientId: updated.booker.id,
            templateKey: "BOOKING_REJECTED",
            payload: { ...notifyPayload, comment },
          },
        });
      } else if (isLastStep) {
        await tx.notificationOutbox.create({
          data: {
            bookingId,
            recipientId: updated.booker.id,
            templateKey: "BOOKING_APPROVED",
            payload: notifyPayload,
          },
        });
      } else {
        const nextStep = chain[newStepIndex];
        const nextApprover = nextStep.assignedApproverId
          ? await tx.user.findUnique({ where: { id: nextStep.assignedApproverId } })
          : await tx.user.findFirst({
              where: { role: "APPROVER", approverTier: nextStep.tier },
            });
        // No approver seeded for this tier — the decision still stands;
        // there is simply no one to notify until one is assigned.
        if (nextApprover) {
          await tx.notificationOutbox.create({
            data: {
              bookingId,
              recipientId: nextApprover.id,
              templateKey: "APPROVAL_REQUESTED",
              payload: { ...notifyPayload, stepTier: nextStep.tier },
            },
          });
        }
      }

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
    // The pre-check above is a courtesy for the common case; this is the
    // real guarantee -- two concurrent decisions on the same step race past
    // the pre-check, but only one can win the unique constraint on
    // (bookingId, stepIndex). The loser gets a clean 409, not a raw 500.
    if (err?.code === "P2002") {
      return res.status(409).json({ error: "This step has already been decided" });
    }
    next(err);
  }
}