import { useState, useEffect } from "react";
import { fetchPublicAvailability } from "../lib/apiClient.js";
import { Button, Card, Badge, Spinner } from "../components/ui/index.js";

export default function PublicBoardPage() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toISOString().slice(0, 10);
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(nextWeek);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const startIso = startDate ? new Date(startDate).toISOString() : undefined;
      const endIso = endDate ? new Date(`${endDate}T23:59:59`).toISOString() : undefined;
      const data = await fetchPublicAvailability(startIso, endIso);
      setSlots(data || []);
    } catch (err) {
      setError(err.message || "Failed to load availability data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fmt = (dt) => new Date(dt).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });
  const fmtT = (dt) => new Date(dt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl mb-3 shadow-lg">
            <span className="text-white text-xl">🏛</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Venue Availability</h1>
          <p className="text-blue-200/60">IIM Lucknow Campus &middot; Public Board</p>
        </div>

        <Card hover={false} className="flex flex-wrap gap-4 items-end justify-center sm:justify-start">
          <div>
            <label htmlFor="pub-start" className="block text-sm text-blue-200/60 mb-1">From Date</label>
            <input
              id="pub-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <div>
            <label htmlFor="pub-end" className="block text-sm text-blue-200/60 mb-1">To Date</label>
            <input
              id="pub-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <Button onClick={() => load()} id="pub-search-btn" className="px-6">
            Check Availability
          </Button>
        </Card>

        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-lg text-red-200 text-center">{error}</div>
        )}

        {loading && <Spinner label="Checking venue availability…" />}

        {!loading && slots.length === 0 && !error && (
          <Card className="text-center py-16">
            <p className="text-blue-200/60">No availability records found for this date range</p>
          </Card>
        )}

        {!loading && slots.length > 0 && (
          <div className="grid gap-3">
            {slots.map((s, i) => (
              <div
                key={i}
                className={`backdrop-blur-xl border rounded-xl p-4 flex items-center justify-between transition ${
                  s.busy ? "bg-red-500/10 border-red-500/20" : "bg-emerald-500/10 border-emerald-500/20"
                }`}
              >
                <div>
                  <p className="text-white font-medium text-lg">{s.venueName || s.venueId}</p>
                  <p className="text-blue-200/60 text-sm mt-0.5">
                    📅 {fmt(s.timeslot.startAt)} &middot; {fmtT(s.timeslot.startAt)} – {fmtT(s.timeslot.endAt)}
                  </p>
                </div>
                <Badge variant={s.busy ? "REJECTED" : "APPROVED"}>
                  {s.busy ? "Booked" : "Available"}
                </Badge>
              </div>
            ))}
          </div>
        )}

        <div className="text-center pt-4">
          <a href="/login" className="text-blue-300/80 hover:text-blue-200 text-sm font-medium transition">
            Sign in to submit a booking request →
          </a>
        </div>
      </div>
    </div>
  );
}
