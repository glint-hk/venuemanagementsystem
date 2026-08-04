import prisma from "../lib/prisma.js";

/**
 * POST /api/admin/venues/:id/blocks
 * Add a blackout/blocked date range for a venue (Admin only)
 */
export const createVenueBlock = async (req, res, next) => {
  try {
    const { id: venueId } = req.params;
    const { startTime, endTime, reason } = req.body;

    if (!startTime || !endTime) {
      return res.status(400).json({ error: "Start time and end time are required" });
    }

    const block = await prisma.venueBlock.create({
      data: {
        venueId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        reason,
        createdBy: req.user.id,
      },
    });

    return res.status(201).json({ block });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/blocks/:blockId
 * Remove a venue block (Admin only)
 */
export const removeVenueBlock = async (req, res, next) => {
  try {
    const { blockId } = req.params;

    await prisma.venueBlock.delete({
      where: { id: blockId },
    });

    return res.json({ message: "Venue block removed successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/users/:userId/role
 * Update user role (Booker, Approver, Admin) (Admin only)
 */
export const updateUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // Validate allowed roles
    const validRoles = ["BOOKER", "APPROVER", "ADMIN"];
    if (!role || !validRoles.includes(role.toUpperCase())) {
      return res.status(400).json({
        error: `Invalid role. Allowed roles are: ${validRoles.join(", ")}`,
      });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: role.toUpperCase() },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true,
      },
    });

    return res.json({
      message: "User role updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/metrics/utilization
 * Calculate utilization metrics in database as per US-A5 formulas (Admin only)
 */
export const getUtilizationMetrics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Perform database-level aggregation (Do NOT pull into memory and reduce)
    const totalBookings = await prisma.booking.count({
      where: {
        createdAt: { gte: start, lte: end },
      },
    });

    const statusCounts = await prisma.booking.groupBy({
      by: ["status"],
      where: {
        createdAt: { gte: start, lte: end },
      },
      _count: {
        status: true,
      },
    });

    const venueStats = await prisma.booking.groupBy({
      by: ["venueId"],
      where: {
        status: "APPROVED",
        createdAt: { gte: start, lte: end },
      },
      _count: {
        id: true,
      },
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
};