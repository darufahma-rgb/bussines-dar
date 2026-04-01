import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StatusBadge from "@/components/StatusBadge";
import BusinessBadge from "@/components/BusinessBadge";
import PageGuide from "@/components/PageGuide";
import { Link } from "react-router-dom";
import { Search, Download, Upload, X, CheckCircle, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type SortKey = "name" | "updatedAt" | "status" | "estimatedValue";
type SortDir = "asc" | "desc";

const STATUS_ORDER = ["new", "warm", "hot", "negotiation", "closed", "lost"];

const COLUMN_OPTIONS = [
  { value: "_skip", label: "— Abaikan kolom ini —" },
  { value: "name", label: "Nama" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Telepon" },
  { value: "status", label: "Status" },
  { value: "source", label: "Sumber" },
  { value: "estimatedValue", label: "Nilai Deal (angka)" },
  { value: "notes", label: "Catatan" },
];

const AUTO_MAP: Record<string, string> = {
  name: "name", nama: "name", customer: "name", "nama customer": "name", "full name": "name",
  email: "email", "e-mail": "email", "alamat email": "email",
  phone: "phone", telepon: "phone", "no hp": "phone", "no. hp": "phone", hp: "phone",
  "phone number": "phone", mobile: "phone", wa: "phone", whatsapp: "phone",
  status: "status",
  source: "source", sumber: "source", "sumber lead": "source",
  "estimated value": "estimatedValue", nilai: "estimatedValue", "nilai deal": "estimatedValue",
  harga: "estimatedValue", budget: "estimatedValue",
  notes: "notes", catatan: "notes", keterangan: "notes", note: "notes", memo: "notes",
};

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
  function parseLine(line: string): string[] {
    const result: string[] = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        i++;
        let val = "";
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') { val += '"'; i += 2; }
          else if (line[i] === '"') { i++; break; }
          else { val += line[i++]; }
        }
        result.push(val);
        if (line[i] === ",") i++;
      } else {
        const end = line.indexOf(",", i);
        if (end === -1) { result.push(line.slice(i)); break; }
        result.push(line.slice(i, end));
        i = end + 1;
      }
    }
    return result;
  }
  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

function exportCSV(customers: any[]) {
  const headers = ["Nama", "Email", "Telepon", "Status", "Bisnis", "Sumber", "Nilai Deal (IDR)", "Terakhir Update"];
  const rows = customers.map((c) => [
    c.name, c.email || "", c.phone || "", c.status,
    c.customer_businesses?.map((cb: any) => cb.businesses?.name).filter(Boolean).join("; ") || "",
    c.source || "", c.estimatedValue || "",
    format(parseISO(c.updatedAt), "yyyy-MM-dd"),
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `customers-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<"upload" | "map" | "done">("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [bizName, setBizName] = useState("all");
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: businesses } = useQuery({
    queryKey: ["businesses"],
    queryFn: () => api.businesses.list(),
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const dataRows = rows.map((row) => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => {
          const mapped = mapping[h];
          if (mapped && mapped !== "_skip" && row[i] !== undefined) {
            obj[mapped] = row[i];
          }
        });
        return obj;
      });
      const selectedBiz = bizName !== "all" ? bizName : undefined;
      return api.import.customers(dataRows, selectedBiz);
    },
    onSuccess: (data) => {
      setResult(data);
      setStep("done");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: () => toast({ title: "Gagal import", description: "Coba lagi", variant: "destructive" }),
  });

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers: h, rows: r } = parseCSV(text);
      setHeaders(h);
      setRows(r.filter((row) => row.some((cell) => cell.trim())));
      const autoMapping: Record<string, string> = {};
      h.forEach((col) => {
        const key = col.toLowerCase().trim();
        autoMapping[col] = AUTO_MAP[key] || "_skip";
      });
      setMapping(autoMapping);
      setStep("map");
    };
    reader.readAsText(file, "UTF-8");
  }

  function reset() {
    setStep("upload"); setHeaders([]); setRows([]); setMapping({}); setBizName("all"); setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  const hasName = Object.values(mapping).includes("name");
  const preview = rows.slice(0, 4);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import CSV dari Notion</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-xl p-10 text-center">
              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium mb-1">Upload file CSV dari Notion</p>
              <p className="text-sm text-muted-foreground mb-4">
                Di Notion: buka database → klik <strong>···</strong> → <strong>Export</strong> → pilih <strong>CSV</strong>
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFile}
                className="hidden"
                id="csv-file-input"
                data-testid="input-csv-file"
              />
              <Button onClick={() => fileRef.current?.click()} data-testid="button-choose-file">
                Pilih File CSV
              </Button>
            </div>
          </div>
        )}

        {step === "map" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{rows.length} baris data ditemukan</p>
              <Button variant="ghost" size="sm" onClick={reset} data-testid="button-reupload">
                <X className="h-4 w-4 mr-1" /> Ganti file
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Petakan kolom CSV ke field CRM:</p>
              <div className="grid gap-2 max-h-52 overflow-y-auto pr-1">
                {headers.map((col) => (
                  <div key={col} className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-36 shrink-0 truncate font-mono" title={col}>{col}</span>
                    <span className="text-muted-foreground text-xs">→</span>
                    <Select value={mapping[col] || "_skip"} onValueChange={(v) => setMapping(m => ({ ...m, [col]: v }))}>
                      <SelectTrigger className="h-8 text-sm flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COLUMN_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Masukkan ke bisnis (opsional):</p>
              <Select value={bizName} onValueChange={setBizName}>
                <SelectTrigger className="h-9" data-testid="select-import-business">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tidak perlu</SelectItem>
                  {businesses?.map((b: any) => (
                    <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {preview.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Preview ({preview.length} baris pertama):</p>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="text-xs w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        {headers.map((h) => (
                          <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                            {mapping[h] && mapping[h] !== "_skip"
                              ? COLUMN_OPTIONS.find(o => o.value === mapping[h])?.label
                              : <span className="line-through opacity-50">{h}</span>
                            }
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-t border-border">
                          {headers.map((h, j) => (
                            <td key={j} className={`px-2 py-1.5 max-w-[120px] truncate ${mapping[h] === "_skip" ? "opacity-30" : ""}`}>
                              {row[j] || ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!hasName && (
              <p className="text-sm text-destructive flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" /> Pastikan ada kolom yang dipetakan ke <strong>Nama</strong>
              </p>
            )}

            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => { reset(); onClose(); }} data-testid="button-cancel-import">Batal</Button>
              <Button
                onClick={() => importMutation.mutate()}
                disabled={!hasName || importMutation.isPending}
                data-testid="button-run-import"
              >
                {importMutation.isPending ? "Mengimport..." : `Import ${rows.length} Customer`}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && result && (
          <div className="py-6 text-center space-y-3">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <p className="text-lg font-semibold">Import selesai!</p>
            <p className="text-sm text-muted-foreground">
              <span className="text-green-600 font-medium">{result.imported} customer</span> berhasil diimport
              {result.skipped > 0 && <>, <span className="text-muted-foreground">{result.skipped} dilewati</span> (duplikat / tanpa nama)</>}
            </p>
            <Button onClick={() => { reset(); onClose(); }} data-testid="button-done-import">Selesai</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function CustomerList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bizFilter, setBizFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showImport, setShowImport] = useState(false);

  const { data: businesses } = useQuery({
    queryKey: ["businesses"],
    queryFn: () => api.businesses.list(),
  });

  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers", search, statusFilter, bizFilter],
    queryFn: () => api.customers.list({ search, status: statusFilter, businessId: bizFilter }),
  });

  const sorted = useMemo(() => {
    if (!customers) return [];
    return [...customers].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "updatedAt") cmp = a.updatedAt < b.updatedAt ? -1 : 1;
      else if (sortKey === "status") cmp = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
      else if (sortKey === "estimatedValue") cmp = (Number(a.estimatedValue) || 0) - (Number(b.estimatedValue) || 0);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [customers, sortKey, sortDir]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">Daftar Customer</h2>
          <p className="text-sm text-muted-foreground">{customers?.length ?? 0} customer</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={() => setShowImport(true)}
            data-testid="button-import-csv"
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Import CSV</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={() => sorted.length && exportCSV(sorted)}
            disabled={!sorted.length}
            data-testid="button-export-csv"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
        </div>
      </div>

      <ImportModal open={showImport} onClose={() => setShowImport(false)} />

      <PageGuide steps={[
        { icon: "🔍", title: "Cari Customer", desc: "Ketik nama customer di kolom pencarian. Filter tambahan tersedia untuk menyaring berdasarkan status (New, Warm, Hot, dll) dan bisnis." },
        { icon: "↕️", title: "Urutkan Daftar", desc: "Gunakan dropdown Sort untuk mengurutkan berdasarkan tanggal update, nama A-Z, status, atau nilai deal terbesar/terkecil." },
        { icon: "📤", title: "Import & Export CSV", desc: "Import customer dari file CSV Notion (klik Import CSV), atau ekspor semua customer yang tampil ke spreadsheet." },
        { icon: "👤", title: "Buka Profil", desc: "Klik baris customer mana saja untuk membuka detail lengkap: riwayat interaksi, AI summary, next action, dan memory." },
      ]} />

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
            data-testid="input-search-customers"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="new">Lead Baru</SelectItem>
            <SelectItem value="warm">Hangat</SelectItem>
            <SelectItem value="hot">Panas</SelectItem>
            <SelectItem value="negotiation">Negosiasi</SelectItem>
            <SelectItem value="closed">Berhasil</SelectItem>
            <SelectItem value="lost">Gagal</SelectItem>
          </SelectContent>
        </Select>
        <Select value={bizFilter} onValueChange={setBizFilter}>
          <SelectTrigger className="w-36 h-9" data-testid="select-biz-filter">
            <SelectValue placeholder="Business" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Bisnis</SelectItem>
            {businesses?.map((b: any) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={`${sortKey}-${sortDir}`} onValueChange={(v) => {
          const [k, d] = v.split("-") as [SortKey, SortDir];
          setSortKey(k); setSortDir(d);
        }}>
          <SelectTrigger className="w-40 h-9 gap-1" data-testid="select-sort">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updatedAt-desc">Terbaru Diupdate</SelectItem>
            <SelectItem value="updatedAt-asc">Terlama Diupdate</SelectItem>
            <SelectItem value="name-asc">Nama A–Z</SelectItem>
            <SelectItem value="name-desc">Nama Z–A</SelectItem>
            <SelectItem value="status-asc">Status</SelectItem>
            <SelectItem value="estimatedValue-desc">Nilai Terbesar</SelectItem>
            <SelectItem value="estimatedValue-asc">Nilai Terkecil</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-muted/40 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : !sorted.length ? (
        <div className="text-sm text-muted-foreground p-8 text-center">
          Belum ada customer. <Link to="/customers/new" className="underline">Tambah customer pertama kamu</Link>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-xl card-shadow divide-y divide-border">
          {sorted.map((c: any) => (
            <Link
              key={c.id}
              to={`/customers/${c.id}`}
              className="flex items-center justify-between p-3.5 hover:bg-muted/40 transition-colors first:rounded-t-xl last:rounded-b-xl"
              data-testid={`row-customer-${c.id}`}
            >
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{c.name}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {c.customer_businesses?.map((cb: any) => (
                    <BusinessBadge key={cb.business_id} name={cb.businesses?.name} />
                  ))}
                  {c.source && <span className="text-xs text-muted-foreground">via {c.source}</span>}
                  {c.phone && <span className="text-xs text-muted-foreground font-mono">{c.phone}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {c.estimatedValue && (
                  <span className="text-xs font-mono text-green-600 hidden sm:block">
                    IDR {Number(c.estimatedValue).toLocaleString()}
                  </span>
                )}
                <StatusBadge status={c.status} />
                <span className="text-xs text-muted-foreground font-mono hidden xs:block">
                  {format(parseISO(c.updatedAt), "MMM d")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
