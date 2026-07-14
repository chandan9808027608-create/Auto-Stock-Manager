export const formatNPR = (amount) => {
  if (amount === null || amount === undefined) return "N/A";
  return `Rs. ${new Intl.NumberFormat("en-IN").format(Math.round(amount))}`;
};

export const getAgingStyle = (category) => {
  const map = {
    fresh:  { bg: "bg-green-100",  text: "text-green-800",  border: "border-green-200", label: "Fresh Stock" },
    normal: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-200", label: "Normal" },
    slow:   { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-200", label: "Slow Moving" },
    dead:   { bg: "bg-red-100",    text: "text-red-800",    border: "border-red-200",   label: "Dead Stock" },
  };
  return map[category] || map.fresh;
};

export const getStatusStyle = (status) => {
  const map = {
    unlisted:  { bg: "bg-slate-200",  text: "text-slate-700",  label: "Unlisted" },
    scrap:     { bg: "bg-red-100",    text: "text-red-800",    label: "Scrap" },
    in_repair: { bg: "bg-purple-100", text: "text-purple-800", label: "In Repair" },
    available: { bg: "bg-blue-100",   text: "text-blue-800",   label: "Available" },
    sold:      { bg: "bg-green-100",  text: "text-green-800",  label: "Sold" },
    reserved:  { bg: "bg-yellow-100", text: "text-yellow-800", label: "Reserved" },
  };
  if (status === "hidden") return map.unlisted; // legacy alias, pre-rename data
  return map[status] || map.available;
};

export const VEHICLE_STATUS_OPTIONS = [
  { value: "unlisted", label: "Unlisted" },
  { value: "scrap", label: "Scrap" },
  { value: "in_repair", label: "In Repair" },
  { value: "available", label: "Available" },
  { value: "reserved", label: "Reserved" },
  { value: "sold", label: "Sold" },
];

export const getJobStyle = (status) => {
  const map = {
    pending:     { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pending" },
    in_progress: { bg: "bg-blue-100",   text: "text-blue-800",   label: "In Progress" },
    completed:   { bg: "bg-green-100",  text: "text-green-800",  label: "Completed" },
  };
  return map[status] || map.pending;
};

export const getDocStyle = (status) => {
  const map = {
    ok:      { bg: "bg-green-100", text: "text-green-800", label: "OK" },
    pending: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pending" },
    missing: { bg: "bg-red-100",   text: "text-red-800",   label: "Missing" },
  };
  return map[status] || map.pending;
};

export const BRANDS = ["Honda", "Yamaha", "TVS", "Bajaj", "Suzuki", "Hero", "KTM", "Royal Enfield", "Lifan", "Other"];
export const SOURCES = ["Direct Owner", "Auction", "Exchange", "Dealer", "Other"];
export const CONDITIONS = ["Excellent", "Good", "Fair", "Poor"];
export const FUEL_TYPES = ["Petrol", "Electric", "Hybrid"];
export const ENGINE_CCS = [50, 100, 110, 125, 150, 160, 200, 250, 300, 400, 500];
export const DOC_STATUSES = ["ok", "pending", "missing"];
export const VEHICLE_STATUSES = ["available", "reserved", "sold", "in_repair", "exchange", "finance_pending"];
export const EXPENSE_CATEGORIES = [
  { value: "denting_paint", label: "Denting/Paint" },
  { value: "servicing", label: "Servicing" },
  { value: "parts", label: "Parts Replacement" },
  { value: "labor", label: "Labor Cost" },
  { value: "transport", label: "Transport" },
  { value: "other", label: "Other" },
];

export const USER_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "partner", label: "Partner" },
  { value: "sales_manager", label: "Sales Manager" },
  { value: "sales_staff", label: "Sales Staff" },
  { value: "mechanic", label: "Mechanic" },
  { value: "accountant", label: "Accountant" },
  { value: "branch_manager", label: "Branch Manager" },
];

// Bikram Sambat (BS) approximate conversion
export const adToBS = (adDateStr) => {
  if (!adDateStr) return "—";
  try {
    const d = new Date(adDateStr);
    if (isNaN(d.getTime())) return "—";
    const yr = d.getFullYear();
    const mo = d.getMonth();
    const day = d.getDate();
    // Nepal New Year is ~April 13-14; after that, BS year = AD year + 57, before = +56
    const bsYear = (mo > 3 || (mo === 3 && day >= 14)) ? yr + 57 : yr + 56;
    const nepMonths = ["Baisakh","Jestha","Ashadh","Shrawan","Bhadra","Ashwin","Kartik","Mangsir","Poush","Magh","Falgun","Chaitra"];
    // BS month ≈ AD month shifted by ~8.5 months (very approximate)
    const bsMonthIdx = (mo + 9) % 12;
    return `${bsYear} ${nepMonths[bsMonthIdx]} BS`;
  } catch { return "—"; }
};

export const formatDateDual = (adDateStr) => {
  if (!adDateStr) return "—";
  try {
    const d = new Date(adDateStr);
    if (isNaN(d.getTime())) return adDateStr.slice(0, 10);
    const adStr = d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    const yr = d.getFullYear();
    const bsYear = (d.getMonth() > 3 || (d.getMonth() === 3 && d.getDate() >= 14)) ? yr + 57 : yr + 56;
    return `${adStr} · ${bsYear} BS`;
  } catch { return adDateStr?.slice(0, 10) || "—"; }
};
