import { useEffect, useState, useCallback } from "react";
import { Plus, Wrench, TrendingUp, Users, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import api from "../utils/api";

export default function Team() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: "", role: "mechanic", contact: "", specialization: "", commission_rate: "", joining_date: "" });
  const [saving, setSaving] = useState(false);

  const fetchTeam = useCallback(async () => {
    try { const r = await api.get("/team"); setMembers(r.data); }
    catch { toast.error("Failed to load team"); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const openAdd = () => { setEditItem(null); setForm({ name: "", role: "mechanic", contact: "", specialization: "", commission_rate: "", joining_date: "" }); setShowModal(true); };
  const openEdit = (m) => { setEditItem(m); setForm({ name: m.name, role: m.role, contact: m.contact || "", specialization: m.specialization || "", commission_rate: m.commission_rate || "", joining_date: m.joining_date || "" }); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.role) { toast.error("Name and role are required"); return; }
    setSaving(true);
    try {
      const payload = { ...form, commission_rate: form.commission_rate ? Number(form.commission_rate) : null };
      if (editItem) { await api.put(`/team/${editItem.id}`, payload); toast.success("Updated"); }
      else { await api.post("/team", payload); toast.success("Team member added!"); }
      setShowModal(false); fetchTeam();
    } catch { toast.error("Failed to save"); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this team member?")) return;
    try { await api.delete(`/team/${id}`); toast.success("Removed"); fetchTeam(); }
    catch { toast.error("Failed"); }
  };

  const mechanics = members.filter(m => m.role === "mechanic");
  const salesStaff = members.filter(m => m.role === "sales");

  const inp = "w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";
  const sel = "w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  const MemberCard = ({ member }) => (
    <div data-testid="team-member-card" className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${member.role === "mechanic" ? "bg-blue-500" : "bg-purple-500"}`}>
            {member.name[0]?.toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm">{member.name}</div>
            <div className={`text-xs capitalize px-2 py-0.5 rounded-full font-medium inline-block mt-0.5 ${member.role === "mechanic" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
              {member.role === "mechanic" ? "Mechanic" : "Sales Staff"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(member)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><Edit size={14} className="text-slate-400" /></button>
          <button onClick={() => handleDelete(member.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} className="text-red-400" /></button>
        </div>
      </div>

      <div className="space-y-1.5 text-sm text-slate-600">
        {member.contact && <div className="flex items-center gap-2"><span className="text-slate-400 text-xs">Phone:</span>{member.contact}</div>}
        {member.specialization && <div className="flex items-center gap-2"><span className="text-slate-400 text-xs">Specialization:</span>{member.specialization}</div>}
        {member.commission_rate && <div className="flex items-center gap-2"><span className="text-slate-400 text-xs">Commission:</span>{member.commission_rate}%</div>}
        <div className="flex items-center gap-2"><span className="text-slate-400 text-xs">Joined:</span>{member.joining_date?.slice(0, 10)}</div>
      </div>

      {member.role === "mechanic" && (
        <div className="mt-3 pt-3 border-t border-slate-50 grid grid-cols-2 gap-2">
          <div className="text-center bg-slate-50 rounded-lg p-2">
            <div className="text-lg font-bold text-slate-900" style={{ fontFamily: "Manrope" }}>{member.total_jobs || 0}</div>
            <div className="text-xs text-slate-500">Total Jobs</div>
          </div>
          <div className="text-center bg-green-50 rounded-lg p-2">
            <div className="text-lg font-bold text-green-700" style={{ fontFamily: "Manrope" }}>{member.completed_jobs || 0}</div>
            <div className="text-xs text-green-600">Completed</div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Management</h1>
          <p className="text-sm text-slate-500">{members.length} team members</p>
        </div>
        <button onClick={openAdd} data-testid="add-member-button" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-all active:scale-95 shadow-sm">
          <Plus size={16} /> Add Member
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-slate-900" style={{ fontFamily: "Manrope" }}>{members.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Total Staff</div>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-700" style={{ fontFamily: "Manrope" }}>{mechanics.length}</div>
          <div className="text-xs text-blue-600 mt-0.5 flex items-center justify-center gap-1"><Wrench size={11} />Mechanics</div>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-700" style={{ fontFamily: "Manrope" }}>{salesStaff.length}</div>
          <div className="text-xs text-purple-600 mt-0.5 flex items-center justify-center gap-1"><TrendingUp size={11} />Sales Staff</div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="animate-spin w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full" /></div>
      ) : (
        <>
          {mechanics.length > 0 && (
            <div>
              <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2" style={{ fontFamily: "Manrope" }}><Wrench size={17} className="text-blue-500" />Mechanics</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {mechanics.map(m => <MemberCard key={m.id} member={m} />)}
              </div>
            </div>
          )}
          {salesStaff.length > 0 && (
            <div>
              <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2" style={{ fontFamily: "Manrope" }}><TrendingUp size={17} className="text-purple-500" />Sales Staff</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {salesStaff.map(m => <MemberCard key={m.id} member={m} />)}
              </div>
            </div>
          )}
          {members.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
              <Users size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No team members yet</p>
              <p className="text-sm mt-1">Add mechanics and sales staff to get started</p>
            </div>
          )}
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">{editItem ? "Edit Member" : "Add Team Member"}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Full Name <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Ramesh Tamang" className={inp} data-testid="member-name-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Role <span className="text-red-500">*</span></label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className={sel} data-testid="member-role-select">
                  <option value="mechanic">Mechanic</option>
                  <option value="sales">Sales Staff</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Contact Number</label>
                <input type="tel" value={form.contact} onChange={e => setForm({...form, contact: e.target.value})} placeholder="9841234567" className={inp} />
              </div>
              {form.role === "mechanic" && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Specialization</label>
                  <input value={form.specialization} onChange={e => setForm({...form, specialization: e.target.value})} placeholder="e.g. Engine repair, electrical" className={inp} />
                </div>
              )}
              {form.role === "sales" && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Commission Rate (%)</label>
                  <input type="number" value={form.commission_rate} onChange={e => setForm({...form, commission_rate: e.target.value})} placeholder="e.g. 2.5" className={inp} />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Joining Date</label>
                <input type="date" value={form.joining_date} onChange={e => setForm({...form, joining_date: e.target.value})} className={inp} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 h-10 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60" data-testid="save-member-btn">
                  {saving ? "Saving..." : editItem ? "Update" : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
