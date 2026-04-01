import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; className: string }> = {
  new:         { label: "Baru",      className: "bg-blue-100 text-blue-700" },
  warm:        { label: "Hangat",    className: "bg-yellow-100 text-yellow-700" },
  hot:         { label: "Panas",     className: "bg-orange-100 text-orange-700" },
  negotiation: { label: "Negosiasi", className: "bg-purple-100 text-purple-700" },
  closed:      { label: "Berhasil",  className: "bg-green-100 text-green-700" },
  lost:        { label: "Gagal",     className: "bg-gray-100 text-gray-500" },
};

export default function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status, className: "bg-gray-100 text-gray-500" };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap", config.className)}>
      {config.label}
    </span>
  );
}
