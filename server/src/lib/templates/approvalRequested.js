// Sent to the approver whose turn it now is — either because a booking was
// just created (tier 1, bookingController.js/createBooking) or because the
// previous tier just approved (US-C2, approvalController.js/approveBooking).
// payload shape: { bookingId, venueName, purpose, timeslot: { startAt, endAt }, stepTier }
import { formatRange } from "./_format.js";

export function render(payload) {
  const { venueName, purpose, timeslot, stepTier } = payload;
  return {
    subject: `Action needed: approval requested for ${venueName}`,
    text:
      `A booking request is waiting on your decision.\n\n` +
      `Venue: ${venueName}\n` +
      `Purpose: ${purpose}\n` +
      `Requested slot: ${formatRange(timeslot)}\n` +
      `Your tier: ${stepTier}\n\n` +
      `Please review this request and approve or reject it.`,
  };
}
