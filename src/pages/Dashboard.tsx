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
  overdue_followup: { label: "Follow-up terlambat", color: "text-red-500" },
  hot_lead:         { label: "Lead panas",          color: "text-orange-500" },
  high_value:       { label: "Nilai tinggi",        color: "text-green-600" },
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
    {
      label: "Total Customer",
      value: stats?.total ?? 0,
      icon: Users,
      accent: false,
    },
    {
      label: "Lead Aktif",
      value: stats?.leads ?? 0,
      icon: TrendingUp,
      accent: false,
    },
    {
      label: "Follow-up Hari Ini",
      value: stats?.todayFollowUps ?? 0,
      icon: CalendarCheck,
      accent: false,
    },
    {
      label: "Overdue",
      value: stats?.overdue ?? 0,
      icon: Flame,
      accent: true,
    },
  ];

  return (
    <div className="space-y-5 max-w-5xl">
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
          <div
            key={s.label}
            className={`rounded-xl p-4 card-shadow ${
              s.accent
                ? "bg-primary text-white"
                : "bg-white border border-border"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-medium ${s.accent ? "text-white/80" : "text-muted-foreground"}`}>
                {s.label}
              </span>
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                s.accent ? "bg-white/20" : "bg-muted"
              }`}>
                <s.icon className={`h-4 w-4 ${s.accent ? "text-white" : "text-muted-foreground"}`} />
              </div>
            </div>
            <p className={`text-3xl font-bold font-mono ${s.accent ? "text-white" : "text-foreground"}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {(revenue?.pipelineValue > 0 || revenue?.closedRevenue > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-border rounded-xl p-4 card-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">Pipeline Value</span>
              <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Target className="h-4 w-4 text-blue-500" />
              </div>
            </div>
            <p className="text-xl font-bold font-mono text-blue-600">
              IDR {Number(revenue.pipelineValue).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Peluang aktif</p>
          </div>
          <div className="bg-white border border-border rounded-xl p-4 card-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">Closed Revenue</span>
              <div className="h-8 w-8 rounded-lg bg-green-50 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-green-500" />
              </div>
            </div>
            <p className="text-xl font-bold font-mono text-green-600">
              IDR {Number(revenue.closedRevenue).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Deal berhasil</p>
          </div>
        </div>
      )}

      {dailyFocus && dailyFocus.length > 0 && (
        <div className="bg-white border border-border rounded-xl p-4 card-shadow">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-lg bg-orange-50 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Daily Focus</h3>
              <p className="text-xs text-muted-foreground">Customer yang perlu diperhatikan hari ini</p>
            </div>
          </div>
          <div className="space-y-1">
            {dailyFocus.map((c: any) => (
              <Link
                key={c.id}
                to={`/customers/${c.id}`}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/60 transition-colors"
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
                    <span className="text-xs font-mono text-green-600 font-semibold">
                      IDR {Number(c.estimatedValue).toLocaleString()}
                    </span>
                  )}
                  <StatusBadge status={c.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white border border-border rounded-xl p-4 card-shadow">
          <h3 className="font-semibold text-sm mb-3">Follow-up Jatuh Tempo</h3>
          {!dueFollowUps.length ? (
            <div className="py-8 text-center">
              <CalendarCheck className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Semua follow-up sudah selesai!</p>
            </div>
          ) : (
            <div className="space-y-1">
              {dueFollowUps.map((f: any) => (
                <Link
                  key={f.id}
                  to={`/customers/${f.customerId}`}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/60 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{f.customers?.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{f.content}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={f.customers?.status} />
                    {f.followUpDate && (
                      <span className={`text-xs font-mono ${isPast(parseISO(f.followUpDate)) && !isToday(parseISO(f.followUpDate)) ? "text-red-500 font-semibold" : "text-muted-foreground"}`}>
                        {format(parseISO(f.followUpDate), "MMM d")}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-border rounded-xl p-4 card-shadow">
          <h3 className="font-semibold text-sm mb-3">Catatan Terbaru</h3>
          {!recentCaptures?.length ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">Belum ada catatan. Pakai Quick Capture!</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentCaptures.map((n: any) => (
                <Link
                  key={n.id}
                  to={`/customers/${n.customerId}`}
                  className="block p-2.5 rounded-lg hover:bg-muted/60 transition-colors"
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
