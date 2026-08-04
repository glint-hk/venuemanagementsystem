// Dashboard page — "My Bookings" view for the Booker role (US-B3).
// Shows all bookings by the signed-in user with approval history, modify modal, and cancel actions.
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchMyBookings, cancelBooking, modifyBooking } from "../lib/apiClient.js";
import Layout from "../components/Layout.jsx";

const STATUS_COLORS = {
  DRAFT: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  PENDING: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  APPROVED: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  REJECTED: "bg-red-500/20 text-red-300 border-red-500/30",
  MODIFIED: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  COMPLETED: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  CANCELLED: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingBooking, setEditingBooking] = useState(null);
  const [editForm, setEditForm] = useState({ purpose: "", date: "", startTime: "", endTime: "" });
  const [editError, setEditError] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const data = await fetchMyBookings();
      setBookings(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleCancel = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    try {
      await cancelBooking(bookingId);
      loadBookings();
    } catch (err) {
      setError(err.message);
    }
  };

  const openModifyModal = (b) => {
    setEditingBooking(b);
    const startDateObj = new Date(b.timeslot.startAt);
    const endDateObj = new Date(b.timeslot.endAt);
    const dateStr = startDateObj.toISOString().slice(0, 10);
    const startStr = startDateObj.toTimeString().slice(0, 5);
    const endStr = endDateObj.toTimeString().slice(0, 5);

    setEditForm({
      purpose: b.purpose,
      date: dateStr,
      startTime: startStr,
      endTime: endStr,
    });
    setEditError("");
  };

  const handleModifySubmit = async (e) => {
    e.preventDefault();
    setEditError("");
    setSubmittingEdit(true);
    try {
      const { purpose, date, startTime, endTime } = editForm;
      const startAt = new Date(`${date}T${startTime}`).toISOString();
      const endAt = new Date(`${date}T${endTime}`).toISOString();

      await modifyBooking(editingBooking.id, {
        purpose,
        timeslot: { startAt, endAt },
      });

      setEditingBooking(null);
      loadBookings();
    } catch (err) {
      if (err.status === 409) {
        setEditError("This venue is already booked for the requested time slot.");
      } else {
        setEditError(err.message);
      }
    } finally {
      setSubmittingEdit(false);
    }
  };

  const formatDate = (dt) =>
    new Date(dt).toLocaleDateString("en-IN", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const formatTime = (dt) =>
    new Date(dt).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">My Bookings</h1>
            <p className="text-blue-200/60 mt-1">Welcome back, {user?.name}</p>
          </div>
          <Link
            to="/search"
            id="new-booking-btn"
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-lg shadow-lg transition-all duration-200"
          >
            + New Booking
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-blue-200/60 mt-3">Loading bookings…</p>
          </div>
        )}

        {/* Empty */}
        {!loading && bookings.length === 0 && (
          <div className="text-center py-16 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl">
            <svg className="w-16 h-16 text-blue-300/30 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-blue-200/60 text-lg">No bookings yet</p>
            <Link to="/search" className="inline-block mt-4 text-blue-400 hover:text-blue-300 transition">
              Search for a venue →
            </Link>
          </div>
        )}

        {/* Booking Cards */}
        {!loading && bookings.length > 0 && (
          <div className="grid gap-4">
            {bookings.map((booking) => {
              const chain = booking.approvalChainSnapshot || [];
              const totalSteps = chain.length;
              const currentStepNumber = booking.currentStepIndex + 1;

              return (
                <div
                  key={booking.id}
                  className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/8 transition-all duration-200"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {booking.venue?.name || "Unknown Venue"}
                        </h3>
                        <span
                          className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${STATUS_COLORS[booking.status] || STATUS_COLORS.DRAFT}`}
                        >
                          {booking.status}
                        </span>
                      </div>
                      <p className="text-blue-200/60 text-sm mb-1">
                        📍 {booking.venue?.location || "—"}
                      </p>
                      <p className="text-blue-200/60 text-sm mb-1">
                        📅 {formatDate(booking.timeslot.startAt)} &middot;{" "}
                        {formatTime(booking.timeslot.startAt)} – {formatTime(booking.timeslot.endAt)}
                      </p>
                      <p className="text-blue-200/80 text-sm mt-2">
                        <span className="text-blue-300/50">Purpose:</span> {booking.purpose}
                      </p>

                      {/* Approval Step Status */}
                      <div className="mt-4 pt-3 border-t border-white/10">
                        {booking.status === "PENDING" && (
                          <div className="flex items-center gap-2 text-amber-300/80 text-xs">
                            <span>⏳ Step {currentStepNumber} of {totalSteps || 1} pending</span>
                            {chain[booking.currentStepIndex] && (
                              <span>(Awaiting Tier {chain[booking.currentStepIndex].tier} Approver)</span>
                            )}
                          </div>
                        )}
                        {booking.status === "APPROVED" && (
                          <div className="text-emerald-300/80 text-xs">
                            ✅ Fully approved by all required tiers
                          </div>
                        )}
                        {booking.status === "REJECTED" && (
                          <div className="text-red-300/80 text-xs">
                            ❌ Request rejected
                          </div>
                        )}

                        {/* Approvals History / Comments */}
                        {booking.approvals && booking.approvals.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {booking.approvals.map((app, idx) => (
                              <div key={idx} className="text-xs text-blue-200/60 flex items-center gap-2">
                                <span className={app.decision === "APPROVE" ? "text-emerald-400" : "text-red-400"}>
                                  ● Step {app.stepIndex + 1} ({app.decision}) by {app.approver?.name}
                                </span>
                                {app.comment && <span className="italic text-blue-300/80">&mdash; &quot;{app.comment}&quot;</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions — only for cancellable or modifiable bookings */}
                    {["PENDING", "APPROVED"].includes(booking.status) && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => openModifyModal(booking)}
                          className="px-3 py-1.5 text-sm bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg border border-blue-500/30 transition"
                        >
                          Modify
                        </button>
                        <button
                          onClick={() => handleCancel(booking.id)}
                          className="px-3 py-1.5 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg border border-red-500/30 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modify Booking Modal */}
        {editingBooking && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="backdrop-blur-xl bg-slate-900/95 border border-white/20 rounded-2xl shadow-2xl w-full max-w-lg p-6">
              <h2 className="text-xl font-bold text-white mb-1">Modify Booking</h2>
              <p className="text-blue-200/60 text-sm mb-4">{editingBooking.venue?.name}</p>

              {editError && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-200 text-sm">
                  {editError}
                </div>
              )}

              <form onSubmit={handleModifySubmit} className="space-y-4">
                <div>
                  <label htmlFor="modify-purpose" className="block text-sm text-blue-100 mb-1">Purpose</label>
                  <input
                    id="modify-purpose"
                    type="text"
                    value={editForm.purpose}
                    onChange={(e) => setEditForm({ ...editForm, purpose: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div>
                  <label htmlFor="modify-date" className="block text-sm text-blue-100 mb-1">Date</label>
                  <input
                    id="modify-date"
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="modify-start" className="block text-sm text-blue-100 mb-1">Start Time</label>
                    <input
                      id="modify-start"
                      type="time"
                      value={editForm.startTime}
                      onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                  <div>
                    <label htmlFor="modify-end" className="block text-sm text-blue-100 mb-1">End Time</label>
                    <input
                      id="modify-end"
                      type="time"
                      value={editForm.endTime}
                      onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                </div>

                {/* US-B3 Re-approval Warning */}
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-amber-200/80 text-xs">
                    ⚠️ Changing date or time will reset status to PENDING and re-trigger the approval chain.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingBooking(null)}
                    className="flex-1 py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingEdit}
                    className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-lg transition disabled:opacity-50"
                  >
                    {submittingEdit ? "Saving…" : "Save Changes"}
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
