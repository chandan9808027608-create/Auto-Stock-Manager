import { useEffect, useState, useCallback } from "react";
import { Plus, Search, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import api from "../utils/api";
import { formatNPR, getJobStyle } from "../utils/helpers";

const STATUSES = ["all", "pending", "in_progress", "completed"];

export default function JobCards() {
  const [jobs, setJobs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ vehicle_id: "", work_description: "", mechanic_name: "", estimated_cost: "", notes: "" });
  const [vehicles, setVehicles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(null);

  const fetchJobs = useCallback(async () => {
    try {
      const r = await api.get("/jobs");
      setJobs(r.data);
    } catch { toast.error("Failed to load jobs"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchJobs(); api.get("/vehicles?status=available").then(r => setVehicles(r.data)).catch(() => {}); }, [fetchJobs]);

  useEffect(() => {
    let result = [...jobs];
    if (statusFilter !== "all") result = result.filter(j => j.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(j => j.mechanic_name?.toLowerCase().includes(q) || j.job_number?.toLowerCase().includes(q) || j.work_description?.toLowerCase().includes(q) || j.vehicle_brand?.toLowerCase().includes(q) || j.vehicle_model?.toLowerCase().includes(q));
    }
    setFiltered(result);
  }, [jobs, statusFilter, search]);

  const createJob = async (e) => {
    e.preventDefault();
    if (!form.vehicle_id || !form.work_description || !form.mechanic_name || !form.estimated_cost) { toast.error("Fill all required fields"); return; }
    setSaving(true);
    try {
      await api.post("/jobs", { ...form, estimated_cost: Number(form.estimated_cost) });
      toast.success("Job card created!");
      setShowModal(false);
      setForm({ vehicle_id: "", work_description: "", mechanic_name: "", estimated_cost: "", notes: "" });
      fetchJobs();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); } finally { setSaving(false); }
  };

  const updateStatus = async (jobId, newStatus, actualCost = null) => {
    setUpdating(jobId);
    try {
      const upd = { status: newStatus };
      if (actualCost !== null) upd.actual_cost = Number(actualCost);
      await api.put(`/jobs/${jobId}`, upd);
      toast.success("Status updated");
      fetchJobs();
    } catch { toast.error("Failed"); } finally { setUpdating(null); }
  };

  const deleteJob = async (jobId) => {
    if (!window.confirm("Delete this job card?")) return;
    try { await api.delete(`/jobs/${jobId}`); toast.success("Deleted"); fetchJobs(); } catch { toast.error("Failed"); }
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
        <button onClick={() => setShowModal(true)} data-testid="create-job-button" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-all active:scale-95 shadow-sm">
          <Plus size={16} /> New Job Card
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending", count: stats.pending, bg: "bg-yellow-50 border-yellow-100", text: "text-yellow-800" },
          { label: "In Progress", count: stats.in_progress, bg: "bg-blue-50 border-blue-100", text: "text-blue-800" },
          { label: "Completed", count: stats.completed, bg: "bg-green-50 border-green-100", text: "text-green-800" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border rounded-xl p-4 text-center`} data-testid={`job-stat-${s.label.toLowerCase().replace(" ","-")}`}>
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

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="animate-spin w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">No job cards found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(job => {
            const js = getJobStyle(job.status);
            const overBudget = job.actual_cost && job.actual_cost > job.estimated_cost;
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
                  <div>Mechanic: <span className="font-medium text-slate-700">{job.mechanic_name}</span></div>
                  <div>Est: <span className="font-medium text-slate-700">{formatNPR(job.estimated_cost)}</span></div>
                  {job.actual_cost && <div className={overBudget ? "text-red-600 font-medium" : ""}>Actual: <span className="font-medium">{formatNPR(job.actual_cost)}</span></div>}
                  <div>Date: <span className="font-medium text-slate-700">{job.created_at?.slice(0, 10)}</span></div>
                </div>

                {overBudget && <div className="text-xs text-red-600 font-medium mb-3">⚠ Over budget by {formatNPR(job.actual_cost - job.estimated_cost)}</div>}

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {job.status === "pending" && (
                    <button onClick={() => updateStatus(job.id, "in_progress")} disabled={updating === job.id} className="px-2.5 py-1.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-60">
                      Start Work
                    </button>
                  )}
                  {job.status === "in_progress" && (
                    <button onClick={() => { const cost = window.prompt("Enter actual cost (NPR):"); if (cost !== null) updateStatus(job.id, "completed", cost || job.estimated_cost); }} disabled={updating === job.id} className="px-2.5 py-1.5 bg-green-100 text-green-700 text-xs font-medium rounded-lg hover:bg-green-200 transition-colors disabled:opacity-60">
                      Mark Complete
                    </button>
                  )}
                  {job.status === "completed" && <span className="text-xs text-green-600 font-medium">Completed {job.completed_at?.slice(0,10)}</span>}
                  <button onClick={() => deleteJob(job.id)} className="ml-auto text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1">Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Create Job Card</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">✕</button>
            </div>
            <form onSubmit={createJob} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Vehicle <span className="text-red-500">*</span></label>
                <select value={form.vehicle_id} onChange={e => setForm({...form, vehicle_id: e.target.value})} className={sel} data-testid="job-vehicle-select">
                  <option value="">Select Vehicle</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.brand} {v.model} {v.year} {v.registration_number ? `(${v.registration_number})` : ""}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Work Description <span className="text-red-500">*</span></label>
                <textarea value={form.work_description} onChange={e => setForm({...form, work_description: e.target.value})} rows={3} placeholder="Describe work..." className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Mechanic Name <span className="text-red-500">*</span></label>
                <input value={form.mechanic_name} onChange={e => setForm({...form, mechanic_name: e.target.value})} placeholder="Mechanic name" className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Estimated Cost (NPR) <span className="text-red-500">*</span></label>
                <input type="number" value={form.estimated_cost} onChange={e => setForm({...form, estimated_cost: e.target.value})} placeholder="e.g. 3000" className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Additional notes" className={inp} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 h-10 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60">{saving ? "Creating..." : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
