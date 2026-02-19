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
    available: { bg: "bg-blue-100",   text: "text-blue-800",   label: "Available" },
    sold:      { bg: "bg-green-100",  text: "text-green-800",  label: "Sold" },
    reserved:  { bg: "bg-yellow-100", text: "text-yellow-800", label: "Reserved" },
  };
  return map[status] || map.available;
};

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

export const BRANDS = ["Honda", "Yamaha", "TVS", "Bajaj", "Suzuki", "Hero", "KTM", "Royal Enfield", "Other"];
export const SOURCES = ["Direct Owner", "Auction", "Exchange", "Dealer", "Other"];
export const CONDITIONS = ["Excellent", "Good", "Fair", "Poor"];
export const FUEL_TYPES = ["Petrol", "Electric", "Hybrid"];
export const ENGINE_CCS = [50, 100, 110, 125, 150, 160, 200, 250, 300, 400, 500];
export const DOC_STATUSES = ["ok", "pending", "missing"];
export const EXPENSE_CATEGORIES = [
  { value: "denting_paint", label: "Denting/Paint" },
  { value: "servicing", label: "Servicing" },
  { value: "parts", label: "Parts Replacement" },
  { value: "labor", label: "Labor Cost" },
  { value: "transport", label: "Transport" },
  { value: "other", label: "Other" },
];
