import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; className: string }> = {
  new:         { label: "Baru",      className: "bg-blue-50 text-blue-700 ring-1 ring-blue-200/80" },
  warm:        { label: "Hangat",    className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/80" },
  hot:         { label: "Panas",     className: "bg-orange-50 text-orange-700 ring-1 ring-orange-200/80" },
  negotiation: { label: "Negosiasi", className: "bg-violet-50 text-violet-700 ring-1 ring-violet-200/80" },
  closed:      { label: "Berhasil",  className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80" },
  lost:        { label: "Gagal",     className: "bg-slate-100 text-slate-500 ring-1 ring-slate-200/80" },
};

export default function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status, className: "bg-slate-100 text-slate-500 ring-1 ring-slate-200/80" };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap", config.className)}>
      {config.label}
    </span>
  );
}
