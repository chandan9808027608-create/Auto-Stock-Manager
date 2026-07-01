import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Eye, Trash2, Filter } from "lucide-react";
import { toast } from "sonner";
import api from "../utils/api";
import { formatNPR, getAgingStyle, getStatusStyle, BRANDS } from "../utils/helpers";
import { formatBSDate } from "../utils/nepali-date";
import { AddVehicleModal } from "./AddVehicleModal";

const STATUSES = ["all", "available", "sold", "reserved"];

const EMPTY = {
  brand: "", model: "", year: new Date().getFullYear(), engine_cc: 125, fuel_type: "Petrol",
  ownership_number: 1, purchase_price: "", purchase_date: "", purchase_source: "", purchase_from: "",
  vendor_id: null, condition: "Good", color: "", registration_number: "", selling_price: "", notes: "", status: "available",
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
        <AddVehicleModal
          form={form}
          setForm={setForm}
          onClose={() => { setShowModal(false); setForm(EMPTY); }}
          onSubmit={handleSave}
          saving={saving}
        />
      )}
    </div>
  );
}
