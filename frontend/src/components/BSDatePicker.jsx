import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { adToBsDate, bsToAdDate, getBSMonthMaxDays, getCurrentBSDate, BS_MONTHS, formatBSDate } from "../utils/nepali-date";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// Wide enough for old vehicle purchase dates (well into the past) plus a couple of future years
function getBSYearList() {
  const cur = getCurrentBSDate()?.year || 2083;
  return Array.from({ length: 18 }, (_, i) => cur - 15 + i);
}

// The BS calendar's weekday alignment is derived from the equivalent AD date —
// avoids reimplementing BS weekday math, reuses the already-converted date.
function firstWeekdayOfBSMonth(year, month) {
  const adStr = bsToAdDate(year, month, 1);
  if (!adStr) return 0;
  return new Date(`${adStr}T00:00:00`).getDay();
}

/**
 * BSDatePicker — Nepali (Bikram Sambat) calendar picker.
 * The user only ever picks a BS date; value/onChange stay plain AD "YYYY-MM-DD"
 * strings (via @sbmdkl/nepali-date-converter under nepali-date.js), so the rest
 * of the form, the API payload, and the database are unaffected.
 */
export default function BSDatePicker({ value, onChange, required, className = "" }) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(null);
  const [viewMonth, setViewMonth] = useState(null);
  const wrapRef = useRef(null);

  const selectedBS = adToBsDate(value);

  useEffect(() => {
    if (!open) return;
    const base = selectedBS || getCurrentBSDate();
    setViewYear(base?.year ?? 2083);
    setViewMonth(base?.month ?? 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const maxDays = viewYear && viewMonth ? getBSMonthMaxDays(viewYear, viewMonth) : 30;
  const leadingBlanks = viewYear && viewMonth ? firstWeekdayOfBSMonth(viewYear, viewMonth) : 0;
  const years = getBSYearList();

  const changeMonth = (delta) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setViewMonth(m); setViewYear(y);
  };

  const pickDay = (day) => {
    const ad = bsToAdDate(viewYear, viewMonth, day);
    if (ad) onChange(ad);
    setOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={wrapRef} data-testid="bs-date-picker">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white flex items-center justify-between gap-2 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        data-testid="bs-date-trigger"
      >
        <span className={selectedBS ? "text-slate-800" : "text-slate-400"}>
          {selectedBS ? `${formatBSDate(value)} BS` : "Select date (BS)"}
        </span>
        <Calendar size={15} className="text-slate-400 shrink-0" />
      </button>

      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500" data-testid="bs-date-ad-readout">
        <span>Equivalent AD:</span>
        <span className="font-mono font-medium text-slate-700">{value || "—"}</span>
        {value && <Check size={13} className="text-green-600" />}
      </div>

      {open && viewYear && (
        <div className="absolute z-20 mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-lg p-3" data-testid="bs-calendar-popover">
          <div className="flex items-center justify-between mb-2 gap-2">
            <button type="button" onClick={() => changeMonth(-1)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500" data-testid="bs-prev-month">
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-slate-800">{BS_MONTHS[viewMonth - 1]}</span>
              <select
                value={viewYear}
                onChange={e => setViewYear(Number(e.target.value))}
                className="h-7 px-1 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                data-testid="bs-year-select"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button type="button" onClick={() => changeMonth(1)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500" data-testid="bs-next-month">
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400 mb-1">
            {WEEKDAYS.map(w => <div key={w}>{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: leadingBlanks }).map((_, i) => <div key={`blank-${i}`} />)}
            {Array.from({ length: maxDays }, (_, i) => i + 1).map(day => {
              const isSelected = selectedBS && selectedBS.year === viewYear && selectedBS.month === viewMonth && selectedBS.day === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => pickDay(day)}
                  className={`h-7 w-7 text-xs rounded-full flex items-center justify-center transition-colors ${
                    isSelected ? "bg-blue-600 text-white font-semibold" : "text-slate-700 hover:bg-blue-50"
                  }`}
                  data-testid={`bs-day-${day}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
