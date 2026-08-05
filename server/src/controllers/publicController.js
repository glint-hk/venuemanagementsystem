import prisma from "../lib/prisma.js";
import { activeBookingOverlapFilter } from "../lib/venueHelpers.js";
import { timeslotsOverlap } from "../lib/bookingHelpers.js";

/**
 * GET /api/public/availability — anonymous busy/free board (US-B5).
 * Returns PublicAvailabilitySlotDTO[] only — no identity or purpose fields.
 */
export async function getPublicAvailability(req, res, next) {
  try {
    const { venueId, startAt, endAt } = req.query;

    const start = startAt ? new Date(startAt) : new Date();
    const end = endAt
      ? new Date(endAt)
      : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return res.status(400).json({ error: "Invalid date range." });
    }

    const venueWhere = venueId ? { id: venueId } : {};
    const venues = await prisma.venue.findMany({
      where: venueWhere,
      select: { id: true, name: true },
    });

    const venueMap = new Map(venues.map((v) => [v.id, v.name]));

    const bookings = await prisma.booking.findMany({
      where: {
        ...activeBookingOverlapFilter(start, end),
        ...(venueId ? { venueId } : {}),
      },
      select: { venueId: true, startAt: true, endAt: true },
    });

    const blocks = await prisma.venueBlock.findMany({
      where: venueId ? { venueId } : {},
      select: { venueId: true, startAt: true, endAt: true },
    });

    const slots = [];

    for (const venue of venues) {
      const venueBookings = bookings.filter((b) => b.venueId === venue.id);
      const venueBlocks = blocks.filter((b) => b.venueId === venue.id);

      if (venueBookings.length === 0 && venueBlocks.length === 0) {
        slots.push({
          venueId: venue.id,
          venueName: venue.name,
          timeslot: { startAt: start, endAt: end },
          busy: false,
        });
        continue;
      }

      for (const booking of venueBookings) {
        slots.push({
          venueId: booking.venueId,
          venueName: venueMap.get(booking.venueId) || booking.venueId,
          timeslot: { startAt: booking.startAt, endAt: booking.endAt },
          busy: true,
        });
      }

      for (const block of venueBlocks) {
        if (timeslotsOverlap(start, end, block.startAt, block.endAt)) {
          slots.push({
            venueId: block.venueId,
            venueName: venueMap.get(block.venueId) || block.venueId,
            timeslot: { startAt: block.startAt, endAt: block.endAt },
            busy: true,
          });
        }
      }
    }

    return res.json(slots);
  } catch (error) {
    next(error);
  }
}
