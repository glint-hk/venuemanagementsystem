import { useState, useEffect } from "react";
import {
  fetchVenues,
  createVenue,
  updateVenue,
  deleteVenue,
  fetchApprovalChains,
  createApprovalChain,
  updateApprovalChain,
  fetchUsers,
} from "../lib/apiClient.js";
import Layout from "../components/Layout.jsx";
import { Button, Card, Modal, Spinner } from "../components/ui/index.js";

const MAX_APPROVAL_TIERS = 6;

const EMPTY_FORM = {
  name: "",
  type: "",
  location: "",
  capacity: "",
  attributes: "",
  approvalChainId: "",
};

const emptyStep = (tier) => ({ tier, role: "APPROVER", escalationWindowHours: "24", assignedApproverId: "" });
const EMPTY_CHAIN_FORM = { venueType: "", steps: [emptyStep(1)] };

export default function AdminVenuesPage() {
  const [venues, setVenues] = useState([]);
  const [chains, setChains] = useState([]);
  const [approvers, setApprovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(null); // venue object, or "new"
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [chainEditing, setChainEditing] = useState(null); // chain object, or "new"
  const [chainForm, setChainForm] = useState(EMPTY_CHAIN_FORM);
  const [chainFormError, setChainFormError] = useState("");
  const [chainSubmitting, setChainSubmitting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const [venuesData, chainsData, usersData] = await Promise.all([
        fetchVenues(),
        fetchApprovalChains().catch(() => []),
        fetchUsers().catch(() => []),
      ]);
      // GET /api/venues wraps its payload as { venues: [...] }; guard against
      // any other shape (or a partially-failed request) so this never crashes.
      const venuesList = Array.isArray(venuesData) ? venuesData : venuesData?.venues;
      setVenues(Array.isArray(venuesList) ? venuesList : []);
      setChains(Array.isArray(chainsData) ? chainsData : []);
      const usersList = Array.isArray(usersData) ? usersData : [];
      setApprovers(usersList.filter((u) => u.role === "APPROVER"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setFormError("");
    setForm(EMPTY_FORM);
    setEditing("new");
  };

  const openEdit = (venue) => {
    setFormError("");
    setForm({
      name: venue.name || "",
      type: venue.type || "",
      location: venue.location || "",
      capacity: venue.capacity ?? "",
      attributes: (venue.attributes || []).join(", "),
      approvalChainId: venue.approvalChainId || "",
    });
    setEditing(venue);
  };

  const closeModal = () => {
    setEditing(null);
    setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!form.name || !form.type || !form.location || form.capacity === "" || !form.approvalChainId) {
      setFormError("Name, type, location, capacity, and approval chain are required.");
      return;
    }

    const payload = {
      name: form.name,
      type: form.type,
      location: form.location,
      capacity: Number(form.capacity),
      attributes: form.attributes
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      approvalChainId: form.approvalChainId,
    };

    setSubmitting(true);
    try {
      if (editing === "new") {
        await createVenue(payload);
      } else {
        await updateVenue(editing.id, payload);
      }
      closeModal();
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (venue) => {
    if (!window.confirm(`Delete "${venue.name}"? This cannot be undone.`)) return;
    setError("");
    try {
      await deleteVenue(venue.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  // ── Approval chains ──
  const openCreateChain = () => {
    setChainFormError("");
    setChainForm(EMPTY_CHAIN_FORM);
    setChainEditing("new");
  };

  const openEditChain = (chain) => {
    setChainFormError("");
    setChainForm({
      venueType: chain.venueType || "",
      steps: Array.isArray(chain.steps)
        ? chain.steps.map((s) => ({
            tier: s.tier,
            role: "APPROVER",
            escalationWindowHours: String(s.escalationWindowHours ?? ""),
            assignedApproverId: s.assignedApproverId || "",
          }))
        : [],
    });
    setChainEditing(chain);
  };

  const closeChainModal = () => {
    setChainEditing(null);
    setChainFormError("");
  };

  const addTier = () => {
    setChainForm((prev) => {
      if (prev.steps.length >= MAX_APPROVAL_TIERS) return prev;
      return { ...prev, steps: [...prev.steps, emptyStep(prev.steps.length + 1)] };
    });
  };

  const removeTier = (index) => {
    setChainForm((prev) => {
      const steps = prev.steps
        .filter((_, i) => i !== index)
        .map((s, i) => {
          const newTier = i + 1;
          // Renumbering can shift a step onto a different tier — an
          // approver assigned to the old tier number may no longer be
          // valid, so clear the assignment rather than silently mismatch it.
          return newTier === s.tier ? s : { ...s, tier: newTier, assignedApproverId: "" };
        });
      return { ...prev, steps };
    });
  };

  const updateTierHours = (index, value) => {
    setChainForm((prev) => ({
      ...prev,
      steps: prev.steps.map((s, i) => (i === index ? { ...s, escalationWindowHours: value } : s)),
    }));
  };

  const updateTierApprover = (index, value) => {
    setChainForm((prev) => ({
      ...prev,
      steps: prev.steps.map((s, i) => (i === index ? { ...s, assignedApproverId: value } : s)),
    }));
  };

  const handleChainSubmit = async (e) => {
    e.preventDefault();
    setChainFormError("");

    if (chainEditing === "new" && !chainForm.venueType.trim()) {
      setChainFormError("Venue type is required.");
      return;
    }
    if (chainForm.steps.length > MAX_APPROVAL_TIERS) {
      setChainFormError(`A chain cannot have more than ${MAX_APPROVAL_TIERS} approvers.`);
      return;
    }
    if (chainForm.steps.some((s) => !s.escalationWindowHours || Number(s.escalationWindowHours) <= 0)) {
      setChainFormError("Every tier needs a positive escalation window (hours).");
      return;
    }

    const steps = chainForm.steps.map((s) => ({
      tier: s.tier,
      role: "APPROVER",
      escalationWindowHours: Number(s.escalationWindowHours),
      assignedApproverId: s.assignedApproverId || null,
    }));

    setChainSubmitting(true);
    try {
      if (chainEditing === "new") {
        await createApprovalChain({ venueType: chainForm.venueType.trim(), steps });
      } else {
        await updateApprovalChain(chainEditing.id, { steps });
      }
      closeChainModal();
      load();
    } catch (err) {
      setChainFormError(err.message);
    } finally {
      setChainSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Venue Management</h1>
            <p className="text-blue-200/60 mt-1">Add, edit, or remove campus venues.</p>
          </div>
          <Button onClick={openCreate}>+ Add Venue</Button>
        </div>

        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <Spinner label="Loading venues…" />
        ) : (
          <Card hover={false} className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left p-4 text-blue-200/60 font-medium">Venue Name</th>
                  <th className="text-left p-4 text-blue-200/60 font-medium">Location</th>
                  <th className="text-left p-4 text-blue-200/60 font-medium">Capacity</th>
                  <th className="text-left p-4 text-blue-200/60 font-medium">Type</th>
                  <th className="text-right p-4 text-blue-200/60 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {venues.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-blue-200/50 text-sm italic">
                      No venues registered yet.
                    </td>
                  </tr>
                ) : (
                  venues.map((v) => (
                    <tr key={v.id} className="border-b border-white/5 hover:bg-white/5 transition">
                      <td className="p-4 text-white font-medium">{v.name}</td>
                      <td className="p-4 text-blue-200/60">📍 {v.location}</td>
                      <td className="p-4 text-blue-200/60">👥 {v.capacity} seats</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 text-xs bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">
                          {v.type}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        <Button variant="outline" size="sm" onClick={() => openEdit(v)}>
                          Edit
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(v)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        )}

        <Modal
          isOpen={!!editing}
          onClose={closeModal}
          title={editing === "new" ? "Add Venue" : `Edit Venue: ${editing?.name}`}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-200 text-sm">
                {formError}
              </div>
            )}

            <div>
              <label htmlFor="venue-name" className="block text-sm text-blue-100 mb-1">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                id="venue-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="venue-type" className="block text-sm text-blue-100 mb-1">
                  Type <span className="text-red-400">*</span>
                </label>
                <input
                  id="venue-type"
                  type="text"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  placeholder="e.g. classroom"
                  required
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <div>
                <label htmlFor="venue-capacity" className="block text-sm text-blue-100 mb-1">
                  Capacity <span className="text-red-400">*</span>
                </label>
                <input
                  id="venue-capacity"
                  type="number"
                  min="1"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>

            <div>
              <label htmlFor="venue-location" className="block text-sm text-blue-100 mb-1">
                Location <span className="text-red-400">*</span>
              </label>
              <input
                id="venue-location"
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                required
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <div>
              <label htmlFor="venue-attributes" className="block text-sm text-blue-100 mb-1">
                Attributes
              </label>
              <input
                id="venue-attributes"
                type="text"
                value={form.attributes}
                onChange={(e) => setForm({ ...form, attributes: e.target.value })}
                placeholder="comma-separated, e.g. projector, whiteboard"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <div>
              <label htmlFor="venue-chain" className="block text-sm text-blue-100 mb-1">
                Approval Chain <span className="text-red-400">*</span>
              </label>
              <select
                id="venue-chain"
                value={form.approvalChainId}
                onChange={(e) => setForm({ ...form, approvalChainId: e.target.value })}
                required
                className="w-full px-3 py-2 bg-slate-800 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="" disabled>
                  Select a chain…
                </option>
                {chains.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.venueType} (v{c.version}
                    {c.steps?.length ? `, ${c.steps.length} tier${c.steps.length === 1 ? "" : "s"}` : ", auto-approve"}
                    )
                  </option>
                ))}
              </select>
              {chains.length === 0 && (
                <p className="text-xs text-amber-300/80 mt-1">
                  No approval chains found — one must exist before a venue can be created.
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={closeModal} className="flex-1" type="button">
                Cancel
              </Button>
              <Button type="submit" loading={submitting} className="flex-1">
                {editing === "new" ? "Create Venue" : "Save Changes"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Approval Chains */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h2 className="text-lg font-bold text-white">Approval Chains</h2>
            <p className="text-blue-200/60 text-sm mt-1">
              Configure the ordered approver tiers venues route through (max {MAX_APPROVAL_TIERS} tiers,
              or 0 for no approval required).
            </p>
          </div>
          <Button onClick={openCreateChain}>+ Add Chain</Button>
        </div>

        {!loading && (
          <Card hover={false} className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left p-4 text-blue-200/60 font-medium">Venue Type</th>
                  <th className="text-left p-4 text-blue-200/60 font-medium">Version</th>
                  <th className="text-left p-4 text-blue-200/60 font-medium">Tiers</th>
                  <th className="text-right p-4 text-blue-200/60 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {chains.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-blue-200/50 text-sm italic">
                      No approval chains configured yet.
                    </td>
                  </tr>
                ) : (
                  chains.map((c) => (
                    <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition">
                      <td className="p-4 text-white font-medium">{c.venueType}</td>
                      <td className="p-4 text-blue-200/60 font-mono">v{c.version}</td>
                      <td className="p-4 text-blue-200/60">
                        {(c.steps || []).length === 0 ? (
                          <span className="text-emerald-300/80 italic">No approval required (auto-approve)</span>
                        ) : (
                          c.steps
                            .slice()
                            .sort((a, b) => a.tier - b.tier)
                            .map((s) => {
                              const assigned = s.assignedApproverId
                                ? approvers.find((a) => a.id === s.assignedApproverId)
                                : null;
                              const who = s.assignedApproverId
                                ? assigned?.name || "unknown user"
                                : "any";
                              return `T${s.tier} (${s.escalationWindowHours}h, ${who})`;
                            })
                            .join(", ")
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="outline" size="sm" onClick={() => openEditChain(c)}>
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        )}

        <Modal
          isOpen={!!chainEditing}
          onClose={closeChainModal}
          title={chainEditing === "new" ? "Add Approval Chain" : `Edit Chain: ${chainEditing?.venueType}`}
        >
          <form onSubmit={handleChainSubmit} className="space-y-4">
            {chainFormError && (
              <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-200 text-sm">
                {chainFormError}
              </div>
            )}

            <div>
              <label htmlFor="chain-venue-type" className="block text-sm text-blue-100 mb-1">
                Venue Type <span className="text-red-400">*</span>
              </label>
              <input
                id="chain-venue-type"
                type="text"
                value={chainForm.venueType}
                onChange={(e) => setChainForm({ ...chainForm, venueType: e.target.value })}
                placeholder="e.g. auditorium"
                required
                disabled={chainEditing !== "new"}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
              />
              {chainEditing !== "new" && (
                <p className="text-xs text-blue-300/50 mt-1">Venue type can&apos;t be changed after creation.</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm text-blue-100">
                  Approval Tiers ({chainForm.steps.length}/{MAX_APPROVAL_TIERS}){" "}
                  <span className="text-red-400">*</span>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTier}
                  disabled={chainForm.steps.length >= MAX_APPROVAL_TIERS}
                >
                  + Add Tier
                </Button>
              </div>

              <div className="space-y-2">
                {chainForm.steps.length === 0 ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-200 text-sm">
                    No approval tiers — bookings for this venue type will be{" "}
                    <strong>auto-approved instantly</strong>, no sign-off required.
                  </div>
                ) : (
                  chainForm.steps.map((step, i) => {
                    const tierApprovers = approvers.filter((a) => a.approverTier === step.tier);
                    return (
                      <div
                        key={i}
                        className="flex flex-col gap-2 bg-white/5 border border-white/10 rounded-lg p-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-blue-300/70 w-16 shrink-0">Tier {step.tier}</span>
                          <span className="text-xs text-blue-200/60 shrink-0">Approver ·</span>
                          <input
                            type="number"
                            min="1"
                            value={step.escalationWindowHours}
                            onChange={(e) => updateTierHours(i, e.target.value)}
                            placeholder="Escalation window (hrs)"
                            required
                            className="flex-1 px-2 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          />
                          <span className="text-xs text-blue-200/40 shrink-0">hrs</span>
                          <button
                            type="button"
                            onClick={() => removeTier(i)}
                            className="text-red-300/70 hover:text-red-300 px-1"
                            aria-label={`Remove tier ${step.tier}`}
                          >
                            ✕
                          </button>
                        </div>
                        <div className="flex items-center gap-2 pl-[4.5rem]">
                          <select
                            value={step.assignedApproverId}
                            onChange={(e) => updateTierApprover(i, e.target.value)}
                            className="flex-1 px-2 py-1.5 bg-slate-800 border border-white/20 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          >
                            <option value="">Any approver at Tier {step.tier}</option>
                            {tierApprovers.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name} ({a.email})
                              </option>
                            ))}
                          </select>
                        </div>
                        {tierApprovers.length === 0 && (
                          <p className="text-[11px] text-amber-300/70 pl-[4.5rem]">
                            No users are set as Tier {step.tier} approvers yet — assign one from User
                            Management first, or leave this on &ldquo;Any approver&rdquo;.
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              <p className="text-xs text-blue-300/50 mt-1">
                Every tier is an APPROVER step; set how many hours before it escalates. Optionally pin a
                tier to one specific approver so only they see it — otherwise any approver at that tier
                can act on it. Remove every tier to make this venue type require no approval at all.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={closeChainModal} className="flex-1" type="button">
                Cancel
              </Button>
              <Button type="submit" loading={chainSubmitting} className="flex-1">
                {chainEditing === "new" ? "Create Chain" : "Save Changes"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
}