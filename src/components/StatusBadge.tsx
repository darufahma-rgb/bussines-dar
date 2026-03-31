import { cn } from "@/lib/utils";

const statusConfig = {
  new: { label: "New", className: "bg-status-new/10 text-status-new" },
  warm: { label: "Warm", className: "bg-status-warm/10 text-status-warm" },
  hot: { label: "Hot", className: "bg-status-hot/10 text-status-hot" },
  closed: { label: "Closed", className: "bg-status-closed/10 text-status-closed" },
};

export default function StatusBadge({ status }: { status: keyof typeof statusConfig }) {
  const config = statusConfig[status];
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", config.className)}>
      {config.label}
    </span>
  );
}
