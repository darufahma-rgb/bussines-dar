import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Flame, CalendarCheck, TrendingUp } from "lucide-react";
import QuickCapture from "@/components/QuickCapture";
import StatusBadge from "@/components/StatusBadge";
import { Link } from "react-router-dom";
import { format, isToday, isPast, parseISO } from "date-fns";

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [customersRes, leadsRes, todayFollowUps, overdueFollowUps] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("customers").select("id", { count: "exact", head: true }).in("status", ["new", "warm", "hot"]),
        supabase.from("interactions").select("id", { count: "exact", head: true })
          .eq("type", "follow_up").eq("is_completed", false)
          .eq("follow_up_date", new Date().toISOString().split("T")[0]),
        supabase.from("interactions").select("id", { count: "exact", head: true })
          .eq("type", "follow_up").eq("is_completed", false)
          .lt("follow_up_date", new Date().toISOString().split("T")[0]),
      ]);
      return {
        total: customersRes.count ?? 0,
        leads: leadsRes.count ?? 0,
        todayFollowUps: todayFollowUps.count ?? 0,
        overdue: overdueFollowUps.count ?? 0,
      };
    },
  });

  const { data: todayFollowUps } = useQuery({
    queryKey: ["today-follow-ups"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("interactions")
        .select("*, customers(id, name, status)")
        .eq("type", "follow_up")
        .eq("is_completed", false)
        .lte("follow_up_date", today)
        .order("follow_up_date");
      return data ?? [];
    },
  });

  const { data: recentCaptures } = useQuery({
    queryKey: ["recent-captures"],
    queryFn: async () => {
      const { data } = await supabase
        .from("interactions")
        .select("*, customers(id, name)")
        .in("type", ["quick_capture", "note"])
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const statCards = [
    { label: "Total Customers", value: stats?.total ?? 0, icon: Users, color: "text-foreground" },
    { label: "Active Leads", value: stats?.leads ?? 0, icon: TrendingUp, color: "text-status-warm" },
    { label: "Today's Follow-ups", value: stats?.todayFollowUps ?? 0, icon: CalendarCheck, color: "text-status-new" },
    { label: "Overdue", value: stats?.overdue ?? 0, icon: Flame, color: "text-status-hot" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Quick overview of your CRM</p>
      </div>

      <QuickCapture />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="bg-card border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-semibold font-mono mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <h3 className="font-medium text-sm mb-3">Due Follow-ups</h3>
          {!todayFollowUps?.length ? (
            <p className="text-sm text-muted-foreground">No follow-ups due. You're all caught up! 🎉</p>
          ) : (
            <div className="space-y-2">
              {todayFollowUps.map((f) => (
                <Link
                  key={f.id}
                  to={`/customers/${f.customer_id}`}
                  className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{(f.customers as any)?.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{f.content}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={(f.customers as any)?.status} />
                    {f.follow_up_date && (
                      <span className={`text-xs font-mono ${isPast(parseISO(f.follow_up_date)) && !isToday(parseISO(f.follow_up_date)) ? "text-status-hot" : "text-muted-foreground"}`}>
                        {format(parseISO(f.follow_up_date), "MMM d")}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border rounded-lg p-4">
          <h3 className="font-medium text-sm mb-3">Recent Notes</h3>
          {!recentCaptures?.length ? (
            <p className="text-sm text-muted-foreground">No notes yet. Use Quick Capture above!</p>
          ) : (
            <div className="space-y-2">
              {recentCaptures.map((n) => (
                <Link
                  key={n.id}
                  to={`/customers/${n.customer_id}`}
                  className="block p-2 rounded hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{(n.customers as any)?.name}</p>
                    <span className="text-xs text-muted-foreground font-mono">
                      {format(parseISO(n.created_at), "MMM d")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{n.content}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
