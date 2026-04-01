import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import BusinessBadge from "@/components/BusinessBadge";
import PageGuide from "@/components/PageGuide";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft, MessageSquare, DollarSign, CalendarCheck, Zap,
  Check, Trash2, Sparkles, Loader2, Copy, RefreshCw, ChevronDown, ChevronUp,
  Brain, Edit2,
} from "lucide-react";

type InteractionType = "note" | "transaction" | "follow_up" | "quick_capture";
type CustomerStatus = "new" | "warm" | "hot" | "negotiation" | "closed" | "lost";

const typeIcons: Record<InteractionType, any> = {
  note: MessageSquare, transaction: DollarSign, follow_up: CalendarCheck, quick_capture: Zap,
};
const typeLabels: Record<InteractionType, string> = {
  note: "Catatan", transaction: "Transaksi", follow_up: "Follow-up", quick_capture: "Quick Capture",
};

const LOST_PRESETS = ["Harga terlalu tinggi", "Tidak ada respons", "Tidak berminat", "Pilih kompetitor", "Waktu tidak tepat", "Anggaran dipotong"];

function LostReasonModal({ onConfirm, onCancel }: { onConfirm: (r: string) => void; onCancel: () => void }) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-background border rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4">
        <h3 className="font-semibold">Kenapa ini gagal?</h3>
        <div className="flex flex-wrap gap-2">
          {LOST_PRESETS.map((p) => (
            <button key={p} onClick={() => setReason(p)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${reason === p ? "bg-foreground text-background border-foreground" : "hover:bg-muted"}`}>
              {p}
            </button>
          ))}
        </div>
        <input className="w-full border rounded-md px-3 py-2 text-sm" placeholder="Atau tulis alasan lain..."
          value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5">Batal</button>
          <button onClick={() => onConfirm(reason)}
            className="text-sm bg-foreground text-background px-4 py-1.5 rounded-md">Konfirmasi</button>
        </div>
      </div>
    </div>
  );
}

function AIPanel({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white border border-border rounded-xl card-shadow overflow-hidden">
      <button type="button"
        className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-muted/40 transition-colors"
        onClick={() => setOpen(!open)}>
        <span className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-violet-500" />{label}
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

const SOURCE_OPTIONS = ["Instagram", "WhatsApp", "Referral", "Website", "TikTok", "Email", "Cold Outreach", "Event", "Other"];

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [addType, setAddType] = useState<InteractionType>("note");
  const [content, setContent] = useState("");
  const [amount, setAmount] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingMemory, setEditingMemory] = useState(false);
  const [memoryText, setMemoryText] = useState("");
  const [savingMemory, setSavingMemory] = useState(false);

  const [pendingStatus, setPendingStatus] = useState<CustomerStatus | null>(null);

  const [summary, setSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyTone, setReplyTone] = useState("professional");
  const [reply, setReply] = useState<string | null>(null);
  const [loadingReply, setLoadingReply] = useState(false);
  const [nextAction, setNextAction] = useState<any>(null);
  const [loadingNext, setLoadingNext] = useState(false);

  const { data: customer } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => api.customers.get(id!),
    enabled: !!id,
  });

  const { data: interactions } = useQuery({
    queryKey: ["interactions", id],
    queryFn: () => api.interactions.list({ customerId: id! }),
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["customer", id] });
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    queryClient.invalidateQueries({ queryKey: ["customers-pipeline"] });
    queryClient.invalidateQueries({ queryKey: ["daily-focus"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  const handleAddInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !id) return;
    setSaving(true);
    try {
      await api.interactions.create({ customerId: id, type: addType, content: content.trim(), amount: amount || undefined, followUpDate: followUpDate || undefined });
      setContent(""); setAmount(""); setFollowUpDate("");
      queryClient.invalidateQueries({ queryKey: ["interactions", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Added!");
    } catch { toast.error("Failed to add"); }
    setSaving(false);
  };

  const handleStatusChange = async (status: CustomerStatus, lostReason?: string) => {
    if (!id) return;
    try {
      await api.customers.update(id, { status, ...(lostReason !== undefined ? { lostReason } : {}) });
      invalidate();
      toast.success("Status diperbarui");
    } catch { toast.error("Gagal memperbarui status"); }
  };

  const handleStatusSelect = (v: string) => {
    const status = v as CustomerStatus;
    if (status === "lost") {
      setPendingStatus("lost");
    } else {
      handleStatusChange(status);
    }
  };

  const handleSaveMemory = async () => {
    if (!id) return;
    setSavingMemory(true);
    try {
      await api.customers.update(id, { memory: memoryText });
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      setEditingMemory(false);
      toast.success("Memori tersimpan");
    } catch { toast.error("Gagal menyimpan memori"); }
    setSavingMemory(false);
  };

  const handleComplete = async (interactionId: string) => {
    try {
      await api.interactions.complete(interactionId);
      queryClient.invalidateQueries({ queryKey: ["interactions", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["today-follow-ups"] });
      toast.success("Ditandai selesai");
    } catch { toast.error("Gagal menandai selesai"); }
  };

  const handleDelete = async () => {
    if (!id || !confirm("Hapus customer ini beserta semua datanya?")) return;
    try {
      await api.customers.delete(id);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer berhasil dihapus");
      navigate("/customers");
    } catch { toast.error("Gagal menghapus customer"); }
  };

  const handleGetSummary = async () => {
    if (!id) return;
    setLoadingSummary(true);
    try { const r = await api.ai.customerSummary(id); setSummary(r.summary); }
    catch { toast.error("Could not generate summary"); }
    setLoadingSummary(false);
  };

  const handleGenerateReply = async () => {
    if (!replyMessage.trim() || !id) return;
    setLoadingReply(true);
    try { const r = await api.ai.generateReply({ customerMessage: replyMessage, tone: replyTone, customerId: id }); setReply(r.reply); }
    catch { toast.error("Could not generate reply"); }
    setLoadingReply(false);
  };

  const handleNextAction = async () => {
    if (!id) return;
    setLoadingNext(true);
    try { const r = await api.ai.nextAction(id); setNextAction(r); }
    catch { toast.error("Could not generate suggestion"); }
    setLoadingNext(false);
  };

  const urgencyColors: Record<string, string> = {
    high: "text-red-500 bg-red-50 border-red-200",
    medium: "text-yellow-600 bg-yellow-50 border-yellow-200",
    low: "text-green-600 bg-green-50 border-green-200",
  };

  if (!customer) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-5 max-w-2xl">
      {pendingStatus === "lost" && (
        <LostReasonModal
          onConfirm={(reason) => { handleStatusChange("lost", reason); setPendingStatus(null); }}
          onCancel={() => setPendingStatus(null)}
        />
      )}

      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => navigate(-1)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
            <ArrowLeft className="h-3 w-3" /> Kembali
          </button>
          <h2 className="text-xl font-semibold">{customer.name}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {customer.customer_businesses?.map((cb: any) => (
              <BusinessBadge key={cb.business_id} name={cb.businesses?.name} />
            ))}
            {customer.source && (
              <span className="text-xs bg-muted text-muted-foreground rounded px-2 py-0.5">via {customer.source}</span>
            )}
            {customer.email && <span className="text-xs text-muted-foreground">{customer.email}</span>}
            {customer.phone && <span className="text-xs text-muted-foreground font-mono">{customer.phone}</span>}
          </div>
          {customer.estimatedValue && (
            <p className="text-sm font-mono text-green-600 mt-1">IDR {Number(customer.estimatedValue).toLocaleString()}</p>
          )}
          {customer.status === "lost" && customer.lostReason && (
            <p className="text-xs text-red-500 mt-1">Alasan gagal: {customer.lostReason}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Select value={customer.status} onValueChange={handleStatusSelect}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">Lead Baru</SelectItem>
              <SelectItem value="warm">Hangat</SelectItem>
              <SelectItem value="hot">Panas</SelectItem>
              <SelectItem value="negotiation">Negosiasi</SelectItem>
              <SelectItem value="closed">Berhasil</SelectItem>
              <SelectItem value="lost">Gagal</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive h-8">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <PageGuide steps={[
        { icon: "🔄", title: "Ubah Status", desc: "Gunakan dropdown di pojok kanan atas untuk memindahkan customer ke tahap yang sesuai: New → Warm → Hot → Negotiation → Closed Won / Lost." },
        { icon: "🧠", title: "Customer Memory", desc: "Catatan permanen tentang customer ini (preferensi, konteks penting, dll). Diedit manual dan dipakai AI sebagai konteks saat generate summary." },
        { icon: "✨", title: "AI Summary & Next Action", desc: "Klik 'Generate' untuk mendapatkan ringkasan situasi customer dan rekomendasi langkah selanjutnya dari AI berdasarkan riwayat interaksi." },
        { icon: "📝", title: "Tambah Interaksi", desc: "Log Note (catatan umum), Transaction (nominal deal), atau Follow-up (dengan tanggal). Follow-up akan muncul di halaman Follow-ups." },
        { icon: "🗑️", title: "Hapus Customer", desc: "Tombol merah di pojok kanan atas akan menghapus seluruh data customer ini beserta semua interaksinya secara permanen." },
      ]} />

      <div className="bg-white border border-border rounded-xl card-shadow overflow-hidden">
        <div className="flex items-center justify-between p-3">
          <span className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-3.5 w-3.5 text-indigo-500" /> Customer Memory
          </span>
          {!editingMemory && (
            <button
              onClick={() => { setMemoryText(customer.memory || ""); setEditingMemory(true); }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Edit2 className="h-3 w-3" /> {customer.memory ? "Edit" : "Tambah"}
            </button>
          )}
        </div>
        <div className="px-3 pb-3">
          {editingMemory ? (
            <div className="space-y-2">
              <Textarea
                value={memoryText}
                onChange={(e) => setMemoryText(e.target.value)}
                placeholder="Gaya komunikasi, preferensi, konteks penting, catatan personal..."
                rows={3}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs" onClick={handleSaveMemory} disabled={savingMemory}>
                  {savingMemory ? <Loader2 className="h-3 w-3 animate-spin" /> : "Simpan"}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingMemory(false)}>Batal</Button>
              </div>
            </div>
          ) : customer.memory ? (
            <p className="text-sm whitespace-pre-wrap text-foreground/80">{customer.memory}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">Belum ada memori. Simpan gaya komunikasi, preferensi, atau catatan personal tentang customer ini.</p>
          )}
        </div>
      </div>

      <AIPanel label="Ringkasan Customer">
        {summary ? (
          <div className="space-y-2">
            <p className="text-sm leading-relaxed">{summary}</p>
            <button onClick={handleGetSummary} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <RefreshCw className="h-3 w-3" /> Perbarui
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">Dapatkan ringkasan singkat customer berdasarkan AI.</p>
            <Button size="sm" variant="outline" className="w-fit h-7 text-xs gap-1" onClick={handleGetSummary} disabled={loadingSummary}>
              {loadingSummary ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {loadingSummary ? "Menghasilkan..." : "Buat Ringkasan"}
            </Button>
          </div>
        )}
      </AIPanel>

      <AIPanel label="Saran Tindakan Berikutnya">
        {nextAction ? (
          <div className="space-y-2">
            <div className={`text-xs font-medium px-2 py-1 rounded border w-fit ${urgencyColors[nextAction.urgency] || urgencyColors.low}`}>
              PRIORITAS {nextAction.urgency === "high" ? "TINGGI" : nextAction.urgency === "medium" ? "SEDANG" : "RENDAH"}
            </div>
            <p className="text-sm font-medium">{nextAction.action}</p>
            <p className="text-xs text-muted-foreground">{nextAction.reason}</p>
            {nextAction.suggestedDate && (
              <p className="text-xs font-mono text-muted-foreground">Disarankan: {nextAction.suggestedDate}</p>
            )}
            <button onClick={handleNextAction} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1">
              <RefreshCw className="h-3 w-3" /> Perbarui
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">Dapatkan langkah terbaik untuk memajukan deal ini.</p>
            <Button size="sm" variant="outline" className="w-fit h-7 text-xs gap-1" onClick={handleNextAction} disabled={loadingNext}>
              {loadingNext ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {loadingNext ? "Berpikir..." : "Saran Tindakan"}
            </Button>
          </div>
        )}
      </AIPanel>

      <AIPanel label="Generator Balasan">
        <div className="space-y-2">
          <Textarea placeholder='Tempelkan pesan customer di sini...' value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} rows={2} className="text-sm" />
          <div className="flex items-center gap-2">
            <Select value={replyTone} onValueChange={setReplyTone}>
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="casual">Santai & Hangat</SelectItem>
                <SelectItem value="professional">Profesional</SelectItem>
                <SelectItem value="persuasive">Persuasif</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={handleGenerateReply} disabled={loadingReply || !replyMessage.trim()}>
              {loadingReply ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {loadingReply ? "Menulis..." : "Buat Balasan"}
            </Button>
          </div>
          {reply && (
            <div className="bg-muted/50 border rounded p-3 space-y-2">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{reply}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => { navigator.clipboard.writeText(reply); toast.success("Tersalin!"); }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <Copy className="h-3 w-3" /> Salin
                </button>
                <button onClick={handleGenerateReply} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <RefreshCw className="h-3 w-3" /> Coba lagi
                </button>
              </div>
            </div>
          )}
        </div>
      </AIPanel>

      <form onSubmit={handleAddInteraction} className="bg-white border border-border rounded-xl card-shadow p-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tambah ke Timeline</p>
        <div className="flex gap-2 flex-wrap">
          <Select value={addType} onValueChange={(v) => setAddType(v as InteractionType)}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="note">📝 Catatan</SelectItem>
              <SelectItem value="transaction">💰 Transaksi</SelectItem>
              <SelectItem value="follow_up">📅 Follow-up</SelectItem>
            </SelectContent>
          </Select>
          {addType === "transaction" && (
            <Input placeholder="Jumlah" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-32 h-8 text-xs" />
          )}
          {addType === "follow_up" && (
            <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className="w-40 h-8 text-xs" />
          )}
        </div>
        <Textarea placeholder="Tulis sesuatu..." value={content} onChange={(e) => setContent(e.target.value)} rows={2} className="text-sm" />
        <Button type="submit" size="sm" disabled={saving || !content.trim()}>Tambah</Button>
      </form>

      <div className="space-y-2">
        <h3 className="font-semibold text-sm">Timeline</h3>
        {!interactions?.length ? (
          <p className="text-sm text-muted-foreground p-4">Belum ada interaksi.</p>
        ) : (
          <div className="bg-white border border-border rounded-xl card-shadow divide-y divide-border">
            {interactions.map((i: any) => {
              const Icon = typeIcons[i.type as InteractionType];
              return (
                <div key={i.id} className="p-3.5 flex gap-3">
                  <div className="mt-0.5"><Icon className="h-4 w-4 text-muted-foreground" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-muted-foreground">{typeLabels[i.type as InteractionType]}</span>
                      <span className="text-xs text-muted-foreground font-mono">{format(parseISO(i.createdAt), "MMM d, h:mm a")}</span>
                      {i.type === "follow_up" && !i.isCompleted && (
                        <button onClick={() => handleComplete(i.id)} className="text-xs text-status-closed hover:underline flex items-center gap-0.5">
                          <Check className="h-3 w-3" /> Selesai
                        </button>
                      )}
                      {i.type === "follow_up" && i.isCompleted && (
                        <span className="text-xs text-green-600">✓ Selesai</span>
                      )}
                    </div>
                    <p className="text-sm mt-0.5 whitespace-pre-wrap">{i.content}</p>
                    {i.amount && <p className="text-sm font-mono font-medium mt-0.5">{i.currency} {Number(i.amount).toLocaleString()}</p>}
                    {i.followUpDate && <p className="text-xs text-muted-foreground mt-0.5">Follow-up: {format(parseISO(i.followUpDate), "MMM d, yyyy")}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
