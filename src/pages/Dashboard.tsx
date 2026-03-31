import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Users, Flame, CalendarCheck, TrendingUp } from "lucide-react";
import QuickCapture from "@/components/QuickCapture";
import StatusBadge from "@/components/StatusBadge";
import { Link } from "react-router-dom";
import { format, isToday, isPast, parseISO } from "date-fns";

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.interactions.stats(),
  });

  const { data: todayFollowUps } = useQuery({
    queryKey: ["today-follow-ups"],
    queryFn: () => api.interactions.followUps(true),
  });

  const { data: recentCaptures } = useQuery({
    queryKey: ["recent-captures"],
    queryFn: () => api.interactions.list({ type: "quick_capture,note", limit: 5, includeCustomer: true }),
  });

  const today = new Date().toISOString().split("T")[0];
  const dueFollowUps = todayFollowUps?.filter((f: any) =>
    f.followUpDate ? f.followUpDate <= today : true
  ) ?? [];

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
          {!dueFollowUps.length ? (
            <p className="text-sm text-muted-foreground">No follow-ups due. You're all caught up! 🎉</p>
          ) : (
            <div className="space-y-2">
              {dueFollowUps.map((f: any) => (
                <Link
                  key={f.id}
                  to={`/customers/${f.customerId}`}
                  className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{f.customers?.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{f.content}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={f.customers?.status} />
                    {f.followUpDate && (
                      <span className={`text-xs font-mono ${isPast(parseISO(f.followUpDate)) && !isToday(parseISO(f.followUpDate)) ? "text-status-hot" : "text-muted-foreground"}`}>
                        {format(parseISO(f.followUpDate), "MMM d")}
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
              {recentCaptures.map((n: any) => (
                <Link
                  key={n.id}
                  to={`/customers/${n.customerId}`}
                  className="block p-2 rounded hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{n.customers?.name}</p>
                    <span className="text-xs text-muted-foreground font-mono">
                      {format(parseISO(n.createdAt), "MMM d")}
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
