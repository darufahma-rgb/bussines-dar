import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import BusinessBadge from "@/components/BusinessBadge";
import { Link, useNavigate } from "react-router-dom";
import {
  Search, Download, Upload, Trash2, Tag, LayoutGrid, List, Table2,
  ArrowUpDown, Users, ChevronRight, Building2, Phone, Mail, TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/EmptyState";
import { formatIDR, formatDateShort } from "@/lib/format";

type SortKey = "name" | "updatedAt" | "status" | "estimatedValue";
type SortDir = "asc" | "desc";
type ViewMode = "grid" | "list" | "table";

const STATUS_ORDER = ["new", "warm", "hot", "negotiation", "closed", "lost"];

function exportCSV(customers: any[]) {
  const headers = ["Nama", "Email", "Telepon", "Status", "Bisnis", "Sumber", "Nilai Deal (IDR)", "Tags", "Terakhir Update"];
  const rows = customers.map((c) => [
    c.name, c.email || "", c.phone || "", c.status,
    c.customer_businesses?.map((cb: any) => cb.businesses?.name).filter(Boolean).join("; ") || "",
    c.source || "", c.estimatedValue || "",
    (c.tags || []).join("; "),
    c.updatedAt ? (() => { try { return format(new Date(c.updatedAt), "yyyy-MM-dd"); } catch { return ""; } })() : "",
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

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const BIZ_AVATAR_COLORS: Record<string, string> = {
  Temantiket: "bg-amber-100 text-amber-700",
  "SYMP Studio": "bg-blue-100 text-blue-700",
  Darcia: "bg-pink-100 text-pink-700",
  AIGYPT: "bg-emerald-100 text-emerald-700",
};

function avatarColor(customer: any) {
  const biz = customer.customer_businesses?.[0]?.businesses?.name;
  return BIZ_AVATAR_COLORS[biz] || "bg-primary/10 text-primary";
}

/* ─── Card (Grid View) ─────────────────────────────────────── */
function CustomerCard({ customer, selected, onSelect, onNavigate }: {
  customer: any; selected: boolean; onSelect: (e: React.MouseEvent) => void; onNavigate: () => void;
}) {
  const bizNames = customer.customer_businesses?.map((cb: any) => cb.businesses?.name).filter(Boolean) || [];
  return (
    <div
      onClick={onNavigate}
      className={`group relative bg-white rounded-2xl border cursor-pointer transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 ${selected ? "border-primary ring-2 ring-primary/20 shadow-sm" : "border-border hover:border-primary/30"}`}
    >
      {/* Selection checkbox */}
      <div
        onClick={onSelect}
        className={`absolute top-3 left-3 z-10 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selected ? "bg-primary border-primary" : "border-border/60 bg-white opacity-0 group-hover:opacity-100"}`}
      >
        {selected && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12"><path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
      </div>

      <div className="p-4 pt-3">
        {/* Top row: avatar + status */}
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${avatarColor(customer)}`}>
            {getInitials(customer.name)}
          </div>
          <StatusBadge status={customer.status} />
        </div>

        {/* Name */}
        <h3 className="font-semibold text-sm text-foreground leading-tight mb-1 line-clamp-1">{customer.name}</h3>

        {/* Contact */}
        {(customer.phone || customer.email) && (
          <p className="text-xs text-muted-foreground mb-2 truncate flex items-center gap-1">
            {customer.phone
              ? <><Phone className="h-3 w-3 shrink-0" />{customer.phone}</>
              : <><Mail className="h-3 w-3 shrink-0" />{customer.email}</>
            }
          </p>
        )}

        {/* Businesses */}
        {bizNames.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {bizNames.slice(0, 2).map((biz: string) => (
              <BusinessBadge key={biz} name={biz} />
            ))}
            {bizNames.length > 2 && <span className="text-xs text-muted-foreground">+{bizNames.length - 2}</span>}
          </div>
        )}

        {/* Tags */}
        {customer.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {customer.tags.slice(0, 2).map((tag: string) => (
              <span key={tag} className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md">{tag}</span>
            ))}
            {customer.tags.length > 2 && <span className="text-xs text-muted-foreground">+{customer.tags.length - 2}</span>}
          </div>
        )}

        {/* Footer: value + date */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50 mt-2">
          {customer.estimatedValue ? (
            <span className="text-xs font-semibold text-primary flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {formatIDR(Number(customer.estimatedValue))}
            </span>
          ) : <span />}
          <span className="text-[11px] text-muted-foreground">
            {formatDateShort(customer.updatedAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── List Row ─────────────────────────────────────────────── */
function CustomerRow({ customer, selected, onSelect, onNavigate }: {
  customer: any; selected: boolean; onSelect: (e: React.MouseEvent) => void; onNavigate: () => void;
}) {
  const bizNames = customer.customer_businesses?.map((cb: any) => cb.businesses?.name).filter(Boolean) || [];
  return (
    <div
      onClick={onNavigate}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-100 hover:bg-muted/50 group ${selected ? "bg-primary/5 ring-1 ring-primary/20" : "bg-white border border-border hover:border-primary/20"}`}
    >
      {/* Checkbox */}
      <div
        onClick={onSelect}
        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${selected ? "bg-primary border-primary" : "border-border/60 opacity-0 group-hover:opacity-100"}`}
      >
        {selected && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12"><path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
      </div>

      {/* Avatar */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${avatarColor(customer)}`}>
        {getInitials(customer.name)}
      </div>

      {/* Name + contact */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground truncate">{customer.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {customer.phone || customer.email || <span className="italic opacity-60">tidak ada kontak</span>}
        </p>
      </div>

      {/* Businesses */}
      <div className="hidden sm:flex gap-1 shrink-0">
        {bizNames.slice(0, 2).map((biz: string) => <BusinessBadge key={biz} name={biz} />)}
      </div>

      {/* Tags */}
      <div className="hidden md:flex gap-1 shrink-0">
        {customer.tags?.slice(0, 2).map((tag: string) => (
          <span key={tag} className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md">{tag}</span>
        ))}
      </div>

      {/* Status */}
      <div className="shrink-0"><StatusBadge status={customer.status} /></div>

      {/* Value */}
      <div className="hidden lg:block text-xs font-medium text-primary shrink-0 w-24 text-right">
        {customer.estimatedValue ? formatIDR(Number(customer.estimatedValue)) : "—"}
      </div>

      {/* Date */}
      <div className="text-xs text-muted-foreground shrink-0 hidden md:block w-16 text-right">
        {formatDateShort(customer.updatedAt)}
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
    </div>
  );
}

/* ─── Table View ───────────────────────────────────────────── */
function CustomerTable({ customers, selectedIds, onSelect, onNavigate, onSort, sortKey, sortDir }: {
  customers: any[]; selectedIds: Set<string>;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onNavigate: (id: string) => void;
  onSort: (key: SortKey) => void;
  sortKey: SortKey; sortDir: SortDir;
}) {
  const SortIcon = ({ k }: { k: SortKey }) => (
    <ArrowUpDown className={`h-3 w-3 ml-1 inline ${sortKey === k ? "text-primary" : "text-muted-foreground/40"}`} />
  );
  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="w-10 px-4 py-3">
                <input type="checkbox" checked={selectedIds.size === customers.length && customers.length > 0}
                  onChange={() => {}} className="rounded" />
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => onSort("name")}>
                Nama <SortIcon k="name" />
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Bisnis</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Kontak</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => onSort("status")}>
                Status <SortIcon k="status" />
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Tags</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => onSort("estimatedValue")}>
                Nilai <SortIcon k="estimatedValue" />
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => onSort("updatedAt")}>
                Update <SortIcon k="updatedAt" />
              </th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c, i) => {
              const bizNames = c.customer_businesses?.map((cb: any) => cb.businesses?.name).filter(Boolean) || [];
              const sel = selectedIds.has(c.id);
              return (
                <tr
                  key={c.id}
                  onClick={() => onNavigate(c.id)}
                  className={`border-b border-border/50 last:border-0 cursor-pointer transition-colors hover:bg-muted/30 ${sel ? "bg-primary/5" : i % 2 === 0 ? "" : "bg-muted/10"}`}
                >
                  <td className="px-4 py-3" onClick={(e) => { e.stopPropagation(); onSelect(c.id, e); }}>
                    <input type="checkbox" checked={sel} onChange={() => {}} className="rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${avatarColor(c)}`}>
                        {getInitials(c.name)}
                      </div>
                      <span className="font-medium text-foreground truncate max-w-[180px]">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {bizNames.slice(0, 2).map((biz: string) => <BusinessBadge key={biz} name={biz} />)}
                      {bizNames.length > 2 && <span className="text-xs text-muted-foreground">+{bizNames.length - 2}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {c.phone || c.email || "—"}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.tags?.slice(0, 3).map((tag: string) => (
                        <span key={tag} className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md">{tag}</span>
                      ))}
                      {c.tags?.length > 3 && <span className="text-xs text-muted-foreground">+{c.tags.length - 3}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-semibold text-primary">
                    {c.estimatedValue ? formatIDR(Number(c.estimatedValue)) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {formatDateShort(c.updatedAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Skeleton loaders ─────────────────────────────────────── */
function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-border p-4 space-y-3">
          <div className="flex justify-between"><Skeleton className="w-10 h-10 rounded-xl" /><Skeleton className="w-16 h-5 rounded-full" /></div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-border">
          <Skeleton className="w-9 h-9 rounded-xl" />
          <div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-1/4" /></div>
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────── */
export default function CustomerList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem("customerViewMode") as ViewMode) || "grid";
  });
  const [activeBiz, setActiveBiz] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    localStorage.setItem("customerViewMode", viewMode);
  }, [viewMode]);

  const { data: businesses } = useQuery({
    queryKey: ["businesses"],
    queryFn: () => api.businesses.list(),
  });

  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers", search, statusFilter],
    queryFn: () => api.customers.list({ search, status: statusFilter }),
  });

  const allTags = useMemo(() => {
    const s = new Set<string>();
    (customers || []).forEach((c: any) => (c.tags || []).forEach((t: string) => s.add(t)));
    return Array.from(s).sort();
  }, [customers]);

  // Count customers per business
  const bizCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    (customers || []).forEach((c: any) => {
      counts.all = (counts.all || 0) + 1;
      (c.customer_businesses || []).forEach((cb: any) => {
        const name = cb.businesses?.name;
        if (name) counts[name] = (counts[name] || 0) + 1;
      });
    });
    return counts;
  }, [customers]);

  const filtered = useMemo(() => {
    if (!customers) return [];
    let list = [...customers];

    // Business tab filter
    if (activeBiz !== "all") {
      list = list.filter((c: any) =>
        c.customer_businesses?.some((cb: any) => cb.businesses?.name === activeBiz)
      );
    }

    // Tag filter
    if (tagFilter !== "all") {
      list = list.filter((c: any) => (c.tags || []).includes(tagFilter));
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "updatedAt") cmp = a.updatedAt < b.updatedAt ? -1 : 1;
      else if (sortKey === "status") cmp = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
      else if (sortKey === "estimatedValue") cmp = (Number(a.estimatedValue) || 0) - (Number(b.estimatedValue) || 0);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [customers, activeBiz, tagFilter, sortKey, sortDir]);

  const bulkDelete = useMutation({
    mutationFn: (ids: string[]) => api.customers.bulkDelete(ids),
    onSuccess: (data: any) => {
      toast({ title: `${data.deleted} customer dihapus` });
      setSelectedIds(new Set());
      setConfirmDelete(false);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: () => toast({ title: "Gagal menghapus", variant: "destructive" }),
  });

  function toggleSelect(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  const bizTabs = [
    { key: "all", label: "Semua" },
    ...(businesses || []).map((b: any) => ({ key: b.name, label: b.name, color: b.color })),
  ];

  return (
    <div className="space-y-4 max-w-7xl">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground">Customer</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? "Memuat..." : `${filtered.length} dari ${customers?.length ?? 0} customer`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode */}
          <div className="flex items-center bg-muted rounded-xl p-0.5 gap-0.5">
            {([
              { mode: "grid" as ViewMode, icon: LayoutGrid, label: "Grid" },
              { mode: "list" as ViewMode, icon: List, label: "List" },
              { mode: "table" as ViewMode, icon: Table2, label: "Table" },
            ]).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                title={label}
                className={`p-2 rounded-lg transition-all ${viewMode === mode ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => navigate("/import")}>
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Import</span>
          </Button>
          <Button
            variant="outline" size="sm" className="gap-1.5 h-9"
            onClick={() => filtered.length && exportCSV(filtered)}
            disabled={!filtered.length}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Link
            to="/customers/new"
            className="inline-flex items-center gap-1.5 bg-primary text-white text-sm font-medium px-3 py-2 rounded-xl hover:opacity-90 transition-opacity shadow-sm h-9"
          >
            + Tambah
          </Link>
        </div>
      </div>

      {/* ── Business Tabs ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        {bizTabs.map(({ key, label, color }: any) => {
          const count = bizCounts[key] || 0;
          const active = activeBiz === key;
          return (
            <button
              key={key}
              onClick={() => { setActiveBiz(key); setSelectedIds(new Set()); }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all shrink-0 border ${
                active
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
              }`}
            >
              {key === "all"
                ? <Users className="h-3.5 w-3.5" />
                : <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
              }
              {label}
              <span className={`text-xs px-1.5 py-0.5 rounded-md font-semibold ${active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Bulk delete toolbar ── */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-2xl px-4 py-2.5">
          <p className="text-sm font-medium text-primary">{selectedIds.size} customer dipilih</p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 text-sm" onClick={() => setSelectedIds(new Set())}>Batalkan</Button>
            {!confirmDelete ? (
              <Button variant="destructive" size="sm" className="h-8 gap-1.5 text-sm" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-3.5 w-3.5" /> Hapus {selectedIds.size}
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-destructive font-medium">Yakin hapus permanen?</span>
                <Button variant="destructive" size="sm" className="h-8 text-sm"
                  disabled={bulkDelete.isPending}
                  onClick={() => bulkDelete.mutate(Array.from(selectedIds))}
                >
                  {bulkDelete.isPending ? "Menghapus..." : "Ya, Hapus"}
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-sm" onClick={() => setConfirmDelete(false)}>Batal</Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari nama, telepon, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 bg-white text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9 bg-white text-sm shrink-0">
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
        {allTags.length > 0 && (
          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="w-36 h-9 bg-white text-sm gap-1 shrink-0">
              <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tag</SelectItem>
              {allTags.map((tag) => <SelectItem key={tag} value={tag}>{tag}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={`${sortKey}-${sortDir}`} onValueChange={(v) => {
          const parts = v.split("-");
          const dir = parts.pop() as SortDir;
          const key = parts.join("-") as SortKey;
          setSortKey(key); setSortDir(dir);
        }}>
          <SelectTrigger className="w-44 h-9 bg-white text-sm gap-1 shrink-0">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updatedAt-desc">Terbaru Diupdate</SelectItem>
            <SelectItem value="updatedAt-asc">Terlama Diupdate</SelectItem>
            <SelectItem value="name-asc">Nama A–Z</SelectItem>
            <SelectItem value="name-desc">Nama Z–A</SelectItem>
            <SelectItem value="status-asc">Status</SelectItem>
            <SelectItem value="estimatedValue-desc">Nilai Terbesar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        viewMode === "grid" ? <GridSkeleton /> : <ListSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10 text-muted-foreground/30" />}
          title={search || statusFilter !== "all" || tagFilter !== "all" ? "Tidak ada customer yang cocok" : "Belum ada customer"}
          description={search || statusFilter !== "all" || tagFilter !== "all" ? "Coba ubah filter atau kata kunci pencarian" : "Tambah customer pertama kamu atau import dari CSV"}
          action={!search && statusFilter === "all" && tagFilter === "all" ? (
            <Link to="/customers/new" className="inline-flex items-center gap-1.5 bg-primary text-white text-sm font-medium px-4 py-2 rounded-xl hover:opacity-90">
              + Tambah Customer
            </Link>
          ) : undefined}
        />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((c: any) => (
            <CustomerCard
              key={c.id}
              customer={c}
              selected={selectedIds.has(c.id)}
              onSelect={(e) => toggleSelect(c.id, e)}
              onNavigate={() => navigate(`/customers/${c.id}`)}
            />
          ))}
        </div>
      ) : viewMode === "list" ? (
        <div className="space-y-1.5">
          {filtered.map((c: any) => (
            <CustomerRow
              key={c.id}
              customer={c}
              selected={selectedIds.has(c.id)}
              onSelect={(e) => toggleSelect(c.id, e)}
              onNavigate={() => navigate(`/customers/${c.id}`)}
            />
          ))}
        </div>
      ) : (
        <CustomerTable
          customers={filtered}
          selectedIds={selectedIds}
          onSelect={toggleSelect}
          onNavigate={(id) => navigate(`/customers/${id}`)}
          onSort={handleSort}
          sortKey={sortKey}
          sortDir={sortDir}
        />
      )}

      {/* ── Footer count ── */}
      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-center pb-4">
          Menampilkan {filtered.length} customer
          {selectedIds.size > 0 && ` · ${selectedIds.size} dipilih`}
        </p>
      )}
    </div>
  );
}
