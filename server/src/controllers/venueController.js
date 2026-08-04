import prisma from "../lib/prisma.js";

/**
 * GET /api/venues
 * List all active venues (Public / Authenticated users)
 */
export const getAllVenues = async (req, res, next) => {
  try {
    const venues = await prisma.venue.findMany({
      include: {
        blocks: true, // Include active venue blackout dates
      },
      orderBy: { name: "asc" },
    });
    return res.json({ venues });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/venues/:id
 * Get single venue details
 */
export const getVenueById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const venue = await prisma.venue.findUnique({
      where: { id },
      include: { blocks: true },
    });

    if (!venue) {
      return res.status(404).json({ error: "Venue not found" });
    }

    return res.json({ venue });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/venues
 * Create a new venue (Admin only)
 */
export const createVenue = async (req, res, next) => {
  try {
    const { name, capacity, type, location, attributes } = req.body;

    if (!name || !capacity) {
      return res.status(400).json({ error: "Name and capacity are required" });
    }

    const venue = await prisma.venue.create({
      data: {
        name,
        capacity: Number(capacity),
        type,
        location,
        attributes: attributes || {},
      },
    });

    return res.status(201).json({ venue });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/venues/:id
 * Modify venue details (Admin only)
 */
export const patchVenue = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.capacity) {
      updates.capacity = Number(updates.capacity);
    }

    const venue = await prisma.venue.update({
      where: { id },
      data: updates,
    });

    return res.json({ venue });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/venues/:id
 * Delete venue (Admin only)
 */
export const deleteVenue = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.delete({
      where: { id },
    });

    return res.json({ message: "Venue deleted successfully" });
  } catch (error) {
    next(error);
  }
};