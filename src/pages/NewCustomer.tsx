import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import PageGuide from "@/components/PageGuide";
import { toast } from "sonner";

const SOURCE_OPTIONS = ["Instagram", "WhatsApp", "Referral", "Website", "TikTok", "Email", "Cold Outreach", "Event", "Other"];

export default function NewCustomer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("new");
  const [source, setSource] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [selectedBiz, setSelectedBiz] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: businesses } = useQuery({
    queryKey: ["businesses"],
    queryFn: () => api.businesses.list(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { id } = await api.customers.create({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        status,
        businessIds: selectedBiz,
        source: source || undefined,
        estimatedValue: estimatedValue ? Number(estimatedValue.replace(/[^0-9]/g, "")) : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Customer created!");
      navigate(`/customers/${id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create customer");
    }
    setSaving(false);
  };

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Tambah Customer</h2>
        <p className="text-sm text-muted-foreground">Buat profil customer baru secara manual</p>
      </div>

      <PageGuide steps={[
        { icon: "💡", title: "Alternatif Lebih Cepat", desc: "Untuk input cepat, gunakan Quick Capture di Dashboard (Ctrl+K) dan aktifkan AI Parse — AI akan otomatis mengisi nama, status, dan follow-up dari catatan singkat kamu." },
        { icon: "🏢", title: "Pilih Bisnis", desc: "Satu customer bisa dihubungkan ke lebih dari satu bisnis (centang beberapa). Berguna jika customer tertarik ke Temantiket sekaligus AIGYPT misalnya." },
        { icon: "💰", title: "Estimated Value", desc: "Isi perkiraan nilai deal dalam Rupiah (tanpa titik/koma). Angka ini digunakan untuk menghitung Pipeline Value di Dashboard dan Pipeline." },
        { icon: "📌", title: "Lead Source", desc: "Pilih dari mana customer ini berasal (Instagram, WhatsApp, Referral, dll). Membantu kamu tahu channel mana yang paling efektif." },
      ]} />

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

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New Lead</SelectItem>
                <SelectItem value="warm">Warm</SelectItem>
                <SelectItem value="hot">Hot</SelectItem>
                <SelectItem value="negotiation">Negotiation</SelectItem>
                <SelectItem value="closed">Closed Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Source</label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Where from?" />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Estimated Value (IDR)</label>
          <Input
            type="text"
            inputMode="numeric"
            value={estimatedValue}
            onChange={(e) => setEstimatedValue(e.target.value)}
            placeholder="e.g. 5000000"
          />
          <p className="text-xs text-muted-foreground">Optional — helps track pipeline revenue</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Businesses</label>
          <div className="flex flex-wrap gap-3">
            {businesses?.map((b: any) => (
              <label key={b.id} className="flex items-center gap-2 text-sm cursor-pointer">
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
