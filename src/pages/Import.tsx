import { useState, useRef, useCallback } from "react";
import Papa from "papaparse";
import { Upload, FileText, FileCode, File, ChevronRight, Check, X, AlertTriangle, Loader2, ArrowLeft, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

/* ─── Types ─────────────────────────────────────── */
type Step = "upload" | "mapping" | "preview" | "done";

type TargetField = "name" | "phone" | "email" | "status" | "estimatedValue" | "source" | "notes" | "business" | "skip";

const TARGET_FIELDS: { value: TargetField; label: string; required?: boolean }[] = [
  { value: "name",           label: "Nama Customer",    required: true },
  { value: "phone",          label: "No. HP / WhatsApp" },
  { value: "email",          label: "Email" },
  { value: "status",         label: "Status Lead" },
  { value: "estimatedValue", label: "Estimasi Nilai (Rp)" },
  { value: "source",         label: "Sumber / Source" },
  { value: "notes",          label: "Catatan / Notes" },
  { value: "business",       label: "Unit Bisnis" },
  { value: "skip",           label: "— Abaikan kolom ini —" },
];

const AUTO_MAP: Record<string, TargetField> = {
  name: "name", nama: "name", "customer name": "name", "nama customer": "name", "full name": "name",
  phone: "phone", hp: "phone", "no hp": "phone", telepon: "phone", whatsapp: "phone", wa: "phone", "no. hp": "phone", mobile: "phone",
  email: "email",
  status: "status", "lead status": "status", stage: "status", pipeline: "status",
  value: "estimatedValue", "estimated value": "estimatedValue", "estimasi nilai": "estimatedValue", nilai: "estimatedValue", harga: "estimatedValue", budget: "estimatedValue",
  source: "source", sumber: "source", channel: "source",
  notes: "notes", catatan: "notes", memo: "notes", keterangan: "notes", note: "notes",
  business: "business", bisnis: "business", "unit bisnis": "business", brand: "business",
};

function guessMapping(headers: string[]): Record<string, TargetField> {
  const m: Record<string, TargetField> = {};
  headers.forEach((h) => {
    const key = h.toLowerCase().trim();
    m[h] = AUTO_MAP[key] || "skip";
  });
  return m;
}

/* ─── File type icons ────────────────────────────── */
function FileIcon({ type }: { type: string }) {
  if (type === "pdf") return <File className="h-5 w-5 text-red-500" />;
  if (type === "html") return <FileCode className="h-5 w-5 text-orange-500" />;
  return <FileText className="h-5 w-5 text-blue-500" />;
}

/* ─── Parse HTML table ───────────────────────────── */
function parseHtml(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/html");
  const table = doc.querySelector("table");
  if (!table) return { headers: [], rows: [] };

  const headerCells = Array.from(table.querySelectorAll("thead tr th, thead tr td"));
  const headers = headerCells.length
    ? headerCells.map(c => c.textContent?.trim() || "")
    : Array.from(table.querySelectorAll("tr:first-child th, tr:first-child td")).map(c => c.textContent?.trim() || "");

  const bodyRows = Array.from(table.querySelectorAll("tbody tr"));
  if (!bodyRows.length) {
    const allRows = Array.from(table.querySelectorAll("tr")).slice(1);
    const rows = allRows.map(tr => {
      const cells = Array.from(tr.querySelectorAll("td, th"));
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = cells[i]?.textContent?.trim() || ""; });
      return obj;
    });
    return { headers, rows };
  }

  const rows = bodyRows.map(tr => {
    const cells = Array.from(tr.querySelectorAll("td, th"));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = cells[i]?.textContent?.trim() || ""; });
    return obj;
  });
  return { headers, rows };
}

/* ─── Main component ─────────────────────────────── */
export default function ImportPage() {
  const [step, setStep] = useState<Step>("upload");
  const [fileType, setFileType] = useState<"csv" | "html" | "pdf" | null>(null);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, TargetField>>({});
  const [defaultBizId, setDefaultBizId] = useState("");
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; total: number } | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: bizList } = useQuery({ queryKey: ["businesses"], queryFn: () => api.businesses.list() });

  /* ── File handler ── */
  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase() || "";

    if (ext === "pdf") {
      setFileType("pdf");
      setPdfFile(file);
      setStep("mapping");
      return;
    }

    const text = await file.text();

    if (ext === "csv" || ext === "txt") {
      setFileType("csv");
      const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
      const hdrs = result.meta.fields || [];
      setHeaders(hdrs);
      setRawRows(result.data);
      setMapping(guessMapping(hdrs));
      setStep("mapping");
      return;
    }

    if (ext === "html" || ext === "htm") {
      setFileType("html");
      const { headers: hdrs, rows } = parseHtml(text);
      if (!hdrs.length) {
        toast.error("Tidak ada tabel yang ditemukan di file HTML ini.");
        return;
      }
      setHeaders(hdrs);
      setRawRows(rows);
      setMapping(guessMapping(hdrs));
      setStep("mapping");
      return;
    }

    toast.error("Format tidak didukung. Gunakan CSV, HTML, atau PDF.");
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  /* ── Parse PDF via backend ── */
  const parsePdf = async () => {
    if (!pdfFile) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", pdfFile);
      const res = await fetch("/api/import/parse-pdf", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membaca PDF");

      const rows: Record<string, string>[] = data.rows || [];
      if (!rows.length) { toast.error("Tidak ada data customer yang ditemukan di PDF"); return; }

      const hdrs = Object.keys(rows[0]);
      setHeaders(hdrs);
      setRawRows(rows);
      setMapping(guessMapping(hdrs));
      setStep("preview");
    } catch (err: any) {
      toast.error(err.message || "Gagal membaca PDF");
    }
    setLoading(false);
  };

  /* ── Build mapped rows ── */
  const getMappedRows = () => {
    return rawRows.map(row => {
      const out: Record<string, string> = {};
      Object.entries(mapping).forEach(([src, tgt]) => {
        if (tgt !== "skip") out[tgt] = row[src] || "";
      });
      return out;
    });
  };

  /* ── Confirm import ── */
  const doImport = async () => {
    setLoading(true);
    try {
      const rows = getMappedRows();
      const res = await fetch("/api/import/customers", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, defaultBusinessId: defaultBizId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal import");

      setImportResult({ imported: data.imported, skipped: data.skipped, total: data.total });
      setStep("done");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["customers-pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["daily-focus"] });
    } catch (err: any) {
      toast.error(err.message || "Gagal import");
    }
    setLoading(false);
  };

  const mappedRows = step === "preview" || step === "done" ? getMappedRows() : [];
  const hasMappedName = Object.values(mapping).includes("name");

  /* ────────── STEP: Upload ────────── */
  if (step === "upload") return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link to="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors w-fit">
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Dasbor
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Import Customer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload file dari Notion atau sumber lain. Mendukung CSV, HTML, dan PDF.
        </p>
      </div>

      <div
        className={cn(
          "relative flex flex-col items-center justify-center gap-4 border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all",
          isDragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border bg-muted/20 hover:border-primary/50 hover:bg-primary/5"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" accept=".csv,.html,.htm,.pdf,.txt" className="hidden" onChange={onFileChange} />
        <div className="h-14 w-14 rounded-2xl bg-white border border-border shadow-sm flex items-center justify-center">
          <Upload className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-foreground text-base">Drag & drop file di sini</p>
          <p className="text-sm text-muted-foreground mt-1">atau klik untuk pilih file dari komputer</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {[
            { ext: "CSV", desc: "Notion Database Export", color: "bg-blue-50 text-blue-600 border-blue-200" },
            { ext: "HTML", desc: "Notion Page Export", color: "bg-orange-50 text-orange-600 border-orange-200" },
            { ext: "PDF", desc: "Dokumen / Laporan", color: "bg-red-50 text-red-600 border-red-200" },
          ].map(f => (
            <span key={f.ext} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border", f.color)}>
              {f.ext} <span className="font-normal opacity-70">— {f.desc}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="bg-white border border-border rounded-2xl card-shadow p-5">
        <p className="text-sm font-semibold text-foreground mb-3">Cara export dari Notion:</p>
        <ol className="space-y-2 text-sm text-muted-foreground list-none">
          {[
            'Buka database Notion kamu (tabel customer)',
            'Klik ••• (tiga titik) di pojok kanan atas',
            'Pilih "Export" → pilih format CSV atau HTML',
            'Download file-nya, lalu upload di sini',
          ].map((s, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );

  /* ────────── STEP: Mapping ────────── */
  if (step === "mapping") return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Pemetaan Kolom</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cocokkan kolom dari file ke field CRM. AI sudah mencoba menebak secara otomatis.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setStep("upload")} className="h-8 px-3 text-xs rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors">
            ← Ganti File
          </button>
        </div>
      </div>

      {/* PDF notice */}
      {fileType === "pdf" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">File PDF</p>
            <p className="text-xs text-amber-700 mt-0.5">
              AI akan membaca isi PDF dan mengekstrak data customer secara otomatis. Klik "Proses PDF" untuk mulai.
            </p>
          </div>
        </div>
      )}

      {/* File info */}
      <div className="bg-white border border-border rounded-xl px-4 py-3 flex items-center gap-3">
        <FileIcon type={fileType || "csv"} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{fileName}</p>
          {fileType !== "pdf" && (
            <p className="text-xs text-muted-foreground">{rawRows.length} baris data · {headers.length} kolom terdeteksi</p>
          )}
        </div>
      </div>

      {/* Bisnis default */}
      <div className="bg-white border border-border rounded-2xl card-shadow p-5">
        <p className="text-sm font-semibold text-foreground mb-1">Unit Bisnis Default</p>
        <p className="text-xs text-muted-foreground mb-3">
          Jika kolom bisnis kosong atau tidak dikenali, customer akan masuk ke bisnis ini.
        </p>
        <select
          value={defaultBizId}
          onChange={e => setDefaultBizId(e.target.value)}
          className="w-full text-sm border border-border rounded-xl px-3 py-2 bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">— Tidak ada bisnis default —</option>
          {(bizList || []).map((b: any) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* Column mapping (CSV/HTML only) */}
      {fileType !== "pdf" && (
        <div className="bg-white border border-border rounded-2xl card-shadow overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Mapping Kolom</p>
            <p className="text-xs text-muted-foreground mt-0.5">Kolom hijau sudah terdeteksi otomatis. Ubah jika perlu.</p>
          </div>
          <div className="divide-y divide-border">
            {headers.map((h) => {
              const tgt = mapping[h] || "skip";
              const isAuto = tgt !== "skip";
              return (
                <div key={h} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-medium text-foreground truncate">{h}</p>
                    {rawRows[0]?.[h] && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        Contoh: <span className="italic">{rawRows[0][h]}</span>
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  <select
                    value={tgt}
                    onChange={e => setMapping(m => ({ ...m, [h]: e.target.value as TargetField }))}
                    className={cn(
                      "w-44 text-xs border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30",
                      isAuto ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-border bg-muted/30 text-muted-foreground"
                    )}
                  >
                    {TARGET_FIELDS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}{f.required ? " *" : ""}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="flex justify-end gap-3">
        {fileType === "pdf" ? (
          <button
            onClick={parsePdf}
            disabled={loading}
            className="flex items-center gap-2 h-10 px-6 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Memproses PDF..." : "Proses PDF dengan AI"}
          </button>
        ) : (
          <button
            onClick={() => setStep("preview")}
            disabled={!hasMappedName}
            className="flex items-center gap-2 h-10 px-6 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
          >
            Preview Data ({rawRows.length} baris) <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );

  /* ────────── STEP: Preview ────────── */
  if (step === "preview") return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Preview Import</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {mappedRows.length} customer siap diimport. Periksa sebelum konfirmasi.
          </p>
        </div>
        <button
          onClick={() => fileType === "pdf" ? setStep("mapping") : setStep("mapping")}
          className="h-8 px-3 text-xs rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors"
        >
          ← Ubah Mapping
        </button>
      </div>

      <div className="bg-white border border-border rounded-2xl card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["Nama", "No. HP", "Email", "Status", "Unit Bisnis", "Estimasi Nilai", "Sumber", "Catatan"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mappedRows.slice(0, 20).map((row, i) => (
                <tr key={i} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 font-semibold text-foreground whitespace-nowrap max-w-[180px] truncate">{row.name || <span className="text-red-400 italic">kosong</span>}</td>
                  <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs whitespace-nowrap">{row.phone || "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs max-w-[160px] truncate">{row.email || "—"}</td>
                  <td className="px-4 py-2.5">
                    {row.status ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted/60 font-medium">{row.status}</span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs whitespace-nowrap">{row.business || "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs whitespace-nowrap">{row.estimatedValue || "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs whitespace-nowrap">{row.source || "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs max-w-[200px] truncate">{row.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {mappedRows.length > 20 && (
            <div className="px-4 py-3 text-center text-xs text-muted-foreground border-t border-border bg-muted/20">
              Menampilkan 20 dari {mappedRows.length} baris. Semua akan diimport.
            </div>
          )}
        </div>
      </div>

      {mappedRows.some(r => !r.name) && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Beberapa baris tidak punya nama — baris tersebut akan dilewati saat import.
          </p>
        </div>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{mappedRows.filter(r => r.name).length} dari {mappedRows.length} baris valid</p>
        <button
          onClick={doImport}
          disabled={loading || !mappedRows.some(r => r.name)}
          className="flex items-center gap-2 h-10 px-8 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {loading ? "Mengimport..." : `Import ${mappedRows.filter(r => r.name).length} Customer`}
        </button>
      </div>
    </div>
  );

  /* ────────── STEP: Done ────────── */
  return (
    <div className="max-w-lg mx-auto text-center space-y-6 pt-8">
      <div className="h-20 w-20 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
        <Check className="h-9 w-9 text-emerald-500" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Import Berhasil!</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Data customer sudah masuk ke CRM dan terhubung ke semua fitur.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Berhasil diimport", value: importResult?.imported ?? 0, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Dilewati (duplikat)", value: importResult?.skipped ?? 0, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Total baris", value: importResult?.total ?? 0, color: "text-foreground", bg: "bg-muted/40" },
        ].map(s => (
          <div key={s.label} className={cn("rounded-2xl p-4 border border-border", s.bg)}>
            <p className={cn("text-3xl font-bold font-mono", s.color)}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 justify-center">
        <Link
          to="/customers"
          className="flex items-center gap-2 h-10 px-6 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition"
        >
          <Users className="h-4 w-4" /> Lihat Daftar Customer
        </Link>
        <button
          onClick={() => { setStep("upload"); setFileName(""); setHeaders([]); setRawRows([]); setMapping({}); setImportResult(null); setPdfFile(null); }}
          className="flex items-center gap-2 h-10 px-6 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
        >
          Import Lagi
        </button>
      </div>
    </div>
  );
}
