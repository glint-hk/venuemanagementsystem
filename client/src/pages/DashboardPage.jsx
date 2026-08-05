import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchMyBookings, cancelBooking, modifyBooking, fetchVenueAvailability } from "../lib/apiClient.js";
import Layout from "../components/Layout.jsx";
import { Button, Card, Badge, Modal, Spinner } from "../components/ui/index.js";

export default function DashboardPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingBooking, setEditingBooking] = useState(null);
  const [editForm, setEditForm] = useState({ purpose: "", date: "", startTime: "", endTime: "" });
  const [editError, setEditError] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [busySlots, setBusySlots] = useState([]); // [{startAt: Date, endAt: Date}] for the selected date
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const data = await fetchMyBookings();
      setBookings(data || []);
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
    setBusySlots([]);
  };

  // Same pattern as the create-booking modal in SearchPage.jsx: pull the
  // venue's busy slots for the selected date so a reschedule can be flagged
  // before submit, not just after a 409. Still a UX courtesy only — the
  // database exclusion constraint is the real guarantee.
  useEffect(() => {
    if (!editingBooking || !editForm.date) {
      setBusySlots([]);
      return;
    }
    let cancelled = false;
    const venueId = editingBooking.venue?.id;
    if (!venueId) {
      setBusySlots([]);
      return;
    }
    const dayStart = new Date(`${editForm.date}T00:00:00`);
    const dayEnd = new Date(`${editForm.date}T23:59:59`);

    setCheckingAvailability(true);
    fetchVenueAvailability(venueId, dayStart.toISOString(), dayEnd.toISOString())
      .then((slots) => {
        if (cancelled) return;
        const busy = (Array.isArray(slots) ? slots : [])
          .filter((s) => s.busy)
          .map((s) => ({ startAt: new Date(s.timeslot.startAt), endAt: new Date(s.timeslot.endAt) }));
        setBusySlots(busy);
      })
      .catch(() => {
        if (!cancelled) setBusySlots([]);
      })
      .finally(() => {
        if (!cancelled) setCheckingAvailability(false);
      });

    return () => {
      cancelled = true;
    };
  }, [editingBooking, editForm.date]);

  const rangesOverlap = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;
  const fmtSlotTime = (d) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // The busy slot (if any) the currently-entered start/end would collide
  // with — excluding the booking's OWN current slot, since without that
  // exclusion editing anything other than the time would always show a
  // false conflict against itself.
  const conflictingSlot = (() => {
    if (!editingBooking || !editForm.date || !editForm.startTime || !editForm.endTime) return null;
    const proposedStart = new Date(`${editForm.date}T${editForm.startTime}`);
    const proposedEnd = new Date(`${editForm.date}T${editForm.endTime}`);
    if (Number.isNaN(proposedStart.getTime()) || Number.isNaN(proposedEnd.getTime()) || proposedEnd <= proposedStart) {
      return null;
    }
    const ownStart = new Date(editingBooking.timeslot.startAt).getTime();
    const ownEnd = new Date(editingBooking.timeslot.endAt).getTime();

    return (
      busySlots.find((slot) => {
        if (slot.startAt.getTime() === ownStart && slot.endAt.getTime() === ownEnd) return false;
        return rangesOverlap(proposedStart, proposedEnd, slot.startAt, slot.endAt);
      }) || null
    );
  })();

  // All fields must be filled before Save Changes is submittable — independent
  // of whether a conflict was found.
  const isFormIncomplete =
    !editForm.purpose.trim() ||
    !editForm.date ||
    !editForm.startTime ||
    !editForm.endTime;

  const handleModifySubmit = async (e) => {
    e.preventDefault();
    setEditError("");

    if (conflictingSlot) {
      setEditError(
        `This overlaps an existing booking (${fmtSlotTime(conflictingSlot.startAt)}–${fmtSlotTime(conflictingSlot.endAt)}). Please choose a different time.`
      );
      return;
    }

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
          <Link to="/search" id="new-booking-btn">
            <Button variant="primary">+ New Booking</Button>
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && <Spinner label="Loading bookings…" />}

        {/* Empty */}
        {!loading && bookings.length === 0 && (
          <Card className="text-center py-16">
            <svg className="w-16 h-16 text-blue-300/30 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-blue-200/60 text-lg">No bookings yet</p>
            <Link to="/search" className="inline-block mt-4 text-blue-400 hover:text-blue-300 transition">
              Search for a venue →
            </Link>
          </Card>
        )}

        {/* Booking Cards */}
        {!loading && bookings.length > 0 && (
          <div className="grid gap-4">
            {bookings.map((booking) => {
              const chain = booking.approvalChainSnapshot || [];
              const totalSteps = chain.length;
              const currentStepNumber = (booking.currentStepIndex ?? 0) + 1;

              return (
                <Card key={booking.id}>
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {booking.venue?.name || "Unknown Venue"}
                        </h3>
                        <Badge status={booking.status} />
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
                        <Button variant="outline" size="sm" onClick={() => openModifyModal(booking)}>
                          Modify
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleCancel(booking.id)}>
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Modify Booking Modal */}
        <Modal
          isOpen={!!editingBooking}
          onClose={() => setEditingBooking(null)}
          title="Modify Booking"
        >
          {editingBooking && (
            <div>
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

                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-amber-200/80 text-xs">
                    ⚠️ Changing date or time re-checks the venue's approval requirements: most venues
                    reset to PENDING for re-approval, while venues that require no approval are
                    re-approved automatically.
                  </p>
                </div>

                {conflictingSlot && (
                  <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-200 text-sm">
                    This overlaps an existing booking ({fmtSlotTime(conflictingSlot.startAt)}–{fmtSlotTime(conflictingSlot.endAt)}).
                    Please choose a different time.
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setEditingBooking(null)} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    loading={submittingEdit}
                    disabled={!!conflictingSlot || isFormIncomplete}
                    className="flex-1"
                  >
                    Save Changes
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