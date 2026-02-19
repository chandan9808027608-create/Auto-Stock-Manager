import { useState } from "react";
import { Sparkles, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "../utils/api";

const CONTEXT_TYPES = [
  { value: "inventory", label: "Inventory Analysis", icon: "📦", desc: "Get advice on slow-moving stock and price adjustments" },
  { value: "finance", label: "Finance & Capital", icon: "💰", desc: "Capital risk analysis and cash flow recommendations" },
  { value: "customer", label: "Customer Follow-up", icon: "👥", desc: "Strategies to re-engage existing customers" },
  { value: "festival", label: "Festival Strategy", icon: "🎉", desc: "Dashain/Tihar sales strategy and pricing advice" },
];

export default function AIAssistant() {
  const [contextType, setContextType] = useState("inventory");
  const [additionalContext, setAdditionalContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState("");
  const [lastContext, setLastContext] = useState("");

  const getSuggestions = async () => {
    setLoading(true);
    setSuggestions("");
    try {
      const r = await api.post("/ai/suggestions", { context_type: contextType, additional_context: additionalContext || null });
      setSuggestions(r.data.suggestions);
      setLastContext(contextType);
    } catch (err) {
      toast.error(err.response?.data?.detail || "AI request failed. Check your key balance.");
    } finally { setLoading(false); }
  };

  const selectedCtx = CONTEXT_TYPES.find(c => c.value === contextType);

  // Format suggestions with basic markdown-like rendering
  const formatSuggestions = (text) => {
    if (!text) return null;
    const lines = text.split("\n");
    return lines.map((line, i) => {
      if (line.match(/^\d+\./)) {
        return <p key={i} className="mb-2 font-medium text-slate-900">{line}</p>;
      }
      if (line.startsWith("**") && line.endsWith("**")) {
        return <p key={i} className="mb-1 font-bold text-blue-700">{line.replace(/\*\*/g, "")}</p>;
      }
      if (line.startsWith("- ") || line.startsWith("• ")) {
        return <p key={i} className="mb-1 pl-4 text-slate-700">{line}</p>;
      }
      if (line.trim() === "") return <br key={i} />;
      return <p key={i} className="mb-1 text-slate-700">{line}</p>;
    });
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
          <Sparkles size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Business Assistant</h1>
          <p className="text-sm text-slate-500">Powered by Gemini AI — Get actionable insights for your business</p>
        </div>
      </div>

      {/* Context Type Selection */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-sm font-bold text-slate-900 mb-4" style={{ fontFamily: "Manrope" }}>What do you want advice on?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {CONTEXT_TYPES.map(ctx => (
            <button
              key={ctx.value}
              onClick={() => setContextType(ctx.value)}
              data-testid={`ai-context-${ctx.value}`}
              className={`text-left p-4 rounded-xl border-2 transition-all ${contextType === ctx.value ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}
            >
              <div className="text-xl mb-1">{ctx.icon}</div>
              <div className={`font-semibold text-sm ${contextType === ctx.value ? "text-blue-700" : "text-slate-900"}`}>{ctx.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{ctx.desc}</div>
            </button>
          ))}
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Additional context or specific question (optional)</label>
          <textarea
            value={additionalContext}
            onChange={e => setAdditionalContext(e.target.value)}
            placeholder="e.g. 'We have 5 Honda bikes that have been sitting for 50 days' or 'Dashain is in 2 weeks'"
            rows={3}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            data-testid="ai-additional-context"
          />
        </div>

        <button
          onClick={getSuggestions}
          disabled={loading}
          data-testid="ai-get-suggestions-button"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-all active:scale-95 disabled:opacity-60"
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" />Analyzing your data...</>
          ) : (
            <><Sparkles size={16} />Get AI Recommendations</>
          )}
        </button>
      </div>

      {/* Results */}
      {loading && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <Loader2 size={32} className="animate-spin mx-auto text-blue-600 mb-3" />
          <p className="font-medium text-slate-700">Analyzing your business data...</p>
          <p className="text-sm text-slate-500 mt-1">This may take a few seconds</p>
        </div>
      )}

      {suggestions && !loading && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5" data-testid="ai-suggestions-result">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
              <Sparkles size={14} className="text-blue-600" />
            </div>
            <h2 className="text-base font-bold text-slate-900" style={{ fontFamily: "Manrope" }}>
              AI Recommendations — {CONTEXT_TYPES.find(c => c.value === lastContext)?.label}
            </h2>
          </div>
          <div className="prose prose-sm max-w-none">
            <div className="bg-slate-50 rounded-xl p-4 text-sm leading-relaxed">
              {formatSuggestions(suggestions)}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={getSuggestions}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              data-testid="ai-refresh-btn"
            >
              Regenerate
            </button>
            <span className="text-slate-300">·</span>
            <span className="text-xs text-slate-400">Powered by Gemini 3 Flash</span>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <h3 className="text-sm font-bold text-blue-900 mb-2">How to get the best recommendations</h3>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Add vehicles with accurate purchase dates for aging analysis</li>
          <li>• Record all expenses per vehicle for better financial insights</li>
          <li>• Keep selling prices updated for margin calculations</li>
          <li>• Add customer records for follow-up suggestions</li>
        </ul>
      </div>
    </div>
  );
}
