import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { format, parseISO, isToday, isPast, isFuture } from "date-fns";
import { toast } from "sonner";

export default function FollowUps() {
  const queryClient = useQueryClient();

  const { data: followUps } = useQuery({
    queryKey: ["all-follow-ups"],
    queryFn: async () => {
      const { data } = await supabase
        .from("interactions")
        .select("*, customers(id, name, status)")
        .eq("type", "follow_up")
        .eq("is_completed", false)
        .order("follow_up_date");
      return data ?? [];
    },
  });

  const handleComplete = async (id: string) => {
    await supabase.from("interactions").update({ is_completed: true }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["all-follow-ups"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    toast.success("Done!");
  };

  const overdue = followUps?.filter((f) => f.follow_up_date && isPast(parseISO(f.follow_up_date)) && !isToday(parseISO(f.follow_up_date))) ?? [];
  const today = followUps?.filter((f) => f.follow_up_date && isToday(parseISO(f.follow_up_date))) ?? [];
  const upcoming = followUps?.filter((f) => f.follow_up_date && isFuture(parseISO(f.follow_up_date)) && !isToday(parseISO(f.follow_up_date))) ?? [];
  const noDate = followUps?.filter((f) => !f.follow_up_date) ?? [];

  const Section = ({ title, items, color }: { title: string; items: typeof followUps; color: string }) => (
    items && items.length > 0 ? (
      <div>
        <h3 className={`text-sm font-medium mb-2 ${color}`}>{title} ({items.length})</h3>
        <div className="border rounded-lg divide-y">
          {items.map((f) => (
            <div key={f.id} className="flex items-center justify-between p-3">
              <Link to={`/customers/${f.customer_id}`} className="flex-1 min-w-0 hover:underline">
                <p className="text-sm font-medium">{(f.customers as any)?.name}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{f.content}</p>
              </Link>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={(f.customers as any)?.status} />
                {f.follow_up_date && (
                  <span className="text-xs font-mono text-muted-foreground">
                    {format(parseISO(f.follow_up_date), "MMM d")}
                  </span>
                )}
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleComplete(f.id)}>
                  <Check className="h-3 w-3 mr-1" /> Done
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : null
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Follow-ups</h2>
        <p className="text-sm text-muted-foreground">{followUps?.length ?? 0} pending follow-ups</p>
      </div>

      {!followUps?.length ? (
        <p className="text-sm text-muted-foreground p-8 text-center">No pending follow-ups. You're all caught up! 🎉</p>
      ) : (
        <div className="space-y-6">
          <Section title="⚠️ Overdue" items={overdue} color="text-status-hot" />
          <Section title="📅 Today" items={today} color="text-status-new" />
          <Section title="🔜 Upcoming" items={upcoming} color="text-muted-foreground" />
          <Section title="📌 No date set" items={noDate} color="text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
