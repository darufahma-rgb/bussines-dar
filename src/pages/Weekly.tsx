import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Users, Flame, CalendarCheck, AlertTriangle, Sparkles, Loader2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageGuide from "@/components/PageGuide";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
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
      setInsight("Gagal membuat insight. Coba lagi nanti.");
    }
    setLoadingInsight(false);
  };

  const statCards = [
    { label: "Lead Baru", value: stats?.newLeads ?? 0, icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Lead Panas", value: stats?.hotLeads ?? 0, icon: Flame, color: "text-amber-500", bg: "bg-amber-50" },
    { label: "Deal Berhasil", value: stats?.closedDeals ?? 0, icon: TrendingUp, color: "text-green-500", bg: "bg-green-50" },
    { label: "Follow-up Terlewat", value: stats?.missedFollowUps ?? 0, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
  ];

  const typeLabels: Record<string, string> = {
    note: "Catatan",
    transaction: "Transaksi",
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
        <h2 className="text-xl font-semibold">Laporan Mingguan</h2>
        <p className="text-sm text-muted-foreground">Ringkasan aktivitas 7 hari terakhir</p>
      </div>

      <PageGuide steps={[
        { icon: "📊", title: "Statistik Minggu Ini", desc: "Lihat berapa lead baru masuk, hot lead, deal yang berhasil ditutup, dan follow-up yang terlewat dalam 7 hari terakhir." },
        { icon: "✨", title: "AI Weekly Insight", desc: "Klik 'Buat Insight' untuk mendapatkan analisis AI tentang performa minggu ini — apa yang berjalan baik, apa yang perlu diperbaiki, dan rekomendasi untuk minggu depan." },
        { icon: "📋", title: "Aktivitas Minggu Ini", desc: "Daftar semua interaksi yang terjadi minggu ini: note, follow-up, quick capture, dan transaksi. Klik nama customer untuk membuka profilnya." },
      ]} />

      {isLoading ? (
        <div className="text-sm text-muted-foreground text-center py-12">Memuat data...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {statCards.map((s) => (
              <div key={s.label} className="bg-white border border-border rounded-xl p-4 card-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${s.bg}`}>
                    <s.icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                </div>
                <p className="text-3xl font-bold font-mono">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-border rounded-xl p-4 card-shadow space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Insight Mingguan AI</h3>
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
              <p className="text-sm text-muted-foreground">Klik "Buat Insight" untuk mendapatkan ringkasan AI tentang minggu ini — apa yang berjalan baik, apa yang perlu diperhatikan, dan apa yang harus difokuskan.</p>
            )}
          </div>

          <div className="bg-white border border-border rounded-xl p-4 card-shadow">
            <h3 className="font-semibold text-sm mb-3">Aktivitas Minggu Ini</h3>
            {!stats?.weekInteractions?.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Belum ada aktivitas minggu ini.</p>
            ) : (
              <div className="divide-y">
                {stats.weekInteractions.map((i: any) => (
                  <div key={i.id} className="flex items-start gap-3 py-2.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${typeColors[i.type] || "bg-gray-100 text-gray-700"}`}>
                      {typeLabels[i.type] || i.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link to={`/customers/${i.customerId}`} className="text-xs font-medium hover:underline">
                          {i.customerName}
                        </Link>
                        <span className="text-xs text-muted-foreground font-mono shrink-0">
                          {format(parseISO(i.createdAt), "EEE, d MMM", { locale: idLocale })}
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
