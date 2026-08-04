// Admin page — user management and role elevation (US-B2).
import { useState, useEffect } from "react";
import { fetchUsers, elevateRole } from "../lib/apiClient.js";
import Layout from "../components/Layout.jsx";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [roleForm, setRoleForm] = useState({ role: "BOOKER", approverTier: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try { setLoading(true); const data = await fetchUsers(); setUsers(data); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleElevate = async (e) => {
    e.preventDefault(); setError("");
    if (roleForm.role === "APPROVER" && !roleForm.approverTier) { setError("Approver tier is required"); return; }
    setSubmitting(true);
    try {
      await elevateRole(editing.id, roleForm.role, roleForm.role === "APPROVER" ? parseInt(roleForm.approverTier) : null);
      setEditing(null); load();
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">User Management</h1>
        {error && <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-lg text-red-200">{error}</div>}
        {loading && <div className="text-center py-12"><div className="inline-block w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /></div>}
        {!loading && (
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/10">
                <th className="text-left p-4 text-blue-200/60 font-medium">Name</th>
                <th className="text-left p-4 text-blue-200/60 font-medium">Email</th>
                <th className="text-left p-4 text-blue-200/60 font-medium">Role</th>
                <th className="text-left p-4 text-blue-200/60 font-medium">Tier</th>
                <th className="text-right p-4 text-blue-200/60 font-medium">Actions</th>
              </tr></thead>
              <tbody>{users.map((u) => (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition">
                  <td className="p-4 text-white">{u.name}</td>
                  <td className="p-4 text-blue-200/60">{u.email}</td>
                  <td className="p-4"><span className={`px-2 py-0.5 text-xs rounded-full ${u.role === "ADMIN" ? "bg-purple-500/20 text-purple-300" : u.role === "APPROVER" ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300"}`}>{u.role}</span></td>
                  <td className="p-4 text-blue-200/60">{u.approverTier ?? "—"}</td>
                  <td className="p-4 text-right"><button onClick={() => { setEditing(u); setRoleForm({ role: u.role, approverTier: u.approverTier || "" }); }} className="text-blue-400 hover:text-blue-300 text-sm transition">Edit Role</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {editing && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="backdrop-blur-xl bg-slate-900/95 border border-white/20 rounded-2xl shadow-2xl w-full max-w-md p-6">
              <h2 className="text-xl font-bold text-white mb-4">Edit Role: {editing.name}</h2>
              <form onSubmit={handleElevate} id="elevate-form" className="space-y-4">
                <div><label htmlFor="role-select" className="block text-sm text-blue-100 mb-1">Role</label>
                  <select id="role-select" value={roleForm.role} onChange={(e) => setRoleForm({ ...roleForm, role: e.target.value })} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                    <option value="BOOKER">Booker</option><option value="APPROVER">Approver</option><option value="ADMIN">Admin</option>
                  </select>
                </div>
                {roleForm.role === "APPROVER" && (
                  <div><label htmlFor="tier-input" className="block text-sm text-blue-100 mb-1">Approver Tier <span className="text-red-400">*</span></label>
                    <input id="tier-input" type="number" min="1" value={roleForm.approverTier} onChange={(e) => setRoleForm({ ...roleForm, approverTier: e.target.value })} required className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                  </div>
                )}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setEditing(null)} className="flex-1 py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg transition">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition disabled:opacity-50">{submitting ? "…" : "Save"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
