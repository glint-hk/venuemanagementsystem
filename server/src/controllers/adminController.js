import prisma from "../lib/prisma.js";
import { Role } from "../../../shared/index.js";

/**
 * POST /api/admin/venues/:id/blocks — create venue blackout (US-A4).
 */
export async function createVenueBlock(req, res, next) {
  try {
    const { id: venueId } = req.params;
    const { startAt, endAt, recurring, reason } = req.body;

    if (!startAt || !endAt) {
      return res
        .status(400)
        .json({ error: "startAt and endAt are required." });
    }

    const start = new Date(startAt);
    const end = new Date(endAt);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return res.status(400).json({ error: "Invalid block timeframe." });
    }

    const venue = await prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue) {
      return res.status(404).json({ error: "Venue not found." });
    }

    const block = await prisma.$transaction(async (tx) => {
      const created = await tx.venueBlock.create({
        data: {
          venueId,
          startAt: start,
          endAt: end,
          recurring: Boolean(recurring),
          reason: reason ?? "",
          createdBy: req.user.id,
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: "venue_block",
          entityId: created.id,
          action: "VENUE_BLOCK_CREATED",
          actorId: req.user.id,
          metadata: { venueId, startAt: start, endAt: end, reason },
        },
      });

      return created;
    });

    return res.status(201).json({ block });
  } catch (error) {
    next(error);
  }
}

/** DELETE /api/admin/blocks/:blockId */
export async function removeVenueBlock(req, res, next) {
  try {
    const { blockId } = req.params;

    await prisma.$transaction(async (tx) => {
      const block = await tx.venueBlock.delete({ where: { id: blockId } });

      await tx.auditLog.create({
        data: {
          entityType: "venue_block",
          entityId: blockId,
          action: "VENUE_BLOCK_DELETED",
          actorId: req.user.id,
          metadata: { venueId: block.venueId },
        },
      });
    });

    return res.json({ message: "Venue block removed successfully" });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Venue block not found." });
    }
    next(error);
  }
}

/** GET /api/admin/metrics/utilization — admin utilization metrics (US-A5). */
export async function getUtilizationMetrics(req, res, next) {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const totalBookings = await prisma.booking.count({
      where: { createdAt: { gte: start, lte: end } },
    });

    const statusCounts = await prisma.booking.groupBy({
      by: ["status"],
      where: { createdAt: { gte: start, lte: end } },
      _count: { status: true },
    });

    const venueStats = await prisma.booking.groupBy({
      by: ["venueId"],
      where: {
        status: "APPROVED",
        createdAt: { gte: start, lte: end },
      },
      _count: { id: true },
    });

    return res.json({
      timeframe: { start, end },
      totalBookings,
      statusBreakdown: statusCounts.reduce((acc, curr) => {
        acc[curr.status] = curr._count.status;
        return acc;
      }, {}),
      venueUtilization: venueStats,
    });
  } catch (error) {
    next(error);
  }
}

export async function listUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        approverTier: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(users);
  } catch (err) {
    next(err);
  }
}

const MAX_APPROVAL_TIERS = 6;

// NOTE: specs/US-C1-configurable-approval-chains.md's original edge case says
// a zero-step chain should be rejected. Product decision overrides that: an
// empty chain now means "no approval required" — see createBooking in
// bookingController.js, which auto-approves bookings against an empty chain.
function validateApprovalSteps(steps) {
  if (!Array.isArray(steps)) {
    return "steps must be an array (use an empty array for 'no approval required').";
  }
  if (steps.length > MAX_APPROVAL_TIERS) {
    return `A chain cannot have more than ${MAX_APPROVAL_TIERS} approval tiers.`;
  }
  for (const step of steps) {
    if (!step || typeof step !== "object") {
      return "Each step must be an object.";
    }
    if (!Number.isInteger(step.tier) || step.tier < 1) {
      return "Each step needs a positive integer tier.";
    }
    if (step.role !== "APPROVER") {
      return "Each step's role must be 'APPROVER'.";
    }
    if (!Number.isFinite(Number(step.escalationWindowHours)) || Number(step.escalationWindowHours) <= 0) {
      return "Each step needs a positive escalationWindowHours.";
    }
  }
  return null;
}

/**
 * GET /api/admin/approval-chains — list chains for the venue add/edit form's
 * approvalChainId picker (Admin only). Bare array, matching listUsers/listAuditLogs.
 */
export async function listApprovalChains(req, res, next) {
  try {
    const chains = await prisma.approvalChain.findMany({
      orderBy: { venueType: "asc" },
    });
    return res.json(chains);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/approval-chains — create a new approval chain (US-C1, Admin only).
 * Body matches shared/contracts.js ApprovalChainConfigRequest: { venueType, steps }.
 * Capped at MAX_APPROVAL_TIERS (6) steps.
 */
export async function createApprovalChain(req, res, next) {
  try {
    const { venueType, steps } = req.body;

    if (!venueType || typeof venueType !== "string") {
      return res.status(400).json({ error: "venueType is required." });
    }
    const stepsError = validateApprovalSteps(steps);
    if (stepsError) {
      return res.status(400).json({ error: stepsError });
    }

    const orderedSteps = [...steps]
      .map((s) => ({
        tier: s.tier,
        role: "APPROVER",
        escalationWindowHours: Number(s.escalationWindowHours),
      }))
      .sort((a, b) => a.tier - b.tier);

    const chain = await prisma.$transaction(async (tx) => {
      const created = await tx.approvalChain.create({
        data: { venueType, steps: orderedSteps, version: 1 },
      });

      await tx.auditLog.create({
        data: {
          entityType: "approval_chain",
          entityId: created.id,
          action: "APPROVAL_CHAIN_CREATED",
          actorId: req.user.id,
          metadata: { venueType, tierCount: orderedSteps.length },
        },
      });

      return created;
    });

    return res.status(201).json({ chain });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/approval-chains/:id — edit an existing chain's steps (US-C1, Admin only).
 * Increments `version` in place; never touches `bookings` or `approvals` so
 * in-flight bookings keep following their snapshot, per US-C2.
 */
export async function updateApprovalChain(req, res, next) {
  try {
    const { id } = req.params;
    const { steps } = req.body;

    const stepsError = validateApprovalSteps(steps);
    if (stepsError) {
      return res.status(400).json({ error: stepsError });
    }

    const orderedSteps = [...steps]
      .map((s) => ({
        tier: s.tier,
        role: "APPROVER",
        escalationWindowHours: Number(s.escalationWindowHours),
      }))
      .sort((a, b) => a.tier - b.tier);

    const chain = await prisma.$transaction(async (tx) => {
      const existing = await tx.approvalChain.findUnique({ where: { id } });
      if (!existing) {
        const notFound = new Error("Approval chain not found");
        notFound.status = 404;
        throw notFound;
      }

      const updated = await tx.approvalChain.update({
        where: { id },
        data: { steps: orderedSteps, version: existing.version + 1 },
      });

      await tx.auditLog.create({
        data: {
          entityType: "approval_chain",
          entityId: id,
          action: "APPROVAL_CHAIN_UPDATED",
          actorId: req.user.id,
          metadata: { tierCount: orderedSteps.length, version: updated.version },
        },
      });

      return updated;
    });

    return res.json({ chain });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ error: err.message });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Approval chain not found" });
    }
    next(err);
  }
}

export async function listAuditLogs(req, res, next) {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        actor: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return res.json(logs);
  } catch (err) {
    next(err);
  }
}