// Search & Book page (US-B3) — venue search with filters and availability grid.
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchVenues, createBooking } from "../lib/apiClient.js";
import Layout from "../components/Layout.jsx";

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

  const loadVenues = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await fetchVenues(filters);
      setVenues(data);
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
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    setBookingError("");
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
      // US-B3: 409 conflict renders as clear human message
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
        <form onSubmit={handleSearch} id="search-form" className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5">
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
                placeholder="projector, sound system"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300/40 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                id="search-btn"
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition"
              >
                Search
              </button>
            </div>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-lg text-red-200">{error}</div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty — US-B3: zero matches renders empty state, not error */}
        {!loading && venues.length === 0 && !error && (
          <div className="text-center py-16 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl">
            <p className="text-blue-200/60 text-lg">No venues match your filters</p>
            <p className="text-blue-300/40 text-sm mt-2">Try adjusting your search criteria</p>
          </div>
        )}

        {/* Venue cards */}
        {!loading && venues.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {venues.map((venue) => (
              <div
                key={venue.id}
                className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/8 transition-all duration-200 group"
              >
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
                <button
                  onClick={() => openBookingModal(venue)}
                  className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-lg transition-all duration-200 opacity-80 group-hover:opacity-100"
                >
                  Book Now
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Booking Modal */}
        {showBookingModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="backdrop-blur-xl bg-slate-900/95 border border-white/20 rounded-2xl shadow-2xl w-full max-w-lg p-6">
              <h2 className="text-xl font-bold text-white mb-1">Book {showBookingModal.name}</h2>
              <p className="text-blue-200/60 text-sm mb-6">{showBookingModal.location} &middot; Capacity: {showBookingModal.capacity}</p>

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

                {/* US-B3: Warn about re-approval */}
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-amber-200/80 text-xs">
                    ⚠️ Changing date, time, or venue after submission will re-trigger the approval process.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowBookingModal(null)}
                    className="flex-1 py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="submit-booking-btn"
                    disabled={submitting}
                    className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-lg transition disabled:opacity-50"
                  >
                    {submitting ? "Submitting…" : "Submit Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
