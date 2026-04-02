import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import BusinessBadge from "@/components/BusinessBadge";
import LostReasonModal from "@/components/LostReasonModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { formatDateTime, formatDate, formatIDR } from "@/lib/format";
import {
  ArrowLeft, MessageSquare, DollarSign, CalendarCheck, Zap,
  Check, Trash2, Sparkles, Loader2, Copy, RefreshCw, ChevronDown, ChevronUp,
  Brain, Edit2, X, AlertTriangle, Upload, FileText, Image, File, Download, FolderOpen,
} from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

type InteractionType = "note" | "transaction" | "follow_up" | "quick_capture";
type CustomerStatus = "new" | "warm" | "hot" | "negotiation" | "closed" | "lost";

const typeConfig: Record<InteractionType, { icon: any; label: string; bg: string; color: string }> = {
  note:          { icon: MessageSquare, label: "Catatan",      bg: "bg-blue-50",    color: "text-blue-600" },
  transaction:   { icon: DollarSign,   label: "Transaksi",    bg: "bg-emerald-50", color: "text-emerald-600" },
  follow_up:     { icon: CalendarCheck,label: "Follow-up",   bg: "bg-amber-50",   color: "text-amber-600" },
  quick_capture: { icon: Zap,          label: "Quick Capture",bg: "bg-violet-50",  color: "text-violet-600" },
};

const urgencyConfig: Record<string, { label: string; className: string }> = {
  high:   { label: "Prioritas Tinggi",  className: "bg-red-50 text-red-700 ring-1 ring-red-200" },
  medium: { label: "Prioritas Sedang",  className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  low:    { label: "Prioritas Rendah",  className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
};

const FILE_CATEGORIES = [
  { value: "paspor",  label: "Paspor",          color: "bg-blue-100 text-blue-700" },
  { value: "visa",    label: "Visa",             color: "bg-purple-100 text-purple-700" },
  { value: "ktp",     label: "KTP",              color: "bg-orange-100 text-orange-700" },
  { value: "foto",    label: "Foto",             color: "bg-pink-100 text-pink-700" },
  { value: "berkas",  label: "Berkas Lainnya",   color: "bg-gray-100 text-gray-700" },
];

function getCategoryStyle(cat: string) {
  return FILE_CATEGORIES.find((c) => c.value === cat) || FILE_CATEGORIES[FILE_CATEGORIES.length - 1];
}

function formatBytes(bytes: string | number) {
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function FileCard({ file, customerId, onDelete }: { file: any; customerId: string; onDelete: () => void }) {
  const isImage = file.mimeType.startsWith("image/");
  const catStyle = getCategoryStyle(file.category);
  const fileUrl = `/uploads/${file.fileName}`;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.files.delete(customerId, file.id);
      onDelete();
      toast.success("File dihapus");
    } catch {
      toast.error("Gagal menghapus file");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="group relative flex flex-col bg-white border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
      {/* Preview */}
      {isImage ? (
        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block">
          <div className="h-32 bg-muted/30 overflow-hidden">
            <img src={fileUrl} alt={file.originalName} className="w-full h-full object-cover" />
          </div>
        </a>
      ) : (
        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center h-32 bg-muted/20 hover:bg-muted/40 transition-colors">
          {file.mimeType === "application/pdf" ? (
            <FileText className="h-10 w-10 text-red-400" />
          ) : (
            <File className="h-10 w-10 text-blue-400" />
          )}
        </a>
      )}

      {/* Info */}
      <div className="p-2.5 space-y-1.5">
        <p className="text-xs font-medium text-foreground truncate" title={file.originalName}>
          {file.originalName}
        </p>
        <div className="flex items-center justify-between gap-1">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${catStyle.color}`}>
            {catStyle.label}
          </span>
          <span className="text-[10px] text-muted-foreground">{formatBytes(file.fileSize)}</span>
        </div>
      </div>

      {/* Actions */}
      {confirmDelete ? (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10">
          <p className="text-[11px] font-semibold text-foreground text-center px-2">Hapus file ini?</p>
          <div className="flex gap-1.5">
            <button
              onClick={() => setConfirmDelete(false)}
              className="h-7 px-2.5 rounded-lg text-xs bg-muted hover:bg-muted/80 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="h-7 px-2.5 rounded-lg text-xs bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-60"
            >
              {deleting ? "Menghapus..." : "Hapus"}
            </button>
          </div>
        </div>
      ) : (
        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <a
            href={fileUrl}
            download={file.originalName}
            className="h-6 w-6 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center shadow-sm hover:bg-white transition-colors"
            title="Download"
          >
            <Download className="h-3 w-3 text-foreground" />
          </a>
          <button
            onClick={() => setConfirmDelete(true)}
            className="h-6 w-6 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center shadow-sm hover:bg-red-50 transition-colors"
            title="Hapus"
          >
            <X className="h-3 w-3 text-red-500" />
          </button>
        </div>
      )}
    </div>
  );
}

function CustomerFilesSection({ customerId }: { customerId: string }) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState("berkas");
  const [open, setOpen] = useState(false);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["customer-files", customerId],
    queryFn: () => api.files.list(customerId),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await api.files.upload(customerId, file, category);
      queryClient.invalidateQueries({ queryKey: ["customer-files", customerId] });
      toast.success(`${file.name} berhasil diupload`);
    } catch (err: any) {
      toast.error(err.message || "Upload gagal");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const invalidateFiles = () => queryClient.invalidateQueries({ queryKey: ["customer-files", customerId] });

  return (
    <div className="bg-white border border-border rounded-2xl card-shadow overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold hover:bg-muted/30 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-sky-50 flex items-center justify-center">
            <FolderOpen className="h-3.5 w-3.5 text-sky-500" />
          </div>
          Berkas & Foto
          {files.length > 0 && (
            <span className="text-xs text-muted-foreground font-normal">({files.length} file)</span>
          )}
        </span>
        {open
          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 space-y-4">
          {/* Upload controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILE_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleUpload}
              className="hidden"
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <Upload className="h-3 w-3" />}
              {uploading ? "Mengupload..." : "Upload File"}
            </Button>
            <span className="text-xs text-muted-foreground">JPG, PNG, PDF, DOCX · maks 20MB</span>
          </div>

          {/* File grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-[160px] rounded-xl bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Image className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Belum ada berkas yang diupload.</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">Upload foto paspor, visa, KTP, atau berkas lainnya.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {(files as any[]).map((f) => (
                <FileCard key={f.id} file={f} customerId={customerId} onDelete={invalidateFiles} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AISection({
  title,
  icon: Icon = Sparkles,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon?: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-border rounded-2xl card-shadow overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold hover:bg-muted/30 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-violet-50 flex items-center justify-center">
            <Icon className="h-3.5 w-3.5 text-violet-500" />
          </div>
          {title}
        </span>
        {open
          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground" />
        }
      </button>
      {open && <div className="px-5 pb-5 pt-1">{children}</div>}
    </div>
  );
}

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

  const [editingInfo, setEditingInfo] = useState(false);
  const [infoName, setInfoName] = useState("");
  const [infoEmail, setInfoEmail] = useState("");
  const [infoPhone, setInfoPhone] = useState("");
  const [infoValue, setInfoValue] = useState("");
  const [infoSource, setInfoSource] = useState("");
  const [infoBiz, setInfoBiz] = useState<string[]>([]);
  const [savingInfo, setSavingInfo] = useState(false);

  const [pendingStatus, setPendingStatus] = useState<CustomerStatus | null>(null);
  const [statusChanging, setStatusChanging] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [confirmDeleteInteraction, setConfirmDeleteInteraction] = useState<string | null>(null);
  const [confirmDeleteCustomer, setConfirmDeleteCustomer] = useState(false);

  const [editingCustomKey, setEditingCustomKey] = useState<string | null>(null);
  const [customEditValue, setCustomEditValue] = useState("");
  const [savingCustomField, setSavingCustomField] = useState(false);

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

  const { data: allBusinesses } = useQuery({
    queryKey: ["businesses"],
    queryFn: () => api.businesses.list(),
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
      await api.interactions.create({
        customerId: id, type: addType, content: content.trim(),
        amount: amount || undefined, followUpDate: followUpDate || undefined,
      });
      setContent(""); setAmount(""); setFollowUpDate("");
      queryClient.invalidateQueries({ queryKey: ["interactions", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Berhasil ditambahkan!");
    } catch { toast.error("Gagal menambahkan interaksi"); }
    setSaving(false);
  };

  const openEditInfo = (c: any) => {
    setInfoName(c.name ?? "");
    setInfoEmail(c.email ?? "");
    setInfoPhone(c.phone ?? "");
    setInfoValue(c.estimatedValue ?? "");
    setInfoSource(c.source ?? "");
    setInfoBiz(c.customer_businesses?.map((cb: any) => cb.business_id) ?? []);
    setEditingInfo(true);
  };

  const handleSaveInfo = async () => {
    if (!id || !infoName.trim()) { toast.error("Nama tidak boleh kosong"); return; }
    setSavingInfo(true);
    try {
      await api.customers.update(id, {
        name: infoName.trim(),
        email: infoEmail.trim() || undefined,
        phone: infoPhone.trim() || undefined,
        estimatedValue: infoValue ? Number(infoValue.replace(/[^0-9]/g, "")) : null,
        source: infoSource || undefined,
        businessIds: infoBiz,
      });
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setEditingInfo(false);
      toast.success("Info customer diperbarui");
    } catch { toast.error("Gagal menyimpan"); }
    setSavingInfo(false);
  };

  const handleStatusChange = async (status: CustomerStatus, lostReason?: string) => {
    if (!id) return;
    setStatusChanging(true);
    try {
      await api.customers.update(id, { status, ...(lostReason !== undefined ? { lostReason } : {}) });
      invalidate();
      toast.success("Status diperbarui");
    } catch { toast.error("Gagal memperbarui status"); }
    setStatusChanging(false);
  };

  const handleStatusSelect = (v: string) => {
    const status = v as CustomerStatus;
    if (status === "lost") setPendingStatus("lost");
    else handleStatusChange(status);
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

  const handleSaveCustomField = async (key: string) => {
    if (!id) return;
    setSavingCustomField(true);
    try {
      await api.customers.update(id, { customDataKey: key, customDataValue: customEditValue } as any);
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      setEditingCustomKey(null);
      toast.success("Field tersimpan");
    } catch { toast.error("Gagal menyimpan field"); }
    setSavingCustomField(false);
  };

  const handleDeleteCustomField = async (key: string) => {
    if (!id) return;
    try {
      await api.customers.update(id, { customDataKey: key, customDataValue: "" } as any);
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      toast.success("Field dihapus");
    } catch { toast.error("Gagal menghapus field"); }
  };

  const handleComplete = async (interactionId: string) => {
    setCompletingId(interactionId);
    try {
      await api.interactions.complete(interactionId);
      queryClient.invalidateQueries({ queryKey: ["interactions", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["today-follow-ups"] });
      toast.success("Ditandai selesai");
    } catch { toast.error("Gagal menandai selesai"); }
    setCompletingId(null);
  };

  const handleDeleteInteraction = async (interactionId: string) => {
    try {
      await api.interactions.delete(interactionId);
      queryClient.invalidateQueries({ queryKey: ["interactions", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Interaksi dihapus");
    } catch { toast.error("Gagal menghapus interaksi"); }
    setConfirmDeleteInteraction(null);
  };

  const handleDelete = async () => {
    if (!id) return;
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
    catch { toast.error("Gagal membuat ringkasan"); }
    setLoadingSummary(false);
  };

  const handleGenerateReply = async () => {
    if (!replyMessage.trim() || !id) return;
    setLoadingReply(true);
    try {
      const r = await api.ai.generateReply({ customerMessage: replyMessage, tone: replyTone, customerId: id });
      setReply(r.reply);
    }
    catch { toast.error("Gagal membuat balasan"); }
    setLoadingReply(false);
  };

  const handleNextAction = async () => {
    if (!id) return;
    setLoadingNext(true);
    try { const r = await api.ai.nextAction(id); setNextAction(r); }
    catch { toast.error("Gagal membuat saran tindakan"); }
    setLoadingNext(false);
  };

  if (!customer) {
    return (
      <div className="space-y-5 max-w-2xl animate-pulse">
        <div className="h-5 w-20 bg-muted rounded-lg" />
        <div className="h-8 w-48 bg-muted rounded-lg" />
        <div className="h-32 bg-muted rounded-2xl" />
        <div className="h-20 bg-muted rounded-2xl" />
        <div className="h-24 bg-muted rounded-2xl" />
      </div>
    );
  }

  const avatarInitials = customer.name.slice(0, 2).toUpperCase();

  return (
    <div className="space-y-5 max-w-2xl">
      {pendingStatus === "lost" && (
        <LostReasonModal
          onConfirm={(reason) => { handleStatusChange("lost", reason); setPendingStatus(null); }}
          onCancel={() => setPendingStatus(null)}
        />
      )}

      {/* Header */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 mb-4 transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Kembali
        </button>

        <div className="bg-white border border-border rounded-2xl card-shadow p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary shrink-0 shadow-sm">
                {avatarInitials}
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-foreground leading-tight">{customer.name}</h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {customer.customer_businesses?.map((cb: any) => (
                    <BusinessBadge key={cb.business_id} name={cb.businesses?.name} />
                  ))}
                  {customer.source && (
                    <span className="text-xs bg-muted text-muted-foreground rounded-lg px-2 py-0.5 font-medium">
                      via {customer.source}
                    </span>
                  )}
                </div>
                {(customer.email || customer.phone) && (
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    {customer.email && (
                      <a href={`mailto:${customer.email}`} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                        {customer.email}
                      </a>
                    )}
                    {customer.phone && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground font-mono">{customer.phone}</span>
                        <a
                          href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, "").replace(/^0/, "62")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Buka WhatsApp"
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200"
                        >
                          <MessageSquare className="h-2.5 w-2.5" /> WA
                        </a>
                      </div>
                    )}
                  </div>
                )}
                {customer.estimatedValue && (
                  <p className="text-sm font-mono font-bold text-emerald-600 mt-1.5">
                    {formatIDR(customer.estimatedValue)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openEditInfo(customer)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                title="Edit info customer"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
              <Select value={customer.status} onValueChange={handleStatusSelect} disabled={statusChanging}>
                <SelectTrigger className="w-32 h-8 text-xs bg-white">
                  {statusChanging
                    ? <span className="flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> Menyimpan...</span>
                    : <SelectValue />}
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
              {confirmDeleteCustomer ? (
                <div className="flex items-center gap-1.5 border border-red-200 bg-red-50 rounded-xl px-2.5 py-1.5">
                  <span className="text-xs text-red-600 font-medium">Hapus customer ini?</span>
                  <button
                    onClick={() => setConfirmDeleteCustomer(false)}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-border hover:bg-muted/50 transition-colors"
                  >Batal</button>
                  <button
                    onClick={handleDelete}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
                  >Ya, Hapus</button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDeleteCustomer(true)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-red-50"
                  title="Hapus customer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {customer.status === "lost" && customer.lostReason && (
            <div className="flex items-center gap-2 mt-4 px-3 py-2 bg-red-50 rounded-xl border border-red-100">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
              <p className="text-xs text-red-600">Alasan gagal: <strong>{customer.lostReason}</strong></p>
            </div>
          )}

          {/* Inline edit form */}
          {editingInfo && (
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Edit Info Customer</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Nama *</label>
                  <Input value={infoName} onChange={e => setInfoName(e.target.value)} placeholder="Nama customer" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Estimated Value (Rp)</label>
                  <Input value={infoValue} onChange={e => setInfoValue(e.target.value)} placeholder="Contoh: 5000000" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Email</label>
                  <Input value={infoEmail} onChange={e => setInfoEmail(e.target.value)} type="email" placeholder="email@contoh.com" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Nomor HP / WhatsApp</label>
                  <Input value={infoPhone} onChange={e => setInfoPhone(e.target.value)} placeholder="08xxxxxxxx" className="h-8 text-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Lead Source</label>
                <Select value={infoSource} onValueChange={setInfoSource}>
                  <SelectTrigger className="h-8 text-sm bg-white"><SelectValue placeholder="Pilih sumber..." /></SelectTrigger>
                  <SelectContent>
                    {["Instagram", "WhatsApp", "Referral", "Website", "TikTok", "Email", "Cold Outreach", "Event", "Other"].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {allBusinesses && allBusinesses.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Bisnis</label>
                  <div className="flex flex-wrap gap-3">
                    {allBusinesses.map((b: any) => (
                      <label key={b.id} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={infoBiz.includes(b.id)}
                          onCheckedChange={checked => setInfoBiz(prev => checked ? [...prev, b.id] : prev.filter(x => x !== b.id))}
                        />
                        <span className="text-sm text-foreground">{b.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setEditingInfo(false)} className="h-8">Batal</Button>
                <Button size="sm" onClick={handleSaveInfo} disabled={savingInfo} className="h-8">
                  {savingInfo ? <><Loader2 className="h-3 w-3 animate-spin mr-1.5" />Menyimpan...</> : "Simpan Perubahan"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Customer Memory */}
      <div className="bg-white border border-border rounded-2xl card-shadow overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Brain className="h-3.5 w-3.5 text-indigo-500" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">Customer Memory</h3>
          </div>
          {!editingMemory && (
            <button
              onClick={() => { setMemoryText(customer.memory || ""); setEditingMemory(true); }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Edit2 className="h-3 w-3" />
              {customer.memory ? "Edit" : "Tambah"}
            </button>
          )}
        </div>
        <div className="px-5 py-4">
          {editingMemory ? (
            <div className="space-y-3">
              <Textarea
                value={memoryText}
                onChange={(e) => setMemoryText(e.target.value)}
                placeholder="Gaya komunikasi, preferensi, konteks penting, catatan personal..."
                rows={3}
                className="text-sm bg-muted/30 border-border focus-visible:ring-primary/20"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" className="h-8 text-xs" onClick={handleSaveMemory} disabled={savingMemory}>
                  {savingMemory ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                  Simpan
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setEditingMemory(false)}>
                  Batal
                </Button>
              </div>
            </div>
          ) : customer.memory ? (
            <p className="text-sm whitespace-pre-wrap text-foreground/80 leading-relaxed">{customer.memory}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Simpan gaya komunikasi, preferensi, atau catatan personal di sini. AI akan menggunakannya sebagai konteks.
            </p>
          )}
        </div>
      </div>

      {/* Data Tambahan (custom fields from import) */}
      {customer.customData && Object.keys(customer.customData).length > 0 && (
        <div className="bg-white border border-border rounded-2xl card-shadow overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-violet-50 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-violet-500" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">Data Tambahan</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Field khusus dari import</p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-border">
            {Object.entries(customer.customData).map(([key, val]) => (
              <div key={key} className="flex items-start gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">{key}</p>
                  {editingCustomKey === key ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={customEditValue}
                        onChange={e => setCustomEditValue(e.target.value)}
                        className="h-7 text-sm flex-1"
                        autoFocus
                        onKeyDown={e => { if (e.key === "Enter") handleSaveCustomField(key); if (e.key === "Escape") setEditingCustomKey(null); }}
                      />
                      <button
                        onClick={() => handleSaveCustomField(key)}
                        disabled={savingCustomField}
                        className="h-7 px-2.5 rounded-lg bg-primary text-white text-xs font-medium hover:opacity-90 disabled:opacity-60 transition"
                      >
                        {savingCustomField ? "..." : "Simpan"}
                      </button>
                      <button
                        onClick={() => setEditingCustomKey(null)}
                        className="h-7 px-2 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted/50 transition"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-foreground">{val || <span className="italic text-muted-foreground">—</span>}</p>
                  )}
                </div>
                {editingCustomKey !== key && (
                  <div className="flex items-center gap-1 shrink-0 mt-1">
                    <button
                      onClick={() => { setEditingCustomKey(key); setCustomEditValue(val ?? ""); }}
                      className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition"
                      title="Edit"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteCustomField(key)}
                      className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-red-50 transition"
                      title="Hapus field ini"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Berkas & Foto */}
      <CustomerFilesSection customerId={id!} />

      {/* AI Panels */}
      <AISection title="Ringkasan Customer" defaultOpen={!!summary}>
        {summary ? (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-foreground">{summary}</p>
            <button
              onClick={handleGetSummary}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="h-3 w-3" /> Perbarui
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Dapatkan ringkasan singkat situasi customer ini berdasarkan riwayat interaksi, memory, dan status pipeline.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs h-8"
              onClick={handleGetSummary}
              disabled={loadingSummary}
            >
              {loadingSummary ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {loadingSummary ? "Menghasilkan..." : "Buat Ringkasan"}
            </Button>
          </div>
        )}
      </AISection>

      <AISection title="Saran Tindakan Berikutnya" defaultOpen={!!nextAction}>
        {nextAction ? (
          <div className="space-y-3">
            <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full", urgencyConfig[nextAction.urgency]?.className ?? urgencyConfig.low.className)}>
              {urgencyConfig[nextAction.urgency]?.label ?? "Prioritas Rendah"}
            </span>
            <p className="text-sm font-semibold text-foreground">{nextAction.action}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{nextAction.reason}</p>
            {nextAction.suggestedDate && (
              <p className="text-xs font-mono text-muted-foreground">
                Disarankan: <span className="font-semibold text-foreground">{nextAction.suggestedDate}</span>
              </p>
            )}
            <button
              onClick={handleNextAction}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="h-3 w-3" /> Perbarui
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Dapatkan langkah terbaik untuk memajukan deal ini — prioritas, tindakan, dan waktu yang tepat.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs h-8"
              onClick={handleNextAction}
              disabled={loadingNext}
            >
              {loadingNext ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {loadingNext ? "Berpikir..." : "Saran Tindakan"}
            </Button>
          </div>
        )}
      </AISection>

      <AISection title="Generator Balasan">
        <div className="space-y-3">
          <Textarea
            placeholder="Tempelkan pesan customer di sini..."
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            rows={2}
            className="text-sm bg-muted/30 border-border focus-visible:ring-primary/20"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={replyTone} onValueChange={setReplyTone}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="casual">Santai & Hangat</SelectItem>
                <SelectItem value="professional">Profesional</SelectItem>
                <SelectItem value="persuasive">Persuasif</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={handleGenerateReply}
              disabled={loadingReply || !replyMessage.trim()}
            >
              {loadingReply ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {loadingReply ? "Menulis..." : "Buat Balasan"}
            </Button>
          </div>
          {reply && (
            <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-3">
              <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">{reply}</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { navigator.clipboard.writeText(reply); toast.success("Tersalin!"); }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Copy className="h-3 w-3" /> Salin
                </button>
                <button
                  onClick={handleGenerateReply}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RefreshCw className="h-3 w-3" /> Coba lagi
                </button>
              </div>
            </div>
          )}
        </div>
      </AISection>

      {/* Add Interaction Form */}
      <div className="bg-white border border-border rounded-2xl card-shadow p-5 space-y-4">
        <h3 className="font-semibold text-sm text-foreground">Tambah ke Timeline</h3>

        {/* Type selector tabs */}
        <div className="flex gap-2 flex-wrap">
          {(["note", "transaction", "follow_up"] as InteractionType[]).map((t) => {
            const cfg = typeConfig[t];
            const isActive = addType === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setAddType(t)}
                className={cn(
                  "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border transition-all",
                  isActive
                    ? `${cfg.bg} ${cfg.color} border-transparent shadow-sm`
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <cfg.icon className="h-3 w-3" />
                {cfg.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleAddInteraction} className="space-y-3">
          {addType === "transaction" && (
            <Input
              placeholder="Jumlah (IDR)"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-9 text-sm"
            />
          )}
          {addType === "follow_up" && (
            <Input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="h-9 text-sm w-44"
            />
          )}
          <Textarea
            placeholder={
              addType === "note" ? "Catatan interaksi atau perkembangan terbaru..."
              : addType === "transaction" ? "Deskripsi transaksi..."
              : "Apa yang perlu di-follow up?"
            }
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            className="text-sm bg-muted/20 border-border focus-visible:ring-primary/20"
          />
          <Button
            type="submit"
            size="sm"
            disabled={saving || !content.trim()}
            className="gap-1.5 text-xs h-8"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Tambah
          </Button>
        </form>
      </div>

      {/* Timeline */}
      <div>
        <h3 className="font-semibold text-sm text-foreground mb-3">
          Timeline
          {interactions?.length ? (
            <span className="ml-2 text-xs font-normal text-muted-foreground">({interactions.length} entri)</span>
          ) : null}
        </h3>

        {!interactions?.length ? (
          <div className="bg-white border border-border rounded-2xl card-shadow py-12 text-center">
            <p className="text-sm text-muted-foreground">Belum ada interaksi. Tambahkan catatan pertama di atas.</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[28px] top-0 bottom-0 w-px bg-border" />
            <div className="space-y-0">
              {interactions.map((item: any, idx: number) => {
                const cfg = typeConfig[item.type as InteractionType] ?? typeConfig.note;
                const Icon = cfg.icon;
                const isLast = idx === interactions.length - 1;
                return (
                  <div key={item.id} className={`relative flex gap-4 pb-4 ${isLast ? "pb-0" : ""}`}>
                    <div className={`z-10 h-7 w-7 rounded-xl flex items-center justify-center shrink-0 mt-1 ring-2 ring-background ${cfg.bg}`}>
                      <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 bg-white border border-border rounded-2xl p-4 card-shadow min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {formatDateTime(item.createdAt)}
                          </span>
                          {item.type === "follow_up" && !item.isCompleted && (
                            <button
                              onClick={() => handleComplete(item.id)}
                              disabled={completingId === item.id}
                              className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 transition-colors font-medium disabled:opacity-60"
                            >
                              {completingId === item.id
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <Check className="h-3 w-3" />}
                              {completingId === item.id ? "Menyimpan..." : "Selesai"}
                            </button>
                          )}
                          {item.type === "follow_up" && item.isCompleted && (
                            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                              <Check className="h-3 w-3" /> Selesai
                            </span>
                          )}
                        </div>
                        {confirmDeleteInteraction === item.id ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => setConfirmDeleteInteraction(null)}
                              className="text-[11px] px-2 py-0.5 rounded-md bg-muted hover:bg-muted/70 transition-colors"
                            >Batal</button>
                            <button
                              onClick={() => handleDeleteInteraction(item.id)}
                              className="text-[11px] px-2 py-0.5 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
                            >Hapus</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteInteraction(item.id)}
                            className="text-muted-foreground/30 hover:text-red-500 transition-colors shrink-0"
                            title="Hapus"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm mt-2 whitespace-pre-wrap leading-relaxed text-foreground">{item.content}</p>
                      {item.amount && (
                        <p className="text-sm font-mono font-bold text-emerald-600 mt-1.5">
                          {formatIDR(item.amount)}
                        </p>
                      )}
                      {item.followUpDate && !item.isCompleted && (
                        <p className="text-xs text-amber-600 font-medium mt-1.5 flex items-center gap-1">
                          <CalendarCheck className="h-3 w-3" />
                          Follow-up: {formatDate(item.followUpDate)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
