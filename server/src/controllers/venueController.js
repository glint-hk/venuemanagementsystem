import prisma from "../lib/prisma.js";
import { activeBookingOverlapFilter } from "../lib/venueHelpers.js";
import { timeslotsOverlap } from "../lib/bookingHelpers.js";

/**
 * GET /api/venues
 * List venues with optional filters and availability (US-A3).
 *
 * Query: type, minCapacity, attribute, startAt, endAt
 */
export async function getAllVenues(req, res, next) {
  try {
    const { type, minCapacity, attributes, startAt, endAt } = req.query;

    const where = {};
    if (type) where.type = type;
    if (minCapacity) where.capacity = { gte: Number(minCapacity) };
    if (attributes) {
      // Client sends a comma-separated list (e.g. "projector, audio");
      // a venue must have ALL requested attributes to match.
      const attrList = attributes
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      if (attrList.length > 0) where.attributes = { hasEvery: attrList };
    }

    const venues = await prisma.venue.findMany({
      where,
      include: { venueBlocks: true, approvalChain: true },
      orderBy: { name: "asc" },
    });

    let availabilityWindow = null;
    if (startAt && endAt) {
      const windowStart = new Date(startAt);
      const windowEnd = new Date(endAt);
      if (
        !Number.isNaN(windowStart.getTime()) &&
        !Number.isNaN(windowEnd.getTime()) &&
        windowEnd > windowStart
      ) {
        availabilityWindow = { start: windowStart, end: windowEnd };
      }
    }

    let activeBookings = [];
    if (availabilityWindow) {
      activeBookings = await prisma.booking.findMany({
        where: {
          ...activeBookingOverlapFilter(
            availabilityWindow.start,
            availabilityWindow.end
          ),
        },
        select: { venueId: true, startAt: true, endAt: true },
      });
    }

    const result = venues.map((venue) => {
      const dto = {
        id: venue.id,
        name: venue.name,
        type: venue.type,
        location: venue.location,
        capacity: venue.capacity,
        attributes: venue.attributes,
        approvalChainId: venue.approvalChainId,
        blocks: (venue.venueBlocks || []).map((b) => ({
          id: b.id,
          startAt: b.startAt,
          endAt: b.endAt,
          recurring: b.recurring,
          reason: b.reason,
        })),
      };

      if (availabilityWindow) {
        const blocked = (venue.venueBlocks || []).some((block) =>
          timeslotsOverlap(
            availabilityWindow.start,
            availabilityWindow.end,
            block.startAt,
            block.endAt
          )
        );
        const booked = activeBookings.some(
          (b) =>
            b.venueId === venue.id &&
            timeslotsOverlap(
              availabilityWindow.start,
              availabilityWindow.end,
              b.startAt,
              b.endAt
            )
        );
        dto.available = !blocked && !booked;
      }

      return dto;
    });

    return res.json({ venues: result });
  } catch (error) {
    next(error);
  }
}

/** GET /api/venues/:id */
export async function getVenueById(req, res, next) {
  try {
    const { id } = req.params;
    const venue = await prisma.venue.findUnique({
      where: { id },
      include: { venueBlocks: true, approvalChain: true },
    });

    if (!venue) {
      return res.status(404).json({ error: "Venue not found" });
    }

    return res.json({
      venue: {
        id: venue.id,
        name: venue.name,
        type: venue.type,
        location: venue.location,
        capacity: venue.capacity,
        attributes: venue.attributes,
        approvalChainId: venue.approvalChainId,
        blocks: venue.venueBlocks || [],
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getVenueAvailability(req, res, next) {
  try {
    const { id: venueId } = req.params;
    const { startAt, endAt } = req.query;
 
    const venue = await prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue) {
      return res.status(404).json({ error: "Venue not found" });
    }
 
    const start = startAt ? new Date(startAt) : new Date();
    const end = endAt
      ? new Date(endAt)
      : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
 
    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      return res.status(400).json({ error: "Invalid date range." });
    }
 
    const bookings = await prisma.booking.findMany({
      where: { ...activeBookingOverlapFilter(start, end), venueId },
      select: { venueId: true, startAt: true, endAt: true },
    });
 
    const blocks = await prisma.venueBlock.findMany({
      where: { venueId },
      select: { venueId: true, startAt: true, endAt: true },
    });
 
    if (bookings.length === 0 && blocks.length === 0) {
      return res.json([
        { venueId, timeslot: { startAt: start, endAt: end }, busy: false },
      ]);
    }
 
    const slots = bookings.map(formatPublicAvailabilitySlot);
 
    for (const block of blocks) {
      if (timeslotsOverlap(start, end, block.startAt, block.endAt)) {
        slots.push({
          venueId: block.venueId,
          timeslot: { startAt: block.startAt, endAt: block.endAt },
          busy: true,
        });
      }
    }
 
    return res.json(slots);
  } catch (error) {
    next(error);
  }
}

/** POST /api/venues — create venue (Admin only, US-A4). */
export async function createVenue(req, res, next) {
  try {
    const { name, capacity, type, location, attributes, approvalChainId } =
      req.body;

    if (!name || capacity == null || !type || !location || !approvalChainId) {
      return res.status(400).json({
        error:
          "name, capacity, type, location, and approvalChainId are required.",
      });
    }

    const chain = await prisma.approvalChain.findUnique({
      where: { id: approvalChainId },
    });
    if (!chain) {
      return res.status(400).json({ error: "Invalid approvalChainId." });
    }

    const venue = await prisma.$transaction(async (tx) => {
      const created = await tx.venue.create({
        data: {
          name,
          capacity: Number(capacity),
          type,
          location,
          attributes: Array.isArray(attributes) ? attributes : [],
          approvalChainId,
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: "venue",
          entityId: created.id,
          action: "VENUE_CREATED",
          actorId: req.user.id,
          metadata: { name, type, location },
        },
      });

      return created;
    });

    return res.status(201).json({ venue });
  } catch (error) {
    next(error);
  }
}

/** PATCH /api/venues/:id — update venue (Admin only). */
export async function patchVenue(req, res, next) {
  try {
    const { id } = req.params;
    const { name, capacity, type, location, attributes, approvalChainId } =
      req.body;

    const data = {};
    if (name != null) data.name = name;
    if (capacity != null) data.capacity = Number(capacity);
    if (type != null) data.type = type;
    if (location != null) data.location = location;
    if (attributes != null) {
      data.attributes = Array.isArray(attributes) ? attributes : [];
    }
    if (approvalChainId != null) {
      const chain = await prisma.approvalChain.findUnique({
        where: { id: approvalChainId },
      });
      if (!chain) {
        return res.status(400).json({ error: "Invalid approvalChainId." });
      }
      data.approvalChainId = approvalChainId;
    }

    const venue = await prisma.$transaction(async (tx) => {
      const updated = await tx.venue.update({ where: { id }, data });

      await tx.auditLog.create({
        data: {
          entityType: "venue",
          entityId: id,
          action: "VENUE_UPDATED",
          actorId: req.user.id,
          metadata: data,
        },
      });

      return updated;
    });

    return res.json({ venue });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Venue not found" });
    }
    next(error);
  }
}

/** DELETE /api/venues/:id — delete venue (Admin only). */
export async function deleteVenue(req, res, next) {
  try {
    const { id } = req.params;

    await prisma.$transaction(async (tx) => {
      await tx.venue.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          entityType: "venue",
          entityId: id,
          action: "VENUE_DELETED",
          actorId: req.user.id,
          metadata: {},
        },
      });
    });

    return res.json({ message: "Venue deleted successfully" });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Venue not found" });
    }
    next(error);
  }
}