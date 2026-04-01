import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sparkles, Loader2, TrendingUp, TrendingDown, Minus, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

function Delta({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  const isUp = diff > 0;
  const isDown = diff < 0;
  return (
    <div className="flex items-center gap-1 text-xs">
      {isUp && <TrendingUp className="h-3 w-3 text-emerald-500" />}
      {isDown && <TrendingDown className="h-3 w-3 text-red-500" />}
      {!isUp && !isDown && <Minus className="h-3 w-3 text-muted-foreground" />}
      <span className={`font-medium ${isUp ? "text-emerald-600" : isDown ? "text-red-500" : "text-muted-foreground"}`}>
        {isUp ? "+" : ""}{diff}
      </span>
    </div>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline gap-2 mb-3">
      <h3 className="font-semibold text-[13px] text-muted-foreground uppercase tracking-wider">{title}</h3>
      {subtitle && <span className="text-xs text-muted-foreground">— {subtitle}</span>}
    </div>
  );
}

const STAT_ROWS = [
  { label: "Customer Baru", key: "newCustomers" },
  { label: "Deal Berhasil", key: "closedDeals" },
  { label: "Total Interaksi", key: "totalInteractions" },
  { label: "Follow-up Selesai", key: "followUpsDone" },
  { label: "Follow-up Terlewat", key: "followUpsMissed" },
];

const BIZ_COLORS: Record<string, string> = {
  Temantiket: "#2563EB",
  "SYMP Studio": "#DC2626",
  SYMP: "#DC2626",
  AIGYPT: "#7C3AED",
  Darcia: "#EC4899",
};

export default function Monthly() {
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [reflection, setReflection] = useState("");

  const { data: stats, isLoading } = useQuery({
    queryKey: ["monthly-stats"],
    queryFn: () => api.stats.monthly(),
  });

  const handleGetInsight = async () => {
    if (!stats) return;
    setLoadingInsight(true);
    try {
      const result = await api.ai.monthlyInsight({
        current: stats.current,
        previous: stats.previous,
        byBusiness: stats.byBusiness,
      });
      setInsight(result.insight);
    } catch {
      setInsight("Gagal membuat insight. Coba lagi nanti.");
    }
    setLoadingInsight(false);
  };

  const now = new Date();
  const currentMonthName = now.toLocaleString("id-ID", { month: "long", year: "numeric" });
  const prevMonthName = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleString("id-ID", { month: "long", year: "numeric" });

  const bestBiz = stats?.byBusiness?.length
    ? [...stats.byBusiness].sort((a: any, b: any) => b.totalInteractions - a.totalInteractions)[0]
    : null;

  return (
    <div className="space-y-8 max-w-4xl">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BarChart2 className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Laporan Bulanan</p>
        </div>
        <h2 className="text-2xl font-bold text-foreground capitalize">{currentMonthName}</h2>
        <p className="text-sm text-muted-foreground mt-1 capitalize">Dibandingkan dengan {prevMonthName}.</p>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white border border-border rounded-2xl p-5 card-shadow space-y-3">
              <Skeleton className="h-4 w-32" />
              {[...Array(5)].map((_, j) => (
                <div key={j} className="flex justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Month comparison */}
          <div>
            <SectionHeading title="Perbandingan Bulan" />
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white border border-border rounded-2xl card-shadow overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-primary/5">
                  <h3 className="font-semibold text-sm text-primary capitalize">{currentMonthName}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Bulan berjalan</p>
                </div>
                <div className="px-5 py-4 space-y-3.5">
                  {STAT_ROWS.map(({ label, key }) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{label}</span>
                      <div className="flex items-center gap-3">
                        <Delta current={stats?.current?.[key] ?? 0} previous={stats?.previous?.[key] ?? 0} />
                        <span className="text-sm font-bold font-mono w-8 text-right text-foreground">
                          {stats?.current?.[key] ?? 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white border border-border rounded-2xl card-shadow overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-muted/40">
                  <h3 className="font-semibold text-sm text-muted-foreground capitalize">{prevMonthName}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Bulan lalu (pembanding)</p>
                </div>
                <div className="px-5 py-4 space-y-3.5">
                  {STAT_ROWS.map(({ label, key }) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{label}</span>
                      <span className="text-sm font-bold font-mono text-muted-foreground">
                        {stats?.previous?.[key] ?? 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Business breakdown */}
          <div>
            <SectionHeading title="Performa Unit Bisnis" subtitle="aktivitas bulan ini" />
            <div className="bg-white border border-border rounded-2xl card-shadow overflow-hidden">
              {!stats?.byBusiness?.length ? (
                <div className="py-10 text-center px-5">
                  <p className="text-sm text-muted-foreground">Belum ada data bisnis.</p>
                </div>
              ) : (
                <>
                  {stats.byBusiness
                    .sort((a: any, b: any) => b.totalInteractions - a.totalInteractions)
                    .map((biz: any) => {
                      const brandColor = BIZ_COLORS[biz.name] || biz.color || "#6B7280";
                      return (
                        <div
                          key={biz.id}
                          className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-b-0"
                          style={{ borderLeftColor: brandColor, borderLeftWidth: "3px" }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">{biz.name}</p>
                            <p className="text-xs text-muted-foreground">{biz.totalCustomers} total customer</p>
                          </div>
                          <div className="flex items-center gap-6 shrink-0">
                            <div className="text-right">
                              <p className="text-sm font-bold font-mono text-foreground">{biz.totalInteractions}</p>
                              <p className="text-[10px] text-muted-foreground">interaksi</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold font-mono text-foreground">{biz.newCustomers}</p>
                              <p className="text-[10px] text-muted-foreground">lead baru</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  {bestBiz && (
                    <div className="px-5 py-3 bg-muted/20">
                      <p className="text-xs text-muted-foreground">
                        🏆 Unit paling aktif bulan ini: <strong className="text-foreground">{bestBiz.name}</strong>
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Reflection */}
          <div>
            <SectionHeading title="Refleksi Bulanan" subtitle="hanya tersimpan di browser ini" />
            <div className="bg-white border border-border rounded-2xl card-shadow p-5">
              <Textarea
                placeholder={`Tulis refleksi bulan ini...\n\n• Apa pencapaian terbesar bulan ini?\n• Deal mana yang seharusnya bisa ditutup?\n• Bisnis mana yang perlu lebih banyak perhatian bulan depan?\n• Apa yang ingin kamu lakukan berbeda?`}
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                rows={5}
                className="text-sm bg-muted/20 border-border focus-visible:ring-primary/20 resize-none"
              />
              <p className="text-xs text-muted-foreground mt-2">Catatan ini tidak disimpan ke server.</p>
            </div>
          </div>

          {/* AI Insight */}
          <div>
            <SectionHeading title="AI Insight" />
            <div className="bg-white border border-border rounded-2xl card-shadow overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-violet-50 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-violet-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">Insight Bulanan AI</h3>
                    <p className="text-xs text-muted-foreground">Analisis tren dan rekomendasi</p>
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
                  {loadingInsight ? "Berpikir..." : insight ? "Perbarui" : "Buat Insight"}
                </Button>
              </div>
              <div className="px-5 py-4">
                {insight ? (
                  <p className="text-sm leading-relaxed text-foreground">{insight}</p>
                ) : (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Klik "Buat Insight" untuk mendapatkan analisis AI bulanan — apa yang membaik dibanding bulan lalu, unit bisnis mana yang paling aktif, dan apa yang perlu diprioritaskan bulan depan.
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
