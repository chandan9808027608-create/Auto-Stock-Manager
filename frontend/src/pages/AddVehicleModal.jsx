/**
 * AddVehicleModal.jsx — extracted Add Vehicle form modal for Inventory page
 */
import BSDatePicker from "../components/BSDatePicker";
import VendorAutocomplete from "../components/VendorAutocomplete";
import { BRANDS, SOURCES, CONDITIONS, FUEL_TYPES } from "../utils/helpers";

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

export function AddVehicleModal({ form, setForm, onClose, onSubmit, saving }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: "Manrope, sans-serif" }}>Add New Vehicle</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">✕</button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Brand" required>
              <select data-testid="brand-select" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} className={sel}>
                <option value="">Select Brand</option>
                {BRANDS.map(b => <option key={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Model" required>
              <input
                data-testid="model-input"
                value={form.model}
                onChange={e => setForm({ ...form, model: e.target.value })}
                placeholder="e.g. CB Shine, FZ-S"
                className={inp}
              />
            </Field>
            <Field label="Year" required>
              <input
                type="text" inputMode="numeric" pattern="[0-9]*"
                value={form.year}
                onChange={e => setForm({ ...form, year: e.target.value })}
                placeholder="e.g. 2020"
                className={inp}
              />
            </Field>
            <Field label="Engine CC">
              <input
                type="text" inputMode="numeric" pattern="[0-9]*"
                value={form.engine_cc}
                onChange={e => setForm({ ...form, engine_cc: e.target.value })}
                placeholder="e.g. 125"
                className={inp}
              />
            </Field>
            <Field label="Fuel Type">
              <select value={form.fuel_type} onChange={e => setForm({ ...form, fuel_type: e.target.value })} className={sel}>
                {FUEL_TYPES.map(f => <option key={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Ownership Number">
              <select value={form.ownership_number} onChange={e => setForm({ ...form, ownership_number: Number(e.target.value) })} className={sel}>
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}{["st", "nd", "rd"][n - 1] || "th"} Owner</option>)}
              </select>
            </Field>
            <Field label="Purchase Price (NPR)" required>
              <input
                data-testid="purchase-price-input"
                type="text" inputMode="numeric" pattern="[0-9]*"
                value={form.purchase_price}
                onChange={e => setForm({ ...form, purchase_price: e.target.value })}
                placeholder="e.g. 150000"
                className={inp}
              />
            </Field>
            <Field label="Selling Price (NPR)">
              <input
                type="text" inputMode="numeric" pattern="[0-9]*"
                value={form.selling_price}
                onChange={e => setForm({ ...form, selling_price: e.target.value })}
                placeholder="e.g. 185000"
                className={inp}
              />
            </Field>
            <Field label="Purchase Date" required full>
              <BSDatePicker
                data-testid="purchase-date-input"
                value={form.purchase_date}
                onChange={val => setForm({ ...form, purchase_date: val })}
                required
              />
            </Field>
            <Field label="Purchase Source" required>
              <select data-testid="source-select" value={form.purchase_source} onChange={e => setForm({ ...form, purchase_source: e.target.value })} className={sel}>
                <option value="">Select Source</option>
                {SOURCES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Purchased From (Name)">
              <VendorAutocomplete
                value={form.purchase_from}
                onChange={(name, vendorId) => setForm({ ...form, purchase_from: name, vendor_id: vendorId || form.vendor_id })}
                placeholder="Type vendor name to search..."
              />
            </Field>
            <Field label="Condition">
              <select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })} className={sel}>
                {CONDITIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Registration Number">
              <input
                value={form.registration_number}
                onChange={e => setForm({ ...form, registration_number: e.target.value })}
                placeholder="e.g. Ba 1 Pa 1234"
                className={inp}
              />
            </Field>
            <Field label="Color">
              <input
                value={form.color}
                onChange={e => setForm({ ...form, color: e.target.value })}
                placeholder="e.g. Red, Black"
                className={inp}
              />
            </Field>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Document Status</p>
            <div className="grid grid-cols-2 gap-3">
              {[["bluebook_status", "Bluebook"], ["insurance_status", "Insurance"], ["tax_clearance_status", "Tax Clearance"], ["transfer_status", "Transfer"]].map(([key, label]) => (
                <Field key={key} label={label}>
                  <select value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} className={sel}>
                    <option value="pending">Pending</option>
                    <option value="ok">OK</option>
                    <option value="missing">Missing</option>
                  </select>
                </Field>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-10 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
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
  );
}
