import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import BusinessBadge from "@/components/BusinessBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ArrowLeft, MessageSquare, DollarSign, CalendarCheck, Zap, Check, Trash2 } from "lucide-react";

type InteractionType = "note" | "transaction" | "follow_up" | "quick_capture";
type CustomerStatus = "new" | "warm" | "hot" | "closed";

const typeIcons: Record<InteractionType, any> = {
  note: MessageSquare,
  transaction: DollarSign,
  follow_up: CalendarCheck,
  quick_capture: Zap,
};

const typeLabels: Record<InteractionType, string> = {
  note: "Note",
  transaction: "Transaction",
  follow_up: "Follow-up",
  quick_capture: "Quick Capture",
};

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [addType, setAddType] = useState<InteractionType>("note");
  const [content, setContent] = useState("");
  const [amount, setAmount] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [saving, setSaving] = useState(false);

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

  const handleAddInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !id) return;
    setSaving(true);
    try {
      await api.interactions.create({
        customerId: id,
        type: addType,
        content: content.trim(),
        amount: amount || undefined,
        followUpDate: followUpDate || undefined,
      });
      setContent("");
      setAmount("");
      setFollowUpDate("");
      queryClient.invalidateQueries({ queryKey: ["interactions", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Added!");
    } catch {
      toast.error("Failed to add");
    }
    setSaving(false);
  };

  const handleStatusChange = async (status: CustomerStatus) => {
    if (!id) return;
    try {
      await api.customers.updateStatus(id, status);
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleComplete = async (interactionId: string) => {
    try {
      await api.interactions.complete(interactionId);
      queryClient.invalidateQueries({ queryKey: ["interactions", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["today-follow-ups"] });
      toast.success("Marked complete");
    } catch {
      toast.error("Failed to mark complete");
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm("Delete this customer and all their data?")) return;
    try {
      await api.customers.delete(id);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer deleted");
      navigate("/customers");
    } catch {
      toast.error("Failed to delete customer");
    }
  };

  if (!customer) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => navigate(-1)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
            <ArrowLeft className="h-3 w-3" /> Back
          </button>
          <h2 className="text-xl font-semibold">{customer.name}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {customer.customer_businesses?.map((cb: any) => (
              <BusinessBadge key={cb.business_id} name={cb.businesses?.name} />
            ))}
            {customer.email && <span className="text-xs text-muted-foreground">{customer.email}</span>}
            {customer.phone && <span className="text-xs text-muted-foreground font-mono">{customer.phone}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={customer.status} onValueChange={(v) => handleStatusChange(v as CustomerStatus)}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="hot">Hot</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive h-8">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <form onSubmit={handleAddInteraction} className="bg-card border rounded-lg p-4 space-y-3">
        <div className="flex gap-2">
          <Select value={addType} onValueChange={(v) => setAddType(v as InteractionType)}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="note">📝 Note</SelectItem>
              <SelectItem value="transaction">💰 Transaction</SelectItem>
              <SelectItem value="follow_up">📅 Follow-up</SelectItem>
            </SelectContent>
          </Select>
          {addType === "transaction" && (
            <Input placeholder="Amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-32 h-8 text-xs" />
          )}
          {addType === "follow_up" && (
            <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className="w-40 h-8 text-xs" />
          )}
        </div>
        <Textarea
          placeholder="Write something..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
          className="text-sm"
        />
        <Button type="submit" size="sm" disabled={saving || !content.trim()}>Add</Button>
      </form>

      <div className="space-y-1">
        <h3 className="font-medium text-sm text-muted-foreground">Timeline</h3>
        {!interactions?.length ? (
          <p className="text-sm text-muted-foreground p-4">No interactions yet.</p>
        ) : (
          <div className="space-y-0 border rounded-lg divide-y">
            {interactions.map((i: any) => {
              const Icon = typeIcons[i.type as InteractionType];
              return (
                <div key={i.id} className="p-3 flex gap-3">
                  <div className="mt-0.5">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">{typeLabels[i.type as InteractionType]}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {format(parseISO(i.createdAt), "MMM d, h:mm a")}
                      </span>
                      {i.type === "follow_up" && !i.isCompleted && (
                        <button onClick={() => handleComplete(i.id)} className="text-xs text-status-closed hover:underline flex items-center gap-0.5">
                          <Check className="h-3 w-3" /> Done
                        </button>
                      )}
                      {i.type === "follow_up" && i.isCompleted && (
                        <span className="text-xs text-status-closed">✓ Completed</span>
                      )}
                    </div>
                    <p className="text-sm mt-0.5 whitespace-pre-wrap">{i.content}</p>
                    {i.amount && (
                      <p className="text-sm font-mono font-medium mt-0.5">
                        {i.currency} {Number(i.amount).toLocaleString()}
                      </p>
                    )}
                    {i.followUpDate && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Follow-up: {format(parseISO(i.followUpDate), "MMM d, yyyy")}
                      </p>
                    )}
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
