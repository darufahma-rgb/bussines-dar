import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Check, CalendarCheck, Clock, AlarmClock, CalendarDays } from "lucide-react";
import { parseISO, isToday, isPast, isFuture } from "date-fns";
import { toast } from "sonner";
import { formatDateShort } from "@/lib/format";

export default function FollowUps() {
  const queryClient = useQueryClient();

  const { data: followUps, isLoading } = useQuery({
    queryKey: ["all-follow-ups"],
    queryFn: () => api.interactions.followUps(true),
  });

  const handleComplete = async (id: string) => {
    try {
      await api.interactions.complete(id);
      queryClient.invalidateQueries({ queryKey: ["all-follow-ups"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Selesai!");
    } catch {
      toast.error("Gagal menandai selesai");
    }
  };

  const overdue = followUps?.filter((f: any) => f.followUpDate && isPast(parseISO(f.followUpDate)) && !isToday(parseISO(f.followUpDate))) ?? [];
  const todayItems = followUps?.filter((f: any) => f.followUpDate && isToday(parseISO(f.followUpDate))) ?? [];
  const upcoming = followUps?.filter((f: any) => f.followUpDate && isFuture(parseISO(f.followUpDate)) && !isToday(parseISO(f.followUpDate))) ?? [];
  const noDate = followUps?.filter((f: any) => !f.followUpDate) ?? [];

  type SectionConfig = {
    title: string;
    items: any[];
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    badgeColor?: string;
  };

  const sections: SectionConfig[] = [
    { title: "Terlambat", items: overdue, icon: AlarmClock, iconBg: "bg-red-50", iconColor: "text-red-500", badgeColor: "text-red-500" },
    { title: "Hari Ini", items: todayItems, icon: CalendarCheck, iconBg: "bg-blue-50", iconColor: "text-blue-500" },
    { title: "Mendatang", items: upcoming, icon: CalendarDays, iconBg: "bg-muted", iconColor: "text-muted-foreground" },
    { title: "Tanpa Tanggal", items: noDate, icon: Clock, iconBg: "bg-muted", iconColor: "text-muted-foreground" },
  ];

  const FollowUpRow = ({ f, urgency }: { f: any; urgency?: boolean }) => (
    <div className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors border-b border-border last:border-b-0">
      <Link to={`/customers/${f.customerId}`} className="flex-1 min-w-0 group">
        <p className="text-sm font-semibold text-foreground group-hover:underline underline-offset-2">{f.customers?.name}</p>
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{f.content}</p>
      </Link>
      <div className="flex items-center gap-3 shrink-0 ml-3">
        <StatusBadge status={f.customers?.status} />
        {f.followUpDate && (
          <span className={`text-xs font-mono font-semibold tabular-nums ${urgency ? "text-red-500" : "text-muted-foreground"}`}>
            {formatDateShort(f.followUpDate)}
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
          onClick={() => handleComplete(f.id)}
        >
          <Check className="h-3 w-3" /> Selesai
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-foreground">Follow-ups</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isLoading ? "Memuat..." : followUps?.length ? `${followUps.length} follow-up tertunda` : "Semua sudah selesai"}
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-white border border-border rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && !followUps?.length && (
        <div className="bg-white border border-border rounded-2xl card-shadow py-16 text-center">
          <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CalendarCheck className="h-6 w-6 text-emerald-500" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">Semua beres!</p>
          <p className="text-xs text-muted-foreground">Tidak ada follow-up tertunda. Kerja bagus!</p>
        </div>
      )}

      {!isLoading && followUps && followUps.length > 0 && (
        <div className="space-y-5">
          {sections.filter(s => s.items.length > 0).map((section) => (
            <div key={section.title}>
              <div className="flex items-center gap-2.5 mb-3">
                <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${section.iconBg}`}>
                  <section.icon className={`h-3.5 w-3.5 ${section.iconColor}`} />
                </div>
                <h3 className={`text-sm font-semibold ${section.badgeColor ?? "text-foreground"}`}>
                  {section.title}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">({section.items.length})</span>
                </h3>
              </div>
              <div className="bg-white border border-border rounded-2xl card-shadow overflow-hidden">
                {section.items.map((f: any) => (
                  <FollowUpRow key={f.id} f={f} urgency={section.title === "Terlambat"} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
