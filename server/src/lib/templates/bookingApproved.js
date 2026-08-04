// Sent to the booker when the last chain tier approves and the booking
// becomes APPROVED (US-C2, approvalController.js/approveBooking).
// payload shape: { bookingId, venueName, purpose, timeslot: { startAt, endAt } }
import { formatRange } from "./_format.js";

export function render(payload) {
  const { venueName, purpose, timeslot } = payload;
  return {
    subject: `Approved: your ${venueName} booking is confirmed`,
    text:
      `Your booking has been approved by every required approver.\n\n` +
      `Venue: ${venueName}\n` +
      `Purpose: ${purpose}\n` +
      `Slot: ${formatRange(timeslot)}\n\n` +
      `No action is needed from you.`,
  };
}
