import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; className: string }> = {
  new:         { label: "New",         className: "bg-blue-100 text-blue-700" },
  warm:        { label: "Warm",        className: "bg-yellow-100 text-yellow-700" },
  hot:         { label: "Hot",         className: "bg-orange-100 text-orange-700" },
  negotiation: { label: "Negotiation", className: "bg-purple-100 text-purple-700" },
  closed:      { label: "Closed Won",  className: "bg-green-100 text-green-700" },
  lost:        { label: "Lost",        className: "bg-gray-100 text-gray-500" },
};

export default function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status, className: "bg-gray-100 text-gray-500" };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap", config.className)}>
      {config.label}
    </span>
  );
}
