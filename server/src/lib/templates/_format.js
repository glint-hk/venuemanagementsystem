// Internal formatting helper shared by templates in this folder. Not a
// template itself — not registered in index.js's templates map.
//
// Payload timestamps are stored as UTC ISO strings; IIML operates on IST,
// so display is pinned to Asia/Kolkata explicitly rather than relying on
// the server process's local timezone (which would silently drift if the
// app is ever deployed on a host set to a different TZ).
export function formatRange(timeslot) {
  if (!timeslot?.startAt || !timeslot?.endAt) return "time to be confirmed";
  const start = new Date(timeslot.startAt);
  const end = new Date(timeslot.endAt);

  const partsOf = (date) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);
    const get = (type) => parts.find((p) => p.type === type)?.value;
    return {
      day: `${get("year")}-${get("month")}-${get("day")}`,
      time: `${get("hour")}:${get("minute")}`,
    };
  };

  const s = partsOf(start);
  const e = partsOf(end);
  const dayLabel = s.day === e.day ? s.day : `${s.day} – ${e.day}`;
  return `${dayLabel}, ${s.time}–${e.time} IST`;
}
