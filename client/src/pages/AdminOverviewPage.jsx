// Admin Overview page — system administration overview dashboard (US-B6).
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchVenues, fetchUsers, fetchAuditLogs } from "../lib/apiClient.js";
import Layout from "../components/Layout.jsx";

export default function AdminOverviewPage() {
  const [venues, setVenues] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [venuesData, usersData, logsData] = await Promise.all([
        fetchVenues(),
        fetchUsers(),
        fetchAuditLogs().catch(() => []), // Fallback gracefully if empty
      ]);
      setVenues(venuesData);
      setUsers(usersData);
      setAuditLogs(logsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const approverCount = users.filter((u) => u.role === "APPROVER").length;
  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const bookerCount = users.filter((u) => u.role === "BOOKER").length;

  const fmtTime = (dt) => new Date(dt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Administration Hub</h1>
          <p className="text-blue-200/60 mt-1">
            System overview, venue registry, audit trail, and user role management
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* System Overview KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5">
                <p className="text-blue-200/60 text-xs font-medium uppercase tracking-wider">
                  Total Venues
                </p>
                <h3 className="text-3xl font-bold text-white mt-1">{venues.length}</h3>
                <p className="text-blue-300/40 text-xs mt-2">Active campus spaces</p>
              </div>

              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5">
                <p className="text-blue-200/60 text-xs font-medium uppercase tracking-wider">
                  Registered Users
                </p>
                <h3 className="text-3xl font-bold text-white mt-1">{users.length}</h3>
                <p className="text-blue-300/40 text-xs mt-2">
                  {bookerCount} Bookers &middot; {approverCount} Approvers
                </p>
              </div>

              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5">
                <p className="text-blue-200/60 text-xs font-medium uppercase tracking-wider">
                  Approver Tiers
                </p>
                <h3 className="text-3xl font-bold text-amber-400 mt-1">{approverCount}</h3>
                <p className="text-blue-300/40 text-xs mt-2">Tier 1 & Tier 2 active</p>
              </div>

              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5">
                <p className="text-blue-200/60 text-xs font-medium uppercase tracking-wider">
                  Administrators
                </p>
                <h3 className="text-3xl font-bold text-purple-400 mt-1">{adminCount}</h3>
                <p className="text-blue-300/40 text-xs mt-2">Full elevated control</p>
              </div>
            </div>

            {/* Quick Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                to="/admin/users"
                className="backdrop-blur-xl bg-white/5 border border-white/10 hover:border-blue-500/40 rounded-xl p-6 transition-all duration-200 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    👥
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-blue-300 transition">
                      User & Role Elevation
                    </h3>
                    <p className="text-blue-200/60 text-sm mt-1">
                      Elevate users to Approvers/Admins, configure tiers, and view audit history.
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                to="/approvals"
                className="backdrop-blur-xl bg-white/5 border border-white/10 hover:border-emerald-500/40 rounded-xl p-6 transition-all duration-200 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    ✅
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition">
                      Pending Approvals Overview
                    </h3>
                    <p className="text-blue-200/60 text-sm mt-1">
                      Review in-flight requests across all approval tiers.
                    </p>
                  </div>
                </div>
              </Link>
            </div>

            {/* Recent Audit Trail Feed (US-B2 Requirement) */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-white">System Audit Log Feed</h2>
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5">
                {auditLogs.length === 0 ? (
                  <p className="text-blue-200/50 text-sm italic">No system audit logs recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 text-sm gap-2"
                      >
                        <div>
                          <span className="font-semibold text-blue-300">{log.action}</span>
                          <span className="text-blue-200/60 ml-2">by {log.actor?.name || "System"}</span>
                          {log.metadata && (
                            <p className="text-xs text-blue-300/60 mt-0.5">
                              {JSON.stringify(log.metadata)}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-blue-300/40 whitespace-nowrap">
                          {fmtTime(log.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Venue Registry Summary Table */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-white">Campus Venue Registry</h2>
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-4 text-blue-200/60 font-medium">Venue Name</th>
                      <th className="text-left p-4 text-blue-200/60 font-medium">Location</th>
                      <th className="text-left p-4 text-blue-200/60 font-medium">Capacity</th>
                      <th className="text-left p-4 text-blue-200/60 font-medium">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {venues.map((v) => (
                      <tr key={v.id} className="border-b border-white/5 hover:bg-white/5 transition">
                        <td className="p-4 text-white font-medium">{v.name}</td>
                        <td className="p-4 text-blue-200/60">📍 {v.location}</td>
                        <td className="p-4 text-blue-200/60">👥 {v.capacity} seats</td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 text-xs bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">
                            {v.type}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
