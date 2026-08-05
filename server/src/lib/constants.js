import { BookingStatus, Role } from "../../../shared/index.js";

/** Statuses that hold a venue slot (exclusion constraint + availability board). */
export const ACTIVE_SLOT_STATUSES = Object.freeze([
  BookingStatus.PENDING,
  BookingStatus.APPROVED,
  BookingStatus.MODIFIED,
]);

export { BookingStatus, Role };
