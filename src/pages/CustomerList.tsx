import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import BusinessBadge from "@/components/BusinessBadge";
import PageGuide from "@/components/PageGuide";
import { Link } from "react-router-dom";
import { Search, Download, ArrowUpDown } from "lucide-react";
import { format, parseISO } from "date-fns";

type SortKey = "name" | "updatedAt" | "status" | "estimatedValue";
type SortDir = "asc" | "desc";

const STATUS_ORDER = ["new", "warm", "hot", "negotiation", "closed", "lost"];

function exportCSV(customers: any[]) {
  const headers = ["Name", "Email", "Phone", "Status", "Business", "Source", "Estimated Value (IDR)", "Last Updated"];
  const rows = customers.map((c) => [
    c.name,
    c.email || "",
    c.phone || "",
    c.status,
    c.customer_businesses?.map((cb: any) => cb.businesses?.name).filter(Boolean).join("; ") || "",
    c.source || "",
    c.estimatedValue || "",
    format(parseISO(c.updatedAt), "yyyy-MM-dd"),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `customers-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CustomerList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bizFilter, setBizFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

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

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">Customers</h2>
          <p className="text-sm text-muted-foreground">{customers?.length ?? 0} customer</p>
        </div>
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

      <PageGuide steps={[
        { icon: "🔍", title: "Cari Customer", desc: "Ketik nama customer di kolom pencarian. Filter tambahan tersedia untuk menyaring berdasarkan status (New, Warm, Hot, dll) dan bisnis." },
        { icon: "↕️", title: "Urutkan Daftar", desc: "Gunakan dropdown Sort untuk mengurutkan berdasarkan tanggal update, nama A-Z, status, atau nilai deal terbesar/terkecil." },
        { icon: "📥", title: "Export CSV", desc: "Tekan tombol Export CSV untuk mengunduh semua customer yang sedang ditampilkan (sesuai filter aktif) dalam format spreadsheet." },
        { icon: "👤", title: "Buka Profil", desc: "Klik baris customer mana saja untuk membuka detail lengkap: riwayat interaksi, AI summary, next action, dan memory." },
      ]} />

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
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
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New Lead</SelectItem>
            <SelectItem value="warm">Warm</SelectItem>
            <SelectItem value="hot">Hot</SelectItem>
            <SelectItem value="negotiation">Negotiation</SelectItem>
            <SelectItem value="closed">Closed Won</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
        <Select value={bizFilter} onValueChange={setBizFilter}>
          <SelectTrigger className="w-36 h-9" data-testid="select-biz-filter">
            <SelectValue placeholder="Business" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Business</SelectItem>
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
            <SelectItem value="updatedAt-desc">Latest Updated</SelectItem>
            <SelectItem value="updatedAt-asc">Oldest Updated</SelectItem>
            <SelectItem value="name-asc">Name A–Z</SelectItem>
            <SelectItem value="name-desc">Name Z–A</SelectItem>
            <SelectItem value="status-asc">Status</SelectItem>
            <SelectItem value="estimatedValue-desc">Highest Value</SelectItem>
            <SelectItem value="estimatedValue-asc">Lowest Value</SelectItem>
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
          No customers found. <Link to="/customers/new" className="underline">Add your first customer</Link>
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {sorted.map((c: any) => (
            <Link
              key={c.id}
              to={`/customers/${c.id}`}
              className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
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
