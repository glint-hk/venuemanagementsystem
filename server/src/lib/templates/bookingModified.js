// Sent to the booker when a modification changes the venue or timeslot and
// re-triggers approval from a fresh chain snapshot
// (bookingController.js/updateBooking).
// payload shape (as currently produced): { bookingId, venueName }
//
// NOTE: same payload thinness as bookingSubmitted.js — no timeslot in the
// payload, so the new requested slot can't be stated here. Flagging for
// whoever owns that payload to enrich it — not fabricated here.
export function render(payload) {
  const { venueName } = payload;
  return {
    subject: `Re-approval needed: your ${venueName} booking was modified`,
    text:
      `Your booking for ${venueName} was changed, and the change requires it ` +
      `to go through approval again from the first tier.\n\n` +
      `No action is needed from you right now — you'll be notified once a decision is made.`,
  };
}
