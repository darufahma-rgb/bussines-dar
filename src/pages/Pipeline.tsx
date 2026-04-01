import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import BusinessBadge from "@/components/BusinessBadge";
import LostReasonModal from "@/components/LostReasonModal";
import { ArrowRight } from "lucide-react";
import { formatIDR } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

type CustomerStatus = "new" | "warm" | "hot" | "negotiation" | "closed" | "lost";

const STAGES: {
  key: CustomerStatus;
  label: string;
  headerBg: string;
  headerText: string;
  dot: string;
}[] = [
  { key: "new",         label: "Lead Baru",  headerBg: "bg-blue-50",    headerText: "text-blue-700",    dot: "bg-blue-500" },
  { key: "warm",        label: "Hangat",     headerBg: "bg-amber-50",   headerText: "text-amber-700",   dot: "bg-amber-500" },
  { key: "hot",         label: "Panas",      headerBg: "bg-orange-50",  headerText: "text-orange-700",  dot: "bg-orange-500" },
  { key: "negotiation", label: "Negosiasi",  headerBg: "bg-violet-50",  headerText: "text-violet-700",  dot: "bg-violet-500" },
  { key: "closed",      label: "Berhasil",   headerBg: "bg-emerald-50", headerText: "text-emerald-700", dot: "bg-emerald-500" },
  { key: "lost",        label: "Gagal",      headerBg: "bg-slate-50",   headerText: "text-slate-500",   dot: "bg-slate-400" },
];

const NEXT: Record<CustomerStatus, CustomerStatus | null> = {
  new: "warm", warm: "hot", hot: "negotiation", negotiation: "closed", closed: null, lost: null,
};

export default function Pipeline() {
  const queryClient = useQueryClient();
  const [movingId, setMovingId] = useState<string | null>(null);
  const [lostTarget, setLostTarget] = useState<{ id: string; to: CustomerStatus } | null>(null);

  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers-pipeline"],
    queryFn: () => api.customers.list(),
  });

  const byStage = (status: CustomerStatus) =>
    (customers || []).filter((c: any) => c.status === status);

  const moveCustomer = async (id: string, to: CustomerStatus, lostReason?: string) => {
    setMovingId(id);
    try {
      const body: any = { status: to };
      if (lostReason !== undefined) body.lostReason = lostReason;
      await api.customers.update(id, body);
      queryClient.invalidateQueries({ queryKey: ["customers-pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Customer berhasil dipindah");
    } catch {
      toast.error("Gagal memindahkan customer");
    }
    setMovingId(null);
  };

  const handleMove = (id: string, to: CustomerStatus) => {
    if (to === "lost") {
      setLostTarget({ id, to });
    } else {
      moveCustomer(id, to);
    }
  };

  const totalPipeline = (customers || [])
    .filter((c: any) => ["new", "warm", "hot", "negotiation"].includes(c.status) && c.estimatedValue)
    .reduce((sum: number, c: any) => sum + Number(c.estimatedValue), 0);

  return (
    <div className="space-y-5">
      {lostTarget && (
        <LostReasonModal
          onConfirm={(reason) => {
            moveCustomer(lostTarget.id, lostTarget.to, reason);
            setLostTarget(null);
          }}
          onCancel={() => setLostTarget(null)}
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Pipeline</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading
              ? "Memuat..."
              : `${customers?.length ?? 0} customer${totalPipeline > 0 ? ` · ${formatIDR(totalPipeline)} aktif` : ""}`}
          </p>
        </div>
        <Link
          to="/customers/new"
          className="inline-flex items-center gap-1.5 bg-primary text-white text-sm font-medium px-4 py-2 rounded-xl hover:opacity-90 transition-opacity shadow-sm shrink-0"
        >
          + Tambah Customer
        </Link>
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1">
          {STAGES.map((stage) => (
            <div key={stage.key} className="flex-shrink-0 w-[220px]">
              <Skeleton className="h-10 rounded-t-2xl rounded-b-none mb-px" />
              <div className="bg-white border border-border border-t-0 rounded-b-2xl min-h-[120px] p-3.5 space-y-3">
                <Skeleton className="h-10 rounded-xl" />
                <Skeleton className="h-10 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1">
          {STAGES.map((stage) => {
            const stageCustomers = byStage(stage.key);
            const stageValue = stageCustomers.reduce((sum: number, c: any) => sum + (Number(c.estimatedValue) || 0), 0);
            return (
              <div key={stage.key} className="flex-shrink-0 w-[220px]">
                {/* Column header */}
                <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-2xl ${stage.headerBg} mb-px`}>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${stage.dot}`} />
                    <span className={`text-xs font-semibold ${stage.headerText}`}>{stage.label}</span>
                    <span className="text-[11px] text-muted-foreground font-mono bg-white/60 px-1.5 py-0.5 rounded-full">
                      {stageCustomers.length}
                    </span>
                  </div>
                  {stageValue > 0 && (
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {(stageValue / 1_000_000).toFixed(1)}M
                    </span>
                  )}
                </div>

                {/* Cards */}
                <div className="bg-white border border-border border-t-0 rounded-b-2xl min-h-[120px] overflow-hidden card-shadow">
                  {stageCustomers.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-xs text-muted-foreground/60">Kosong</p>
                    </div>
                  ) : (
                    stageCustomers.map((c: any) => {
                      const next = NEXT[stage.key];
                      return (
                        <div
                          key={c.id}
                          className={`p-3.5 border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors ${movingId === c.id ? "opacity-40" : ""}`}
                        >
                          <Link to={`/customers/${c.id}`} className="block mb-2.5">
                            <p className="text-sm font-semibold text-foreground line-clamp-1 hover:text-primary transition-colors">
                              {c.name}
                            </p>
                            {c.customer_businesses?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {c.customer_businesses.map((cb: any) => (
                                  <BusinessBadge key={cb.business_id} name={cb.businesses?.name} />
                                ))}
                              </div>
                            )}
                            {c.estimatedValue && (
                              <p className="text-xs font-mono text-emerald-600 font-semibold mt-1">
                                {formatIDR(c.estimatedValue)}
                              </p>
                            )}
                            {c.source && (
                              <p className="text-[11px] text-muted-foreground mt-0.5">via {c.source}</p>
                            )}
                          </Link>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {next && (
                              <button
                                onClick={() => handleMove(c.id, next)}
                                disabled={movingId === c.id}
                                className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted rounded-lg px-2 py-1 transition-colors"
                              >
                                <ArrowRight className="h-3 w-3" />
                                {STAGES.find((s) => s.key === next)?.label}
                              </button>
                            )}
                            {stage.key !== "lost" && stage.key !== "closed" && (
                              <button
                                onClick={() => handleMove(c.id, "lost")}
                                disabled={movingId === c.id}
                                className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg px-2 py-1 transition-colors font-medium"
                              >
                                Gagal
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
