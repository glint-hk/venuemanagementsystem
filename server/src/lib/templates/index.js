// Template registry — one entry per templateKey written anywhere to
// notification_outbox (US-C2's approvalController.js, and
// bookingController.js's createBooking/updateBooking/cancelBooking).
// US-C4 rule: every transition that notifies someone has exactly one
// matching template — never zero, never more than one.
import { render as approvalRequested } from "./approvalRequested.js";
import { render as bookingApproved } from "./bookingApproved.js";
import { render as bookingRejected } from "./bookingRejected.js";
import { render as bookingSubmitted } from "./bookingSubmitted.js";
import { render as bookingModified } from "./bookingModified.js";
import { render as bookingCancelled } from "./bookingCancelled.js";

export const templates = {
  APPROVAL_REQUESTED: approvalRequested,
  BOOKING_APPROVED: bookingApproved,
  BOOKING_REJECTED: bookingRejected,
  BOOKING_SUBMITTED: bookingSubmitted,
  BOOKING_MODIFIED: bookingModified,
  BOOKING_CANCELLED: bookingCancelled,
};

// Renders a notification_outbox row's email. This is the delivery worker's
// entry point (US-C4, outboxWorker.js — not built in this iteration).
// Business logic never calls this; it only ever writes rows to the outbox.
export function renderNotification(templateKey, payload) {
  const template = templates[templateKey];
  if (!template) {
    throw new Error(`No template registered for templateKey "${templateKey}"`);
  }
  return template(payload);
}
