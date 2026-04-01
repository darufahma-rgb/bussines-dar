import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Sparkles, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageGuide from "@/components/PageGuide";

function Delta({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  const isUp = diff > 0;
  const isDown = diff < 0;
  return (
    <div className="flex items-center gap-1 text-xs">
      {isUp && <TrendingUp className="h-3 w-3 text-green-500" />}
      {isDown && <TrendingDown className="h-3 w-3 text-red-500" />}
      {!isUp && !isDown && <Minus className="h-3 w-3 text-muted-foreground" />}
      <span className={isUp ? "text-green-600" : isDown ? "text-red-500" : "text-muted-foreground"}>
        {isUp ? "+" : ""}{diff} vs bln lalu
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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Laporan Bulanan</h2>
        <p className="text-sm text-muted-foreground capitalize">{currentMonthName} vs {prevMonthName}</p>
      </div>

      <PageGuide steps={[
        { icon: "📈", title: "Perbandingan Bulan", desc: "Bandingkan performa bulan ini vs bulan lalu: customer baru, deal closed, interaksi total, dan follow-up. Panah hijau = naik, merah = turun." },
        { icon: "🏢", title: "Performa per Bisnis", desc: "Lihat breakdown customer per bisnis — berapa yang aktif dan berapa deal yang closed bulan ini." },
        { icon: "✨", title: "AI Monthly Insight", desc: "Klik 'Buat Insight' untuk mendapatkan analisis mendalam dari AI tentang tren bulan ini dan rekomendasi strategi bulan depan." },
      ]} />

      {isLoading ? (
        <div className="text-sm text-muted-foreground text-center py-12">Memuat data...</div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white border border-border rounded-xl p-4 card-shadow space-y-3">
              <h3 className="text-sm font-semibold">Bulan Ini</h3>
              <div className="space-y-2.5">
                {STAT_ROWS.map(({ label, key }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <div className="flex items-center gap-3">
                      <Delta
                        current={stats?.current?.[key] ?? 0}
                        previous={stats?.previous?.[key] ?? 0}
                      />
                      <span className="text-sm font-semibold font-mono w-8 text-right">{stats?.current?.[key] ?? 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-border rounded-xl p-4 card-shadow space-y-3">
              <h3 className="text-sm font-semibold capitalize">Bulan Lalu — {prevMonthName}</h3>
              <div className="space-y-2.5">
                {STAT_ROWS.map(({ label, key }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className="text-sm font-semibold font-mono text-muted-foreground">{stats?.previous?.[key] ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white border border-border rounded-xl p-4 card-shadow space-y-3">
            <h3 className="text-sm font-semibold">Performa per Bisnis</h3>
            {!stats?.byBusiness?.length ? (
              <p className="text-sm text-muted-foreground">Belum ada data bisnis.</p>
            ) : (
              <div className="divide-y">
                {stats.byBusiness
                  .sort((a: any, b: any) => b.totalInteractions - a.totalInteractions)
                  .map((biz: any) => (
                  <div key={biz.id} className="py-3 flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: biz.color || "#6B7280" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{biz.name}</p>
                      <p className="text-xs text-muted-foreground">{biz.totalCustomers} total customer</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold font-mono">{biz.totalInteractions}</p>
                      <p className="text-xs text-muted-foreground">interaksi</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold font-mono">{biz.newCustomers}</p>
                      <p className="text-xs text-muted-foreground">lead baru</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-border rounded-xl p-4 card-shadow space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Insight Bulanan AI</h3>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={handleGetInsight}
                disabled={loadingInsight}
              >
                {loadingInsight ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {loadingInsight ? "Berpikir..." : insight ? "Perbarui" : "Buat Insight"}
              </Button>
            </div>
            {insight ? (
              <p className="text-sm leading-relaxed text-foreground">{insight}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Klik "Buat Insight" untuk mendapatkan analisis AI bulanan — apa yang membaik, apa yang belum, dan apa yang perlu diprioritaskan bulan depan.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
