import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { User, Lock, Mail, Save, Eye, EyeOff, ShieldCheck } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";

export default function Profile() {
  const { user } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.auth.updateProfile({ name: name.trim() || undefined });
      toast.success("Profil berhasil diperbarui!");
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui profil");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Password baru tidak cocok");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password baru minimal 6 karakter");
      return;
    }
    setSavingPassword(true);
    try {
      await api.auth.updateProfile({ currentPassword, newPassword });
      toast.success("Password berhasil diubah!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengubah password");
    } finally {
      setSavingPassword(false);
    }
  };

  const initials = (user?.name || user?.email || "CR").slice(0, 2).toUpperCase();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Avatar & identity */}
      <div className="bg-white border border-border rounded-2xl card-shadow p-6 flex items-center gap-5">
        <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shadow-md shrink-0">
          <span className="text-xl font-bold text-white">{initials}</span>
        </div>
        <div>
          <p className="font-semibold text-foreground text-base leading-tight">
            {user?.name || "Belum ada nama"}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            {user?.email}
          </p>
        </div>
      </div>

      {/* Edit info */}
      <div className="bg-white border border-border rounded-2xl card-shadow overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-border">
          <SectionHeading icon={User} title="Informasi Profil" />
        </div>
        <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Nama Tampilan</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masukkan nama kamu"
              className="w-full h-10 px-3.5 text-sm rounded-xl border border-border bg-muted/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Email</label>
            <input
              type="email"
              value={user?.email ?? ""}
              disabled
              className="w-full h-10 px-3.5 text-sm rounded-xl border border-border bg-muted/20 text-muted-foreground cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">Email tidak bisa diubah.</p>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={savingProfile}
              className="flex items-center gap-2 h-9 px-5 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition"
            >
              <Save className="h-3.5 w-3.5" />
              {savingProfile ? "Menyimpan..." : "Simpan Profil"}
            </button>
          </div>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white border border-border rounded-2xl card-shadow overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-border">
          <SectionHeading icon={ShieldCheck} title="Ganti Password" />
        </div>
        <form onSubmit={handleSavePassword} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Password Lama</label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full h-10 pl-3.5 pr-10 text-sm rounded-xl border border-border bg-muted/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition"
              />
              <button type="button" tabIndex={-1} onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Password Baru</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Min. 6 karakter"
                className="w-full h-10 pl-3.5 pr-10 text-sm rounded-xl border border-border bg-muted/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition"
              />
              <button type="button" tabIndex={-1} onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Konfirmasi Password Baru</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Ulangi password baru"
              className="w-full h-10 px-3.5 text-sm rounded-xl border border-border bg-muted/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={savingPassword}
              className="flex items-center gap-2 h-9 px-5 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition"
            >
              <Lock className="h-3.5 w-3.5" />
              {savingPassword ? "Mengubah..." : "Ubah Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
