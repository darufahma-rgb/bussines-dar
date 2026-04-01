import { Skeleton } from "@/components/ui/skeleton";
import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  sub?: string;
  loading?: boolean;
  /** Renders card with primary color background (for accent/highlight metrics) */
  accent?: boolean;
}

/**
 * Reusable metric/stat card.
 * Used across Dashboard, Weekly, Monthly, and Yearly pages.
 */
export default function StatCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  sub,
  loading,
  accent,
}: StatCardProps) {
  const baseCard = accent
    ? "bg-primary text-white border-transparent"
    : "bg-white border border-border text-foreground";

  return (
    <div className={`rounded-2xl p-5 card-shadow ${baseCard}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-medium leading-tight ${accent ? "text-white/70" : "text-muted-foreground"}`}>
          {label}
        </span>
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${accent ? "bg-white/15" : iconBg}`}>
          <Icon className={`h-4 w-4 ${accent ? "text-white" : iconColor}`} />
        </div>
      </div>

      {loading ? (
        <Skeleton className={`h-9 w-16 mt-1 ${accent ? "bg-white/20" : ""}`} />
      ) : (
        <p className={`text-4xl font-bold font-mono leading-none tracking-tight ${accent ? "text-white" : "text-foreground"}`}>
          {value}
        </p>
      )}

      {sub && !loading && (
        <p className={`text-xs mt-1.5 ${accent ? "text-white/60" : "text-muted-foreground"}`}>{sub}</p>
      )}
    </div>
  );
}
