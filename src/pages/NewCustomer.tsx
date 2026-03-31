import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type CustomerStatus = Database["public"]["Enums"]["customer_status"];

export default function NewCustomer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<CustomerStatus>("new");
  const [selectedBiz, setSelectedBiz] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: businesses } = useQuery({
    queryKey: ["businesses"],
    queryFn: async () => {
      const { data } = await supabase.from("businesses").select("*").order("name");
      return data ?? [];
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);

    const { data: customer, error } = await supabase
      .from("customers")
      .insert({
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        status,
      })
      .select("id")
      .single();

    if (error || !customer) {
      toast.error("Failed to create customer");
      setSaving(false);
      return;
    }

    if (selectedBiz.length > 0) {
      await supabase.from("customer_businesses").insert(
        selectedBiz.map((bizId) => ({ customer_id: customer.id, business_id: bizId }))
      );
    }

    queryClient.invalidateQueries({ queryKey: ["customers"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    toast.success("Customer created!");
    navigate(`/customers/${customer.id}`);
    setSaving(false);
  };

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Add Customer</h2>
        <p className="text-sm text-muted-foreground">Create a new customer profile</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Name *</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Customer name" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Phone</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+62..." />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Status</label>
          <Select value={status} onValueChange={(v) => setStatus(v as CustomerStatus)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="hot">Hot</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Businesses</label>
          <div className="flex flex-wrap gap-3">
            {businesses?.map((b) => (
              <label key={b.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selectedBiz.includes(b.id)}
                  onCheckedChange={(checked) => {
                    setSelectedBiz(checked
                      ? [...selectedBiz, b.id]
                      : selectedBiz.filter((id) => id !== b.id)
                    );
                  }}
                />
                {b.name}
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving ? "Saving..." : "Create Customer"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
