import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Wrench, X, Package, Pencil } from "lucide-react";
import { toast } from "sonner";
import api from "../utils/api";
import { formatNPR, getJobStyle } from "../utils/helpers";
import { formatBSDate } from "../utils/nepali-date";
import VehicleComboBox from "../components/VehicleComboBox";
import BSDatePicker from "../components/BSDatePicker";
import { useAuth } from "../context/AuthContext";
import { canEditJobs, canDeleteJobs } from "../utils/permissions";

const STATUSES = ["all", "pending", "in_progress", "completed"];
const EMPTY_FORM = { vehicle_id: "", work_description: "", mechanic_id: "", mechanic_name: "", estimated_cost: "", notes: "", coupon_no: "", job_date: "" };

function getErrMsg(err) {
  if (!err.response) return "Network error - could not reach the server";
  const detail = err.response.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => d.msg || JSON.stringify(d)).join(", ");
  return `Server error (${err.response.status})`;
}

export default function JobCards() {
  const { user } = useAuth();
  const canEdit = canEditJobs(user?.role);
  const canDelete = canDeleteJobs(user?.role);
  const [jobs, setJobs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [vehicles, setVehicles] = useState([]);
  const [spareParts, setSpareParts] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(null);

  // Parts linked to the new job
  const [jobParts, setJobParts] = useState([]);
  const [partSearch, setPartSearch] = useState("");

  const fetchJobs = useCallback(async () => {
    try {
      const r = await api.get("/jobs");
      setJobs(r.data);
    } catch { toast.error("Failed to load jobs"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchJobs();
    api.get("/vehicles?status=in_repair").then(r => setVehicles(r.data)).catch(() => {});
    api.get("/spare-parts").then(r => setSpareParts(r.data)).catch(() => {});
    api.get("/team").then(r => setMechanics(r.data.filter(m => m.role === "mechanic"))).catch(() => {});
  }, [fetchJobs]);

  useEffect(() => {
    let result = [...jobs];
    if (statusFilter !== "all") result = result.filter(j => j.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(j =>
        j.mechanic_name?.toLowerCase().includes(q) ||
        j.job_number?.toLowerCase().includes(q) ||
        j.work_description?.toLowerCase().includes(q) ||
        j.vehicle_brand?.toLowerCase().includes(q) ||
        j.vehicle_model?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [jobs, statusFilter, search]);

  const partsTotalCost = jobParts.reduce((s, p) => s + p.quantity * p.unit_cost, 0);

  const filteredSpareParts = spareParts.filter(p =>
    partSearch.length > 0 &&
    p.name.toLowerCase().includes(partSearch.toLowerCase()) &&
    !jobParts.find(jp => jp.part_id === p.id)
  );

  const addPartToJob = (part) => {
    if (part.quantity <= 0) { toast.error(`${part.name} is out of stock`); return; }
    setJobParts(prev => [...prev, { part_id: part.id, part_name: part.name, quantity: 1, unit_cost: part.unit_cost || 0, available_qty: part.quantity, original_qty: 0 }]);
    setPartSearch("");
  };

  const updatePartQty = (part_id, val) => {
    const num = parseInt(val) || 1;
    const part = jobParts.find(p => p.part_id === part_id);
    if (num > part.available_qty) { toast.error(`Only ${part.available_qty} in stock`); return; }
    setJobParts(prev => prev.map(p => p.part_id === part_id ? { ...p, quantity: Math.max(1, num) } : p));
  };

  const removePartFromJob = (part_id) => setJobParts(prev => prev.filter(p => p.part_id !== part_id));

  const nextCouponNo = () => Math.max(0, ...jobs.map(j => Number(j.coupon_no) || 0)) + 1;

  const openModal = () => { setEditingJob(null); setForm({ ...EMPTY_FORM, coupon_no: String(nextCouponNo()) }); setJobParts([]); setPartSearch(""); setShowModal(true); };

  const openEditModal = (job) => {
    setEditingJob(job);
    setForm({
      vehicle_id: job.vehicle_id || "",
      work_description: job.work_description || "",
      mechanic_id: job.mechanic_id || "",
      mechanic_name: job.mechanic_name || "",
      estimated_cost: job.estimated_cost != null ? String(job.estimated_cost) : "",
      notes: job.notes || "",
      coupon_no: job.coupon_no != null ? String(job.coupon_no) : "",
      job_date: job.job_date || "",
    });
    setJobParts((job.parts || []).map(p => {
      const stock = spareParts.find(sp => sp.id === p.part_id);
      return {
        part_id: p.part_id,
        part_name: p.part_name,
        quantity: p.quantity,
        unit_cost: p.unit_cost,
        original_qty: p.quantity,
        available_qty: (stock?.quantity || 0) + p.quantity,
      };
    }));
    setPartSearch("");
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingJob(null); };

  const submitJob = async (e) => {
    e.preventDefault();
    if (editingJob) {
      if (!form.work_description || !form.mechanic_name || !form.estimated_cost) { toast.error("Fill all required fields"); return; }
      setSaving(true);
      try {
        await api.put(`/jobs/${editingJob.id}`, {
          work_description: form.work_description,
          mechanic_name: form.mechanic_name,
          estimated_cost: Number(form.estimated_cost),
          notes: form.notes,
          parts: jobParts.map(p => ({ part_id: p.part_id, part_name: p.part_name, quantity: p.quantity, unit_cost: p.unit_cost })),
        });
        toast.success("Job card updated!");
        closeModal();
        fetchJobs();
        api.get("/spare-parts").then(r => setSpareParts(r.data)).catch(() => {});
      } catch (err) { toast.error(getErrMsg(err)); }
      finally { setSaving(false); }
      return;
    }
    if (!form.vehicle_id || !form.work_description || !form.mechanic_name || !form.estimated_cost || !form.coupon_no || !form.job_date) { toast.error("Fill all required fields"); return; }
    setSaving(true);
    try {
      await api.post("/jobs", {
        ...form,
        estimated_cost: Number(form.estimated_cost),
        coupon_no: Number(form.coupon_no),
        parts: jobParts.map(p => ({ part_id: p.part_id, part_name: p.part_name, quantity: p.quantity, unit_cost: p.unit_cost })),
      });
      toast.success("Job card created!");
      closeModal();
      fetchJobs();
      // Refresh spare parts quantities after deduction
      api.get("/spare-parts").then(r => setSpareParts(r.data)).catch(() => {});
    } catch (err) { toast.error(getErrMsg(err)); }
    finally { setSaving(false); }
  };

  const updateStatus = async (jobId, newStatus, actualCost = null) => {
    setUpdating(jobId);
    try {
      const upd = { status: newStatus };
      if (actualCost !== null) upd.actual_cost = Number(actualCost);
      await api.put(`/jobs/${jobId}`, upd);
      toast.success("Status updated");
      fetchJobs();
    } catch (err) { toast.error(getErrMsg(err)); } finally { setUpdating(null); }
  };

  const deleteJob = async (jobId) => {
    if (!window.confirm("Delete this job card?")) return;
    try { await api.delete(`/jobs/${jobId}`); toast.success("Deleted"); fetchJobs(); } catch (err) { toast.error(getErrMsg(err)); }
  };

  const inp = "w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";
  const sel = "w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  const stats = {
    pending: jobs.filter(j => j.status === "pending").length,
    in_progress: jobs.filter(j => j.status === "in_progress").length,
    completed: jobs.filter(j => j.status === "completed").length,
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Job Cards</h1>
          <p className="text-sm text-slate-500">{filtered.length} records</p>
        </div>
        {canEdit && (
          <button onClick={openModal} data-testid="create-job-button" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-all active:scale-95 shadow-sm">
            <Plus size={16} /> New Job Card
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending", count: stats.pending, bg: "bg-yellow-50 border-yellow-100", text: "text-yellow-800" },
          { label: "In Progress", count: stats.in_progress, bg: "bg-blue-50 border-blue-100", text: "text-blue-800" },
          { label: "Completed", count: stats.completed, bg: "bg-green-50 border-green-100", text: "text-green-800" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border rounded-xl p-4 text-center`} data-testid={`job-stat-${s.label.toLowerCase().replace(" ", "-")}`}>
            <div className={`text-2xl font-bold ${s.text}`} style={{ fontFamily: "Manrope" }}>{s.count}</div>
            <div className={`text-xs font-medium ${s.text} mt-0.5`}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search job#, mechanic, vehicle..." className="w-full h-9 pl-9 pr-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex items-center gap-2">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} data-testid={`job-filter-${s}`} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${statusFilter === s ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {s === "all" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Job Cards */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="animate-spin w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">No job cards found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(job => {
            const js = getJobStyle(job.status);
            const overBudget = job.actual_cost && job.actual_cost > job.estimated_cost;
            const partsTotal = job.parts?.reduce((s, p) => s + p.quantity * p.unit_cost, 0) || 0;
            return (
              <div key={job.id} data-testid="job-card" className={`bg-white rounded-xl border ${overBudget ? "border-red-200" : "border-slate-200"} shadow-sm p-5 hover:shadow-md transition-shadow`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-xs font-mono text-slate-400">{job.job_number}</div>
                    <div className="font-bold text-slate-900 text-sm mt-0.5" style={{ fontFamily: "Manrope" }}>
                      {job.vehicle_brand} {job.vehicle_model} {job.vehicle_year}
                    </div>
                    {job.registration_number && <div className="text-xs text-slate-500 font-mono">{job.registration_number}</div>}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${js.bg} ${js.text}`}>{js.label}</span>
                </div>

                <p className="text-sm text-slate-700 mb-3 line-clamp-2">{job.work_description}</p>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-3">
                  {job.coupon_no != null && <div>Coupon: <span className="font-medium text-slate-700">#{job.coupon_no}</span></div>}
                  {job.job_date && <div>Job Date: <span className="font-medium text-slate-700">{formatBSDate(job.job_date)} BS</span></div>}
                  <div>Mechanic: <span className="font-medium text-slate-700">{job.mechanic_name}</span></div>
                  <div>Est: <span className="font-medium text-slate-700">{formatNPR(job.estimated_cost)}</span></div>
                  {job.actual_cost != null && <div className={overBudget ? "text-red-600 font-medium" : ""}>Actual: <span className="font-medium">{formatNPR(job.actual_cost)}</span></div>}
                  <div>Created: <span className="font-medium text-slate-700">{job.created_at?.slice(0, 10)}</span></div>
                </div>

                {/* Parts used in this job */}
                {job.parts?.length > 0 && (
                  <div className="mb-3 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
                      <Package size={11} /> Parts Used
                    </div>
                    {job.parts.map((p, i) => (
                      <div key={i} className="flex justify-between text-xs text-slate-600 py-0.5">
                        <span>{p.part_name} × {p.quantity}</span>
                        <span className="font-medium">{formatNPR(p.quantity * p.unit_cost)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs font-bold text-slate-800 border-t border-slate-200 mt-1 pt-1">
                      <span>Parts Total</span>
                      <span className="text-blue-700">{formatNPR(partsTotal)}</span>
                    </div>
                  </div>
                )}

                {overBudget && <div className="text-xs text-red-600 font-medium mb-3">Over budget by {formatNPR(job.actual_cost - job.estimated_cost)}</div>}

                <div className="flex items-center gap-2 flex-wrap">
                  {canEdit && job.status === "pending" && (
                    <button onClick={() => updateStatus(job.id, "in_progress")} disabled={updating === job.id} className="px-2.5 py-1.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-60">
                      Start Work
                    </button>
                  )}
                  {canEdit && job.status === "in_progress" && (
                    <button onClick={() => { const cost = window.prompt("Enter actual cost (NPR):"); if (cost !== null) updateStatus(job.id, "completed", cost || job.estimated_cost); }} disabled={updating === job.id} className="px-2.5 py-1.5 bg-green-100 text-green-700 text-xs font-medium rounded-lg hover:bg-green-200 transition-colors disabled:opacity-60">
                      Mark Complete
                    </button>
                  )}
                  {job.status === "completed" && <span className="text-xs text-green-600 font-medium">Completed {job.completed_at?.slice(0, 10)}</span>}
                  <div className="ml-auto flex items-center gap-2">
                    {canEdit && (
                      <button onClick={() => openEditModal(job)} data-testid="edit-job-button" className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors">
                        <Pencil size={12} /> Edit
                      </button>
                    )}
                    {canDelete && <button onClick={() => deleteJob(job.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1">Delete</button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Job Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">{editingJob ? `Edit Job Card ${editingJob.job_number || ""}` : "Create Job Card"}</h2>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">✕</button>
            </div>
            <form onSubmit={submitJob} className="p-5 space-y-4">
              {editingJob ? (
                <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 grid grid-cols-2 gap-2">
                  <div>Vehicle: <span className="font-medium text-slate-700">{editingJob.vehicle_brand} {editingJob.vehicle_model}</span></div>
                  <div>Coupon: <span className="font-medium text-slate-700">#{editingJob.coupon_no}</span></div>
                  {editingJob.job_date && <div>Job Date: <span className="font-medium text-slate-700">{formatBSDate(editingJob.job_date)} BS</span></div>}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Vehicle <span className="text-red-500">*</span></label>
                      <VehicleComboBox
                        vehicles={vehicles}
                        value={form.vehicle_id}
                        onChange={id => setForm({...form, vehicle_id: id})}
                        placeholder="Search or select a vehicle..."
                        testId="job-vehicle"
                        tagStatus
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Coupon No. <span className="text-red-500">*</span></label>
                      <input type="text" inputMode="numeric" value={form.coupon_no} onChange={e => setForm({...form, coupon_no: e.target.value})} placeholder="0" className={inp} data-testid="job-coupon-no-input" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Job Date (BS) <span className="text-red-500">*</span></label>
                    <BSDatePicker value={form.job_date} onChange={val => setForm({...form, job_date: val})} required data-testid="job-date-input" />
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Work Description <span className="text-red-500">*</span></label>
                <textarea value={form.work_description} onChange={e => setForm({...form, work_description: e.target.value})} rows={3} placeholder="Describe work to be done..." className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Mechanic Name <span className="text-red-500">*</span></label>
                <select
                  value={form.mechanic_id}
                  onChange={e => {
                    const m = mechanics.find(x => x.id === e.target.value);
                    setForm({...form, mechanic_id: e.target.value, mechanic_name: m ? m.name : ""});
                  }}
                  className={sel}
                  data-testid="job-mechanic-select"
                >
                  <option value="">Select a mechanic...</option>
                  {mechanics.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Estimated Cost (NPR) <span className="text-red-500">*</span></label>
                <input type="number" value={form.estimated_cost} onChange={e => setForm({...form, estimated_cost: e.target.value})} placeholder="e.g. 3000" className={inp} />
              </div>

              {/* Spare Parts Section */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-2">
                  <Wrench size={12} /> Add Spare Parts <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <input
                    value={partSearch}
                    onChange={e => setPartSearch(e.target.value)}
                    placeholder="Search parts from inventory..."
                    className={inp}
                    data-testid="part-search-input"
                    autoComplete="off"
                  />
                  {filteredSpareParts.length > 0 && (
                    <div className="absolute left-0 right-0 top-10 z-10 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto" data-testid="parts-dropdown">
                      {filteredSpareParts.map(p => (
                        <button type="button" key={p.id} onClick={() => addPartToJob(p)} className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 flex justify-between items-center border-b border-slate-50 last:border-0">
                          <div>
                            <span className="font-medium text-slate-800">{p.name}</span>
                            {p.brand_compatibility && <span className="text-slate-400 ml-1.5">({p.brand_compatibility})</span>}
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <div className={`font-semibold ${p.quantity <= (p.min_stock_alert || 2) ? "text-red-600" : "text-green-600"}`}>{p.quantity} left</div>
                            <div className="text-slate-400">{formatNPR(p.unit_cost)}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {jobParts.length > 0 && (
                  <div className="mt-2 bg-slate-50 rounded-lg p-2 space-y-1.5" data-testid="job-parts-list">
                    {jobParts.map(p => (
                      <div key={p.part_id} className="flex items-center gap-2 bg-white rounded-lg px-2 py-1.5 border border-slate-100 text-xs">
                        <Package size={11} className="text-slate-400 shrink-0" />
                        <span className="flex-1 font-medium text-slate-700 truncate">{p.part_name}</span>
                        <span className="text-slate-400 shrink-0">Qty:</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={p.quantity}
                          onChange={e => updatePartQty(p.part_id, e.target.value)}
                          className="w-12 h-6 text-center text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <span className="text-slate-700 font-medium w-20 text-right shrink-0">{formatNPR(p.quantity * p.unit_cost)}</span>
                        <button type="button" onClick={() => removePartFromJob(p.part_id)} className="text-red-400 hover:text-red-600 shrink-0">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs font-bold text-slate-800 border-t border-slate-200 pt-1.5 px-1">
                      <span>Parts Total</span>
                      <span className="text-blue-700">{formatNPR(partsTotalCost)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Additional notes" className={inp} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={closeModal} className="flex-1 h-10 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} data-testid="create-job-submit" className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60">
                  {saving ? (editingJob ? "Saving..." : "Creating...") : (editingJob ? "Save Changes" : "Create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
