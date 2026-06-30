import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Edit, CheckCircle, AlertCircle, Clock, FileText, QrCode } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import api from "../utils/api";
import { formatNPR, getAgingStyle, getStatusStyle, getDocStyle, getJobStyle, EXPENSE_CATEGORIES, SOURCES, CONDITIONS, FUEL_TYPES, BRANDS } from "../utils/helpers";
import { formatBSDate } from "../utils/nepali-date";

const DocCard = ({ label, status }) => {
  const s = getDocStyle(status);
  const icons = { ok: CheckCircle, pending: Clock, missing: AlertCircle };
  const Icon = icons[status] || Clock;
  return (
    <div className={`flex items-center gap-2.5 p-3 rounded-lg border ${s.bg} ${s.text}`}>
      <Icon size={16} />
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide">{label}</div>
        <div className="text-xs capitalize">{s.label}</div>
      </div>
    </div>
  );
};

export default function VehicleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [expForm, setExpForm] = useState({ category: "servicing", amount: "", description: "", date: "" });
  const [jobForm, setJobForm] = useState({ work_description: "", mechanic_name: "", estimated_cost: "", notes: "" });
  const [editForm, setEditForm] = useState({});
  const [mechanics, setMechanics] = useState([]);
  const [saving, setSaving] = useState(false);

  const fetchVehicle = useCallback(async () => {
    try {
      const r = await api.get(`/vehicles/${id}`);
      setVehicle(r.data);
      setEditForm(r.data);
    } catch { toast.error("Vehicle not found"); navigate("/inventory"); }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => {
    fetchVehicle();
    api.get("/team").then(r => setMechanics(r.data.filter(m => m.role === "mechanic"))).catch(() => {});
  }, [fetchVehicle]);

  const addExpense = async (e) => {
    e.preventDefault();
    if (!expForm.category || !expForm.amount) { toast.error("Fill required fields"); return; }
    setSaving(true);
    try {
      await api.post("/expenses", { vehicle_id: id, ...expForm, amount: Number(expForm.amount) });
      toast.success("Expense added"); setShowExpenseModal(false);
      setExpForm({ category: "servicing", amount: "", description: "", date: "" });
      fetchVehicle();
    } catch { toast.error("Failed to add expense"); } finally { setSaving(false); }
  };

  const deleteExpense = async (eid) => {
    if (!window.confirm("Delete this expense?")) return;
    try { await api.delete(`/expenses/${eid}`); toast.success("Deleted"); fetchVehicle(); } catch { toast.error("Failed"); }
  };

  const createJob = async (e) => {
    e.preventDefault();
    if (!jobForm.work_description || !jobForm.mechanic_name || !jobForm.estimated_cost) { toast.error("Fill required fields"); return; }
    setSaving(true);
    try {
      await api.post("/jobs", { vehicle_id: id, ...jobForm, estimated_cost: Number(jobForm.estimated_cost) });
      toast.success("Job card created"); setShowJobModal(false);
      setJobForm({ work_description: "", mechanic_name: "", estimated_cost: "", notes: "" });
      fetchVehicle();
    } catch { toast.error("Failed"); } finally { setSaving(false); }
  };

  const updateStatus = async (status) => {
    try {
      const upd = { status };
      if (status === "sold") upd.sold_date = new Date().toISOString().slice(0, 10);
      await api.put(`/vehicles/${id}`, upd);
      toast.success(`Status updated to ${status}`);
      fetchVehicle();
    } catch { toast.error("Failed"); }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/vehicles/${id}`, { ...editForm, purchase_price: Number(editForm.purchase_price), selling_price: editForm.selling_price ? Number(editForm.selling_price) : null, year: Number(editForm.year), engine_cc: Number(editForm.engine_cc), ownership_number: Number(editForm.ownership_number) });
      toast.success("Vehicle updated"); setShowEditModal(false); fetchVehicle();
    } catch { toast.error("Failed to update"); } finally { setSaving(false); }
  };

  const [showQR, setShowQR] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [legalDocs, setLegalDocs] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const loadPhotos = useCallback(async () => {
    try { const r = await api.get(`/vehicles/${id}/photos`); setPhotos(r.data); } catch (e) { /* silent */ }
  }, [id]);

  const loadDocs = useCallback(async () => {
    try { const r = await api.get(`/vehicles/${id}/legal-documents`); setLegalDocs(r.data); } catch (e) { /* silent */ }
  }, [id]);

  const uploadPhoto = async (file) => {
    const fd = new FormData(); fd.append("file", file);
    setUploadingPhoto(true);
    try {
      await api.post(`/vehicles/${id}/photos`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Photo uploaded!"); loadPhotos();
    } catch (e) { toast.error(e.response?.data?.detail || "Upload failed"); }
    finally { setUploadingPhoto(false); }
  };

  const deletePhoto = async (photoId) => {
    if (!window.confirm("Delete this photo?")) return;
    try { await api.delete(`/vehicles/${id}/photos/${photoId}`); loadPhotos(); toast.success("Photo deleted"); }
    catch { toast.error("Failed to delete"); }
  };

  const uploadDoc = async (file, docType) => {
    const fd = new FormData(); fd.append("file", file); fd.append("doc_type", docType);
    setUploadingDoc(true);
    try {
      await api.post(`/vehicles/${id}/legal-documents`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Document uploaded!"); loadDocs(); fetchVehicle();
    } catch (e) { toast.error(e.response?.data?.detail || "Upload failed"); }
    finally { setUploadingDoc(false); }
  };

  const deleteDoc = async (docId) => {
    if (!window.confirm("Delete this document?")) return;
    try { await api.delete(`/vehicles/${id}/legal-documents/${docId}`); loadDocs(); fetchVehicle(); toast.success("Document deleted"); }
    catch { toast.error("Failed to delete"); }
  };

  useEffect(() => { if (id) { loadPhotos(); loadDocs(); } }, [id, loadPhotos, loadDocs]);

  const loadQR = async () => {
    try {
      const r = await api.get(`/vehicles/${id}/qr-data`);
      setQrData(r.data);
      setShowQR(true);
    } catch { toast.error("Failed to load QR"); }
  };

  const inp = "w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";
  const sel = "w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;
  if (!vehicle) return null;

  const ag = getAgingStyle(vehicle.aging?.category);
  const st = getStatusStyle(vehicle.status);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/inventory")} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"><ArrowLeft size={18} /></button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{vehicle.brand} {vehicle.model}</h1>
            <p className="text-sm text-slate-500">{vehicle.year} · {vehicle.engine_cc}cc · {vehicle.fuel_type}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${ag.bg} ${ag.text}`}>{vehicle.aging?.days}d · {ag.label}</span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${st.bg} ${st.text}`}>{st.label}</span>
          <button onClick={() => setShowEditModal(true)} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors" data-testid="edit-vehicle-btn"><Edit size={14} /> Edit</button>
          <button onClick={loadQR} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors" data-testid="qr-btn"><QrCode size={14} /> QR Label</button>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Purchase Price", value: formatNPR(vehicle.purchase_price) },
          { label: "Total Expenses", value: formatNPR(vehicle.total_expenses) },
          { label: "Total Investment", value: formatNPR(vehicle.total_investment), bold: true },
          { label: vehicle.status === "sold" ? "Realized Profit" : "Expected Profit", value: vehicle.expected_profit !== null ? formatNPR(vehicle.expected_profit) : "N/A", highlight: vehicle.profit_margin !== null },
        ].map(({ label, value, bold, highlight }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="text-xs text-slate-500 mb-1">{label}</div>
            <div className={`text-lg font-bold ${bold ? "text-slate-900" : highlight && vehicle.low_margin ? "text-red-600" : highlight ? "text-green-600" : "text-slate-900"}`} style={{ fontFamily: "Manrope" }}>{value}</div>
            {label.includes("Profit") && vehicle.profit_margin !== null && (
              <div className={`text-xs mt-0.5 ${vehicle.low_margin ? "text-red-500" : "text-green-600"}`}>
                {vehicle.profit_margin}% margin {vehicle.low_margin ? "⚠ Low!" : ""}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Vehicle Photos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5" data-testid="photos-section">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-900" style={{ fontFamily: "Manrope" }}>Vehicle Photos</h2>
          <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${uploadingPhoto ? "bg-slate-200 text-slate-500" : "bg-blue-600 hover:bg-blue-700 text-white"}`} data-testid="upload-photo-btn">
            {uploadingPhoto ? "Uploading..." : "+ Add Photo"}
            <input type="file" accept="image/*" className="hidden" disabled={uploadingPhoto} onChange={e => { if (e.target.files[0]) uploadPhoto(e.target.files[0]); e.target.value = ""; }} />
          </label>
        </div>
        {photos.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-xl h-32 flex flex-col items-center justify-center text-slate-400">
            <p className="text-sm font-medium">No photos yet</p>
            <p className="text-xs mt-0.5">Click &quot;+ Add Photo&quot; to upload</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {photos.map(photo => (
              <div key={photo.id} className="relative group rounded-xl overflow-hidden aspect-square bg-slate-100" data-testid="vehicle-photo">
                <img src={`${process.env.REACT_APP_BACKEND_URL}${photo.url}`} alt="Vehicle" className="w-full h-full object-cover" />
                <button onClick={() => deletePhoto(photo.id)} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold" data-testid="delete-photo-btn">
                  Delete
                </button>
              </div>
            ))}
            <label className="border-2 border-dashed border-slate-200 rounded-xl aspect-square flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-blue-400 hover:text-blue-500 transition-colors">
              <Plus size={20} />
              <span className="text-xs mt-1">Add</span>
              <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files[0]) uploadPhoto(e.target.files[0]); e.target.value = ""; }} />
            </label>
          </div>
        )}
      </div>

      {/* Document Status + Upload */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-sm font-bold text-slate-900 mb-3" style={{ fontFamily: "Manrope" }}>Legal Documents</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[["bluebook", "Bluebook"], ["insurance", "Insurance"], ["tax_clearance", "Tax Clearance"], ["transfer", "Transfer"]].map(([key, label]) => {
            const status = vehicle[`${key}_status`];
            const docs = legalDocs.filter(d => d.doc_type === key);
            return (
              <div key={key} className="border border-slate-100 rounded-xl p-3">
                <DocCard label={label} status={status} />
                <label className={`mt-2 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors w-full ${uploadingDoc ? "bg-slate-100 text-slate-400" : "bg-blue-50 hover:bg-blue-100 text-blue-700"}`} data-testid={`upload-doc-${key}-btn`}>
                  + Upload
                  <input type="file" accept="image/*,.pdf" className="hidden" disabled={uploadingDoc} onChange={e => { if (e.target.files[0]) uploadDoc(e.target.files[0], key); e.target.value = ""; }} />
                </label>
                {docs.map(doc => (
                  <div key={doc.id} className="mt-1.5 flex items-center justify-between bg-slate-50 rounded-lg px-2 py-1" data-testid="uploaded-doc">
                    <a href={`${process.env.REACT_APP_BACKEND_URL}${doc.url}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline truncate max-w-[80px]">{doc.original_name}</a>
                    <button onClick={() => deleteDoc(doc.id)} className="text-red-400 hover:text-red-600 ml-1 flex-shrink-0" title="Delete"><Trash2 size={11} /></button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        {/* Other documents */}
        {legalDocs.filter(d => d.doc_type === "other").length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Other Documents</p>
            <div className="space-y-1">
              {legalDocs.filter(d => d.doc_type === "other").map(doc => (
                <div key={doc.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2" data-testid="uploaded-doc-other">
                  <a href={`${process.env.REACT_APP_BACKEND_URL}${doc.url}`} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline truncate">{doc.original_name}</a>
                  <button onClick={() => deleteDoc(doc.id)} className="text-red-400 hover:text-red-600 ml-2 flex-shrink-0"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Status Update */}
      {vehicle.status === "available" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-slate-700">Update Status:</span>
          <button onClick={() => updateStatus("reserved")} className="px-3 py-1.5 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-lg hover:bg-yellow-200 transition-colors">Mark Reserved</button>
          <button onClick={() => updateStatus("sold")} className="px-3 py-1.5 bg-green-100 text-green-800 text-xs font-semibold rounded-lg hover:bg-green-200 transition-colors" data-testid="mark-sold-btn">Mark Sold</button>
        </div>
      )}
      {vehicle.status === "reserved" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-slate-700">Update Status:</span>
          <button onClick={() => updateStatus("available")} className="px-3 py-1.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded-lg hover:bg-blue-200 transition-colors">Mark Available</button>
          <button onClick={() => updateStatus("sold")} className="px-3 py-1.5 bg-green-100 text-green-800 text-xs font-semibold rounded-lg hover:bg-green-200 transition-colors">Mark Sold</button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100">
          {["overview", "expenses", "jobcards"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} data-testid={`tab-${tab}`}
              className={`px-5 py-3.5 text-sm font-medium capitalize transition-colors ${activeTab === tab ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>
              {tab === "jobcards" ? "Job Cards" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === "expenses" && vehicle.expenses?.length > 0 && <span className="ml-1.5 bg-slate-100 text-slate-600 text-xs px-1.5 py-0.5 rounded-full">{vehicle.expenses.length}</span>}
              {tab === "jobcards" && vehicle.job_cards?.length > 0 && <span className="ml-1.5 bg-slate-100 text-slate-600 text-xs px-1.5 py-0.5 rounded-full">{vehicle.job_cards.length}</span>}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {[
                ["Registration", vehicle.registration_number || "Not entered"],
                ["Color", vehicle.color || "Not specified"],
                ["Condition", vehicle.condition],
                ["Purchase Source", vehicle.purchase_source],
                ["Purchased From", vehicle.purchase_from || "—"],
                ["Ownership", `${vehicle.ownership_number}${["st","nd","rd"][vehicle.ownership_number-1]||"th"} Owner`],
                ["Purchase Date", formatBSDate(vehicle.purchase_date)],
                ["Sold Date", vehicle.sold_date ? formatBSDate(vehicle.sold_date) : "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-slate-50">
                  <span className="text-sm text-slate-500">{k}</span>
                  <span className="text-sm font-medium text-slate-900 text-right">{v}</span>
                </div>
              ))}
              {vehicle.notes && (
                <div className="col-span-2 mt-2">
                  <div className="text-xs text-slate-500 mb-1">Notes</div>
                  <div className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{vehicle.notes}</div>
                </div>
              )}
            </div>
          )}

          {/* Expenses Tab */}
          {activeTab === "expenses" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Total: <strong className="text-slate-900">{formatNPR(vehicle.total_expenses)}</strong></span>
                <button onClick={() => setShowExpenseModal(true)} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all active:scale-95" data-testid="add-expense-btn">
                  <Plus size={14} /> Add Expense
                </button>
              </div>
              {vehicle.expenses?.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">No expenses recorded yet</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {vehicle.expenses?.map(exp => {
                    const catLabel = EXPENSE_CATEGORIES.find(c => c.value === exp.category)?.label || exp.category;
                    return (
                      <div key={exp.id} data-testid="expense-row" className="flex items-center justify-between py-3">
                        <div>
                          <div className="text-sm font-medium text-slate-900">{catLabel}</div>
                          <div className="text-xs text-slate-500">{exp.description || "—"} · {exp.date?.slice(0,10)}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-slate-900">{formatNPR(exp.amount)}</span>
                          <button onClick={() => deleteExpense(exp.id)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Job Cards Tab */}
          {activeTab === "jobcards" && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button onClick={() => setShowJobModal(true)} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all active:scale-95" data-testid="create-job-btn">
                  <Plus size={14} /> Create Job Card
                </button>
              </div>
              {vehicle.job_cards?.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">No job cards yet</div>
              ) : (
                <div className="space-y-3">
                  {vehicle.job_cards?.map(job => {
                    const js = getJobStyle(job.status);
                    return (
                      <div key={job.id} data-testid="job-card-row" className="border border-slate-100 rounded-xl p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="text-xs font-mono text-slate-500">{job.job_number}</div>
                            <div className="font-semibold text-slate-900 text-sm mt-0.5">{job.work_description}</div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${js.bg} ${js.text}`}>{js.label}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-xs text-slate-500">
                          <span>Mechanic: <strong className="text-slate-700">{job.mechanic_name}</strong></span>
                          <span>Est: <strong className="text-slate-700">{formatNPR(job.estimated_cost)}</strong></span>
                          <span>Actual: <strong className="text-slate-700">{job.actual_cost ? formatNPR(job.actual_cost) : "—"}</strong></span>
                        </div>
                        {job.actual_cost > job.estimated_cost && (
                          <div className="mt-2 text-xs text-red-600 font-medium flex items-center gap-1"><AlertCircle size={12} /> Budget exceeded by {formatNPR(job.actual_cost - job.estimated_cost)}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Add Expense</h2>
              <button onClick={() => setShowExpenseModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">✕</button>
            </div>
            <form onSubmit={addExpense} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Category <span className="text-red-500">*</span></label>
                <select value={expForm.category} onChange={e => setExpForm({...expForm, category: e.target.value})} className={sel}>{EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Amount (NPR) <span className="text-red-500">*</span></label>
                <input type="number" value={expForm.amount} onChange={e => setExpForm({...expForm, amount: e.target.value})} placeholder="e.g. 5000" className={inp} data-testid="expense-amount-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <input value={expForm.description} onChange={e => setExpForm({...expForm, description: e.target.value})} placeholder="Details..." className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
                <input type="date" value={expForm.date} onChange={e => setExpForm({...expForm, date: e.target.value})} className={inp} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowExpenseModal(false)} className="flex-1 h-10 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60" data-testid="save-expense-btn">
                  {saving ? "Saving..." : "Add Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Job Modal */}
      {showJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Create Job Card</h2>
              <button onClick={() => setShowJobModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">✕</button>
            </div>
            <form onSubmit={createJob} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Work Description <span className="text-red-500">*</span></label>
                <textarea value={jobForm.work_description} onChange={e => setJobForm({...jobForm, work_description: e.target.value})} placeholder="Describe the work to be done..." rows={3} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" data-testid="job-description-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Mechanic Name <span className="text-red-500">*</span></label>
                {mechanics.length > 0 ? (
                  <select value={jobForm.mechanic_name} onChange={e => setJobForm({...jobForm, mechanic_name: e.target.value})} className={sel}>
                    <option value="">Select Mechanic</option>
                    {mechanics.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                    <option value="other">Other</option>
                  </select>
                ) : (
                  <input value={jobForm.mechanic_name} onChange={e => setJobForm({...jobForm, mechanic_name: e.target.value})} placeholder="Mechanic name" className={inp} />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Estimated Cost (NPR) <span className="text-red-500">*</span></label>
                <input type="number" value={jobForm.estimated_cost} onChange={e => setJobForm({...jobForm, estimated_cost: e.target.value})} placeholder="e.g. 3000" className={inp} data-testid="job-cost-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <input value={jobForm.notes} onChange={e => setJobForm({...jobForm, notes: e.target.value})} placeholder="Additional notes..." className={inp} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowJobModal(false)} className="flex-1 h-10 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60" data-testid="save-job-btn">
                  {saving ? "Saving..." : "Create Job Card"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal (simplified) */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Edit Vehicle</h2>
              <button onClick={() => setShowEditModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">✕</button>
            </div>
            <form onSubmit={saveEdit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[["Brand","brand","text"],["Model","model","text"],["Year","year","number"],["Engine CC","engine_cc","number"],["Purchase Price","purchase_price","number"],["Selling Price","selling_price","number"]].map(([label, key, type]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                    <input type={type} value={editForm[key] || ""} onChange={e => setEditForm({...editForm, [key]: e.target.value})} className={inp} />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                  <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className={sel}>
                    <option value="available">Available</option>
                    <option value="reserved">Reserved</option>
                    <option value="sold">Sold</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Condition</label>
                  <select value={editForm.condition} onChange={e => setEditForm({...editForm, condition: e.target.value})} className={sel}>{CONDITIONS.map(c => <option key={c}>{c}</option>)}</select>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Documents</p>
                <div className="grid grid-cols-2 gap-3">
                  {[["bluebook_status","Bluebook"],["insurance_status","Insurance"],["tax_clearance_status","Tax Clearance"],["transfer_status","Transfer"]].map(([key, label]) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                      <select value={editForm[key] || "pending"} onChange={e => setEditForm({...editForm, [key]: e.target.value})} className={sel}>
                        <option value="pending">Pending</option><option value="ok">OK</option><option value="missing">Missing</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 h-10 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQR && qrData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Vehicle QR Label</h2>
              <button onClick={() => setShowQR(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">✕</button>
            </div>
            <div className="p-6 flex flex-col items-center gap-4" id="qr-label-content">
              <div className="text-center">
                <div className="font-bold text-xl text-slate-900">{qrData.brand} {qrData.model}</div>
                <div className="text-sm text-slate-500">{qrData.year} · {qrData.engine_cc}cc · {qrData.fuel_type}</div>
              </div>
              <div className="p-3 bg-white border-2 border-slate-900 rounded-xl">
                <QRCodeSVG
                  data-testid="vehicle-qr-code"
                  value={JSON.stringify({ id: qrData.id, brand: qrData.brand, model: qrData.model, year: qrData.year, reg: qrData.registration_number, price: qrData.selling_price, contact: qrData.contact })}
                  size={180}
                  level="M"
                />
              </div>
              <div className="text-center space-y-1">
                {qrData.registration_number && <div className="text-sm font-mono font-bold text-slate-800">Reg: {qrData.registration_number}</div>}
                {qrData.selling_price && <div className="text-sm font-bold text-green-700">Price: {formatNPR(qrData.selling_price)}</div>}
                <div className="text-xs text-slate-400">Hamro G&G Auto Enterprises · Kathmandu</div>
              </div>
              <button
                onClick={() => window.print()}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
                data-testid="print-qr-btn"
              >
                Print Label
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
