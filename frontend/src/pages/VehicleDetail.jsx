import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Edit, CheckCircle, AlertCircle, Clock, QrCode } from "lucide-react";
import { toast } from "sonner";
import api from "../utils/api";
import { formatNPR, getAgingStyle, getStatusStyle, getDocStyle, getJobStyle, EXPENSE_CATEGORIES, VEHICLE_STATUS_OPTIONS, CONDITIONS, SOURCES } from "../utils/helpers";
import { ExpenseModal, JobCardModal, QRLabelModal, inp, sel } from "./VehicleModals";
import HoverADDate from "../components/HoverADDate";
import BSDatePicker from "../components/BSDatePicker";
import VendorAutocomplete from "../components/VendorAutocomplete";

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
  const [isEditing, setIsEditing] = useState(false);
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
    api.get("/team").then(r => setMechanics(r.data.filter(m => m.role === "mechanic"))).catch(err => console.error("Team load:", err));
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
    if (!editForm.registration_number) { toast.error("Registration Number is required"); return; }
    setSaving(true);
    try {
      await api.put(`/vehicles/${id}`, { ...editForm, purchase_price: Number(editForm.purchase_price), selling_price: editForm.selling_price ? Number(editForm.selling_price) : null, year: Number(editForm.year), engine_cc: Number(editForm.engine_cc), ownership_number: Number(editForm.ownership_number) });
      toast.success("Vehicle updated"); setIsEditing(false); fetchVehicle();
    } catch { toast.error("Failed to update"); } finally { setSaving(false); }
  };

  const cancelEdit = () => { setEditForm(vehicle); setIsEditing(false); };

  const [showQR, setShowQR] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [legalDocs, setLegalDocs] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const loadPhotos = useCallback(async () => {
    try { const r = await api.get(`/vehicles/${id}/photos`); setPhotos(r.data); }
    catch (err) { console.error("Failed to load photos:", err); }
  }, [id]);

  const loadDocs = useCallback(async () => {
    try { const r = await api.get(`/vehicles/${id}/legal-documents`); setLegalDocs(r.data); }
    catch (err) { console.error("Failed to load documents:", err); }
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

  const financialCards = useMemo(() => {
    if (!vehicle) return [];
    return [
      { label: "Purchase Price", value: formatNPR(vehicle.purchase_price), bold: false, highlight: false },
      { label: "Total Expenses", value: formatNPR(vehicle.total_expenses), bold: false, highlight: false },
      { label: "Total Investment", value: formatNPR(vehicle.total_investment), bold: true, highlight: false },
      {
        label: vehicle.status === "sold" ? "Realized Profit" : "Expected Profit",
        value: vehicle.expected_profit !== null ? formatNPR(vehicle.expected_profit) : "N/A",
        bold: false,
        highlight: vehicle.profit_margin !== null,
      },
    ];
  }, [vehicle]);

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
          <select
            value={vehicle.status}
            onChange={e => updateStatus(e.target.value)}
            className={`appearance-none cursor-pointer px-2.5 py-1 pr-6 rounded-full text-xs font-semibold uppercase tracking-wide border-none focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 ${st.bg} ${st.text}`}
            style={{ backgroundImage: "none" }}
            data-testid="vehicle-status-select"
            title="Change vehicle status"
          >
            {VEHICLE_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {isEditing ? (
            <>
              <button type="button" onClick={cancelEdit} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
              <button type="button" onClick={saveEdit} disabled={saving} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60 transition-colors" data-testid="save-vehicle-btn">
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          ) : (
            <button onClick={() => { setIsEditing(true); setActiveTab("overview"); }} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors" data-testid="edit-vehicle-btn"><Edit size={14} /> Edit</button>
          )}
          <button onClick={loadQR} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors" data-testid="qr-btn"><QrCode size={14} /> QR Label</button>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {financialCards.map(({ label, value, bold, highlight }) => {
          let textClass = "text-slate-900";
          if (highlight && !bold) textClass = vehicle.low_margin ? "text-red-600" : "text-green-600";
          return (
            <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="text-xs text-slate-500 mb-1">{label}</div>
              <div className={`text-lg font-bold ${bold ? "text-slate-900" : textClass}`} style={{ fontFamily: "Manrope" }}>{value}</div>
              {label.includes("Profit") && vehicle.profit_margin !== null && (
                <div className={`text-xs mt-0.5 ${vehicle.low_margin ? "text-red-500" : "text-green-600"}`}>
                  {vehicle.profit_margin}% margin {vehicle.low_margin ? "⚠ Low!" : ""}
                </div>
              )}
            </div>
          );
        })}
      </div>

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
              <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-50">
                <span className="text-sm text-slate-500 shrink-0">Registration</span>
                {isEditing ? (
                  <input
                    data-testid="edit-registration-number-input"
                    value={editForm.registration_number || ""}
                    onChange={e => setEditForm({ ...editForm, registration_number: e.target.value })}
                    placeholder="e.g. Ba 1 Pa 1234"
                    className={`${inp} h-8 text-right w-40`}
                  />
                ) : (
                  <span className="text-sm font-medium text-slate-900 text-right">{vehicle.registration_number || "Not entered"}</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-50">
                <span className="text-sm text-slate-500 shrink-0">Color</span>
                {isEditing ? (
                  <input value={editForm.color || ""} onChange={e => setEditForm({ ...editForm, color: e.target.value })} placeholder="e.g. Red, Black" className={`${inp} h-8 text-right w-40`} />
                ) : (
                  <span className="text-sm font-medium text-slate-900 text-right">{vehicle.color || "Not specified"}</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-50">
                <span className="text-sm text-slate-500 shrink-0">Condition</span>
                {isEditing ? (
                  <select value={editForm.condition || ""} onChange={e => setEditForm({ ...editForm, condition: e.target.value })} className={`${sel} h-8 w-40`}>
                    {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                  </select>
                ) : (
                  <span className="text-sm font-medium text-slate-900 text-right">{vehicle.condition}</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-50">
                <span className="text-sm text-slate-500 shrink-0">Purchase Source</span>
                {isEditing ? (
                  <select value={editForm.purchase_source || ""} onChange={e => setEditForm({ ...editForm, purchase_source: e.target.value })} className={`${sel} h-8 w-40`}>
                    <option value="">Select Source</option>
                    {SOURCES.map(s => <option key={s}>{s}</option>)}
                  </select>
                ) : (
                  <span className="text-sm font-medium text-slate-900 text-right">{vehicle.purchase_source}</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-50">
                <span className="text-sm text-slate-500 shrink-0">Purchased From</span>
                {isEditing ? (
                  <div className="w-48">
                    <VendorAutocomplete
                      value={editForm.purchase_from || ""}
                      onChange={(name, vendorId) => setEditForm({ ...editForm, purchase_from: name, vendor_id: vendorId || editForm.vendor_id })}
                      placeholder="Vendor name..."
                    />
                  </div>
                ) : (
                  <span className="text-sm font-medium text-slate-900 text-right">{vehicle.purchase_from || "—"}</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-50">
                <span className="text-sm text-slate-500 shrink-0">Ownership</span>
                {isEditing ? (
                  <select value={editForm.ownership_number || 1} onChange={e => setEditForm({ ...editForm, ownership_number: Number(e.target.value) })} className={`${sel} h-8 w-40`}>
                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}{["st", "nd", "rd"][n - 1] || "th"} Owner</option>)}
                  </select>
                ) : (
                  <span className="text-sm font-medium text-slate-900 text-right">{vehicle.ownership_number}{["st","nd","rd"][vehicle.ownership_number-1]||"th"} Owner</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-50">
                <span className="text-sm text-slate-500 shrink-0">Purchase Date</span>
                {isEditing ? (
                  <div className="w-48">
                    <BSDatePicker value={editForm.purchase_date || ""} onChange={val => setEditForm({ ...editForm, purchase_date: val })} />
                  </div>
                ) : (
                  <span className="text-sm font-medium text-slate-900 text-right"><HoverADDate date={vehicle.purchase_date} /></span>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-50">
                <span className="text-sm text-slate-500 shrink-0">Sold Date</span>
                <span className="text-sm font-medium text-slate-900 text-right">{vehicle.sold_date ? <HoverADDate date={vehicle.sold_date} /> : "—"}</span>
              </div>
              {(isEditing || vehicle.notes) && (
                <div className="col-span-2 mt-2">
                  <div className="text-xs text-slate-500 mb-1">Notes</div>
                  {isEditing ? (
                    <textarea
                      value={editForm.notes || ""}
                      onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                      placeholder="Additional notes..."
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  ) : (
                    <div className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{vehicle.notes}</div>
                  )}
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
                <img src={photo.url} alt="Vehicle" className="w-full h-full object-cover" />
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
                    <a href={doc.url} download={doc.original_name} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline truncate max-w-[80px]">{doc.original_name}</a>
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
                  <a href={doc.url} download={doc.original_name} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline truncate">{doc.original_name}</a>
                  <button onClick={() => deleteDoc(doc.id)} className="text-red-400 hover:text-red-600 ml-2 flex-shrink-0"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showExpenseModal && (
        <ExpenseModal
          onClose={() => setShowExpenseModal(false)}
          onSubmit={addExpense}
          form={expForm}
          setForm={setExpForm}
          saving={saving}
        />
      )}

      {showJobModal && (
        <JobCardModal
          onClose={() => setShowJobModal(false)}
          onSubmit={createJob}
          form={jobForm}
          setForm={setJobForm}
          saving={saving}
          mechanics={mechanics}
        />
      )}

      {showQR && (
        <QRLabelModal
          onClose={() => setShowQR(false)}
          qrData={qrData}
        />
      )}
    </div>
  );
}
