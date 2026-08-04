import prisma from "./prisma.js";
import { ACTIVE_SLOT_STATUSES } from "./constants.js";
import { timeslotsOverlap } from "./bookingHelpers.js";

/**
 * Returns true when the venue has a blackout block overlapping [start, end).
 */
export async function isVenueBlocked(venueId, start, end, tx = prisma) {
  const blocks = await tx.venueBlock.findMany({
    where: { venueId },
  });

  return blocks.some((block) =>
    timeslotsOverlap(start, end, block.startAt, block.endAt)
  );
}

/**
 * Builds a Prisma where-clause fragment for active bookings overlapping a window.
 */
export function activeBookingOverlapFilter(start, end) {
  return {
    status: { in: [...ACTIVE_SLOT_STATUSES] },
    startAt: { lt: end },
    endAt: { gt: start },
  };
}
