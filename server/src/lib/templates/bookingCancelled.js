// Sent to the booker when their booking is cancelled
// (bookingController.js/cancelBooking).
// payload shape (as currently produced): { bookingId }
//
// NOTE: the producing payload has neither venueName nor timeslot — the
// thinnest of any producer in this codebase. This template can't name the
// venue at all, unlike every other template here. Flagging for whoever
// owns that payload to enrich it — not fabricated here.
export function render(payload) {
  const { bookingId } = payload;
  return {
    subject: `Cancelled: your booking has been cancelled`,
    text:
      `Your booking (reference ${bookingId}) has been cancelled.\n\n` +
      `No action is needed from you. If this was unexpected, please contact the venue office.`,
  };
}
