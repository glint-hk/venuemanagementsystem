// Public availability board (US-B5) — no login required.
import { useState, useEffect } from "react";
import { fetchPublicAvailability } from "../lib/apiClient.js";

export default function PublicBoardPage() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(nextWeek);

  const load = async () => {
    try { setLoading(true); setError("");
      const data = await fetchPublicAvailability(new Date(startDate).toISOString(), new Date(endDate + "T23:59:59").toISOString());
      setSlots(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fmt = (dt) => new Date(dt).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });
  const fmtT = (dt) => new Date(dt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Venue Availability</h1>
          <p className="text-blue-200/60">IIM Lucknow Campus — Public Board</p>
        </div>
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5 flex flex-wrap gap-4 items-end">
          <div><label htmlFor="pub-start" className="block text-sm text-blue-200/60 mb-1">From</label><input id="pub-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" /></div>
          <div><label htmlFor="pub-end" className="block text-sm text-blue-200/60 mb-1">To</label><input id="pub-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" /></div>
          <button onClick={load} id="pub-search-btn" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition text-sm font-medium">Check</button>
        </div>
        {error && <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-lg text-red-200">{error}</div>}
        {loading && <div className="text-center py-12"><div className="inline-block w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /></div>}
        {!loading && slots.length === 0 && !error && <div className="text-center py-16 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl"><p className="text-blue-200/60">No data for this period</p></div>}
        {!loading && slots.length > 0 && (
          <div className="grid gap-3">{slots.map((s, i) => (
            <div key={i} className={`backdrop-blur-xl border rounded-xl p-4 flex items-center justify-between ${s.busy ? "bg-red-500/10 border-red-500/20" : "bg-emerald-500/10 border-emerald-500/20"}`}>
              <div>
                <p className="text-white font-medium">{s.venueName || s.venueId}</p>
                <p className="text-blue-200/60 text-sm">{fmt(s.timeslot.startAt)} · {fmtT(s.timeslot.startAt)} – {fmtT(s.timeslot.endAt)}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${s.busy ? "bg-red-500/20 text-red-300 border border-red-500/30" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"}`}>{s.busy ? "Booked" : "Available"}</span>
            </div>
          ))}</div>
        )}
        <div className="text-center pt-4"><a href="/login" className="text-blue-300/60 hover:text-blue-200 text-sm transition">Sign in to book →</a></div>
      </div>
    </div>
  );
}
