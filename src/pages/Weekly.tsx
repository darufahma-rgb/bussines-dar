import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Users, Flame, CalendarCheck, AlertTriangle, Sparkles, Loader2, TrendingUp, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import StatCard from "@/components/StatCard";
import SectionHeading from "@/components/SectionHeading";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateShort } from "@/lib/format";

const typeLabels: Record<string, string> = {
  note:          "Catatan",
  transaction:   "Transaksi",
  follow_up:     "Follow-up",
  quick_capture: "Capture",
};

const typeStyles: Record<string, string> = {
  note:          "bg-blue-50 text-blue-700",
  transaction:   "bg-emerald-50 text-emerald-700",
  follow_up:     "bg-amber-50 text-amber-700",
  quick_capture: "bg-violet-50 text-violet-700",
};

export default function Weekly() {
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [reflection, setReflection] = useState("");

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
      setInsight("Gagal membuat insight. Periksa koneksi dan API key kamu.");
    }
    setLoadingInsight(false);
  };

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const weekLabel = `${format(weekStart, "d MMM", { locale: idLocale })} – ${format(weekEnd, "d MMM yyyy", { locale: idLocale })}`;

  const statCards = [
    { label: "Lead Baru",            value: stats?.newLeads       ?? 0, icon: Users,         iconBg: "bg-blue-50",    iconColor: "text-blue-500" },
    { label: "Lead Panas",           value: stats?.hotLeads       ?? 0, icon: Flame,         iconBg: "bg-amber-50",   iconColor: "text-amber-500" },
    { label: "Deal Berhasil",        value: stats?.closedDeals    ?? 0, icon: TrendingUp,    iconBg: "bg-emerald-50", iconColor: "text-emerald-500" },
    { label: "Follow-up Terlewat",   value: stats?.missedFollowUps ?? 0, icon: AlertTriangle, iconBg: "bg-red-50",     iconColor: "text-red-500" },
  ];

  return (
    <div className="space-y-8 max-w-4xl">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Laporan Mingguan</p>
        </div>
        <h2 className="text-2xl font-bold text-foreground">{weekLabel}</h2>
        <p className="text-sm text-muted-foreground mt-1">Ringkasan aktivitas CRM 7 hari terakhir.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-border rounded-2xl p-5 card-shadow space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-12" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div>
            <SectionHeading title="Metrik Minggu Ini" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {statCards.map((s) => (
                <StatCard key={s.label} {...s} />
              ))}
            </div>
          </div>

          {/* Activity Log */}
          <div>
            <SectionHeading
              title="Aktivitas Minggu Ini"
              subtitle={stats?.weekInteractions?.length ? `${stats.weekInteractions.length} interaksi` : undefined}
            />
            <div className="bg-white border border-border rounded-2xl card-shadow overflow-hidden">
              {!stats?.weekInteractions?.length ? (
                <div className="py-12 text-center px-5">
                  <p className="text-sm font-medium text-foreground mb-1">Belum ada aktivitas minggu ini</p>
                  <p className="text-xs text-muted-foreground">Interaksi yang ditambahkan minggu ini akan muncul di sini.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {stats.weekInteractions.map((i: any) => (
                    <div key={i.id} className="flex items-start gap-3 px-5 py-3.5">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg shrink-0 mt-0.5 ${typeStyles[i.type] || "bg-slate-50 text-slate-700"}`}>
                        {typeLabels[i.type] || i.type}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link to={`/customers/${i.customerId}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors hover:underline underline-offset-2">
                            {i.customerName}
                          </Link>
                          <span className="text-xs text-muted-foreground font-mono shrink-0">
                            {formatDateShort(i.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{i.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Reflection */}
          <div>
            <SectionHeading title="Refleksi Mingguan" subtitle="hanya tersimpan di browser ini" />
            <div className="bg-white border border-border rounded-2xl card-shadow p-5">
              <Textarea
                placeholder={`Tulis refleksi minggu ini...\n\n• Apa yang berjalan baik?\n• Apa yang bisa diperbaiki?\n• Customer mana yang perlu diperhatikan minggu depan?\n• Satu hal yang ingin dilakukan berbeda?`}
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                rows={5}
                className="text-sm bg-muted/20 border-border focus-visible:ring-primary/20 resize-none"
              />
              <p className="text-xs text-muted-foreground mt-2">Catatan ini tidak disimpan ke server. Salin ke dokumen kamu jika perlu.</p>
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
                    <h3 className="font-semibold text-sm text-foreground">Insight Mingguan AI</h3>
                    <p className="text-xs text-muted-foreground">Analisis dan rekomendasi untuk minggu depan</p>
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
                    Klik "Buat Insight" untuk mendapatkan ringkasan AI — apa yang berjalan baik, apa yang perlu diperhatikan, dan satu tindakan konkret untuk minggu depan.
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
