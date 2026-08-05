import { useState, useEffect } from "react";
import { fetchPendingApprovals, submitApprovalDecision } from "../lib/apiClient.js";
import Layout from "../components/Layout.jsx";
import { Button, Card, Badge, Modal, Spinner } from "../components/ui/index.js";

export default function ApprovalsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeDecision, setActiveDecision] = useState(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await fetchPendingApprovals();
      setBookings(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDecision = async (e) => {
    e.preventDefault();
    if (!activeDecision) return;
    if (activeDecision.decision === "REJECT" && !comment.trim()) {
      setError("Comment is required when rejecting a request");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await submitApprovalDecision(activeDecision.bookingId, activeDecision.decision, comment || null);
      setActiveDecision(null);
      setComment("");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (dt) => new Date(dt).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });
  const fmtT = (dt) => new Date(dt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Pending Approvals</h1>
          <p className="text-blue-200/60 mt-1">Requests awaiting your tier decision</p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {loading && <Spinner label="Loading pending approvals…" />}

        {!loading && bookings.length === 0 && (
          <Card className="text-center py-16">
            <p className="text-blue-200/60 text-lg">No pending approvals for your tier</p>
          </Card>
        )}

        {!loading && bookings.length > 0 && (
          <div className="grid gap-4">
            {bookings.map((b) => (
              <Card key={b.id}>
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-white">{b.venue?.name}</h3>
                      <Badge status={b.status} />
                    </div>
                    <p className="text-blue-200/60 text-sm">
                      Requested by <span className="text-blue-300 font-medium">{b.booker?.name}</span>
                    </p>
                    <p className="text-blue-200/60 text-sm mt-1">
                      📅 {fmt(b.timeslot.startAt)} &middot; {fmtT(b.timeslot.startAt)} – {fmtT(b.timeslot.endAt)}
                    </p>
                    <p className="text-blue-200/80 text-sm mt-2">
                      <span className="text-blue-300/50">Purpose:</span> {b.purpose}
                    </p>
                    <p className="text-blue-300/40 text-xs mt-2">
                      Step {(b.currentStepIndex ?? 0) + 1} of {b.approvalChainSnapshot?.length || 1}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => setActiveDecision({ bookingId: b.id, decision: "APPROVE" })}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setActiveDecision({ bookingId: b.id, decision: "REJECT" })}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Modal
          isOpen={!!activeDecision}
          onClose={() => {
            setActiveDecision(null);
            setComment("");
          }}
          title={`${activeDecision?.decision === "APPROVE" ? "Approve" : "Reject"} Request`}
        >
          {activeDecision && (
            <form onSubmit={handleDecision} id="decision-form">
              <div className="mb-4">
                <label htmlFor="decision-comment" className="block text-sm text-blue-100 mb-1">
                  Comment {activeDecision.decision === "REJECT" && <span className="text-red-400">*</span>}
                </label>
                <textarea
                  id="decision-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={activeDecision.decision === "REJECT" ? "Reason for rejection (required)" : "Optional comment"}
                  rows={3}
                  required={activeDecision.decision === "REJECT"}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300/40 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setActiveDecision(null);
                    setComment("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant={activeDecision.decision === "APPROVE" ? "success" : "danger"}
                  loading={submitting}
                  className="flex-1"
                >
                  Confirm {activeDecision.decision === "APPROVE" ? "Approval" : "Rejection"}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </Layout>
  );
}
