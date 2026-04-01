import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Sparkles, Loader2, TrendingUp, Users, DollarSign,
  Target, XCircle, MapPin, CalendarRange,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const BIZ_COLORS: Record<string, string> = {
  Temantiket: "#2563EB",
  "SYMP Studio": "#DC2626",
  SYMP: "#DC2626",
  AIGYPT: "#7C3AED",
  Darcia: "#EC4899",
};

function StatCard({
  label, value, icon: Icon, colorClass, bgClass, sub,
}: {
  label: string; value: string | number; icon: React.ElementType;
  colorClass: string; bgClass: string; sub?: string;
}) {
  return (
    <div className="bg-white border border-border rounded-2xl card-shadow p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${bgClass}`}>
          <Icon className={`h-4 w-4 ${colorClass}`} />
        </div>
      </div>
      <p className="text-3xl font-bold font-mono leading-none text-foreground tracking-tight">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex-1 h-5 bg-muted/50 rounded-lg overflow-hidden">
      <div
        className="h-full rounded-lg transition-all"
        style={{ width: `${pct}%`, minWidth: value > 0 ? "8px" : "0", backgroundColor: color || "#3B82F6", opacity: 0.8 }}
      />
    </div>
  );
}

function ReviewSection({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline gap-2 mb-1">
      <h3 className="font-semibold text-[13px] text-muted-foreground uppercase tracking-wider">{title}</h3>
      {subtitle && <span className="text-xs text-muted-foreground">— {subtitle}</span>}
    </div>
  );
}

export default function Yearly() {
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [reflection, setReflection] = useState("");

  const { data: stats, isLoading } = useQuery({
    queryKey: ["yearly-stats"],
    queryFn: () => api.stats.yearly(),
  });

  const handleGetInsight = async () => {
    if (!stats) return;
    setLoadingInsight(true);
    try {
      const result = await api.ai.yearlyInsight(stats);
      setInsight(result.insight);
    } catch {
      setInsight("Gagal membuat insight. Coba lagi nanti.");
    }
    setLoadingInsight(false);
  };

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const monthBreakdown = stats?.monthlyBreakdown?.slice(0, currentMonth + 1) ?? [];
  const maxNewCustomers = Math.max(...monthBreakdown.map((m: any) => m.newCustomers), 1);
  const maxRevenue = Math.max(...monthBreakdown.map((m: any) => Number(m.revenue)), 1);

  const strongestBiz = stats?.byBusiness?.length
    ? [...stats.byBusiness].sort((a: any, b: any) => b.totalCustomers - a.totalCustomers)[0]
    : null;

  const winRate = stats?.totalCustomers > 0
    ? Math.round((stats.closedDeals / stats.totalCustomers) * 100)
    : 0;

  return (
    <div className="space-y-8 max-w-4xl">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CalendarRange className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tinjauan Tahunan</p>
          </div>
          <h2 className="text-2xl font-bold text-foreground">Tahun {currentYear}</h2>
          <p className="text-sm text-muted-foreground mt-1">Gambaran besar bisnis kamu dari Januari hingga sekarang.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-border rounded-2xl p-5 card-shadow space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-16" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* ── KEY METRICS ── */}
          <ReviewSection>
            <SectionHeading title="Metrik Tahun Ini" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                label="Customer Baru"
                value={stats?.totalCustomers ?? 0}
                icon={Users}
                colorClass="text-blue-500"
                bgClass="bg-blue-50"
                sub={`+${stats?.totalCustomers ?? 0} tahun ini`}
              />
              <StatCard
                label="Deal Berhasil"
                value={stats?.closedDeals ?? 0}
                icon={TrendingUp}
                colorClass="text-emerald-500"
                bgClass="bg-emerald-50"
                sub={`Win rate ${winRate}%`}
              />
              <StatCard
                label="Revenue"
                value={Number(stats?.totalRevenue ?? 0) > 0
                  ? `${(Number(stats.totalRevenue) / 1_000_000).toFixed(1)}M`
                  : "—"}
                icon={DollarSign}
                colorClass="text-violet-500"
                bgClass="bg-violet-50"
                sub="dari transaksi tercatat"
              />
              <StatCard
                label="Lead Gagal"
                value={stats?.lostLeads ?? 0}
                icon={XCircle}
                colorClass="text-red-500"
                bgClass="bg-red-50"
                sub={`dari ${stats?.totalCustomers ?? 0} total`}
              />
            </div>
          </ReviewSection>

          {/* ── MONTHLY CADENCE ── */}
          <ReviewSection>
            <SectionHeading title="Cadence Bulanan" subtitle="lead baru per bulan" />
            <div className="bg-white border border-border rounded-2xl card-shadow p-5">
              <div className="space-y-2">
                {monthBreakdown.map((m: any, i: number) => (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-7 shrink-0 font-mono">{MONTH_LABELS[i]}</span>
                    <MiniBar value={m.newCustomers} max={maxNewCustomers} color="#3B82F6" />
                    <span className="text-xs font-mono text-foreground font-semibold w-4 text-right shrink-0">{m.newCustomers}</span>
                    {m.closedDeals > 0 && (
                      <span className="text-[11px] font-semibold text-emerald-600 font-mono shrink-0 hidden sm:block w-12 text-right">
                        {m.closedDeals}✓
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border">
                Angka hijau menunjukkan deal yang berhasil ditutup bulan tersebut.
              </p>
            </div>
          </ReviewSection>

          {/* ── BUSINESS UNITS ── */}
          {stats?.byBusiness?.length > 0 && (
            <ReviewSection>
              <SectionHeading title="Performa Unit Bisnis" />
              <div className="bg-white border border-border rounded-2xl card-shadow overflow-hidden">
                {stats.byBusiness
                  .sort((a: any, b: any) => b.totalCustomers - a.totalCustomers)
                  .map((biz: any) => {
                    const brandColor = BIZ_COLORS[biz.name] || biz.color || "#6B7280";
                    const bizWinRate = biz.totalCustomers > 0 ? Math.round((biz.closedThisYear / biz.totalCustomers) * 100) : 0;
                    return (
                      <div
                        key={biz.id}
                        className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-b-0"
                        style={{ borderLeftColor: brandColor, borderLeftWidth: "3px" }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{biz.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{biz.totalInteractions} interaksi tahun ini</p>
                        </div>
                        <div className="flex items-center gap-5 shrink-0">
                          <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold font-mono text-foreground">{biz.totalCustomers}</p>
                            <p className="text-[10px] text-muted-foreground">total</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold font-mono text-foreground">{biz.newCustomers}</p>
                            <p className="text-[10px] text-muted-foreground">baru</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold font-mono text-emerald-600">{biz.closedThisYear}</p>
                            <p className="text-[10px] text-muted-foreground">closed</p>
                          </div>
                          <div className="text-right hidden sm:block">
                            <p className={`text-sm font-bold font-mono ${bizWinRate >= 30 ? "text-emerald-600" : bizWinRate >= 15 ? "text-amber-600" : "text-muted-foreground"}`}>
                              {bizWinRate}%
                            </p>
                            <p className="text-[10px] text-muted-foreground">win rate</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
              {strongestBiz && (
                <p className="text-xs text-muted-foreground mt-2 ml-1">
                  🏆 Unit terkuat: <strong className="text-foreground">{strongestBiz.name}</strong> dengan {strongestBiz.totalCustomers} customer.
                </p>
              )}
            </ReviewSection>
          )}

          {/* ── PATTERNS ── */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Top sources */}
            <ReviewSection>
              <SectionHeading title="Sumber Lead Terbaik" />
              <div className="bg-white border border-border rounded-2xl card-shadow overflow-hidden">
                {!stats?.topSources?.length ? (
                  <div className="py-8 text-center">
                    <p className="text-xs text-muted-foreground">Belum ada data sumber.</p>
                  </div>
                ) : (
                  <>
                    {stats.topSources.map((s: any, i: number) => (
                      <div key={s.source} className="flex items-center justify-between px-5 py-3 border-b border-border last:border-b-0">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-mono text-muted-foreground w-4">#{i + 1}</span>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-sm font-medium text-foreground">{s.source}</span>
                          </div>
                        </div>
                        <span className="text-sm font-bold font-mono text-foreground">{s.count}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </ReviewSection>

            {/* Lost reasons */}
            <ReviewSection>
              <SectionHeading title="Pola Kegagalan" />
              <div className="bg-white border border-border rounded-2xl card-shadow overflow-hidden">
                {!stats?.lostReasons?.length ? (
                  <div className="py-8 text-center">
                    <p className="text-xs text-muted-foreground">Tidak ada deal yang gagal, atau belum ada alasan yang dicatat.</p>
                  </div>
                ) : (
                  <>
                    {stats.lostReasons.map((r: any, i: number) => (
                      <div key={r.reason} className="flex items-center justify-between px-5 py-3 border-b border-border last:border-b-0">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-mono text-muted-foreground w-4">#{i + 1}</span>
                          <span className="text-sm font-medium text-foreground">{r.reason}</span>
                        </div>
                        <span className="text-sm font-bold font-mono text-red-500">{r.count}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </ReviewSection>
          </div>

          {/* ── REFLECTION NOTES ── */}
          <ReviewSection>
            <SectionHeading title="Refleksi Tahunan" subtitle="hanya tersimpan di browser ini" />
            <div className="bg-white border border-border rounded-2xl card-shadow p-5">
              <Textarea
                placeholder={`Tulis refleksi kamu untuk tahun ${currentYear} di sini...\n\n• Apa yang berjalan paling baik?\n• Apa yang paling banyak membuang waktu?\n• Bisnis mana yang perlu lebih banyak energi?\n• Apa target paling penting untuk tahun depan?`}
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                rows={6}
                className="text-sm bg-muted/20 border-border focus-visible:ring-primary/20 resize-none"
              />
              <p className="text-xs text-muted-foreground mt-2">Catatan ini tidak disimpan ke server. Salin ke dokumen kamu jika perlu.</p>
            </div>
          </ReviewSection>

          {/* ── AI INSIGHT ── */}
          <ReviewSection>
            <SectionHeading title="Strategic Insight AI" />
            <div className="bg-white border border-border rounded-2xl card-shadow overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-violet-50 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-violet-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">Analisis Tahunan AI</h3>
                    <p className="text-xs text-muted-foreground">Tinjauan strategis dan arahan untuk tahun depan</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5"
                  onClick={handleGetInsight}
                  disabled={loadingInsight}
                >
                  {loadingInsight ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {loadingInsight ? "Menganalisis..." : insight ? "Perbarui" : "Buat Analisis"}
                </Button>
              </div>
              <div className="px-5 py-4">
                {insight ? (
                  <p className="text-sm leading-relaxed text-foreground">{insight}</p>
                ) : (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Klik "Buat Analisis" untuk mendapatkan tinjauan strategis AI tentang tahun ini — unit bisnis mana yang paling kuat, pola apa yang terlihat di win/loss, dan ke mana sebaiknya fokus di tahun depan.
                  </p>
                )}
              </div>
            </div>
          </ReviewSection>
        </>
      )}
    </div>
  );
}
