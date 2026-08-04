// Venue controller — read-only venue access for authenticated users,
// plus the public availability endpoint (US-B5).
// Team 2 (Prodnova) owned for the read/public endpoints.
// Team 1 (Tarot Club) owns write/admin endpoints.
import prisma from "../lib/prisma.js";
import { BookingStatus } from "shared";

// Statuses that hold a slot (match the exclusion constraint's definition)
const ACTIVE_STATUSES = [
  BookingStatus.PENDING,
  BookingStatus.APPROVED,
  BookingStatus.MODIFIED,
];

/**
 * GET /api/venues — list all venues with optional filters.
 * Authenticated users only.
 * Query params: type, minCapacity, attributes (comma-separated)
 */
export async function listVenues(req, res, next) {
  try {
    const { type, minCapacity, attributes } = req.query;
    const where = {};

    if (type) where.type = type;
    if (minCapacity) where.capacity = { gte: parseInt(minCapacity, 10) };
    // attributes filter: venues that contain ALL requested attributes
    if (attributes) {
      const attrList = attributes.split(",").map((a) => a.trim());
      where.attributes = { hasEvery: attrList };
    }

    const venues = await prisma.venue.findMany({
      where,
      select: {
        id: true,
        name: true,
        type: true,
        location: true,
        capacity: true,
        attributes: true,
        approvalChainId: true,
      },
      orderBy: { name: "asc" },
    });

    return res.json(venues);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/venues/:venueId — single venue detail.
 */
export async function getVenue(req, res, next) {
  try {
    const venue = await prisma.venue.findUnique({
      where: { id: req.params.venueId },
      select: {
        id: true,
        name: true,
        type: true,
        location: true,
        capacity: true,
        attributes: true,
        approvalChainId: true,
      },
    });
    if (!venue) return res.status(404).json({ error: "Venue not found" });
    return res.json(venue);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/venues/:venueId/availability — availability for a venue over a date range.
 * Authenticated endpoint — returns full booking details.
 * Query params: startDate, endDate (ISO strings)
 */
export async function getVenueAvailability(req, res, next) {
  try {
    const { venueId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required" });
    }

    const bookings = await prisma.booking.findMany({
      where: {
        venueId,
        status: { in: ACTIVE_STATUSES },
        startAt: { lt: new Date(endDate) },
        endAt: { gt: new Date(startDate) },
      },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        status: true,
        purpose: true,
        booker: { select: { id: true, name: true } },
      },
      orderBy: { startAt: "asc" },
    });

    return res.json(bookings);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /public/availability — PUBLIC availability board (US-B5).
 * NO authentication required. NO session token accepted for escalation.
 *
 * Returns ONLY PublicAvailabilitySlotDTO:
 *   { venueId, timeslot: { startAt, endAt }, busy }
 *
 * NEVER exposes booker identity, purpose, or approval details.
 * Privacy is enforced at the QUERY level — fields are never selected.
 *
 * Query params: venueId (optional), startDate, endDate (required)
 */
export async function publicAvailability(req, res, next) {
  try {
    const { venueId, startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get all venues (optionally filtered)
    const venueWhere = venueId ? { id: venueId } : {};
    const venues = await prisma.venue.findMany({
      where: venueWhere,
      select: { id: true, name: true },
    });

    // Get all active bookings in the window — SELECT ONLY the fields needed
    // for busy/free determination. NEVER select bookerId, purpose, etc.
    const bookingWhere = {
      status: { in: ACTIVE_STATUSES },
      startAt: { lt: end },
      endAt: { gt: start },
    };
    if (venueId) bookingWhere.venueId = venueId;

    const bookings = await prisma.booking.findMany({
      where: bookingWhere,
      select: {
        venueId: true,
        startAt: true,
        endAt: true,
        // NOTHING else — no bookerId, no purpose, no approvals
      },
    });

    // Build PublicAvailabilitySlotDTO[] — one entry per booking slot
    const slots = [];

    // For each venue, report busy slots
    for (const venue of venues) {
      const venueBookings = bookings.filter((b) => b.venueId === venue.id);
      if (venueBookings.length === 0) {
        // Venue has no bookings — report as free for the entire window
        slots.push({
          venueId: venue.id,
          venueName: venue.name,
          timeslot: { startAt: start.toISOString(), endAt: end.toISOString() },
          busy: false,
        });
      } else {
        for (const booking of venueBookings) {
          slots.push({
            venueId: venue.id,
            venueName: venue.name,
            timeslot: {
              startAt: booking.startAt.toISOString(),
              endAt: booking.endAt.toISOString(),
            },
            busy: true,
          });
        }
      }
    }

    return res.json(slots);
  } catch (err) {
    next(err);
  }
}
