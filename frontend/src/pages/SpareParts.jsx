import { useEffect, useState, useCallback } from "react";
import { Plus, Search, AlertTriangle, Package, Trash2, Edit, Minus, ShoppingCart, History, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import api from "../utils/api";
import { formatNPR } from "../utils/helpers";

// ── Defined outside component to prevent focus loss ───────────────────
const inp = "w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";
const sel = `${inp} bg-white`;

const CATEGORIES = ["General", "Engine", "Brakes", "Electrical", "Tyres", "Body", "Oil & Fluids", "Filters", "Chain & Sprocket", "Lights", "Other"];
const REASONS = ["Sale", "Used in Repair", "Damaged", "Return to Supplier", "Internal Use"];

const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    {children}
  </div>
);

const EMPTY = { name: "", category: "General", brand_compatibility: "", part_number: "", quantity: 0, unit_cost: "", selling_price: "", supplier: "", min_stock_alert: 2, location: "", notes: "" };
const EMPTY_USE = { quantity: 1, reason: "Sale", notes: "" };

export default function SpareParts() {
  const [parts, setParts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [showLowStock, setShowLowStock] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  // Use/Sell Part modal
  const [showUseModal, setShowUseModal] = useState(false);
  const [usePart, setUsePart] = useState(null);
  const [useForm, setUseForm] = useState(EMPTY_USE);
  const [useSaving, setUseSaving] = useState(false);

  // Transaction log
  const [expandedPart, setExpandedPart] = useState(null);
  const [txns, setTxns] = useState({});

  const fetchAll = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([api.get("/spare-parts"), api.get("/spare-parts/summary")]);
      setParts(p.data); setSummary(s.data);
    } catch { toast.error("Failed to load parts"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = parts.filter(p => {
    if (catFilter !== "all" && p.category !== catFilter) return false;
    if (showLowStock && !p.low_stock) return false;
    if (search) { const q = search.toLowerCase(); return p.name.toLowerCase().includes(q) || (p.part_number || "").toLowerCase().includes(q) || (p.supplier || "").toLowerCase().includes(q); }
    return true;
  });

  const openAdd = () => { setForm(EMPTY); setEditId(null); setShowModal(true); };
  const openEdit = (p) => { setForm({ ...p, unit_cost: p.unit_cost || "", selling_price: p.selling_price || "" }); setEditId(p.id); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const payload = { ...form, quantity: Number(form.quantity) || 0, unit_cost: Number(form.unit_cost) || 0, selling_price: form.selling_price ? Number(form.selling_price) : null, min_stock_alert: Number(form.min_stock_alert) || 2 };
      if (editId) { await api.put(`/spare-parts/${editId}`, payload); toast.success("Updated!"); }
      else { await api.post("/spare-parts", payload); toast.success("Part added!"); }
      setShowModal(false); fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "Error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this part?")) return;
    try { await api.delete(`/spare-parts/${id}`); toast.success("Deleted"); fetchAll(); }
    catch { toast.error("Failed to delete"); }
  };

  const adjustStock = async (id, delta) => {
    try {
      const r = await api.post(`/spare-parts/${id}/adjust-stock`, { delta });
      setParts(prev => prev.map(p => p.id === id ? { ...p, quantity: r.data.quantity, low_stock: r.data.quantity <= p.min_stock_alert } : p));
    } catch { toast.error("Failed to update stock"); }
  };

  const openUsePart = (p) => { setUsePart(p); setUseForm(EMPTY_USE); setShowUseModal(true); };

  const handleStockOut = async (e) => {
    e.preventDefault();
    const qty = Number(useForm.quantity);
    if (!qty || qty <= 0) { toast.error("Enter a valid quantity"); return; }
    if (qty > usePart.quantity) { toast.error(`Only ${usePart.quantity} in stock`); return; }
    setUseSaving(true);
    try {
      await api.post(`/spare-parts/${usePart.id}/stock-out`, { quantity: qty, reason: useForm.reason, notes: useForm.notes });
      toast.success(`${qty} unit(s) marked as "${useForm.reason}"`);
      setShowUseModal(false);
      fetchAll();
      if (expandedPart === usePart.id) {
        const r = await api.get(`/spare-parts/${usePart.id}/transactions`);
        setTxns(prev => ({ ...prev, [usePart.id]: r.data }));
      }
    } catch (err) { toast.error(err.response?.data?.detail || "Error"); }
    finally { setUseSaving(false); }
  };

  const toggleTxn = async (pid) => {
    if (expandedPart === pid) { setExpandedPart(null); return; }
    setExpandedPart(pid);
    if (!txns[pid]) {
      try {
        const r = await api.get(`/spare-parts/${pid}/transactions`);
        setTxns(prev => ({ ...prev, [pid]: r.data }));
      } catch { toast.error("Failed to load history"); }
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Spare Parts</h1>
          <p className="text-sm text-slate-500">{parts.length} parts in inventory</p>
        </div>
        <button onClick={openAdd} data-testid="add-part-btn" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-all active:scale-95 shadow-sm">
          <Plus size={16} /> Add Part
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Parts", value: summary.total_parts, color: "bg-blue-500" },
            { label: "Inventory Value", value: formatNPR(summary.total_value), color: "bg-indigo-500" },
            { label: "Low Stock", value: summary.low_stock_count, color: summary.low_stock_count > 0 ? "bg-red-500" : "bg-green-500" },
            { label: "Categories", value: summary.categories?.length || 0, color: "bg-purple-500" },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${c.color} flex items-center justify-center`}><Package size={16} className="text-white" /></div>
              <div>
                <div className="text-xs text-slate-500 font-medium">{c.label}</div>
                <div className="text-lg font-bold text-slate-900" style={{ fontFamily: "Manrope" }}>{c.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search parts, part#, supplier..." className="w-full h-9 pl-9 pr-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" data-testid="parts-search" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <button onClick={() => setShowLowStock(!showLowStock)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${showLowStock ? "bg-red-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`} data-testid="low-stock-filter">
          <AlertTriangle size={13} /> Low Stock
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500">
            <Package size={32} className="mb-2 opacity-30" />
            <p className="font-medium">No parts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {["Part Name", "Category", "Part#", "Qty", "Unit Cost", "Sell Price", "Total Value", "Supplier", ""].map(h => (
                    <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.flatMap(p => {
                  const rows = [];
                  rows.push(
                    <tr key={p.id} data-testid="part-row" className={`transition-colors ${p.low_stock ? "bg-red-50/40" : "hover:bg-slate-50"}`}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                          {p.name}
                          {p.low_stock && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">Low</span>}
                        </div>
                        {p.brand_compatibility && <div className="text-xs text-slate-400 mt-0.5">{p.brand_compatibility}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{p.category}</td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-500">{p.part_number || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => adjustStock(p.id, -1)} className="w-6 h-6 rounded-md bg-slate-100 hover:bg-red-100 flex items-center justify-center transition-colors"><Minus size={11} /></button>
                          <span className={`text-sm font-bold w-7 text-center ${p.low_stock ? "text-red-600" : "text-slate-900"}`}>{p.quantity}</span>
                          <button onClick={() => adjustStock(p.id, 1)} className="w-6 h-6 rounded-md bg-slate-100 hover:bg-green-100 flex items-center justify-center transition-colors"><Plus size={11} /></button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{formatNPR(p.unit_cost)}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{p.selling_price ? <span className="text-green-700 font-medium">{formatNPR(p.selling_price)}</span> : "—"}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800 whitespace-nowrap">{formatNPR(p.total_value)}</td>
                      <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">{p.supplier || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openUsePart(p)} title="Use / Sell Part" data-testid="use-part-btn" className="p-1.5 hover:bg-orange-50 rounded-lg transition-colors">
                            <ShoppingCart size={14} className="text-orange-500" />
                          </button>
                          <button onClick={() => toggleTxn(p.id)} title="View History" data-testid="txn-history-btn" className={`p-1.5 rounded-lg transition-colors ${expandedPart === p.id ? "bg-blue-100" : "hover:bg-slate-100"}`}>
                            {expandedPart === p.id ? <ChevronUp size={14} className="text-blue-600" /> : <History size={14} className="text-slate-500" />}
                          </button>
                          <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" data-testid="edit-part-btn"><Edit size={14} className="text-slate-500" /></button>
                          <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors" data-testid="delete-part-btn"><Trash2 size={14} className="text-red-400" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                  if (expandedPart === p.id) {
                    rows.push(
                      <tr key={`${p.id}-txn`} className="bg-slate-50">
                        <td colSpan={9} className="px-6 py-3">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-2">
                            <History size={12} /> Usage History
                          </div>
                          {!txns[p.id] ? (
                            <div className="text-xs text-slate-400">Loading...</div>
                          ) : txns[p.id].length === 0 ? (
                            <div className="text-xs text-slate-400">No usage recorded yet.</div>
                          ) : (
                            <div className="space-y-1.5 max-h-44 overflow-y-auto">
                              {txns[p.id].map(t => (
                                <div key={t.id} className="flex items-center gap-4 text-xs text-slate-600 bg-white rounded-lg px-3 py-2 border border-slate-100">
                                  <span className="font-bold text-red-600 w-8 shrink-0">-{t.quantity}</span>
                                  <span className="font-medium text-slate-800">{t.reason}</span>
                                  <span className="text-slate-400">{t.date?.slice(0, 10)}</span>
                                  {t.notes && <span className="text-slate-400 italic truncate">{t.notes}</span>}
                                  <span className="ml-auto text-slate-400 shrink-0">by {t.created_by}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  }
                  return rows;
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">{editId ? "Edit Part" : "Add Spare Part"}</h2>
              <button onClick={() => { setShowModal(false); setForm(EMPTY); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Field label="Part Name" required><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Brake Pad Front" className={inp} data-testid="part-name-input" /></Field></div>
                <Field label="Category"><select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className={sel}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></Field>
                <Field label="Part Number"><input value={form.part_number} onChange={e => setForm({...form, part_number: e.target.value})} placeholder="e.g. BP-001" className={inp} /></Field>
                <Field label="Brand Compatibility"><input value={form.brand_compatibility} onChange={e => setForm({...form, brand_compatibility: e.target.value})} placeholder="e.g. Honda, Yamaha" className={inp} /></Field>
                <Field label="Supplier"><input value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} placeholder="Supplier name" className={inp} /></Field>
                <Field label="Quantity"><input type="text" inputMode="numeric" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} placeholder="0" className={inp} /></Field>
                <Field label="Min Stock Alert"><input type="text" inputMode="numeric" value={form.min_stock_alert} onChange={e => setForm({...form, min_stock_alert: e.target.value})} placeholder="2" className={inp} /></Field>
                <Field label="Unit Cost (NPR)"><input type="text" inputMode="numeric" value={form.unit_cost} onChange={e => setForm({...form, unit_cost: e.target.value})} placeholder="e.g. 850" className={inp} data-testid="part-cost-input" /></Field>
                <Field label="Selling Price (NPR)"><input type="text" inputMode="numeric" value={form.selling_price} onChange={e => setForm({...form, selling_price: e.target.value})} placeholder="e.g. 1200" className={inp} /></Field>
                <Field label="Storage Location"><input value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="e.g. Shelf A2" className={inp} /></Field>
              </div>
              <Field label="Notes"><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} placeholder="Any notes..." className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" /></Field>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowModal(false); setForm(EMPTY); }} className="flex-1 h-10 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} data-testid="save-part-btn" className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60 active:scale-95 transition-all">{saving ? "Saving..." : editId ? "Update" : "Add Part"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Use / Sell Part Modal */}
      {showUseModal && usePart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Use / Sell Part</h2>
                <p className="text-xs text-slate-500 mt-0.5">{usePart.name} — <span className="font-semibold text-slate-700">{usePart.quantity} in stock</span></p>
              </div>
              <button onClick={() => setShowUseModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">✕</button>
            </div>
            <form onSubmit={handleStockOut} className="p-5 space-y-4">
              <Field label="Quantity to Deduct" required>
                <input type="text" inputMode="numeric" value={useForm.quantity} onChange={e => setUseForm({...useForm, quantity: e.target.value})} placeholder="1" className={inp} data-testid="use-qty-input" />
              </Field>
              <Field label="Reason" required>
                <select value={useForm.reason} onChange={e => setUseForm({...useForm, reason: e.target.value})} className={sel} data-testid="use-reason-select">
                  {REASONS.map(r => <option key={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Notes">
                <input value={useForm.notes} onChange={e => setUseForm({...useForm, notes: e.target.value})} placeholder="Optional notes" className={inp} />
              </Field>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowUseModal(false)} className="flex-1 h-10 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={useSaving} data-testid="confirm-use-btn" className="flex-1 h-10 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold disabled:opacity-60 active:scale-95 transition-all">{useSaving ? "Saving..." : "Confirm"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
