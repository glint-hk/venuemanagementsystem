import { useState, useEffect } from "react";
import { fetchPendingApprovals, submitApprovalDecision } from "../lib/apiClient.js";
import Layout from "../components/Layout.jsx";

export default function ApprovalsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeDecision, setActiveDecision] = useState(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try { setLoading(true); const data = await fetchPendingApprovals(); setBookings(data); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleDecision = async (e) => {
    e.preventDefault();
    if (!activeDecision) return;
    if (activeDecision.decision === "REJECT" && !comment.trim()) { setError("Comment required for rejection"); return; }
    setSubmitting(true); setError("");
    try {
      await submitApprovalDecision(activeDecision.bookingId, activeDecision.decision, comment || null);
      setActiveDecision(null); setComment(""); load();
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  const fmt = (dt) => new Date(dt).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });
  const fmtT = (dt) => new Date(dt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <Layout>
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-white">Pending Approvals</h1><p className="text-blue-200/60 mt-1">Requests awaiting your decision</p></div>
        {error && <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-lg text-red-200">{error}</div>}
        {loading && <div className="text-center py-12"><div className="inline-block w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /></div>}
        {!loading && bookings.length === 0 && <div className="text-center py-16 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl"><p className="text-blue-200/60 text-lg">No pending approvals</p></div>}
        {!loading && bookings.length > 0 && (
          <div className="grid gap-4">{bookings.map((b) => (
            <div key={b.id} className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">{b.venue?.name}</h3>
                  <p className="text-blue-200/60 text-sm">By <span className="text-blue-300">{b.booker?.name}</span></p>
                  <p className="text-blue-200/60 text-sm mt-1">📅 {fmt(b.timeslot.startAt)} · {fmtT(b.timeslot.startAt)} – {fmtT(b.timeslot.endAt)}</p>
                  <p className="text-blue-200/80 text-sm mt-2">Purpose: {b.purpose}</p>
                  <p className="text-blue-300/40 text-xs mt-2">Step {b.currentStepIndex + 1} of {b.approvalChainSnapshot?.length || "?"}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button onClick={() => setActiveDecision({ bookingId: b.id, decision: "APPROVE" })} className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg border border-emerald-500/30 transition text-sm font-medium">Approve</button>
                  <button onClick={() => setActiveDecision({ bookingId: b.id, decision: "REJECT" })} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg border border-red-500/30 transition text-sm font-medium">Reject</button>
                </div>
              </div>
            </div>
          ))}</div>
        )}
        {activeDecision && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="backdrop-blur-xl bg-slate-900/95 border border-white/20 rounded-2xl shadow-2xl w-full max-w-md p-6">
              <h2 className="text-xl font-bold text-white mb-4">{activeDecision.decision === "APPROVE" ? "Approve" : "Reject"} Request</h2>
              <form onSubmit={handleDecision} id="decision-form">
                <div className="mb-4">
                  <label htmlFor="decision-comment" className="block text-sm text-blue-100 mb-1">Comment {activeDecision.decision === "REJECT" && <span className="text-red-400">*</span>}</label>
                  <textarea id="decision-comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder={activeDecision.decision === "REJECT" ? "Required reason" : "Optional"} rows={3} required={activeDecision.decision === "REJECT"} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300/40 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setActiveDecision(null); setComment(""); }} className="flex-1 py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg transition">Cancel</button>
                  <button type="submit" disabled={submitting} className={`flex-1 py-2 font-semibold rounded-lg transition disabled:opacity-50 ${activeDecision.decision === "APPROVE" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500"} text-white`}>{submitting ? "…" : "Confirm"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
