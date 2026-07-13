import { useEffect, useState, useCallback } from "react";
import { Phone, Trash2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import api from "../utils/api";
import { formatDateDual } from "../utils/helpers";

const TYPE_LABELS = { sell: "Sell", exchange: "Exchange", service: "Book Service" };
const STATUS_OPTIONS = ["new", "contacted", "closed"];

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);

  const fetchLeads = useCallback(async () => {
    try { const r = await api.get("/leads"); setLeads(r.data); }
    catch { toast.error("Failed to load leads"); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/leads/${id}`, { status });
      setLeads(leads.map(l => l.id === id ? { ...l, status } : l));
    } catch { toast.error("Failed to update status"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this lead?")) return;
    try { await api.delete(`/leads/${id}`); toast.success("Deleted"); fetchLeads(); }
    catch { toast.error("Failed"); }
  };

  const filtered = leads.filter(l =>
    (typeFilter === "all" || l.type === typeFilter) &&
    (statusFilter === "all" || l.status === statusFilter)
  );

  const sel = "h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
          <p className="text-sm text-slate-500">{leads.length} submissions from the storefront (Sell / Exchange / Book Service)</p>
        </div>
        <div className="flex gap-3">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={sel} data-testid="lead-type-filter">
            <option value="all">All Types</option>
            <option value="sell">Sell</option>
            <option value="exchange">Exchange</option>
            <option value="service">Book Service</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={sel} data-testid="lead-status-filter">
            <option value="all">All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="animate-spin w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
          <p className="font-medium">No leads yet</p>
          <p className="text-sm mt-1">Sell / Exchange / Book Service submissions from the storefront will show up here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(l => (
            <div key={l.id} data-testid="lead-card" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      {l.name}
                      <span className="text-[10px] font-semibold uppercase tracking-wide bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                        {TYPE_LABELS[l.type] || l.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1"><Phone size={11} />{l.phone}</span>
                      <span>{formatDateDual(l.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={l.status}
                      onChange={e => updateStatus(l.id, e.target.value)}
                      className={sel}
                      data-testid="lead-status-select"
                    >
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                    </select>
                    <button onClick={() => handleDelete(l.id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={14} className="text-red-400" /></button>
                  </div>
                </div>

                {l.message && (
                  <p className="mt-3 text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2">{l.message}</p>
                )}

                {l.images?.length > 0 && (
                  <button
                    onClick={() => setExpanded(expanded === l.id ? null : l.id)}
                    className="mt-3 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    <ImageIcon size={13} /> {expanded === l.id ? "Hide" : "View"} {l.images.length} Photo{l.images.length > 1 ? "s" : ""}
                  </button>
                )}
                {expanded === l.id && l.images?.length > 0 && (
                  <div className="mt-3 grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {l.images.map((img, i) => (
                      <img key={i} src={img} alt={`Lead photo ${i + 1}`} className="w-full aspect-square object-cover rounded-lg border border-slate-200" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
