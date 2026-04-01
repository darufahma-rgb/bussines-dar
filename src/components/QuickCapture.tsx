import { useState, useEffect, useRef } from "react";
import { Zap, Sparkles, X, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

type ParsedCapture = {
  name?: string;
  businessIds?: string[];
  status?: string;
  interest?: string;
  followUpDate?: string | null;
  content?: string;
};

export default function QuickCapture() {
  const [text, setText] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedCapture | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const { data: businesses } = useQuery({
    queryKey: ["businesses"],
    queryFn: () => api.businesses.list(),
  });

  const { data: customers } = useQuery({
    queryKey: ["customers-list"],
    queryFn: () => api.customers.list(),
  });

  const handleAIParse = async () => {
    if (!text.trim()) return;
    setParsing(true);
    try {
      const result = await api.ai.parseCapture(text, businesses || []);
      setParsed(result);
    } catch {
      toast.error("AI gagal memproses, simpan sebagai catatan biasa");
    }
    setParsing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    try {
      if (customerId && customerId !== "__new__") {
        await api.interactions.create({ customerId, type: "quick_capture", content: text.trim() });
        toast.success("Tersimpan!");
      } else if (parsed && parsed.name) {
        const { id: newId } = await api.customers.create({
          name: parsed.name,
          status: (parsed.status as any) || "new",
          businessIds: parsed.businessIds || [],
        });
        const content = parsed.content || text.trim();
        await api.interactions.create({ customerId: newId, type: "quick_capture", content });
        if (parsed.followUpDate) {
          await api.interactions.create({ customerId: newId, type: "follow_up", content: parsed.interest || "Follow up", followUpDate: parsed.followUpDate });
        }
        toast.success(`Customer "${parsed.name}" berhasil dibuat dari AI!`);
      } else {
        const nameMatch = text.match(/^(\w+)/);
        const name = nameMatch ? nameMatch[1] : "Customer Baru";
        const { id: newId } = await api.customers.create({ name });
        await api.interactions.create({ customerId: newId, type: "quick_capture", content: text.trim() });
        toast.success(`Customer "${name}" berhasil dibuat!`);
      }

      setText("");
      setCustomerId("");
      setParsed(null);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["recent-captures"] });
    } catch {
      toast.error("Gagal menyimpan, coba lagi");
    }
    setSaving(false);
  };

  const clearParsed = () => setParsed(null);

  return (
    <div className="bg-white border border-border rounded-xl card-shadow overflow-hidden">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-2 p-2">
          <Zap className="h-4 w-4 text-status-warm shrink-0" />
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Customer baru" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__new__">+ Customer baru</SelectItem>
              {customers?.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            ref={inputRef}
            value={text}
            onChange={(e) => { setText(e.target.value); if (parsed) setParsed(null); }}
            placeholder='e.g. "Cia asked about Umrah package for Dec, 2 pax"'
            className="flex-1 h-8 text-sm border-0 bg-transparent focus-visible:ring-0 px-0"
            data-testid="input-quick-capture"
          />
          {text.trim() && !customerId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1 shrink-0"
              onClick={handleAIParse}
              disabled={parsing}
            >
              {parsing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {parsing ? "Memproses..." : "AI Parse"}
            </Button>
          )}
          <Button type="submit" size="sm" disabled={saving || !text.trim()} className="h-8 text-xs shrink-0">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Capture"}
          </Button>
        </div>

        {parsed && (
          <div className="border-t bg-muted/30 px-3 py-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> AI mengekstrak — periksa sebelum menyimpan
              </span>
              <button type="button" onClick={clearParsed} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {parsed.name && (
                <span className="flex items-center gap-1 bg-background border rounded px-2 py-1">
                  <span className="text-muted-foreground">Nama:</span>
                  <span className="font-medium">{parsed.name}</span>
                </span>
              )}
              {parsed.status && (
                <span className="flex items-center gap-1 bg-background border rounded px-2 py-1">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="outline" className="text-xs py-0 h-4">{parsed.status}</Badge>
                </span>
              )}
              {parsed.interest && (
                <span className="flex items-center gap-1 bg-background border rounded px-2 py-1 max-w-xs">
                  <span className="text-muted-foreground shrink-0">Tertarik:</span>
                  <span className="font-medium truncate">{parsed.interest}</span>
                </span>
              )}
              {parsed.followUpDate && (
                <span className="flex items-center gap-1 bg-background border rounded px-2 py-1">
                  <span className="text-muted-foreground">Follow-up:</span>
                  <span className="font-medium font-mono">{parsed.followUpDate}</span>
                </span>
              )}
              {parsed.businessIds && parsed.businessIds.length > 0 && (
                <span className="flex items-center gap-1 bg-background border rounded px-2 py-1">
                  <span className="text-muted-foreground">Bisnis:</span>
                  <span className="font-medium">
                    {parsed.businessIds.map((id: string) => businesses?.find((b: any) => b.id === id)?.name).filter(Boolean).join(", ")}
                  </span>
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              <Check className="h-3 w-3 inline mr-1 text-green-500" />
              Sudah oke? Tekan <strong>Capture</strong> untuk menyimpan, atau edit teks di atas.
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
