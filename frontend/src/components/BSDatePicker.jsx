/**
 * BSDatePicker
 * Props:
 *   value    — AD date string (YYYY-MM-DD) from parent state
 *   onChange — called with AD date string when a date is picked
 *   required — boolean
 *   className — extra class for the wrapper
 */
export default function BSDatePicker({ value, onChange, required, className = "" }) {
  return (
    <input
      type="date"
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      required={required}
      className={`w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${className}`}
      data-testid="purchase-date-calendar-input"
    />
  );
}
