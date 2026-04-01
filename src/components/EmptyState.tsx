import { type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface EmptyStateProps {
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

/**
 * Consistent empty state block used across list views and sections.
 */
export default function EmptyState({
  icon: Icon,
  iconBg = "bg-muted",
  iconColor = "text-muted-foreground/60",
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="py-16 text-center px-5">
      <div className={`h-14 w-14 rounded-2xl ${iconBg} flex items-center justify-center mx-auto mb-4`}>
        <Icon className={`h-6 w-6 ${iconColor}`} />
      </div>
      <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">{description}</p>
      )}
      {(actionLabel && actionHref) && (
        <Link
          to={actionHref}
          className="inline-flex items-center gap-1.5 bg-primary text-white text-sm font-medium px-4 py-2 rounded-xl hover:opacity-90 transition-opacity mt-4"
        >
          {actionLabel}
        </Link>
      )}
      {(actionLabel && onAction && !actionHref) && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-1.5 bg-primary text-white text-sm font-medium px-4 py-2 rounded-xl hover:opacity-90 transition-opacity mt-4"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
