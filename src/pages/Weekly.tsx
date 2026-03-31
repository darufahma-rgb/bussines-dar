import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Users, Flame, CalendarCheck, AlertTriangle, Sparkles, Loader2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";

export default function Weekly() {
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["weekly-stats"],
    queryFn: () => api.stats.weekly(),
  });

  const handleGetInsight = async () => {
    if (!stats) return;
    setLoadingInsight(true);
    try {
      const result = await api.ai.weeklyInsight(stats);
      setInsight(result.insight);
    } catch {
      setInsight("Could not generate insight. Try again later.");
    }
    setLoadingInsight(false);
  };

  const statCards = [
    { label: "New Leads", value: stats?.newLeads ?? 0, icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950" },
    { label: "Hot Leads", value: stats?.hotLeads ?? 0, icon: Flame, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950" },
    { label: "Deals Closed", value: stats?.closedDeals ?? 0, icon: TrendingUp, color: "text-green-500", bg: "bg-green-50 dark:bg-green-950" },
    { label: "Missed Follow-ups", value: stats?.missedFollowUps ?? 0, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950" },
  ];

  const typeLabels: Record<string, string> = {
    note: "Note",
    transaction: "Transaction",
    follow_up: "Follow-up",
    quick_capture: "Capture",
  };

  const typeColors: Record<string, string> = {
    note: "bg-blue-100 text-blue-700",
    transaction: "bg-green-100 text-green-700",
    follow_up: "bg-yellow-100 text-yellow-700",
    quick_capture: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Weekly Overview</h2>
        <p className="text-sm text-muted-foreground">What happened this week</p>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground text-center py-12">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {statCards.map((s) => (
              <div key={s.label} className="bg-card border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <div className={`h-7 w-7 rounded-md flex items-center justify-center ${s.bg}`}>
                    <s.icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                </div>
                <p className="text-3xl font-semibold font-mono">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-card border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">AI Weekly Insight</h3>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={handleGetInsight}
                disabled={loadingInsight}
              >
                {loadingInsight ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {loadingInsight ? "Thinking..." : insight ? "Refresh" : "Generate Insight"}
              </Button>
            </div>
            {insight ? (
              <p className="text-sm leading-relaxed text-foreground">{insight}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Click "Generate Insight" to get an AI-powered summary of your week — what's going well, what needs attention, and what to focus on.</p>
            )}
          </div>

          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-medium text-sm mb-3">This Week's Activity</h3>
            {!stats?.weekInteractions?.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No activity recorded this week yet.</p>
            ) : (
              <div className="divide-y">
                {stats.weekInteractions.map((i: any) => (
                  <div key={i.id} className="flex items-start gap-3 py-2.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${typeColors[i.type] || "bg-gray-100 text-gray-700"}`}>
                      {typeLabels[i.type] || i.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link to={`/customers/${i.customerId}`} className="text-xs font-medium hover:underline">
                          {i.customerName}
                        </Link>
                        <span className="text-xs text-muted-foreground font-mono shrink-0">
                          {format(parseISO(i.createdAt), "EEE, MMM d")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{i.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
