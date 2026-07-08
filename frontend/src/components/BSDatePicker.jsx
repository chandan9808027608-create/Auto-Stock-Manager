import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { adToBsDate, bsToAdDate, getBSMonthMaxDays, getCurrentBSDate, BS_MONTHS } from "../utils/nepali-date";

const sel = "h-9 px-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

// Generates the BS year list: currentYear-5 to currentYear+5
function getBSYearList() {
  const cur = getCurrentBSDate()?.year || 2083;
  return Array.from({ length: 16 }, (_, i) => cur - 5 + i);
}

/**
 * BSDatePicker
 * Props:
 *   value    — AD date string (YYYY-MM-DD) from parent state
 *   onChange — called with AD date string when all three selects are filled
 *   required — boolean
 *   className — extra class for the wrapper
 */
export default function BSDatePicker({ value, onChange, required, className = "" }) {
  const [bsYear, setBsYear] = useState("");
  const [bsMonth, setBsMonth] = useState("");
  const [bsDay, setBsDay] = useState("");

  // Sync from parent value (AD) → decompose to BS selects
  useEffect(() => {
    if (value) {
      const bs = adToBsDate(value);
      if (bs) {
        setBsYear(String(bs.year));
        setBsMonth(String(bs.month));
        setBsDay(String(bs.day));
        return;
      }
    }
    setBsYear(""); setBsMonth(""); setBsDay("");
  }, [value]);

  const maxDays = bsYear && bsMonth
    ? getBSMonthMaxDays(Number(bsYear), Number(bsMonth))
    : 32;

  function tryEmit(y, m, d) {
    if (!y || !m || !d) return;
    const ad = bsToAdDate(Number(y), Number(m), Number(d));
    if (ad) onChange(ad);
  }

  function handleYear(y) {
    setBsYear(y);
    // If chosen day exceeds new month's max, reset day
    const newMax = y && bsMonth ? getBSMonthMaxDays(Number(y), Number(bsMonth)) : 32;
    const safeDay = Number(bsDay) <= newMax ? bsDay : "";
    setBsDay(safeDay);
    tryEmit(y, bsMonth, safeDay);
  }

  function handleMonth(m) {
    setBsMonth(m);
    const newMax = bsYear && m ? getBSMonthMaxDays(Number(bsYear), Number(m)) : 32;
    const safeDay = Number(bsDay) <= newMax ? bsDay : "";
    setBsDay(safeDay);
    tryEmit(bsYear, m, safeDay);
  }

  function handleDay(d) {
    setBsDay(d);
    tryEmit(bsYear, bsMonth, d);
  }

  const years = getBSYearList();
  const days = Array.from({ length: maxDays }, (_, i) => i + 1);

  return (
    <div className={`flex gap-2 ${className}`} data-testid="bs-date-picker">
      {/* Year */}
      <select
        value={bsYear}
        onChange={e => handleYear(e.target.value)}
        className={sel}
        style={{ flex: "0 0 80px" }}
        data-testid="bs-year-select"
      >
        <option value="">Year</option>
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>

      {/* Month */}
      <select
        value={bsMonth}
        onChange={e => handleMonth(e.target.value)}
        className={sel}
        style={{ flex: "1 1 100px" }}
        data-testid="bs-month-select"
      >
        <option value="">Month</option>
        {BS_MONTHS.map((name, i) => (
          <option key={i + 1} value={i + 1}>{name}</option>
        ))}
      </select>

      {/* Day */}
      <select
        value={bsDay}
        onChange={e => handleDay(e.target.value)}
        className={sel}
        style={{ flex: "0 0 70px" }}
        data-testid="bs-day-select"
      >
        <option value="">Day</option>
        {days.map(d => <option key={d} value={d}>{d}</option>)}
      </select>

      {/* AD calendar picker (alternative to the BS dropdowns above) */}
      <div className="relative" style={{ flex: "0 0 auto" }}>
        <button
          type="button"
          tabIndex={-1}
          title="Pick from calendar (AD)"
          className="h-9 w-9 flex items-center justify-center border border-slate-200 rounded-lg bg-white text-slate-500 hover:bg-slate-50 transition-colors"
        >
          <Calendar size={15} />
        </button>
        <input
          type="date"
          value={value || ""}
          onChange={e => e.target.value && onChange(e.target.value)}
          className="absolute inset-0 w-9 h-9 opacity-0 cursor-pointer"
          data-testid="ad-calendar-input"
          title="Pick from calendar (AD)"
        />
      </div>
    </div>
  );
}
