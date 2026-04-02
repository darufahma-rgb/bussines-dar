import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Users, Flame, CalendarCheck, TrendingUp, DollarSign,
  ArrowRight, AlertTriangle, ChevronRight, BarChart2, CalendarDays, CalendarRange,
} from "lucide-react";
import QuickCapture from "@/components/QuickCapture";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { Link } from "react-router-dom";
import { format, isToday, isPast, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import BusinessBadge from "@/components/BusinessBadge";
import { useAuth } from "@/hooks/useAuth";
import { getBizColor } from "@/lib/constants";
import { formatIDR, formatDateShort } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

const PIPELINE_STAGES = [
  { key: "new",         label: "Baru",      color: "bg-blue-500",    text: "text-blue-600",   light: "bg-blue-50" },
  { key: "warm",        label: "Hangat",    color: "bg-amber-500",   text: "text-amber-600",  light: "bg-amber-50" },
  { key: "hot",         label: "Panas",     color: "bg-orange-500",  text: "text-orange-600", light: "bg-orange-50" },
  { key: "negotiation", label: "Negosiasi", color: "bg-violet-500",  text: "text-violet-600", light: "bg-violet-50" },
];

const FOCUS_REASON_LABELS: Record<string, { label: string; dot: string }> = {
  overdue_followup: { label: "Follow-up terlambat", dot: "bg-red-500" },
  hot_lead:         { label: "Lead panas",           dot: "bg-orange-500" },
  high_value:       { label: "Nilai tinggi",         dot: "bg-emerald-500" },
};

export default function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.name
    ? user.name.split(" ")[0]
    : (user?.email?.split("@")[0] ?? "there");

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

  const { data: allCustomers } = useQuery({
    queryKey: ["customers-pipeline"],
    queryFn: () => api.customers.list(),
  });

  const { data: monthlyStats } = useQuery({
    queryKey: ["monthly-stats"],
    queryFn: () => api.stats.monthly(),
  });

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

  const hasPriorities = overdue.length > 0 || todayDue.length > 0;
  const bizUnits = monthlyStats?.byBusiness?.filter((b: any) => b.totalCustomers > 0) ?? [];

  return (
    <div className="space-y-5 max-w-screen-xl">

      {/* ══════════════════════════════════════════
          HERO: Greeting + 4 stat chips in one row
          ══════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-0.5">Business Operating System</p>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">{greeting}, {firstName} 👋</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stats?.overdue > 0
              ? <span className="text-red-500 font-medium">{stats.overdue} follow-up terlambat perlu perhatian.</span>
              : "Semua follow-up beres. Fokus ke pipeline hari ini."}
          </p>
        </div>
        <Link
          to="/customers/new"
          className="hidden sm:inline-flex items-center gap-2 bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-sm shrink-0"
        >
          + Customer Baru
        </Link>
      </div>

      {/* 4 stat chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Customer", value: stats?.total ?? 0, icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Lead Aktif", value: stats?.leads ?? 0, icon: TrendingUp, color: "text-indigo-500", bg: "bg-indigo-50" },
          { label: "Follow-up Hari Ini", value: stats?.todayFollowUps ?? 0, icon: CalendarCheck, color: "text-emerald-500", bg: "bg-emerald-50" },
          { label: "Overdue", value: stats?.overdue ?? 0, icon: Flame, color: "text-red-500", bg: "bg-red-50" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-border rounded-2xl card-shadow px-4 py-3.5 flex items-center gap-3">
            <div className={`h-9 w-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
              <s.icon className={`h-4.5 w-4.5 ${s.color}`} />
            </div>
            <div className="min-w-0">
              {statsLoading
                ? <Skeleton className="h-5 w-10 mb-1.5 rounded-md" />
                : <p className="text-xl font-bold font-mono text-foreground leading-none">{s.value}</p>}
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          QUICK CAPTURE (full width, prominent)
          ══════════════════════════════════════════ */}
      <QuickCapture />

      {/* ══════════════════════════════════════════
          MAIN GRID: Left (priorities + focus) / Right (pipeline + biz)
          ══════════════════════════════════════════ */}
      <div className="grid lg:grid-cols-5 gap-5">

        {/* LEFT: Priorities + Customer Prioritas */}
        <div className="lg:col-span-3 space-y-5">

          {/* Today's Priorities */}
          {!hasPriorities && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <CalendarCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800">Semua follow-up beres!</p>
                <p className="text-xs text-emerald-600 mt-0.5">Tidak ada yang terlambat hari ini. Tetap pantau pipeline.</p>
              </div>
            </div>
          )}
          {hasPriorities && (
            <div className="bg-white border border-border rounded-2xl card-shadow overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-sm text-foreground">Prioritas Hari Ini</h3>
                <Link to="/follow-ups" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  Semua <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {overdue.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-5 py-2.5 bg-red-50/70">
                    <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                    <span className="text-xs font-semibold text-red-600">Terlambat ({overdue.length})</span>
                  </div>
                  {overdue.slice(0, 3).map((f: any) => (
                    <Link key={f.id} to={`/customers/${f.customerId}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors border-t border-border group">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{f.customers?.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{f.content}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className="text-xs font-mono font-semibold text-red-500">{formatDateShort(f.followUpDate)}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                  {overdue.length > 3 && (
                    <Link to="/follow-ups" className="block px-5 py-2.5 text-xs text-center text-muted-foreground hover:text-foreground border-t border-border">
                      +{overdue.length - 3} lagi
                    </Link>
                  )}
                </div>
              )}
              {todayDue.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-5 py-2.5 bg-blue-50/50">
                    <CalendarCheck className="h-3 w-3 text-blue-500 shrink-0" />
                    <span className="text-xs font-semibold text-blue-600">Hari Ini ({todayDue.length})</span>
                  </div>
                  {todayDue.slice(0, 3).map((f: any) => (
                    <Link key={f.id} to={`/customers/${f.customerId}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors border-t border-border group">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{f.customers?.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{f.content}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <StatusBadge status={f.customers?.status} />
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Customer Prioritas */}
          {dailyFocus && dailyFocus.length > 0 && (
            <div className="bg-white border border-border rounded-2xl card-shadow overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
                <span className="text-sm">🎯</span>
                <h3 className="font-semibold text-sm text-foreground">Customer Prioritas</h3>
              </div>
              <div className="divide-y divide-border">
                {dailyFocus.map((c: any, idx: number) => (
                  <Link key={c.id} to={`/customers/${c.id}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground shrink-0">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">{c.name}</p>
                          {c.customer_businesses?.slice(0, 2).map((cb: any) => (
                            <BusinessBadge key={cb.business_id} name={cb.businesses?.name} />
                          ))}
                        </div>
                        <div className="flex gap-2 mt-0.5 items-center flex-wrap">
                          {c.focusReasons?.map((r: string) => (
                            <span key={r} className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span className={`h-1.5 w-1.5 rounded-full ${FOCUS_REASON_LABELS[r]?.dot ?? "bg-gray-400"}`} />
                              {FOCUS_REASON_LABELS[r]?.label ?? r}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {c.estimatedValue && (
                        <span className="text-xs font-mono text-emerald-600 font-semibold hidden sm:block">{formatIDR(c.estimatedValue)}</span>
                      )}
                      <StatusBadge status={c.status} />
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recent Notes */}
          <div className="bg-white border border-border rounded-2xl card-shadow overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm text-foreground">Catatan Terbaru</h3>
              <Link to="/customers" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                Lihat semua <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {!recentCaptures?.length ? (
              <EmptyState icon={CalendarCheck} title="Belum ada catatan" description="Gunakan Quick Capture di atas untuk mulai mencatat." />
            ) : (
              <div className="divide-y divide-border">
                {recentCaptures.map((n: any) => (
                  <Link key={n.id} to={`/customers/${n.customerId}`} className="block px-5 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-foreground truncate">{n.customers?.name}</p>
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

        {/* RIGHT: Pipeline + Business Units + Review shortcuts */}
        <div className="lg:col-span-2 space-y-5">

          {/* Pipeline snapshot */}
          <div className="bg-white border border-border rounded-2xl card-shadow overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm text-foreground">Pipeline</h3>
              <Link to="/pipeline" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                Buka <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="px-5 py-4 space-y-3">
              {stageGroups.map((s) => (
                <div key={s.key} className="flex items-center gap-2.5">
                  <div className={`h-6 w-6 rounded-lg ${s.light} flex items-center justify-center shrink-0`}>
                    <span className={`text-[10px] font-bold ${s.text}`}>{s.customers.length}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{s.label}</span>
                      {s.value > 0 && <span className="text-[10px] font-mono text-muted-foreground">{formatIDR(s.value)}</span>}
                    </div>
                    <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s.color} opacity-70`}
                        style={{ width: `${(s.customers.length / maxStageCount) * 100}%`, minWidth: s.customers.length > 0 ? "4px" : "0" }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {revenue?.closedRevenue > 0 && (
              <div className="px-5 pb-4 pt-2 border-t border-border flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs text-muted-foreground">Closed Revenue:</span>
                <span className="text-xs font-mono font-bold text-emerald-600 ml-auto">{formatIDR(revenue.closedRevenue)}</span>
              </div>
            )}
          </div>

          {/* Business Units */}
          {bizUnits.length > 0 && (
            <div className="bg-white border border-border rounded-2xl card-shadow overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border">
                <h3 className="font-semibold text-sm text-foreground">Unit Bisnis</h3>
              </div>
              <div className="divide-y divide-border">
                {bizUnits
                  .sort((a: any, b: any) => b.totalCustomers - a.totalCustomers)
                  .map((biz: any) => {
                    const brandColor = getBizColor(biz.name, biz.color);
                    return (
                      <div key={biz.id} className="flex items-center gap-3 px-5 py-3">
                        <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: brandColor }} />
                        <span className="text-sm font-medium text-foreground flex-1 truncate">{biz.name}</span>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                          <span><span className="font-bold text-foreground font-mono">{biz.totalCustomers}</span> customer</span>
                          {biz.newCustomers > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: brandColor }}>
                              +{biz.newCustomers}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Review shortcuts */}
          <div>
            <p className="section-label mb-2">Laporan</p>
            <div className="space-y-2">
              {[
                { to: "/weekly",  icon: CalendarDays,  label: "Mingguan",  desc: "7 hari terakhir",       color: "bg-blue-50",   iconColor: "text-blue-500" },
                { to: "/monthly", icon: BarChart2,      label: "Bulanan",   desc: "Bulan ini vs lalu",     color: "bg-indigo-50", iconColor: "text-indigo-500" },
                { to: "/yearly",  icon: CalendarRange,  label: "Tahunan",   desc: "Gambaran besar",        color: "bg-violet-50", iconColor: "text-violet-500" },
              ].map((item) => (
                <Link key={item.to} to={item.to}
                  className="flex items-center gap-3 bg-white border border-border rounded-xl card-shadow px-4 py-3 hover:bg-muted/20 transition-colors group">
                  <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${item.color} shrink-0`}>
                    <item.icon className={`h-4 w-4 ${item.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
