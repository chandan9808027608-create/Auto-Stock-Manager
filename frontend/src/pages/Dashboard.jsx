import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AlertTriangle, TrendingUp, Package, Users, Wrench, DollarSign, Clock, ShoppingCart } from "lucide-react";
import api from "../utils/api";
import { formatNPR } from "../utils/helpers";

const KPICard = ({ title, value, subtitle, icon: Icon, color, testid }) => (
  <div data-testid={testid} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow duration-200 animate-fade-in">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Manrope, sans-serif" }}>{value}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
    </div>
  </div>
);

const AlertCard = ({ title, count, description, color, onClick }) => (
  <div onClick={onClick} className={`${color} rounded-lg p-4 cursor-pointer hover:opacity-90 transition-opacity`} data-testid="alert-card">
    <div className="flex items-center gap-2 mb-1">
      <AlertTriangle size={15} />
      <span className="font-semibold text-sm">{title}</span>
      <span className="ml-auto font-bold text-lg">{count}</span>
    </div>
    <p className="text-xs opacity-80">{description}</p>
  </div>
);

const AGING_COLORS = { fresh: "#22c55e", normal: "#eab308", slow: "#f97316", dead: "#ef4444" };

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/reports/dashboard")
      .then(r => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );

  if (!stats) return null;

  const agingData = [
    { name: "Fresh (0-30d)", count: stats.fresh_count || 0, color: AGING_COLORS.fresh },
    { name: "Normal (31-45d)", count: stats.normal_count || 0, color: AGING_COLORS.normal },
    { name: "Slow (46-60d)", count: stats.slow_moving_count || 0, color: AGING_COLORS.slow },
    { name: "Dead (60+d)", count: stats.dead_stock_count || 0, color: AGING_COLORS.dead },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Overview of Hamro G n G Auto operations</p>
      </div>

      {/* KPI Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Available Vehicles" value={stats.available} icon={Package} color="bg-blue-500" testid="kpi-available" />
        <KPICard title="Vehicles Sold" value={stats.sold} icon={ShoppingCart} color="bg-green-500" testid="kpi-sold" />
        <KPICard title="Locked Capital" value={formatNPR(stats.locked_capital)} icon={DollarSign} color="bg-indigo-500" testid="kpi-capital" subtitle="In available stock" />
        <KPICard title="Realized Profit" value={formatNPR(stats.total_realized_profit)} icon={TrendingUp} color="bg-emerald-500" testid="kpi-profit" subtitle="From sold vehicles" />
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Reserved" value={stats.reserved} icon={Clock} color="bg-yellow-500" testid="kpi-reserved" />
        <KPICard title="Customers" value={stats.total_customers} icon={Users} color="bg-purple-500" testid="kpi-customers" />
        <KPICard title="Pending Jobs" value={stats.pending_jobs} icon={Wrench} color="bg-orange-500" testid="kpi-pending-jobs" />
        <KPICard title="Total Vehicles" value={stats.total_vehicles} icon={Package} color="bg-slate-500" testid="kpi-total" subtitle="All time" />
      </div>

      {/* Charts + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Aging Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5" data-testid="aging-chart">
          <h2 className="text-base font-bold text-slate-900 mb-4" style={{ fontFamily: "Manrope, sans-serif" }}>Stock Aging Overview</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={agingData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748B" }} allowDecimals={false} />
              <Tooltip formatter={(val) => [`${val} vehicles`]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {agingData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5" data-testid="alerts-panel">
          <h2 className="text-base font-bold text-slate-900 mb-4" style={{ fontFamily: "Manrope, sans-serif" }}>Stock Alerts</h2>
          <div className="space-y-3">
            <AlertCard
              title="Dead Stock"
              count={stats.dead_stock_count}
              description="60+ days. Immediate action needed."
              color="bg-red-100 text-red-800"
              onClick={() => navigate("/inventory?aging=dead")}
            />
            <AlertCard
              title="Slow Moving"
              count={stats.slow_moving_count}
              description="46–60 days. Consider price reduction."
              color="bg-orange-100 text-orange-800"
              onClick={() => navigate("/inventory?aging=slow")}
            />
            <AlertCard
              title="Pending Jobs"
              count={stats.pending_jobs}
              description="Job cards awaiting attention."
              color="bg-yellow-100 text-yellow-800"
              onClick={() => navigate("/jobs?status=pending")}
            />
            {stats.in_progress_jobs > 0 && (
              <AlertCard
                title="In Progress"
                count={stats.in_progress_jobs}
                description="Active repair/prep work."
                color="bg-blue-100 text-blue-800"
                onClick={() => navigate("/jobs?status=in_progress")}
              />
            )}
          </div>
        </div>
      </div>

      {/* Quick Action */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="font-semibold text-blue-900 text-sm">Need AI-powered business advice?</p>
          <p className="text-blue-700 text-xs mt-0.5">Get inventory, finance, and festival strategy recommendations</p>
        </div>
        <button
          onClick={() => navigate("/ai")}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors active:scale-95"
          data-testid="go-to-ai-btn"
        >
          Ask AI
        </button>
      </div>
    </div>
  );
}
