import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

export default function Settings() {
  const { user, logout } = useAuth();
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [saving, setSaving] = useState(false);

  const changePassword = async (e) => {
    e.preventDefault();
    if (!pwForm.current_password || !pwForm.new_password) { toast.error("Fill all fields"); return; }
    if (pwForm.new_password !== pwForm.confirm) { toast.error("Passwords don't match"); return; }
    if (pwForm.new_password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setSaving(true);
    try {
      await api.post("/auth/change-password", { current_password: pwForm.current_password, new_password: pwForm.new_password });
      toast.success("Password changed successfully!");
      setPwForm({ current_password: "", new_password: "", confirm: "" });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to change password");
    } finally { setSaving(false); }
  };

  const inp = "w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-base font-bold text-slate-900 mb-4" style={{ fontFamily: "Manrope" }}>Profile</h2>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
            {user?.name?.[0]?.toUpperCase() || "A"}
          </div>
          <div>
            <div className="font-bold text-slate-900 text-lg">{user?.name}</div>
            <div className="text-sm text-slate-500">@{user?.username} · {user?.role}</div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-base font-bold text-slate-900 mb-4" style={{ fontFamily: "Manrope" }}>Change Password</h2>
        <form onSubmit={changePassword} className="space-y-4">
          {[["Current Password","current_password"],["New Password","new_password"],["Confirm New Password","confirm"]].map(([label, key]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
              <input
                type="password"
                value={pwForm[key]}
                onChange={e => setPwForm({...pwForm, [key]: e.target.value})}
                className={inp}
                data-testid={`pw-${key}`}
                placeholder="••••••••"
              />
            </div>
          ))}
          <button type="submit" disabled={saving} data-testid="change-pw-btn" className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60 transition-all active:scale-95">
            {saving ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>

      {/* App Info */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-base font-bold text-slate-900 mb-4" style={{ fontFamily: "Manrope" }}>System Information</h2>
        <div className="space-y-3 text-sm">
          {[
            ["Business", "Hamro G n G Auto"],
            ["Version", "1.0.0"],
            ["Currency", "NPR (Nepalese Rupee)"],
            ["AI Engine", "Gemini 3 Flash"],
            ["Database", "MongoDB"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-2 border-b border-slate-50 last:border-0">
              <span className="text-slate-500">{k}</span>
              <span className="font-medium text-slate-900">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Default Credentials */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
        <h3 className="text-sm font-bold text-amber-900 mb-2">Default Login Credentials</h3>
        <p className="text-xs text-amber-700">Username: <span className="font-mono font-bold">admin</span> &nbsp;|&nbsp; Password: <span className="font-mono font-bold">admin123</span></p>
        <p className="text-xs text-amber-600 mt-1">Please change the default password for security.</p>
      </div>
    </div>
  );
}
