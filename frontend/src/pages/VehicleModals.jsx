/**
 * VehicleModals.jsx — extracted modal sub-components for VehicleDetail
 * Kept in the same pages/ directory for co-location.
 */
import { QRCodeSVG } from "qrcode.react";
import { formatNPR, EXPENSE_CATEGORIES, CONDITIONS, SOURCES, FUEL_TYPES } from "../utils/helpers";
import BSDatePicker from "../components/BSDatePicker";
import VendorAutocomplete from "../components/VendorAutocomplete";

const inp = "w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";
const sel = "w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

// ── Expense Modal ──────────────────────────────────────────────────────
export function ExpenseModal({ onClose, onSubmit, form, setForm, saving }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Add Expense</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">✕</button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Category <span className="text-red-500">*</span></label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={sel}>
              {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Amount (NPR) <span className="text-red-500">*</span></label>
            <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="e.g. 5000" className={inp} data-testid="expense-amount-input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Details..." className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={inp} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 h-10 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60" data-testid="save-expense-btn">
              {saving ? "Saving..." : "Add Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Job Card Modal ─────────────────────────────────────────────────────
export function JobCardModal({ onClose, onSubmit, form, setForm, saving, mechanics }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Create Job Card</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">✕</button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Work Description <span className="text-red-500">*</span></label>
            <textarea value={form.work_description} onChange={e => setForm({ ...form, work_description: e.target.value })} placeholder="Describe the work to be done..." rows={3} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" data-testid="job-description-input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Mechanic Name <span className="text-red-500">*</span></label>
            {mechanics.length > 0 ? (
              <select value={form.mechanic_name} onChange={e => setForm({ ...form, mechanic_name: e.target.value })} className={sel}>
                <option value="">Select Mechanic</option>
                {mechanics.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                <option value="other">Other</option>
              </select>
            ) : (
              <input value={form.mechanic_name} onChange={e => setForm({ ...form, mechanic_name: e.target.value })} placeholder="Mechanic name" className={inp} />
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Estimated Cost (NPR) <span className="text-red-500">*</span></label>
            <input type="number" value={form.estimated_cost} onChange={e => setForm({ ...form, estimated_cost: e.target.value })} placeholder="e.g. 3000" className={inp} data-testid="job-cost-input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." className={inp} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 h-10 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60" data-testid="save-job-btn">
              {saving ? "Saving..." : "Create Job Card"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Vehicle Modal ─────────────────────────────────────────────────
export function EditVehicleModal({ onClose, onSubmit, form, setForm, saving }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Edit Vehicle</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">✕</button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[["Brand","brand","text"],["Model","model","text"],["Year","year","number"],["Engine CC","engine_cc","number"],["Purchase Price","purchase_price","number"],["Selling Price","selling_price","number"]].map(([label, key, type]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                <input type={type} value={form[key] || ""} onChange={e => setForm({ ...form, [key]: e.target.value })} className={inp} />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Registration Number<span className="text-red-500 ml-0.5">*</span></label>
              <input
                data-testid="edit-registration-number-input"
                value={form.registration_number || ""}
                onChange={e => setForm({ ...form, registration_number: e.target.value })}
                placeholder="e.g. Ba 1 Pa 1234"
                className={inp}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={sel}>
                <option value="available">Available</option>
                <option value="reserved">Reserved</option>
                <option value="sold">Sold</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Condition</label>
              <select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })} className={sel}>
                {CONDITIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
              <select data-testid="edit-vehicle-type-select" value={form.vehicle_type || "bike"} onChange={e => setForm({ ...form, vehicle_type: e.target.value })} className={sel}>
                <option value="bike">Bike</option>
                <option value="scooter">Scooter</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fuel Type</label>
              <select value={form.fuel_type || "Petrol"} onChange={e => setForm({ ...form, fuel_type: e.target.value })} className={sel}>
                {FUEL_TYPES.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Ownership Number</label>
              <select value={form.ownership_number || 1} onChange={e => setForm({ ...form, ownership_number: Number(e.target.value) })} className={sel}>
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}{["st", "nd", "rd"][n - 1] || "th"} Owner</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Color</label>
              <input value={form.color || ""} onChange={e => setForm({ ...form, color: e.target.value })} placeholder="e.g. Red, Black" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Purchase Source</label>
              <select value={form.purchase_source || ""} onChange={e => setForm({ ...form, purchase_source: e.target.value })} className={sel}>
                <option value="">Select Source</option>
                {SOURCES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Purchased From (Name)</label>
              <VendorAutocomplete
                value={form.purchase_from || ""}
                onChange={(name, vendorId) => setForm({ ...form, purchase_from: name, vendor_id: vendorId || form.vendor_id })}
                placeholder="Type vendor name to search..."
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Purchase Date (BS)</label>
              <BSDatePicker
                value={form.purchase_date || ""}
                onChange={val => setForm({ ...form, purchase_date: val })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <textarea
              value={form.notes || ""}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Documents</p>
            <div className="grid grid-cols-2 gap-3">
              {[["bluebook_status","Bluebook"],["insurance_status","Insurance"],["tax_clearance_status","Tax Clearance"],["transfer_status","Transfer"]].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                  <select value={form[key] || "pending"} onChange={e => setForm({ ...form, [key]: e.target.value })} className={sel}>
                    <option value="pending">Pending</option><option value="ok">OK</option><option value="missing">Missing</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 h-10 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── QR Label Modal ─────────────────────────────────────────────────────
export function QRLabelModal({ onClose, qrData }) {
  if (!qrData) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Vehicle QR Label</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">✕</button>
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
  );
}
