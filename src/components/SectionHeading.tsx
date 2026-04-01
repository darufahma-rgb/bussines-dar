import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  className?: string;
}

/**
 * Consistent section heading used across review pages and dashboard.
 * Renders an uppercase label with optional subtitle annotation.
 */
export default function SectionHeading({ title, subtitle, className }: SectionHeadingProps) {
  return (
    <div className={cn("flex items-baseline gap-2 mb-3", className)}>
      <h3 className="font-semibold text-[13px] text-muted-foreground uppercase tracking-wider">
        {title}
      </h3>
      {subtitle && (
        <span className="text-xs text-muted-foreground">— {subtitle}</span>
      )}
    </div>
  );
}
