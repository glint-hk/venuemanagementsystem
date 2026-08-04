// Sent to the booker when an approver rejects the request at any step
// (US-C2, approvalController.js/approveBooking).
// payload shape: { bookingId, venueName, purpose, timeslot: { startAt, endAt }, comment }
import { formatRange } from "./_format.js";

export function render(payload) {
  const { venueName, purpose, timeslot, comment } = payload;
  return {
    subject: `Not approved: your ${venueName} booking request`,
    text:
      `Your booking request was not approved.\n\n` +
      `Venue: ${venueName}\n` +
      `Purpose: ${purpose}\n` +
      `Requested slot: ${formatRange(timeslot)}\n` +
      `Reason given: ${comment}\n\n` +
      `You're welcome to submit a new request for a different venue or time.`,
  };
}
