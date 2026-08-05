import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchVenues, createBooking, fetchVenueAvailability } from "../lib/apiClient.js";
import Layout from "../components/Layout.jsx";
import { Button, Card, Badge, Modal, Spinner } from "../components/ui/index.js";

export default function SearchPage() {
  const navigate = useNavigate();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ type: "", minCapacity: "", attributes: "" });
  const [showBookingModal, setShowBookingModal] = useState(null);
  const [bookingForm, setBookingForm] = useState({ purpose: "", date: "", startTime: "", endTime: "" });
  const [bookingError, setBookingError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [busySlots, setBusySlots] = useState([]); // [{startAt: Date, endAt: Date}] for the selected date
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const loadVenues = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await fetchVenues(filters);
      // GET /api/venues wraps its payload as { venues: [...] }; guard against
      // any other shape so this never silently ends up as a non-array.
      const venuesList = Array.isArray(data) ? data : data?.venues;
      setVenues(Array.isArray(venuesList) ? venuesList : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVenues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    loadVenues();
  };

  const openBookingModal = (venue) => {
    setShowBookingModal(venue);
    setBookingForm({ purpose: "", date: "", startTime: "", endTime: "" });
    setBookingError("");
    setBusySlots([]);
  };

  // Whenever the selected date (or venue) changes, pull that day's busy
  // slots so the modal can warn about — and block — an overlapping pick
  // before the person ever hits submit. This is a UX courtesy only; the
  // database exclusion constraint on (venueId, timeslot) is still the real
  // authority and the 409 handler below stays in place as the backstop.
  useEffect(() => {
    if (!showBookingModal || !bookingForm.date) {
      setBusySlots([]);
      return;
    }
    let cancelled = false;
    const dayStart = new Date(`${bookingForm.date}T00:00:00`);
    const dayEnd = new Date(`${bookingForm.date}T23:59:59`);

    setCheckingAvailability(true);
    fetchVenueAvailability(showBookingModal.id, dayStart.toISOString(), dayEnd.toISOString())
      .then((slots) => {
        if (cancelled) return;
        const busy = (Array.isArray(slots) ? slots : [])
          .filter((s) => s.busy)
          .map((s) => ({ startAt: new Date(s.timeslot.startAt), endAt: new Date(s.timeslot.endAt) }));
        setBusySlots(busy);
      })
      .catch(() => {
        // Availability check failing shouldn't block the form — the server
        // still enforces the real constraint on submit either way.
        if (!cancelled) setBusySlots([]);
      })
      .finally(() => {
        if (!cancelled) setCheckingAvailability(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showBookingModal, bookingForm.date]);

  const rangesOverlap = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

  // The specific busy slot (if any) the currently-entered start/end would
  // collide with — null while the form is incomplete or clear of conflicts.
  const conflictingSlot = (() => {
    if (!bookingForm.date || !bookingForm.startTime || !bookingForm.endTime) return null;
    const proposedStart = new Date(`${bookingForm.date}T${bookingForm.startTime}`);
    const proposedEnd = new Date(`${bookingForm.date}T${bookingForm.endTime}`);
    if (Number.isNaN(proposedStart.getTime()) || Number.isNaN(proposedEnd.getTime()) || proposedEnd <= proposedStart) {
      return null;
    }
    return (
      busySlots.find((slot) => rangesOverlap(proposedStart, proposedEnd, slot.startAt, slot.endAt)) || null
    );
  })();

  const fmtSlotTime = (d) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const handleBooking = async (e) => {
    e.preventDefault();
    setBookingError("");

    if (conflictingSlot) {
      setBookingError(
        `This overlaps an existing booking (${fmtSlotTime(conflictingSlot.startAt)}–${fmtSlotTime(conflictingSlot.endAt)}). Please choose a different time.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const { purpose, date, startTime, endTime } = bookingForm;
      const startAt = new Date(`${date}T${startTime}`).toISOString();
      const endAt = new Date(`${date}T${endTime}`).toISOString();

      await createBooking({
        venueId: showBookingModal.id,
        purpose,
        timeslot: { startAt, endAt },
      });

      setShowBookingModal(null);
      navigate("/dashboard");
    } catch (err) {
      if (err.status === 409) {
        setBookingError("This venue is already booked for the requested time slot. Please choose a different time.");
      } else {
        setBookingError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Search Venues</h1>

        {/* Filter form */}
        <Card hover={false}>
          <form onSubmit={handleSearch} id="search-form">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="filter-type" className="block text-sm text-blue-200/60 mb-1">Type</label>
                <input
                  id="filter-type"
                  type="text"
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  placeholder="e.g. classroom"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300/40 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <div>
                <label htmlFor="filter-capacity" className="block text-sm text-blue-200/60 mb-1">Min Capacity</label>
                <input
                  id="filter-capacity"
                  type="number"
                  value={filters.minCapacity}
                  onChange={(e) => setFilters({ ...filters, minCapacity: e.target.value })}
                  placeholder="e.g. 50"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300/40 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <div>
                <label htmlFor="filter-attributes" className="block text-sm text-blue-200/60 mb-1">Attributes</label>
                <input
                  id="filter-attributes"
                  type="text"
                  value={filters.attributes}
                  onChange={(e) => setFilters({ ...filters, attributes: e.target.value })}
                  placeholder="projector, audio"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300/40 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" id="search-btn" className="w-full">
                  Search
                </Button>
              </div>
            </div>
          </form>
        </Card>

        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-lg text-red-200">{error}</div>
        )}

        {loading && <Spinner label="Loading venues…" />}

        {!loading && venues.length === 0 && !error && (
          <Card className="text-center py-16">
            <p className="text-blue-200/60 text-lg">No venues match your filters</p>
            <p className="text-blue-300/40 text-sm mt-2">Try adjusting your search criteria</p>
          </Card>
        )}

        {!loading && venues.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {venues.map((venue) => (
              <Card key={venue.id} className="flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">{venue.name}</h3>
                  <p className="text-blue-200/60 text-sm mb-1">📍 {venue.location}</p>
                  <p className="text-blue-200/60 text-sm mb-1">👥 Capacity: {venue.capacity}</p>
                  <p className="text-blue-200/60 text-sm mb-3">🏷 {venue.type}</p>
                  {venue.attributes?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {venue.attributes.map((attr) => (
                        <span key={attr} className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">
                          {attr}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => openBookingModal(venue)}
                  className="w-full mt-4"
                >
                  Book Now
                </Button>
              </Card>
            ))}
          </div>
        )}

        <Modal
          isOpen={!!showBookingModal}
          onClose={() => setShowBookingModal(null)}
          title={`Book ${showBookingModal?.name}`}
        >
          {showBookingModal && (
            <div>
              <p className="text-blue-200/60 text-sm mb-6">
                {showBookingModal.location} &middot; Capacity: {showBookingModal.capacity}
              </p>

              {bookingError && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-200 text-sm">
                  {bookingError}
                </div>
              )}

              <form onSubmit={handleBooking} id="booking-form" className="space-y-4">
                <div>
                  <label htmlFor="booking-purpose" className="block text-sm text-blue-100 mb-1">Purpose</label>
                  <input
                    id="booking-purpose"
                    type="text"
                    value={bookingForm.purpose}
                    onChange={(e) => setBookingForm({ ...bookingForm, purpose: e.target.value })}
                    placeholder="Event purpose"
                    required
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300/40 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div>
                  <label htmlFor="booking-date" className="block text-sm text-blue-100 mb-1">Date</label>
                  <input
                    id="booking-date"
                    type="date"
                    value={bookingForm.date}
                    onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                  {checkingAvailability && (
                    <p className="text-xs text-blue-300/50 mt-1">Checking availability…</p>
                  )}
                  {!checkingAvailability && busySlots.length > 0 && (
                    <p className="text-xs text-amber-300/70 mt-1">
                      Already booked on this date: {busySlots.map((s) => `${fmtSlotTime(s.startAt)}–${fmtSlotTime(s.endAt)}`).join(", ")}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="booking-start" className="block text-sm text-blue-100 mb-1">Start Time</label>
                    <input
                      id="booking-start"
                      type="time"
                      value={bookingForm.startTime}
                      onChange={(e) => setBookingForm({ ...bookingForm, startTime: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                  <div>
                    <label htmlFor="booking-end" className="block text-sm text-blue-100 mb-1">End Time</label>
                    <input
                      id="booking-end"
                      type="time"
                      value={bookingForm.endTime}
                      onChange={(e) => setBookingForm({ ...bookingForm, endTime: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                </div>

                {conflictingSlot && (
                  <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-200 text-sm">
                    This overlaps an existing booking ({fmtSlotTime(conflictingSlot.startAt)}–{fmtSlotTime(conflictingSlot.endAt)}).
                    Please choose a different time.
                  </div>
                )}

                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-amber-200/80 text-xs">
                    ⚠️ Changing date, time, or venue after submission will re-trigger the approval process.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setShowBookingModal(null)} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    id="submit-booking-btn"
                    loading={submitting}
                    disabled={!!conflictingSlot}
                    className="flex-1"
                  >
                    Submit Request
                  </Button>
                </div>
              </form>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
}