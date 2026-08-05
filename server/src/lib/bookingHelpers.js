import prisma from "./prisma.js";
import pkg from "@prisma/client";
const { Prisma } = pkg;

/**
 * Maps a Prisma booking record to the BookingDTO wire shape (shared/contracts.js).
 */
export function formatBookingDTO(booking) {
  return {
    id: booking.id,
    venue: booking.venue
      ? {
          id: booking.venue.id,
          name: booking.venue.name,
          location: booking.venue.location,
        }
      : undefined,
    booker: booking.booker
      ? {
          id: booking.booker.id,
          name: booking.booker.name,
        }
      : undefined,
    purpose: booking.purpose,
    timeslot: {
      startAt: booking.startAt,
      endAt: booking.endAt,
    },
    status: booking.status,
    currentStepIndex: booking.currentStepIndex,
  };
}

/**
 * Maps a booking to PublicAvailabilitySlotDTO — no identity or purpose fields.
 */
export function formatPublicAvailabilitySlot(booking) {
  return {
    venueId: booking.venueId,
    timeslot: {
      startAt: booking.startAt,
      endAt: booking.endAt,
    },
    busy: true,
  };
}

/** Detect PostgreSQL exclusion-constraint violations (double-booking). */
export function isExclusionViolation(error) {
  return (
    (error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2004" || error.code === "P2010")) ||
    error?.message?.includes("23P01") ||
    error?.message?.includes("exclusion constraint") ||
    error?.meta?.code === "23P01"
  );
}

/** True when two [start, end) ranges overlap. */
export function timeslotsOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}
