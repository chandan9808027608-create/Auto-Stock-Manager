import { useState, useEffect, useRef, useCallback } from "react";
import api from "../utils/api";

/**
 * VendorAutocomplete
 * Props:
 *   value       - current text value (purchase_from string)
 *   onChange    - called with (name, vendorId) when user types or selects
 *   placeholder - input placeholder
 *   className   - extra classes
 */
export default function VendorAutocomplete({ value, onChange, placeholder = "Type to search vendors...", className = "" }) {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  // Sync external value
  useEffect(() => { setQuery(value || ""); }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback(async (q) => {
    if (!q.trim()) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    try {
      const r = await api.get(`/vendors/search?q=${encodeURIComponent(q)}`);
      setSuggestions(r.data);
      setOpen(r.data.length > 0);
    } catch { setSuggestions([]); }
    finally { setLoading(false); }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val, null); // pass text immediately, no vendor_id
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 250);
  };

  const handleSelect = (vendor) => {
    setQuery(vendor.name);
    setSuggestions([]);
    setOpen(false);
    onChange(vendor.name, vendor.id);
  };

  const inp = `w-full h-10 sm:h-9 px-3 text-base sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`;

  return (
    <div ref={containerRef} className="relative" data-testid="vendor-autocomplete">
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => query && suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className={inp}
        autoComplete="off"
        data-testid="vendor-search-input"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden" data-testid="vendor-suggestions">
          {suggestions.map(v => (
            <li
              key={v.id}
              onMouseDown={() => handleSelect(v)}
              className="flex items-center justify-between px-3 py-2.5 text-sm hover:bg-blue-50 cursor-pointer transition-colors"
              data-testid="vendor-suggestion-item"
            >
              <span className="font-medium text-slate-900">{v.name}</span>
              {v.phone && <span className="text-xs text-slate-400">{v.phone}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
