import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Users, Flame, CalendarCheck, TrendingUp, Target, DollarSign,
  ArrowRight, Clock, AlertTriangle, ChevronRight, BarChart2, CalendarDays, CalendarRange,
} from "lucide-react";
import QuickCapture from "@/components/QuickCapture";
import StatusBadge from "@/components/StatusBadge";
import { Link } from "react-router-dom";
import { format, isToday, isPast, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import BusinessBadge from "@/components/BusinessBadge";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

const PIPELINE_STAGES = [
  { key: "new", label: "Baru", color: "bg-blue-500" },
  { key: "warm", label: "Hangat", color: "bg-amber-500" },
  { key: "hot", label: "Panas", color: "bg-orange-500" },
  { key: "negotiation", label: "Negosiasi", color: "bg-violet-500" },
];

const FOCUS_REASON_LABELS: Record<string, { label: string; dot: string }> = {
  overdue_followup: { label: "Follow-up terlambat", dot: "bg-red-500" },
  hot_lead:         { label: "Lead panas",          dot: "bg-orange-500" },
  high_value:       { label: "Nilai tinggi",        dot: "bg-emerald-500" },
};

const BIZ_COLORS: Record<string, string> = {
  Temantiket: "#2563EB",
  "SYMP Studio": "#DC2626",
  SYMP: "#DC2626",
  AIGYPT: "#7C3AED",
  Darcia: "#EC4899",
};

function MetricCard({
  label, value, icon: Icon, colorClass, bgClass, loading, accent,
}: {
  label: string; value: string | number; icon: React.ElementType;
  colorClass: string; bgClass: string; loading?: boolean; accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-5 card-shadow flex flex-col gap-2.5 ${accent ? "bg-primary text-white" : "bg-white border border-border"}`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium leading-tight ${accent ? "text-white/70" : "text-muted-foreground"}`}>{label}</span>
        <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${accent ? "bg-white/15" : bgClass}`}>
          <Icon className={`h-4 w-4 ${accent ? "text-white" : colorClass}`} />
        </div>
      </div>
      {loading ? (
        <Skeleton className={`h-9 w-16 ${accent ? "bg-white/20" : ""}`} />
      ) : (
        <p className={`text-4xl font-bold font-mono leading-none tracking-tight ${accent ? "text-white" : "text-foreground"}`}>{value}</p>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-semibold text-[13px] text-muted-foreground uppercase tracking-wider mb-3">{children}</h3>;
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
    queryFn: () => api.interactions.list({ type: "quick_capture,note", limit: 4, includeCustomer: true }),
  });

  const { data: dailyFocus } = useQuery({
    queryKey: ["daily-focus"],
    queryFn: () => api.customers.dailyFocus(),
  });

  const { data: revenue } = useQuery({
    queryKey: ["revenue"],
    queryFn: () => api.customers.revenue(),
  });

  const { data: allCustomers } = useQuery({
    queryKey: ["customers-pipeline"],
    queryFn: () => api.customers.list(),
  });

  const { data: monthlyStats } = useQuery({
    queryKey: ["monthly-stats"],
    queryFn: () => api.stats.monthly(),
  });

  const today = new Date().toISOString().split("T")[0];
  const overdue = todayFollowUps?.filter((f: any) =>
    f.followUpDate && isPast(parseISO(f.followUpDate)) && !isToday(parseISO(f.followUpDate))
  ) ?? [];
  const todayDue = todayFollowUps?.filter((f: any) =>
    f.followUpDate && isToday(parseISO(f.followUpDate))
  ) ?? [];

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? "Selamat pagi" : greetingHour < 17 ? "Selamat siang" : "Selamat malam";

  const stageGroups = PIPELINE_STAGES.map((s) => ({
    ...s,
    customers: (allCustomers || []).filter((c: any) => c.status === s.key),
    value: (allCustomers || []).filter((c: any) => c.status === s.key).reduce((sum: number, c: any) => sum + (Number(c.estimatedValue) || 0), 0),
  }));
  const maxStageCount = Math.max(...stageGroups.map(s => s.customers.length), 1);

  const pipelineTotal = stageGroups.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="space-y-7 max-w-5xl">

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Business Operating System</p>
          <h2 className="text-2xl font-bold text-foreground">{greeting}, {firstName}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {stats?.overdue > 0
              ? <span className="text-red-500 font-medium">{stats.overdue} follow-up terlambat perlu perhatian segera.</span>
              : "Semua follow-up beres. Fokus bisa ke pipeline hari ini."}
          </p>
        </div>
        <Link
          to="/customers/new"
          className="hidden sm:inline-flex items-center gap-2 bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-sm shrink-0"
        >
          + Customer Baru
        </Link>
      </div>

      {/* ── TODAY'S PRIORITIES ── */}
      {(overdue.length > 0 || todayDue.length > 0) && (
        <div>
          <SectionTitle>Prioritas Hari Ini</SectionTitle>
          <div className="bg-white border border-border rounded-2xl card-shadow overflow-hidden">
            {overdue.length > 0 && (
              <div className="border-b border-border">
                <div className="flex items-center gap-2 px-5 py-3 bg-red-50/70">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  <span className="text-xs font-semibold text-red-600">Terlambat ({overdue.length})</span>
                </div>
                {overdue.slice(0, 4).map((f: any) => (
                  <Link
                    key={f.id}
                    to={`/customers/${f.customerId}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors border-t border-border first:border-t-0 group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{f.customers?.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{f.content}</p>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-xs font-mono font-semibold text-red-500">
                        {format(parseISO(f.followUpDate), "d MMM", { locale: idLocale })}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                    </div>
                  </Link>
                ))}
                {overdue.length > 4 && (
                  <Link to="/follow-ups" className="block px-5 py-2.5 text-xs text-center text-muted-foreground hover:text-foreground border-t border-border transition-colors">
                    +{overdue.length - 4} lagi → Lihat semua
                  </Link>
                )}
              </div>
            )}

            {todayDue.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-5 py-3 bg-blue-50/50">
                  <CalendarCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span className="text-xs font-semibold text-blue-600">Hari Ini ({todayDue.length})</span>
                </div>
                {todayDue.slice(0, 3).map((f: any) => (
                  <Link
                    key={f.id}
                    to={`/customers/${f.customerId}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors border-t border-border group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{f.customers?.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{f.content}</p>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <StatusBadge status={f.customers?.status} />
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Quick Capture ── */}
      <QuickCapture />

      {/* ── KEY METRICS ── */}
      <div>
        <SectionTitle>Metrik Kunci</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard label="Total Customer" value={stats?.total ?? 0} icon={Users} colorClass="text-blue-500" bgClass="bg-blue-50" loading={statsLoading} />
          <MetricCard label="Lead Aktif" value={stats?.leads ?? 0} icon={TrendingUp} colorClass="text-indigo-500" bgClass="bg-indigo-50" loading={statsLoading} />
          <MetricCard label="Follow-up Hari Ini" value={stats?.todayFollowUps ?? 0} icon={CalendarCheck} colorClass="text-emerald-500" bgClass="bg-emerald-50" loading={statsLoading} />
          <MetricCard label="Overdue" value={stats?.overdue ?? 0} icon={Flame} accent loading={statsLoading} colorClass="" bgClass="" />
        </div>
      </div>

      {/* ── PIPELINE OVERVIEW ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>Pipeline</SectionTitle>
          {pipelineTotal > 0 && (
            <span className="text-xs font-mono font-semibold text-emerald-600 mb-3">
              IDR {pipelineTotal.toLocaleString()} total
            </span>
          )}
        </div>
        <div className="bg-white border border-border rounded-2xl card-shadow p-5">
          <div className="space-y-3">
            {stageGroups.map((s) => (
              <div key={s.key} className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-24 shrink-0">
                  <span className={`h-2 w-2 rounded-full ${s.color} shrink-0`} />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <div className="flex-1 h-6 bg-muted/50 rounded-lg overflow-hidden">
                  <div
                    className={`h-full rounded-lg transition-all ${s.color} opacity-80`}
                    style={{ width: `${(s.customers.length / maxStageCount) * 100}%`, minWidth: s.customers.length > 0 ? "12px" : "0" }}
                  />
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs">
                  <span className="font-mono font-semibold text-foreground w-4 text-right">{s.customers.length}</span>
                  {s.value > 0 && (
                    <span className="font-mono text-muted-foreground hidden sm:block w-28 text-right">
                      IDR {s.value.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            {(revenue?.closedRevenue > 0) && (
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Closed Revenue</p>
                  <p className="text-sm font-mono font-bold text-emerald-600">IDR {Number(revenue.closedRevenue).toLocaleString()}</p>
                </div>
              </div>
            )}
            <Link to="/pipeline" className="ml-auto flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
              Buka Pipeline <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── BUSINESS UNITS ── */}
      {monthlyStats?.byBusiness?.filter((b: any) => b.totalCustomers > 0).length > 0 && (
        <div>
          <SectionTitle>Unit Bisnis</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            {monthlyStats.byBusiness
              .filter((b: any) => b.totalCustomers > 0)
              .sort((a: any, b: any) => b.totalCustomers - a.totalCustomers)
              .map((biz: any) => {
                const brandColor = BIZ_COLORS[biz.name] || biz.color || "#6B7280";
                return (
                  <div
                    key={biz.id}
                    className="bg-white border border-border rounded-2xl card-shadow overflow-hidden"
                    style={{ borderLeftColor: brandColor, borderLeftWidth: "3px" }}
                  >
                    <div className="px-4 pt-4 pb-3">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-foreground">{biz.name}</span>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: brandColor }}
                        >
                          {biz.newCustomers > 0 ? `+${biz.newCustomers} baru` : "aktif"}
                        </span>
                      </div>
                      <div className="flex gap-4">
                        <div>
                          <p className="text-2xl font-bold font-mono text-foreground leading-none">{biz.totalCustomers}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">total customer</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold font-mono text-foreground leading-none">{biz.totalInteractions}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">interaksi bulan ini</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── DAILY FOCUS ── */}
      {dailyFocus && dailyFocus.length > 0 && (
        <div>
          <SectionTitle>Customer Prioritas</SectionTitle>
          <div className="bg-white border border-border rounded-2xl card-shadow overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border bg-amber-50/50 flex items-center gap-2">
              <span className="text-base">🎯</span>
              <p className="text-xs font-medium text-amber-800">Customer yang perlu diperhatikan hari ini</p>
            </div>
            <div className="divide-y divide-border">
              {dailyFocus.map((c: any, idx: number) => (
                <Link
                  key={c.id}
                  to={`/customers/${c.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors group"
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
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM GRID: Recent + Review Shortcuts ── */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Recent notes */}
        <div className="lg:col-span-3 bg-white border border-border rounded-2xl card-shadow overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-sm text-foreground">Catatan Terbaru</h3>
            <Link to="/customers" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              Lihat semua <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {!recentCaptures?.length ? (
            <div className="py-10 text-center px-5">
              <div className="h-10 w-10 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                <Clock className="h-4 w-4 text-muted-foreground/60" />
              </div>
              <p className="text-xs text-muted-foreground">Belum ada catatan. Pakai Quick Capture di atas.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentCaptures.map((n: any) => (
                <Link
                  key={n.id}
                  to={`/customers/${n.customerId}`}
                  className="block px-5 py-3.5 hover:bg-muted/30 transition-colors"
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

        {/* Review shortcuts */}
        <div className="lg:col-span-2 space-y-3">
          <SectionTitle>Review</SectionTitle>
          {[
            { to: "/weekly", icon: CalendarDays, label: "Laporan Mingguan", desc: "Aktivitas 7 hari terakhir", color: "bg-blue-50", iconColor: "text-blue-500" },
            { to: "/monthly", icon: BarChart2, label: "Laporan Bulanan", desc: "Perbandingan bulan ini vs lalu", color: "bg-indigo-50", iconColor: "text-indigo-500" },
            { to: "/yearly", icon: CalendarRange, label: "Tinjauan Tahunan", desc: "Gambaran besar tahun ini", color: "bg-violet-50", iconColor: "text-violet-500" },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 bg-white border border-border rounded-2xl card-shadow px-4 py-3.5 hover:bg-muted/20 transition-colors group"
            >
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${item.color} shrink-0`}>
                <item.icon className={`h-4 w-4 ${item.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
