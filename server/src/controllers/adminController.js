import prisma from "../lib/prisma.js";

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
