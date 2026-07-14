import { useState, useRef } from "react";
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import api from "../utils/api";

const REQUIRED_COLUMNS = ["brand", "model", "year", "purchase_price", "purchase_date", "purchase_source", "registration_number"];
const OPTIONAL_COLUMNS = [
  "variant", "engine_cc", "fuel_type", "ownership_number", "chassis_number", "engine_number",
  "kilometer_run", "condition", "condition_rating", "color",
  "accessories_cost", "purchase_from", "selling_price", "minimum_selling_price", "notes", "status",
];

export default function ImportStock() {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  const acceptFile = (f) => {
    if (!f) return;
    const name = f.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".csv")) {
      toast.error("Only .xlsx or .csv files are supported");
      return;
    }
    setFile(f);
    setResult(null);
  };

  const handleImport = async () => {
    if (!file) { toast.error("Choose a file first"); return; }
    setImporting(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post("/vehicles/import", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setResult(r.data);
      if (r.data.inserted > 0) toast.success(`Imported ${r.data.inserted} vehicle${r.data.inserted !== 1 ? "s" : ""}`);
      if (r.data.skipped > 0) toast.error(`${r.data.skipped} row${r.data.skipped !== 1 ? "s" : ""} skipped — see details below`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Import Stock</h1>
        <p className="text-sm text-slate-500">Bulk-add vehicles to inventory from a spreadsheet</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <label
          className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl h-40 cursor-pointer transition-colors ${
            dragOver ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-300"
          }`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) acceptFile(e.dataTransfer.files[0]); }}
          data-testid="import-dropzone"
        >
          {file ? (
            <>
              <FileSpreadsheet size={26} className="text-blue-600" />
              <span className="text-sm font-medium text-slate-800">{file.name}</span>
              <span className="text-xs text-slate-400">Click to choose a different file</span>
            </>
          ) : (
            <>
              <UploadCloud size={26} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-600">Click to choose a file, or drag it in</span>
              <span className="text-xs text-slate-400">.xlsx or .csv</span>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv"
            className="hidden"
            onChange={e => acceptFile(e.target.files[0])}
            data-testid="import-file-input"
          />
        </label>

        <div className="flex gap-3 mt-4">
          {file && (
            <button
              type="button"
              onClick={() => { setFile(null); setResult(null); if (inputRef.current) inputRef.current.value = ""; }}
              className="h-10 px-4 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={handleImport}
            disabled={!file || importing}
            data-testid="import-submit-btn"
            className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60 active:scale-95 transition-all"
          >
            {importing ? "Importing..." : "Import Stock"}
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4" data-testid="import-result">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-700" style={{ fontFamily: "Manrope" }}>{result.inserted}</div>
              <div className="text-xs text-green-600 mt-0.5">Imported</div>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-red-700" style={{ fontFamily: "Manrope" }}>{result.skipped}</div>
              <div className="text-xs text-red-600 mt-0.5">Skipped</div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-slate-800" style={{ fontFamily: "Manrope" }}>{result.total_rows}</div>
              <div className="text-xs text-slate-500 mt-0.5">Total Rows</div>
            </div>
          </div>

          {result.inserted > 0 && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
              <CheckCircle2 size={15} /> {result.inserted} vehicle{result.inserted !== 1 ? "s" : ""} added to Inventory as Available.
            </div>
          )}

          {result.errors?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Skipped Rows ({result.skipped})</p>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-red-700">Row {e.row}:</span>{" "}
                      <span className="text-red-600">{e.reason}</span>
                    </div>
                  </div>
                ))}
              </div>
              {result.skipped > result.errors.length && (
                <p className="text-xs text-slate-400 mt-1.5">Showing first {result.errors.length} of {result.skipped} errors.</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Expected Columns</p>
        <p className="text-sm text-slate-500 mb-3">
          The first row must be a header row. Column names are case-insensitive and spaces are treated as underscores
          (e.g. &quot;Purchase Price&quot; or &quot;purchase_price&quot; both work). Dates can be in most common formats
          (e.g. <span className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">2026-07-14</span>, <span className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">14/07/2026</span>, or <span className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">14 Jul 2026</span>).
        </p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {REQUIRED_COLUMNS.map(c => (
            <span key={c} className="text-xs font-mono bg-red-50 text-red-700 border border-red-100 px-2 py-1 rounded-md">{c} *</span>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {OPTIONAL_COLUMNS.map(c => (
            <span key={c} className="text-xs font-mono bg-slate-50 text-slate-600 border border-slate-100 px-2 py-1 rounded-md">{c}</span>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-3">* required column. Rows missing a required value are skipped and listed above. Vehicles are imported as Available unless a valid <span className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">status</span> column (available, reserved, sold, unlisted, scrap, or in_repair) is provided.</p>
      </div>
    </div>
  );
}
