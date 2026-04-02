import { useState, useRef, useCallback } from "react";
import Papa from "papaparse";
import {
  Upload, FileText, FileCode, File, ChevronRight, Check,
  AlertTriangle, Loader2, ArrowLeft, Users, Sparkles, Wand2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

/* ─── Types ─────────────────────────────────────── */
type Step = "upload" | "mapping" | "preview" | "done";
type TargetField = "name" | "phone" | "email" | "status" | "estimatedValue" | "source" | "tags" | "notes" | "business" | "skip";

const TARGET_FIELDS: { value: TargetField; label: string; required?: boolean }[] = [
  { value: "name",           label: "Nama Customer",       required: true },
  { value: "phone",          label: "No. HP / WhatsApp" },
  { value: "email",          label: "Email" },
  { value: "status",         label: "Status Lead" },
  { value: "estimatedValue", label: "Estimasi Nilai (Rp)" },
  { value: "source",         label: "Sumber / Source" },
  { value: "tags",           label: "Kategori / Tags" },
  { value: "notes",          label: "Catatan / Notes" },
  { value: "business",       label: "Unit Bisnis" },
  { value: "skip",           label: "— Abaikan kolom ini —" },
];

/* Expanded dictionary — covers common Notion column name variations */
const AUTO_MAP: Record<string, TargetField> = {
  // Name
  name: "name", nama: "name", "customer name": "name", "nama customer": "name",
  "full name": "name", "nama lengkap": "name", klien: "name", client: "name",
  pelanggan: "name", contact: "name", kontak: "name", "nama klien": "name",
  "nama pelanggan": "name", title: "name", judul: "name",
  // Phone
  phone: "phone", hp: "phone", "no hp": "phone", "no. hp": "phone",
  "nomor hp": "phone", telepon: "phone", whatsapp: "phone", wa: "phone",
  mobile: "phone", "no telepon": "phone", "nomor telepon": "phone",
  "phone number": "phone", "contact number": "phone", "no wa": "phone",
  handphone: "phone", "nomor wa": "phone",
  // Email
  email: "email", "email address": "email", "alamat email": "email", surel: "email",
  // Status
  status: "status", "lead status": "status", stage: "status", pipeline: "status",
  "tahap": "status", fase: "status", "status lead": "status", "status customer": "status",
  kondisi: "status", progress: "status",
  // Value
  value: "estimatedValue", "estimated value": "estimatedValue",
  "estimasi nilai": "estimatedValue", "nilai estimasi": "estimatedValue",
  nilai: "estimatedValue", harga: "estimatedValue", budget: "estimatedValue",
  "anggaran": "estimatedValue", "estimasi": "estimatedValue", "deal value": "estimatedValue",
  "nilai deal": "estimatedValue", "potensi": "estimatedValue", "total": "estimatedValue",
  // Source
  source: "source", sumber: "source", channel: "source", "saluran": "source",
  "asal lead": "source", referral: "source", "via": "source", platform: "source",
  // Notes
  notes: "notes", catatan: "notes", memo: "notes", keterangan: "notes",
  note: "notes", deskripsi: "notes", description: "notes", "detail": "notes",
  informasi: "notes", info: "notes", remarks: "notes", comment: "notes",
  komentar: "notes", "interest": "notes", minat: "notes", kebutuhan: "notes",
  "produk": "notes", paket: "notes", "yang diminati": "notes",
  // Tags / Kategori
  tags: "tags", kategori: "tags", category: "tags", "tag": "tags",
  "kategori customer": "tags", label: "tags", "tipe": "tags", type: "tags",
  "jenis": "tags", segment: "tags", segmen: "tags", grup: "tags", group: "tags",
  // Business
  business: "business", bisnis: "business", "unit bisnis": "business",
  brand: "business", perusahaan: "business", company: "business",
  "nama bisnis": "business", "unit": "business", divisi: "business",
};

function guessMapping(headers: string[]): Record<string, TargetField> {
  const m: Record<string, TargetField> = {};
  const usedTargets = new Set<TargetField>();
  headers.forEach((h) => {
    const key = h.toLowerCase().trim().replace(/[_-]/g, " ");
    const matched = AUTO_MAP[key];
    if (matched && matched !== "skip" && !usedTargets.has(matched)) {
      m[h] = matched;
      usedTargets.add(matched);
    } else if (matched && matched !== "skip") {
      m[h] = "notes"; // already mapped, fold into notes
    } else {
      m[h] = "skip";
    }
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

  const headerEls = table.querySelectorAll("thead tr th, thead tr td");
  const headers = headerEls.length
    ? Array.from(headerEls).map((c) => c.textContent?.trim() || "")
    : Array.from(table.querySelectorAll("tr:first-child th, tr:first-child td")).map((c) => c.textContent?.trim() || "");

  const bodyRows = table.querySelectorAll("tbody tr");
  const rowEls = bodyRows.length
    ? Array.from(bodyRows)
    : Array.from(table.querySelectorAll("tr")).slice(1);

  const rows = rowEls.map((tr) => {
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
  const [aiMapping, setAiMapping] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; total: number } | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
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
      if (!hdrs.length) { toast.error("Tidak ada tabel di file HTML ini."); return; }
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

  /* ── AI Auto-Map ── */
  const runAiMap = async () => {
    if (!headers.length) return;
    setAiMapping(true);
    try {
      const res = await fetch("/api/import/ai-map", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headers, samples: rawRows.slice(0, 5) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI gagal");
      setMapping((prev) => ({ ...prev, ...data.mapping }));
      toast.success("AI berhasil memetakan kolom!");
    } catch (err: any) {
      toast.error(err.message || "AI gagal memetakan kolom");
    }
    setAiMapping(false);
  };

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
      if (!rows.length) { toast.error("Tidak ada data customer di PDF ini"); return; }
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
    return rawRows.map((row) => {
      const out: Record<string, string> = {};
      const noteParts: string[] = [];
      Object.entries(mapping).forEach(([src, tgt]) => {
        if (tgt === "skip") return;
        if (tgt === "notes") {
          if (row[src]?.trim()) noteParts.push(`${src}: ${row[src]}`);
        } else {
          out[tgt] = row[src] || "";
        }
      });
      // Merge all "notes" fields into one
      if (noteParts.length) out["notes"] = [out["notes"], ...noteParts].filter(Boolean).join("\n");
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

  const mappedRows = (step === "preview" || step === "done") ? getMappedRows() : [];
  const unmappedCount = Object.values(mapping).filter((v) => v === "skip").length;
  const hasMappedName = Object.values(mapping).includes("name");

  /* ════════════════════════════════════════
      STEP: Upload
     ════════════════════════════════════════ */
  if (step === "upload") return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link to="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors w-fit">
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Dasbor
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Import Customer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload file dari Notion atau sumber lain. AI akan otomatis mengenali kolomnya.
        </p>
      </div>

      <div
        className={cn(
          "relative flex flex-col items-center justify-center gap-4 border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all",
          isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border bg-muted/20 hover:border-primary/50 hover:bg-primary/5"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" accept=".csv,.html,.htm,.pdf,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        <div className="h-14 w-14 rounded-2xl bg-white border border-border shadow-sm flex items-center justify-center">
          <Upload className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-foreground text-base">Drag & drop file di sini</p>
          <p className="text-sm text-muted-foreground mt-1">atau klik untuk pilih file dari komputer</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {[
            { ext: "CSV", color: "bg-blue-50 text-blue-600 border-blue-200" },
            { ext: "HTML", color: "bg-orange-50 text-orange-600 border-orange-200" },
            { ext: "PDF", color: "bg-red-50 text-red-600 border-red-200" },
          ].map(f => (
            <span key={f.ext} className={cn("px-3 py-1.5 rounded-xl text-xs font-bold border", f.color)}>{f.ext}</span>
          ))}
        </div>
      </div>

      <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5 flex items-start gap-3">
        <Sparkles className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-violet-800">AI Mapping otomatis</p>
          <p className="text-xs text-violet-700 mt-0.5 leading-relaxed">
            Nama kolom Notion kamu beda-beda? Tidak masalah. Setelah upload, AI akan mengenali kolom apapun — bahkan yang unik — dan memetakannya ke field CRM yang sesuai secara otomatis.
          </p>
        </div>
      </div>

      <div className="bg-white border border-border rounded-2xl card-shadow p-5">
        <p className="text-sm font-semibold text-foreground mb-3">Cara export dari Notion:</p>
        <ol className="space-y-2">
          {[
            'Buka database Notion kamu (tabel customer)',
            'Klik ··· di pojok kanan atas → "Export"',
            'Pilih format CSV atau HTML → Download',
            'Upload file di sini — AI akan baca kolomnya',
          ].map((s, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );

  /* ════════════════════════════════════════
      STEP: Mapping
     ════════════════════════════════════════ */
  if (step === "mapping") return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Pemetaan Kolom</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {fileType === "pdf"
              ? "AI akan baca isi PDF dan ekstrak data customer otomatis."
              : `${headers.length} kolom terdeteksi · ${rawRows.length} baris data`
            }
          </p>
        </div>
        <button onClick={() => setStep("upload")} className="h-8 px-3 text-xs rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors shrink-0">
          ← Ganti File
        </button>
      </div>

      {/* File badge */}
      <div className="bg-white border border-border rounded-xl px-4 py-3 flex items-center gap-3">
        <FileIcon type={fileType || "csv"} />
        <p className="text-sm font-semibold text-foreground flex-1 truncate">{fileName}</p>
        {fileType !== "pdf" && unmappedCount > 0 && (
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg shrink-0">
            {unmappedCount} kolom belum dipetakan
          </span>
        )}
      </div>

      {/* PDF special flow */}
      {fileType === "pdf" ? (
        <>
          <div className="bg-white border border-border rounded-2xl card-shadow p-5 space-y-4">
            <p className="text-sm font-semibold text-foreground mb-1">Unit Bisnis Default</p>
            <select
              value={defaultBizId}
              onChange={e => setDefaultBizId(e.target.value)}
              className="w-full text-sm border border-border rounded-xl px-3 py-2.5 bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">— Tidak ada bisnis default —</option>
              {(bizList || []).map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end">
            <button
              onClick={parsePdf}
              disabled={loading}
              className="flex items-center gap-2 h-10 px-8 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "AI sedang membaca PDF..." : "Proses PDF dengan AI"}
            </button>
          </div>
        </>
      ) : (
        /* CSV / HTML mapping */
        <>
          {/* AI Auto-Map + Bisnis Default */}
          <div className="bg-white border border-border rounded-2xl card-shadow p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Unit Bisnis Default</p>
                <p className="text-xs text-muted-foreground mt-0.5">Dipakai jika kolom bisnis kosong atau tidak dikenali.</p>
              </div>
            </div>
            <select
              value={defaultBizId}
              onChange={e => setDefaultBizId(e.target.value)}
              className="w-full text-sm border border-border rounded-xl px-3 py-2.5 bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">— Tidak ada bisnis default —</option>
              {(bizList || []).map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Column mapping table */}
          <div className="bg-white border border-border rounded-2xl card-shadow overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Mapping Kolom</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Kolom <span className="text-emerald-600 font-medium">hijau</span> terdeteksi otomatis.&nbsp;
                  Kolom <span className="text-amber-600 font-medium">kuning</span> belum dikenali — klik "AI Auto-Map" untuk bantuan.
                </p>
              </div>
              <button
                onClick={runAiMap}
                disabled={aiMapping}
                className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-violet-200 text-violet-700 text-xs font-semibold bg-violet-50 hover:bg-violet-100 disabled:opacity-60 transition-colors shrink-0"
              >
                {aiMapping ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                {aiMapping ? "Memproses..." : "AI Auto-Map"}
              </button>
            </div>
            <div className="divide-y divide-border">
              {headers.map((h) => {
                const tgt = mapping[h] ?? "skip";
                const isAuto = tgt !== "skip";
                return (
                  <div key={h} className={cn(
                    "flex items-center gap-3 px-5 py-3 transition-colors",
                    isAuto ? "bg-emerald-50/30" : "bg-amber-50/20"
                  )}>
                    <div className={cn("h-2 w-2 rounded-full shrink-0", isAuto ? "bg-emerald-400" : "bg-amber-400")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono font-medium text-foreground truncate">{h}</p>
                      {rawRows[0]?.[h] && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5 italic">
                          "{rawRows[0][h]}"
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                    <select
                      value={tgt}
                      onChange={e => setMapping(m => ({ ...m, [h]: e.target.value as TargetField }))}
                      className={cn(
                        "w-44 text-xs border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors",
                        isAuto
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : "border-amber-200 bg-amber-50/50 text-muted-foreground"
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

            {/* Legend */}
            <div className="px-5 py-3 border-t border-border bg-muted/20">
              <p className="text-xs text-muted-foreground">
                💡 Kolom yang dipetakan ke <strong>Catatan</strong> akan digabung menjadi satu field catatan per customer.
                Kolom yang diabaikan tidak akan diimport.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStep("preview")}
              disabled={!hasMappedName}
              className="flex items-center gap-2 h-10 px-8 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
            >
              Preview ({rawRows.length} baris) <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {!hasMappedName && (
            <p className="text-center text-xs text-red-500">Pilih setidaknya satu kolom sebagai "Nama Customer" untuk lanjut.</p>
          )}
        </>
      )}
    </div>
  );

  /* ════════════════════════════════════════
      STEP: Preview
     ════════════════════════════════════════ */
  if (step === "preview") {
    // Build dynamic columns from actual mapping — only mapped (non-skip) fields, name first
    const mappedTargets = Array.from(
      new Set(Object.values(mapping).filter(v => v !== "skip"))
    ).sort((a, b) => (a === "name" ? -1 : b === "name" ? 1 : 0));

    // Map each target field → which source columns feed it
    const targetToSources: Record<string, string[]> = {};
    for (const [src, tgt] of Object.entries(mapping)) {
      if (tgt === "skip") continue;
      if (!targetToSources[tgt]) targetToSources[tgt] = [];
      targetToSources[tgt].push(src);
    }

    const fieldLabel = (f: string) => TARGET_FIELDS.find(t => t.value === f)?.label ?? f;
    const monoFields = new Set(["phone", "estimatedValue"]);

    return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Preview Import</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{mappedRows.length} baris · {mappedTargets.length} kolom terdeteksi</p>
        </div>
        <button
          onClick={() => setStep("mapping")}
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
                {mappedTargets.map(tgt => (
                  <th key={tgt} className="text-left px-4 py-3 whitespace-nowrap">
                    <p className="text-xs font-semibold text-foreground">{fieldLabel(tgt)}</p>
                    <p className="text-[10px] text-muted-foreground font-normal mt-0.5 font-mono">
                      {targetToSources[tgt]?.join(", ")}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mappedRows.slice(0, 25).map((row, i) => (
                <tr key={i} className={cn("hover:bg-muted/20 transition-colors", !row.name && "opacity-50")}>
                  {mappedTargets.map(tgt => {
                    const val = row[tgt];
                    if (tgt === "name") return (
                      <td key={tgt} className="px-4 py-2.5 font-semibold text-foreground whitespace-nowrap max-w-[180px] truncate">
                        {val || <span className="text-red-400 italic text-xs">kosong — dilewati</span>}
                      </td>
                    );
                    if (tgt === "status") return (
                      <td key={tgt} className="px-4 py-2.5">
                        {val ? <span className="text-xs px-2 py-0.5 rounded-full bg-muted/60 font-medium">{val}</span> : <span className="text-muted-foreground">—</span>}
                      </td>
                    );
                    return (
                      <td key={tgt} className={cn(
                        "px-4 py-2.5 text-muted-foreground text-xs max-w-[200px] truncate",
                        monoFields.has(tgt) ? "font-mono whitespace-nowrap" : ""
                      )}>
                        {val || "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {mappedRows.length > 25 && (
            <div className="px-5 py-3 text-center text-xs text-muted-foreground border-t border-border bg-muted/20">
              Menampilkan 25 dari {mappedRows.length} baris. Semua akan diimport.
            </div>
          )}
        </div>
      </div>

      {mappedRows.some(r => !r.name) && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            {mappedRows.filter(r => !r.name).length} baris tidak punya nama — akan dilewati saat import.
          </p>
        </div>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{mappedRows.filter(r => r.name).length}</span> dari {mappedRows.length} baris valid
        </p>
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
  } // end preview

  /* ════════════════════════════════════════
      STEP: Done
     ════════════════════════════════════════ */
  return (
    <div className="max-w-lg mx-auto text-center space-y-6 pt-8">
      <div className="h-20 w-20 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
        <Check className="h-9 w-9 text-emerald-500" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Import Berhasil!</h1>
        <p className="text-sm text-muted-foreground mt-2">Semua customer sudah masuk CRM dan terhubung ke semua fitur.</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Berhasil", value: importResult?.imported ?? 0, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
          { label: "Dilewati (duplikat)", value: importResult?.skipped ?? 0, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
          { label: "Total baris", value: importResult?.total ?? 0, color: "text-foreground", bg: "bg-muted/40 border-border" },
        ].map(s => (
          <div key={s.label} className={cn("rounded-2xl p-4 border", s.bg)}>
            <p className={cn("text-3xl font-bold font-mono", s.color)}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-3 justify-center">
        <Link to="/customers" className="flex items-center gap-2 h-10 px-6 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition">
          <Users className="h-4 w-4" /> Lihat Daftar Customer
        </Link>
        <button
          onClick={() => { setStep("upload"); setFileName(""); setHeaders([]); setRawRows([]); setMapping({}); setImportResult(null); setPdfFile(null); }}
          className="h-10 px-6 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
        >
          Import Lagi
        </button>
      </div>
    </div>
  );
}
