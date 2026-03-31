import { useState } from "react";
import { Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function QuickCapture() {
  const [text, setText] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: customers } = useQuery({
    queryKey: ["customers-list"],
    queryFn: () => api.customers.list(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setSaving(true);
    try {
      if (customerId && customerId !== "__new__") {
        await api.interactions.create({
          customerId,
          type: "quick_capture",
          content: text.trim(),
        });
        toast.success("Captured!");
      } else {
        const nameMatch = text.match(/^(\w+)/);
        const name = nameMatch ? nameMatch[1] : "Unknown";

        const { id: newCustomerId } = await api.customers.create({ name });
        await api.interactions.create({
          customerId: newCustomerId,
          type: "quick_capture",
          content: text.trim(),
        });
        toast.success(`New customer "${name}" created with note!`);
      }

      setText("");
      setCustomerId("");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["recent-captures"] });
    } catch {
      toast.error("Failed to save");
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-card border rounded-lg p-2">
      <Zap className="h-4 w-4 text-status-warm shrink-0" />
      <Select value={customerId} onValueChange={setCustomerId}>
        <SelectTrigger className="w-36 h-8 text-xs">
          <SelectValue placeholder="New customer" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__new__">+ New customer</SelectItem>
          {customers?.map((c: any) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='e.g. "Cia asked about Umrah package for Dec, 2 pax"'
        className="flex-1 h-8 text-sm border-0 bg-transparent focus-visible:ring-0 px-0"
      />
      <Button type="submit" size="sm" disabled={saving || !text.trim()} className="h-8 text-xs">
        Capture
      </Button>
    </form>
  );
}
