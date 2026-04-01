import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sparkles, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const STAT_ROWS = [
  { label: "Customer Baru", key: "newCustomers" },
  { label: "Deal Berhasil", key: "closedDeals" },
  { label: "Total Interaksi", key: "totalInteractions" },
  { label: "Follow-up Selesai", key: "followUpsDone" },
  { label: "Follow-up Terlewat", key: "followUpsMissed" },
];

export default function Monthly() {
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

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

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-foreground">Laporan Bulanan</h2>
        <p className="text-sm text-muted-foreground mt-0.5 capitalize">{currentMonthName} vs {prevMonthName}</p>
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
          <div className="grid md:grid-cols-2 gap-4">
            {/* This month */}
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
                      <Delta
                        current={stats?.current?.[key] ?? 0}
                        previous={stats?.previous?.[key] ?? 0}
                      />
                      <span className="text-sm font-bold font-mono w-8 text-right text-foreground">
                        {stats?.current?.[key] ?? 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Last month */}
            <div className="bg-white border border-border rounded-2xl card-shadow overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-muted/40">
                <h3 className="font-semibold text-sm text-muted-foreground capitalize">{prevMonthName}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Bulan lalu</p>
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

          {/* Business performance */}
          <div className="bg-white border border-border rounded-2xl card-shadow overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-sm text-foreground">Performa per Bisnis</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Breakdown customer dan aktivitas</p>
            </div>
            {!stats?.byBusiness?.length ? (
              <div className="py-10 text-center px-5">
                <p className="text-sm text-muted-foreground">Belum ada data bisnis.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {stats.byBusiness
                  .sort((a: any, b: any) => b.totalInteractions - a.totalInteractions)
                  .map((biz: any) => (
                  <div key={biz.id} className="px-5 py-4 flex items-center gap-4">
                    <div
                      className="h-3 w-3 rounded-full shrink-0 ring-2 ring-white shadow-sm"
                      style={{ backgroundColor: biz.color || "#6B7280" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{biz.name}</p>
                      <p className="text-xs text-muted-foreground">{biz.totalCustomers} customer total</p>
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
                ))}
              </div>
            )}
          </div>

          {/* AI Monthly Insight */}
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
                  Klik "Buat Insight" untuk mendapatkan analisis AI bulanan — apa yang membaik, apa yang belum, dan apa yang perlu diprioritaskan bulan depan.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
