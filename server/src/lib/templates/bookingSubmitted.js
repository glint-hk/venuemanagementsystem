// Sent to the booker confirming their own request was received
// (bookingController.js/createBooking).
// payload shape (as currently produced): { bookingId, venueName }
//
// NOTE: the producing payload doesn't include purpose or timeslot, so this
// template can't state the requested slot even though the US-C4 guardrail
// asks every email to state "which venue and slot." Flagging for whoever
// owns that payload to enrich it — not fabricated here.
export function render(payload) {
  const { venueName } = payload;
  return {
    subject: `Received: your ${venueName} booking request`,
    text:
      `We've received your booking request for ${venueName}.\n\n` +
      `It's now pending approval — you'll be notified as soon as a decision is made.\n\n` +
      `No action is needed from you right now.`,
  };
}
