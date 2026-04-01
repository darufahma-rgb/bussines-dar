import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { TrendingUp } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);
    if (error) {
      toast.error(error.message);
    } else if (isSignUp) {
      toast.success("Akun berhasil dibuat! Selamat datang di CRM Hub.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-[360px]">
        {/* Brand mark */}
        <div className="text-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-md">
            <TrendingUp className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">CRM Hub</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Kelola semua customer kamu di satu tempat</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-border rounded-2xl card-shadow-md p-7 space-y-5">
          <h2 className="text-base font-semibold text-foreground">
            {isSignUp ? "Buat akun baru" : "Masuk ke akunmu"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 bg-muted/40 border-border focus-visible:ring-primary/20"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-11 bg-muted/40 border-border focus-visible:ring-primary/20"
            />
            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold mt-1"
              disabled={loading}
            >
              {loading ? "Loading..." : isSignUp ? "Daftar" : "Masuk"}
            </Button>
          </form>

          <div className="pt-1 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              {isSignUp ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary font-semibold hover:underline underline-offset-2 transition-colors"
              >
                {isSignUp ? "Masuk" : "Daftar"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
