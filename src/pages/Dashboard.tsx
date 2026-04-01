import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Users, Flame, CalendarCheck, TrendingUp, Target, DollarSign, ArrowRight, Clock } from "lucide-react";
import QuickCapture from "@/components/QuickCapture";
import StatusBadge from "@/components/StatusBadge";
import { Link } from "react-router-dom";
import { format, isToday, isPast, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import BusinessBadge from "@/components/BusinessBadge";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

const FOCUS_REASON_LABELS: Record<string, { label: string; dot: string }> = {
  overdue_followup: { label: "Follow-up terlambat", dot: "bg-red-500" },
  hot_lead:         { label: "Lead panas",          dot: "bg-orange-500" },
  high_value:       { label: "Nilai tinggi",        dot: "bg-emerald-500" },
};

function StatCard({
  label, value, icon: Icon, accent, colorClass, bgClass, loading,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  accent?: boolean;
  colorClass: string;
  bgClass: string;
  loading?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-5 card-shadow flex flex-col gap-3 ${accent ? "bg-primary text-white" : "bg-white border border-border"}`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium leading-tight ${accent ? "text-white/75" : "text-muted-foreground"}`}>{label}</span>
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${accent ? "bg-white/15" : bgClass}`}>
          <Icon className={`h-4 w-4 ${accent ? "text-white" : colorClass}`} />
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <p className={`text-4xl font-bold font-mono leading-none ${accent ? "text-white" : "text-foreground"}`}>{value}</p>
      )}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline gap-2 mb-4">
      <h3 className="font-semibold text-[15px] text-foreground">{title}</h3>
      {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.email?.split("@")[0] ?? "there";

  const { data: stats, isLoading: statsLoading } = useQuery({
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

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? "Selamat pagi" : greetingHour < 17 ? "Selamat siang" : "Selamat malam";

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Hero / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{greeting}, {firstName} 👋</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {stats?.overdue > 0
              ? `Kamu punya ${stats.overdue} follow-up yang menunggu.`
              : "Semua follow-up sudah beres. Kerja bagus!"}
          </p>
        </div>
        <Link
          to="/customers/new"
          className="hidden sm:inline-flex items-center gap-2 bg-primary text-white text-sm font-medium px-4 py-2 rounded-xl hover:opacity-90 transition-opacity shadow-sm shrink-0"
        >
          + Tambah Customer
        </Link>
      </div>

      {/* Quick Capture */}
      <QuickCapture />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Customer"
          value={stats?.total ?? 0}
          icon={Users}
          colorClass="text-blue-500"
          bgClass="bg-blue-50"
          loading={statsLoading}
        />
        <StatCard
          label="Lead Aktif"
          value={stats?.leads ?? 0}
          icon={TrendingUp}
          colorClass="text-indigo-500"
          bgClass="bg-indigo-50"
          loading={statsLoading}
        />
        <StatCard
          label="Follow-up Hari Ini"
          value={stats?.todayFollowUps ?? 0}
          icon={CalendarCheck}
          colorClass="text-emerald-500"
          bgClass="bg-emerald-50"
          loading={statsLoading}
        />
        <StatCard
          label="Overdue"
          value={stats?.overdue ?? 0}
          icon={Flame}
          accent
          colorClass=""
          bgClass=""
          loading={statsLoading}
        />
      </div>

      {/* Revenue strip */}
      {(revenue?.pipelineValue > 0 || revenue?.closedRevenue > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-border rounded-2xl p-5 card-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">Pipeline Value</span>
              <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center">
                <Target className="h-4 w-4 text-blue-500" />
              </div>
            </div>
            <p className="text-xl font-bold font-mono text-blue-600 leading-none">
              IDR {Number(revenue.pipelineValue).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1.5">Peluang aktif</p>
          </div>
          <div className="bg-white border border-border rounded-2xl p-5 card-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">Closed Revenue</span>
              <div className="h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </div>
            </div>
            <p className="text-xl font-bold font-mono text-emerald-600 leading-none">
              IDR {Number(revenue.closedRevenue).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1.5">Deal berhasil</p>
          </div>
        </div>
      )}

      {/* Daily Focus */}
      {dailyFocus && dailyFocus.length > 0 && (
        <div className="bg-white border border-border rounded-2xl card-shadow overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-amber-50/60">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-amber-100 flex items-center justify-center">
                <span className="text-base">🎯</span>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">Daily Focus</h3>
                <p className="text-xs text-muted-foreground">Customer yang perlu diperhatikan hari ini</p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-border">
            {dailyFocus.map((c: any, idx: number) => (
              <Link
                key={c.id}
                to={`/customers/${c.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/40 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{c.name}</p>
                      {c.customer_businesses?.map((cb: any) => (
                        <BusinessBadge key={cb.business_id} name={cb.businesses?.name} />
                      ))}
                    </div>
                    <div className="flex gap-2 mt-0.5 flex-wrap items-center">
                      {c.focusReasons?.map((r: string) => (
                        <span key={r} className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span className={`h-1.5 w-1.5 rounded-full ${FOCUS_REASON_LABELS[r]?.dot ?? "bg-gray-400"}`} />
                          {FOCUS_REASON_LABELS[r]?.label ?? r}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {c.estimatedValue && (
                    <span className="text-xs font-mono text-emerald-600 font-semibold hidden sm:block">
                      IDR {Number(c.estimatedValue).toLocaleString()}
                    </span>
                  )}
                  <StatusBadge status={c.status} />
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Bottom two-col grid */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Follow-ups due */}
        <div className="bg-white border border-border rounded-2xl card-shadow overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <SectionHeader
              title="Follow-up Jatuh Tempo"
              subtitle={dueFollowUps.length > 0 ? `${dueFollowUps.length} item` : undefined}
            />
          </div>
          {!dueFollowUps.length ? (
            <div className="py-12 text-center px-5">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                <CalendarCheck className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Semua beres!</p>
              <p className="text-xs text-muted-foreground">Tidak ada follow-up yang tertunda.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {dueFollowUps.map((f: any) => (
                <Link
                  key={f.id}
                  to={`/customers/${f.customerId}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/40 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{f.customers?.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{f.content}</p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <StatusBadge status={f.customers?.status} />
                    {f.followUpDate && (
                      <span className={`text-xs font-mono font-semibold ${
                        isPast(parseISO(f.followUpDate)) && !isToday(parseISO(f.followUpDate))
                          ? "text-red-500"
                          : "text-muted-foreground"
                      }`}>
                        {format(parseISO(f.followUpDate), "d MMM", { locale: idLocale })}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent notes */}
        <div className="bg-white border border-border rounded-2xl card-shadow overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <SectionHeader title="Catatan Terbaru" />
          </div>
          {!recentCaptures?.length ? (
            <div className="py-12 text-center px-5">
              <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Belum ada catatan</p>
              <p className="text-xs text-muted-foreground">Pakai Quick Capture di atas untuk mulai mencatat.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentCaptures.map((n: any) => (
                <Link
                  key={n.id}
                  to={`/customers/${n.customerId}`}
                  className="block px-5 py-3.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-foreground">{n.customers?.name}</p>
                    <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                      {format(parseISO(n.createdAt), "d MMM", { locale: idLocale })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{n.content}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
