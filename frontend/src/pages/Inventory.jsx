import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Eye, Trash2, Filter } from "lucide-react";
import { toast } from "sonner";
import api from "../utils/api";
import { formatNPR, getAgingStyle, getStatusStyle, BRANDS, SOURCES, CONDITIONS, FUEL_TYPES } from "../utils/helpers";
import BSDatePicker from "../components/BSDatePicker";
import { formatBSDate } from "../utils/nepali-date";

const STATUSES = ["all", "available", "sold", "reserved"];

// Defined OUTSIDE component — prevents remount-on-keystroke focus loss
const inp = "w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";
const sel = "w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

const Field = ({ label, required, children, full }) => (
  <div className={full ? "col-span-2" : ""}>
    <label className="block text-xs font-medium text-slate-600 mb-1">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const EMPTY = {
  brand: "", model: "", year: new Date().getFullYear(), engine_cc: 125, fuel_type: "Petrol",
  ownership_number: 1, purchase_price: "", purchase_date: "", purchase_source: "", purchase_from: "",
  condition: "Good", color: "", registration_number: "", selling_price: "", notes: "", status: "available",
  bluebook_status: "pending", insurance_status: "pending", tax_clearance_status: "pending", transfer_status: "pending"
};

export default function Inventory() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const fetchVehicles = useCallback(async () => {
    try {
      const r = await api.get("/vehicles");
      setVehicles(r.data);
    } catch { toast.error("Failed to load vehicles"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  useEffect(() => {
    let result = [...vehicles];
    if (statusFilter !== "all") result = result.filter(v => v.status === statusFilter);
    if (brandFilter !== "all") result = result.filter(v => v.brand === brandFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(v =>
        v.brand?.toLowerCase().includes(q) || v.model?.toLowerCase().includes(q) ||
        v.registration_number?.toLowerCase().includes(q) || v.purchase_source?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [vehicles, search, statusFilter, brandFilter]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.brand || !form.model || !form.purchase_price || !form.purchase_date || !form.purchase_source) {
      toast.error("Please fill all required fields"); return;
    }
    setSaving(true);
    try {
      await api.post("/vehicles", {
        ...form,
        purchase_price: Number(form.purchase_price),
        selling_price: form.selling_price ? Number(form.selling_price) : null,
        year: Number(form.year),
        engine_cc: Number(form.engine_cc),
        ownership_number: Number(form.ownership_number)
      });
      toast.success("Vehicle added successfully!");
      setShowModal(false);
      setForm(EMPTY);
      fetchVehicles();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this vehicle and all related data?")) return;
    try {
      await api.delete(`/vehicles/${id}`);
      toast.success("Vehicle deleted");
      fetchVehicles();
    } catch { toast.error("Failed to delete"); }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          <p className="text-sm text-slate-500">{filtered.length} vehicles found</p>
        </div>
        <button
          onClick={() => { setForm(EMPTY); setShowModal(true); }}
          data-testid="add-vehicle-button"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-all active:scale-95 shadow-sm"
        >
          <Plus size={16} /> Add Vehicle
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            data-testid="search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search brand, model, reg#..."
            className="w-full h-9 pl-9 pr-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-slate-400" />
          {STATUSES.map(s => (
            <button
              key={s}
              data-testid={`filter-${s}`}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${statusFilter === s ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {s === "all" ? "All Status" : s}
            </button>
          ))}
          <select
            value={brandFilter}
            onChange={e => setBrandFilter(e.target.value)}
            className="h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Brands</option>
            {BRANDS.map(b => <option key={b}>{b}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500">
            <p className="font-medium">No vehicles found</p>
            <p className="text-sm mt-1">Add your first vehicle to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {["Brand & Model", "Year / CC", "Reg Number", "Purchase Date", "Age", "Investment", "Selling Price", "Margin", "Status", ""].map(h => (
                    <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(v => {
                  const ag = getAgingStyle(v.aging?.category);
                  const st = getStatusStyle(v.status);
                  return (
                    <tr
                      key={v.id}
                      data-testid="vehicle-row"
                      onClick={() => navigate(`/inventory/${v.id}`)}
                      className="table-row-hover cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 text-sm">{v.brand} {v.model}</div>
                        <div className="text-xs text-slate-500">{v.fuel_type} · {v.ownership_number}{["st","nd","rd"][v.ownership_number-1]||"th"} owner</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{v.year} · {v.engine_cc}cc</td>
                      <td className="px-4 py-3 text-sm font-mono text-slate-600">{v.registration_number || "—"}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{formatBSDate(v.purchase_date)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${ag.bg} ${ag.text}`}>
                          {v.aging?.days}d · {ag.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800 whitespace-nowrap">{formatNPR(v.total_investment)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{v.selling_price ? formatNPR(v.selling_price) : "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {v.profit_margin !== null && v.profit_margin !== undefined ? (
                          <span className={`text-sm font-semibold ${v.low_margin ? "text-red-600" : "text-green-600"}`}>{v.profit_margin}%</span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${st.bg} ${st.text}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={e => { e.stopPropagation(); navigate(`/inventory/${v.id}`); }}
                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                            data-testid="view-vehicle-btn"
                          >
                            <Eye size={15} className="text-slate-500" />
                          </button>
                          <button
                            onClick={e => handleDelete(v.id, e)}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                            data-testid="delete-vehicle-btn"
                          >
                            <Trash2 size={15} className="text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Vehicle Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: "Manrope, sans-serif" }}>Add New Vehicle</h2>
              <button onClick={() => { setShowModal(false); setForm(EMPTY); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Brand" required>
                  <select data-testid="brand-select" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} className={sel}>
                    <option value="">Select Brand</option>
                    {BRANDS.map(b => <option key={b}>{b}</option>)}
                  </select>
                </Field>
                <Field label="Model" required>
                  <input
                    data-testid="model-input"
                    value={form.model}
                    onChange={e => setForm({...form, model: e.target.value})}
                    placeholder="e.g. CB Shine, FZ-S"
                    className={inp}
                  />
                </Field>
                <Field label="Year" required>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.year}
                    onChange={e => setForm({...form, year: e.target.value})}
                    placeholder="e.g. 2020"
                    className={inp}
                  />
                </Field>
                <Field label="Engine CC">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.engine_cc}
                    onChange={e => setForm({...form, engine_cc: e.target.value})}
                    placeholder="e.g. 125"
                    className={inp}
                  />
                </Field>
                <Field label="Fuel Type">
                  <select value={form.fuel_type} onChange={e => setForm({...form, fuel_type: e.target.value})} className={sel}>
                    {FUEL_TYPES.map(f => <option key={f}>{f}</option>)}
                  </select>
                </Field>
                <Field label="Ownership Number">
                  <select value={form.ownership_number} onChange={e => setForm({...form, ownership_number: Number(e.target.value)})} className={sel}>
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}{["st","nd","rd"][n-1]||"th"} Owner</option>)}
                  </select>
                </Field>
                <Field label="Purchase Price (NPR)" required>
                  <input
                    data-testid="purchase-price-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.purchase_price}
                    onChange={e => setForm({...form, purchase_price: e.target.value})}
                    placeholder="e.g. 150000"
                    className={inp}
                  />
                </Field>
                <Field label="Selling Price (NPR)">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.selling_price}
                    onChange={e => setForm({...form, selling_price: e.target.value})}
                    placeholder="e.g. 185000"
                    className={inp}
                  />
                </Field>
                <Field label="Purchase Date" required full>
                  <BSDatePicker
                    data-testid="purchase-date-input"
                    value={form.purchase_date}
                    onChange={val => setForm({...form, purchase_date: val})}
                    required
                  />
                </Field>
                <Field label="Purchase Source" required>
                  <select data-testid="source-select" value={form.purchase_source} onChange={e => setForm({...form, purchase_source: e.target.value})} className={sel}>
                    <option value="">Select Source</option>
                    {SOURCES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Purchased From (Name)">
                  <input
                    value={form.purchase_from}
                    onChange={e => setForm({...form, purchase_from: e.target.value})}
                    placeholder="Person/dealer name"
                    className={inp}
                  />
                </Field>
                <Field label="Condition">
                  <select value={form.condition} onChange={e => setForm({...form, condition: e.target.value})} className={sel}>
                    {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Registration Number">
                  <input
                    value={form.registration_number}
                    onChange={e => setForm({...form, registration_number: e.target.value})}
                    placeholder="e.g. Ba 1 Pa 1234"
                    className={inp}
                  />
                </Field>
                <Field label="Color">
                  <input
                    value={form.color}
                    onChange={e => setForm({...form, color: e.target.value})}
                    placeholder="e.g. Red, Black"
                    className={inp}
                  />
                </Field>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({...form, notes: e.target.value})}
                  placeholder="Additional notes..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Document Status */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Document Status</p>
                <div className="grid grid-cols-2 gap-3">
                  {[["bluebook_status","Bluebook"],["insurance_status","Insurance"],["tax_clearance_status","Tax Clearance"],["transfer_status","Transfer"]].map(([key, label]) => (
                    <Field key={key} label={label}>
                      <select value={form[key]} onChange={e => setForm({...form, [key]: e.target.value})} className={sel}>
                        <option value="pending">Pending</option>
                        <option value="ok">OK</option>
                        <option value="missing">Missing</option>
                      </select>
                    </Field>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setForm(EMPTY); }}
                  className="flex-1 h-10 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  data-testid="save-vehicle-button"
                  type="submit"
                  disabled={saving}
                  className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all active:scale-95 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Add Vehicle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
