import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import BusinessBadge from "@/components/BusinessBadge";
import PageGuide from "@/components/PageGuide";
import { ChevronRight, ArrowRight } from "lucide-react";

type CustomerStatus = "new" | "warm" | "hot" | "negotiation" | "closed" | "lost";

const STAGES: { key: CustomerStatus; label: string; color: string; bg: string; border: string }[] = [
  { key: "new",         label: "New Lead",    color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-200" },
  { key: "warm",        label: "Warm",        color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200" },
  { key: "hot",         label: "Hot",         color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
  { key: "negotiation", label: "Negotiation", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
  { key: "closed",      label: "Closed Won",  color: "text-green-600",  bg: "bg-green-50",  border: "border-green-200" },
  { key: "lost",        label: "Lost",        color: "text-gray-500",   bg: "bg-gray-50",   border: "border-gray-200" },
];

const NEXT: Record<CustomerStatus, CustomerStatus | null> = {
  new: "warm", warm: "hot", hot: "negotiation", negotiation: "closed", closed: null, lost: null,
};

function LostReasonModal({ onConfirm, onCancel }: { onConfirm: (reason: string) => void; onCancel: () => void }) {
  const [reason, setReason] = useState("");
  const presets = ["Price too high", "No response", "Not interested", "Went with competitor", "Bad timing"];
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-background border rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4">
        <h3 className="font-semibold">Why was this lost?</h3>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => setReason(p)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${reason === p ? "bg-foreground text-background border-foreground" : "hover:bg-muted"}`}
            >
              {p}
            </button>
          ))}
        </div>
        <input
          className="w-full border rounded-md px-3 py-2 text-sm"
          placeholder="Or write a reason..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5">Cancel</button>
          <button
            onClick={() => onConfirm(reason)}
            className="text-sm bg-foreground text-background px-4 py-1.5 rounded-md"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

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
      toast.success("Customer moved");
    } catch {
      toast.error("Failed to move");
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
    <div className="space-y-4">
      {lostTarget && (
        <LostReasonModal
          onConfirm={(reason) => {
            moveCustomer(lostTarget.id, lostTarget.to, reason);
            setLostTarget(null);
          }}
          onCancel={() => setLostTarget(null)}
        />
      )}

      <div>
        <h2 className="text-xl font-semibold">Pipeline</h2>
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Memuat..." : `${customers?.length ?? 0} customer`}
          {totalPipeline > 0 && (
            <span className="ml-2 text-green-600 font-mono">· Pipeline: IDR {totalPipeline.toLocaleString()}</span>
          )}
        </p>
      </div>

      <PageGuide steps={[
        { icon: "🗂️", title: "Tahap Penjualan", desc: "Setiap kolom mewakili tahap: New Lead → Warm → Hot → Negotiation → Closed Won / Lost. Customer bergerak dari kiri ke kanan seiring proses penjualan." },
        { icon: "▶️", title: "Pindah Tahap", desc: "Klik tombol panah (→) di kartu customer untuk memindahkannya ke tahap berikutnya. Jika dipindah ke 'Lost', kamu akan diminta memasukkan alasan kenapa gagal." },
        { icon: "💰", title: "Nilai Pipeline", desc: "Total nilai deal yang sedang berjalan ditampilkan di bagian atas. Pastikan setiap customer sudah diisi Estimated Value di profilnya." },
        { icon: "👤", title: "Buka Profil", desc: "Klik nama customer di kartu untuk membuka profil lengkapnya dan melihat riwayat interaksi." },
      ]} />

      <div className="flex items-center justify-between">
        <div />
        <Link
          to="/customers/new"
          className="text-xs bg-foreground text-background px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity"
        >
          + Add Customer
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageCustomers = byStage(stage.key);
          const stageValue = stageCustomers.reduce((sum: number, c: any) => sum + (Number(c.estimatedValue) || 0), 0);
          return (
            <div key={stage.key} className="flex-shrink-0 w-64">
              <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg border-b ${stage.bg} ${stage.border} border border-b-0`}>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${stage.color}`}>{stage.label}</span>
                  <span className="text-xs bg-white/70 text-gray-600 rounded-full px-1.5 py-0.5 font-mono">
                    {stageCustomers.length}
                  </span>
                </div>
                {stageValue > 0 && (
                  <span className="text-xs font-mono text-gray-500">
                    {(stageValue / 1_000_000).toFixed(1)}M
                  </span>
                )}
              </div>

              <div className={`border ${stage.border} border-t-0 rounded-b-lg min-h-32 divide-y ${stage.border.replace("border-", "divide-")}`}>
                {stageCustomers.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">Empty</p>
                ) : (
                  stageCustomers.map((c: any) => {
                    const next = NEXT[stage.key];
                    return (
                      <div key={c.id} className={`p-3 bg-card hover:bg-muted/30 transition-colors ${movingId === c.id ? "opacity-50" : ""}`}>
                        <Link to={`/customers/${c.id}`} className="block">
                          <p className="text-sm font-medium line-clamp-1 hover:underline">{c.name}</p>
                          {c.customer_businesses?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {c.customer_businesses.map((cb: any) => (
                                <BusinessBadge key={cb.business_id} name={cb.businesses?.name} />
                              ))}
                            </div>
                          )}
                          {c.estimatedValue && (
                            <p className="text-xs font-mono text-green-600 mt-1">
                              IDR {Number(c.estimatedValue).toLocaleString()}
                            </p>
                          )}
                          {c.source && (
                            <p className="text-xs text-muted-foreground mt-0.5">via {c.source}</p>
                          )}
                        </Link>

                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                          {next && (
                            <button
                              onClick={() => handleMove(c.id, next)}
                              disabled={movingId === c.id}
                              className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground border rounded px-1.5 py-0.5 hover:bg-muted transition-colors"
                            >
                              <ArrowRight className="h-3 w-3" />
                              {STAGES.find((s) => s.key === next)?.label}
                            </button>
                          )}
                          {stage.key !== "lost" && stage.key !== "closed" && (
                            <button
                              onClick={() => handleMove(c.id, "lost")}
                              disabled={movingId === c.id}
                              className="text-xs text-red-400 hover:text-red-600 border border-red-200 rounded px-1.5 py-0.5 hover:bg-red-50 transition-colors"
                            >
                              Lost
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
    </div>
  );
}
