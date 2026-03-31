const bizColors: Record<string, string> = {
  Temantiket: "bg-[hsl(var(--biz-temantiket))]/10 text-[hsl(var(--biz-temantiket))]",
  "SYMP Studio": "bg-[hsl(var(--biz-symp))]/10 text-[hsl(var(--biz-symp))]",
  Darcia: "bg-[hsl(var(--biz-darcia))]/10 text-[hsl(var(--biz-darcia))]",
  AIGYPT: "bg-[hsl(var(--biz-aigypt))]/10 text-[hsl(var(--biz-aigypt))]",
};

export default function BusinessBadge({ name }: { name: string }) {
  const colors = bizColors[name] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors}`}>
      {name}
    </span>
  );
}
