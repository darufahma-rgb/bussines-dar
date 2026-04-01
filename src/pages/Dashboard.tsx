import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Users, Flame, CalendarCheck, TrendingUp, Target, DollarSign, AlertCircle } from "lucide-react";
import QuickCapture from "@/components/QuickCapture";
import PageGuide from "@/components/PageGuide";
import StatusBadge from "@/components/StatusBadge";
import { Link } from "react-router-dom";
import { format, isToday, isPast, parseISO } from "date-fns";
import BusinessBadge from "@/components/BusinessBadge";

const FOCUS_REASON_LABELS: Record<string, { label: string; color: string }> = {
  overdue_followup: { label: "Overdue follow-up", color: "text-red-500" },
  hot_lead:         { label: "Hot lead",          color: "text-orange-500" },
  high_value:       { label: "High value",         color: "text-green-600" },
};

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

  const { data: dailyFocus } = useQuery({
    queryKey: ["daily-focus"],
    queryFn: () => api.customers.dailyFocus(),
  });

  const { data: revenue } = useQuery({
    queryKey: ["revenue"],
    queryFn: () => api.customers.revenue(),
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
        <p className="text-sm text-muted-foreground">Ringkasan aktivitas CRM kamu hari ini</p>
      </div>

      <PageGuide steps={[
        { icon: "⚡", title: "Quick Capture", desc: "Ketik catatan singkat tentang customer lalu tekan Capture. Gunakan tombol 'AI Parse' agar AI otomatis mengekstrak nama, status, dan tanggal follow-up. Shortcut: Ctrl+K / Cmd+K." },
        { icon: "📊", title: "Statistik", desc: "Lihat total customer, lead aktif, follow-up hari ini, dan yang sudah overdue sekaligus di satu tampilan." },
        { icon: "🎯", title: "Daily Focus", desc: "AI memilihkan 3 customer yang paling perlu diperhatikan hari ini — berdasarkan follow-up overdue, hot lead, atau nilai deal yang tinggi." },
        { icon: "📅", title: "Due Follow-ups", desc: "Daftar follow-up yang jatuh tempo hari ini atau sudah lewat. Klik nama customer untuk langsung membuka profilnya dan tandai selesai." },
        { icon: "📝", title: "Recent Notes", desc: "5 catatan terbaru dari Quick Capture. Berguna untuk mengingat apa yang terakhir dibahas dengan customer." },
        { icon: "💰", title: "Pipeline Value", desc: "Total estimasi nilai deal yang masih berjalan (belum closed/lost). Diisi otomatis dari field Estimated Value di profil customer." },
      ]} />

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

      {(revenue?.pipelineValue > 0 || revenue?.closedRevenue > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Pipeline Value</span>
              <Target className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-xl font-semibold font-mono mt-1 text-blue-600">
              IDR {Number(revenue.pipelineValue).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Open opportunities</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Closed Revenue</span>
              <DollarSign className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-xl font-semibold font-mono mt-1 text-green-600">
              IDR {Number(revenue.closedRevenue).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Won deals</p>
          </div>
        </div>
      )}

      {dailyFocus && dailyFocus.length > 0 && (
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            <h3 className="font-medium text-sm">Daily Focus</h3>
            <span className="text-xs text-muted-foreground">— act on these today</span>
          </div>
          <div className="space-y-2">
            {dailyFocus.map((c: any) => (
              <Link
                key={c.id}
                to={`/customers/${c.id}`}
                className="flex items-center justify-between p-2 rounded hover:bg-muted transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{c.name}</p>
                    {c.customer_businesses?.map((cb: any) => (
                      <BusinessBadge key={cb.business_id} name={cb.businesses?.name} />
                    ))}
                  </div>
                  <div className="flex gap-2 mt-0.5 flex-wrap">
                    {c.focusReasons?.map((r: string) => (
                      <span key={r} className={`text-xs ${FOCUS_REASON_LABELS[r]?.color ?? "text-muted-foreground"}`}>
                        {FOCUS_REASON_LABELS[r]?.label ?? r}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {c.estimatedValue && (
                    <span className="text-xs font-mono text-green-600">IDR {Number(c.estimatedValue).toLocaleString()}</span>
                  )}
                  <StatusBadge status={c.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <h3 className="font-medium text-sm mb-3">Due Follow-ups</h3>
          {!dueFollowUps.length ? (
            <p className="text-sm text-muted-foreground">No follow-ups due. You're all caught up!</p>
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
