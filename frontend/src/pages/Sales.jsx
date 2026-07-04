import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Trash2, TrendingUp, DollarSign, Calendar, ShoppingBag, X, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import api from "../utils/api";
import { formatNPR } from "../utils/helpers";

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "EMI", "Cheque", "Digital Wallet"];

const PRESET_EXPENSES = [
  { name: "Registration Transfer Fee", amount: 2000 },
  { name: "Insurance Transfer Fee", amount: 1500 },
  { name: "Road Tax Clearance", amount: 1000 },
  { name: "Bluebook Copy Fee", amount: 500 },
  { name: "Notary / Document Fee", amount: 800 },
  { name: "Delivery / Transport", amount: 1200 },
];

const inp = "w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";
const sel = `${inp} bg-white`;

const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-1">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const EMPTY_FORM = {
  vehicle_id: "", customer_id: "", sale_price: "",
  payment_method: "Cash", sale_date: "", notes: "",
};

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [form, setForm] = useState(EMPTY_FORM);
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Extra expenses state
  const [checkedPresets, setCheckedPresets] = useState({});      // { "Registration Transfer Fee": true }
  const [presetAmounts, setPresetAmounts] = useState({});        // { "Registration Transfer Fee": 2000 }
  const [customExpenses, setCustomExpenses] = useState([]);       // [{name, amount}]
  const [newExpName, setNewExpName] = useState("");
  const [newExpAmt, setNewExpAmt] = useState("");
  const [showPresets, setShowPresets] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [s, sm] = await Promise.all([api.get("/sales"), api.get("/sales/summary")]);
      setSales(s.data); setSummary(sm.data);
    } catch { toast.error("Failed to load sales"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openModal = async () => {
    setForm(EMPTY_FORM);
    setCheckedPresets({});
    setPresetAmounts(Object.fromEntries(PRESET_EXPENSES.map(e => [e.name, e.amount])));
    setCustomExpenses([]);
    setNewExpName(""); setNewExpAmt("");
    setShowModal(true);
    try {
      const [v, c] = await Promise.all([api.get("/vehicles?status=available"), api.get("/customers")]);
      setVehicles(v.data); setCustomers(c.data);
    } catch { toast.error("Failed to load vehicles/customers"); }
  };

  // Compute total extra expenses
  const extraExpenses = [
    ...PRESET_EXPENSES.filter(e => checkedPresets[e.name]).map(e => ({ name: e.name, amount: Number(presetAmounts[e.name] || e.amount) })),
    ...customExpenses,
  ];
  const expensesTotal = extraExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const grandTotal = (Number(form.sale_price) || 0) + expensesTotal;

  const togglePreset = (name) => setCheckedPresets(prev => ({ ...prev, [name]: !prev[name] }));

  const addCustomExpense = () => {
    if (!newExpName || !newExpAmt) { toast.error("Enter name and amount"); return; }
    setCustomExpenses(prev => [...prev, { name: newExpName, amount: Number(newExpAmt) }]);
    setNewExpName(""); setNewExpAmt("");
  };

  const removeCustomExpense = (idx) => setCustomExpenses(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.vehicle_id || !form.sale_price) { toast.error("Vehicle and Sale Price are required"); return; }
    setSaving(true);
    try {
      await api.post("/sales", {
        vehicle_id: form.vehicle_id,
        customer_id: form.customer_id || null,
        sale_price: Number(form.sale_price),
        extra_expenses: extraExpenses,
        payment_method: form.payment_method,
        sale_date: form.sale_date || undefined,
        notes: form.notes,
      });
      toast.success("Sale recorded successfully!");
      setShowModal(false);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to save sale"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this sale? The vehicle will be restored to available.")) return;
    try {
      await api.delete(`/sales/${id}`);
      toast.success("Sale deleted, vehicle restored");
      fetchAll();
    } catch { toast.error("Failed to delete"); }
  };

  const filtered = sales.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (s.vehicle_info || "").toLowerCase().includes(q) ||
      (s.customer_name || "").toLowerCase().includes(q) ||
      (s.payment_method || "").toLowerCase().includes(q);
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sales</h1>
          <p className="text-sm text-slate-500">{sales.length} sales recorded</p>
        </div>
        <button onClick={openModal} data-testid="new-sale-btn" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-all active:scale-95 shadow-sm">
          <Plus size={16} /> Record Sale
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Sales", value: summary.total_sales, icon: ShoppingBag, color: "bg-blue-500" },
            { label: "Total Revenue", value: formatNPR(summary.total_revenue), icon: TrendingUp, color: "bg-green-500" },
            { label: "This Month", value: summary.this_month_sales + " sales", icon: Calendar, color: "bg-indigo-500" },
            { label: "Avg Sale Price", value: formatNPR(summary.avg_sale_price), icon: DollarSign, color: "bg-purple-500" },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${c.color} flex items-center justify-center shrink-0`}>
                <c.icon size={16} className="text-white" />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">{c.label}</div>
                <div className="text-lg font-bold text-slate-900" style={{ fontFamily: "Manrope" }}>{c.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vehicle, customer..." className="w-full h-9 pl-9 pr-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" data-testid="sales-search" />
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500">
            <ShoppingBag size={32} className="mb-2 opacity-30" />
            <p className="font-medium">No sales recorded yet</p>
            <p className="text-xs mt-1 text-slate-400">Click "Record Sale" to add one</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {["Vehicle", "Customer", "Sale Price", "Extra Expenses", "Total", "Payment", "Date", ""].map(h => (
                    <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(s => (
                  <tr key={s.id} data-testid="sale-row" className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 text-sm">{s.vehicle_info || "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-700">{s.customer_name}</div>
                      {s.customer_contact && <div className="text-xs text-slate-400">{s.customer_contact}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800 whitespace-nowrap">{formatNPR(s.sale_price)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                      {s.extra_expenses?.length > 0 ? (
                        <span className="text-orange-600 font-medium">{formatNPR(s.expenses_total)} ({s.extra_expenses.length} items)</span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-green-700 whitespace-nowrap">{formatNPR(s.total_amount)}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{s.payment_method}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">{s.sale_date}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(s.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors" data-testid="delete-sale-btn">
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Sale Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Record Sale</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">

              {/* Vehicle */}
              <Field label="Vehicle" required>
                <select value={form.vehicle_id} onChange={e => setForm({...form, vehicle_id: e.target.value})} className={sel} data-testid="sale-vehicle-select">
                  <option value="">Select available vehicle</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.brand} {v.model} {v.year} {v.registration_number ? `(${v.registration_number})` : ""} — {formatNPR(v.selling_price || v.purchase_price)}
                    </option>
                  ))}
                </select>
              </Field>

              {/* Customer */}
              <Field label="Customer">
                <select value={form.customer_id} onChange={e => setForm({...form, customer_id: e.target.value})} className={sel} data-testid="sale-customer-select">
                  <option value="">Walk-in / No customer record</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} — {c.contact_number}</option>
                  ))}
                </select>
              </Field>

              {/* Sale Price + Payment */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Sale Price (NPR)" required>
                  <input type="text" inputMode="numeric" value={form.sale_price} onChange={e => setForm({...form, sale_price: e.target.value})} placeholder="e.g. 185000" className={inp} data-testid="sale-price-input" />
                </Field>
                <Field label="Payment Method">
                  <select value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})} className={sel}>
                    {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </Field>
              </div>

              {/* Sale Date */}
              <Field label="Sale Date">
                <input type="date" value={form.sale_date} onChange={e => setForm({...form, sale_date: e.target.value})} className={inp} />
              </Field>

              {/* Extra Expenses */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button type="button" onClick={() => setShowPresets(!showPresets)} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors">
                  <span>Extra Expenses</span>
                  <div className="flex items-center gap-2">
                    {extraExpenses.length > 0 && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">{extraExpenses.length} added · {formatNPR(expensesTotal)}</span>}
                    {showPresets ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </div>
                </button>

                {showPresets && (
                  <div className="p-4 space-y-3">
                    {/* Preset checkboxes */}
                    <p className="text-xs text-slate-500 font-medium">Preset Fees</p>
                    <div className="space-y-2">
                      {PRESET_EXPENSES.map(e => (
                        <div key={e.name} className="flex items-center gap-3">
                          <input type="checkbox" id={e.name} checked={!!checkedPresets[e.name]} onChange={() => togglePreset(e.name)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" data-testid={`preset-${e.name.replace(/ /g,"-").toLowerCase()}`} />
                          <label htmlFor={e.name} className="flex-1 text-sm text-slate-700 cursor-pointer">{e.name}</label>
                          <input
                            type="text" inputMode="numeric"
                            value={presetAmounts[e.name] ?? e.amount}
                            onChange={ev => setPresetAmounts(prev => ({ ...prev, [e.name]: ev.target.value }))}
                            disabled={!checkedPresets[e.name]}
                            className="w-24 h-7 px-2 text-xs text-right border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-40 disabled:bg-slate-50"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Custom expenses */}
                    <div className="border-t border-slate-100 pt-3">
                      <p className="text-xs text-slate-500 font-medium mb-2">Custom Expense</p>
                      <div className="flex gap-2 items-center">
                        <input value={newExpName} onChange={e => setNewExpName(e.target.value)} placeholder="Expense name" className="flex-1 h-8 px-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" data-testid="custom-exp-name" />
                        <input type="text" inputMode="numeric" value={newExpAmt} onChange={e => setNewExpAmt(e.target.value)} placeholder="Amount" className="w-24 h-8 px-2 text-sm text-right border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" data-testid="custom-exp-amount" />
                        <button type="button" onClick={addCustomExpense} className="h-8 px-3 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors shrink-0" data-testid="add-custom-exp-btn">Add</button>
                      </div>
                      {customExpenses.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {customExpenses.map((ex, i) => (
                            <div key={i} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-2 py-1.5 border border-slate-100">
                              <span className="text-slate-700">{ex.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-800">{formatNPR(ex.amount)}</span>
                                <button type="button" onClick={() => removeCustomExpense(i)} className="text-red-400 hover:text-red-600"><X size={11} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Grand Total */}
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between" data-testid="grand-total-section">
                <div className="text-sm text-slate-600">
                  <div>Sale Price: <span className="font-medium text-slate-800">{formatNPR(Number(form.sale_price) || 0)}</span></div>
                  {expensesTotal > 0 && <div>Extra Expenses: <span className="font-medium text-orange-700">{formatNPR(expensesTotal)}</span></div>}
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Grand Total</div>
                  <div className="text-xl font-bold text-green-700" style={{ fontFamily: "Manrope" }} data-testid="grand-total-value">{formatNPR(grandTotal)}</div>
                </div>
              </div>

              {/* Notes */}
              <Field label="Notes">
                <input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Any notes about this sale..." className={inp} />
              </Field>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 h-10 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} data-testid="save-sale-btn" className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60 active:scale-95 transition-all">
                  {saving ? "Saving..." : "Record Sale"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
