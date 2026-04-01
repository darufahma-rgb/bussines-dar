import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Eye, EyeOff, Mail } from "lucide-react";

/* ── Animated blob canvas ── */
function AnimatedOrb({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const orbs = [
      { x: 0.60, y: 0.30, r: 0.70, color: "#1a3bff", speed: 0.00030, phase: 0 },
      { x: 0.35, y: 0.70, r: 0.58, color: "#0f2ab8", speed: 0.00022, phase: 1.4 },
      { x: 0.75, y: 0.60, r: 0.50, color: "#2d1dcc", speed: 0.00040, phase: 2.8 },
      { x: 0.25, y: 0.25, r: 0.40, color: "#071a8a", speed: 0.00028, phase: 0.5 },
      { x: 0.55, y: 0.85, r: 0.35, color: "#3d5bfa", speed: 0.00048, phase: 4.1 },
      { x: 0.85, y: 0.20, r: 0.30, color: "#1a2fe0", speed: 0.00035, phase: 2.1 },
    ];

    const draw = (ts: number) => {
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#050d2e";
      ctx.fillRect(0, 0, W, H);

      orbs.forEach((orb, i) => {
        const angle = ts * orb.speed + orb.phase;
        const dx = Math.sin(angle * 1.3 + i) * 0.12;
        const dy = Math.cos(angle * 0.9 + i * 1.7) * 0.12;
        const px = (orb.x + dx) * W;
        const py = (orb.y + dy) * H;
        const radius = orb.r * Math.min(W, H);
        const grad = ctx.createRadialGradient(px, py, 0, px, py, radius);
        grad.addColorStop(0, orb.color + "ee");
        grad.addColorStop(0.45, orb.color + "88");
        grad.addColorStop(1, orb.color + "00");
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalCompositeOperation = "source-over";
      const sg = ctx.createLinearGradient(0, 0, W, H);
      sg.addColorStop(0, "rgba(255,255,255,0)");
      sg.addColorStop(0.5 + 0.4 * Math.sin(ts * 0.0004), "rgba(120,140,255,0.06)");
      sg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, W, H);

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, []);

  return <canvas ref={canvasRef} className={`w-full h-full ${className}`} style={{ display: "block" }} />;
}

function GridOverlay({ className = "" }: { className?: string }) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{
        opacity: 0.07,
        backgroundImage: "linear-gradient(rgba(160,180,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(160,180,255,1) 1px, transparent 1px)",
        backgroundSize: "36px 36px",
      }}
    />
  );
}

/* ── Main component ── */
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      toast.success("Akun berhasil dibuat! Selamat datang di Darcia Business Hub.");
    }
    setLoading(false);
  };

  const BLUE = "hsl(228 82% 47%)";

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: BLUE }}>

      {/* ═══════════════════════════════════════
          MOBILE layout  (< sm)
          Animated full-screen bg + compact card
          ═══════════════════════════════════════ */}
      <div className="sm:hidden relative w-full min-h-screen flex flex-col items-center justify-center px-5 py-8">
        {/* animated bg fills the whole mobile screen */}
        <div className="absolute inset-0 overflow-hidden">
          <AnimatedOrb className="absolute inset-0" />
          <GridOverlay />
        </div>

        {/* brand header — above card */}
        <div className="relative z-10 text-center mb-5">
          <img src="/darcia-logo.png" alt="Darcia" className="h-10 w-auto object-contain mx-auto mb-3" />
          <h1 className="text-lg font-bold text-white tracking-tight">Darcia Business Hub</h1>
          <p className="text-xs text-white/50 mt-0.5">Business Operating System</p>
        </div>

        {/* compact white card */}
        <div
          className="relative z-10 w-full"
          style={{
            maxWidth: "340px",
            background: "rgba(255,255,255,0.97)",
            borderRadius: "20px",
            padding: "24px 22px 20px",
            boxShadow: "0 20px 60px rgba(0,0,15,0.45)",
          }}
        >
          <h2 className="text-[17px] font-bold text-gray-900 mb-0.5">
            {isSignUp ? "Buat akun" : "Selamat datang"}
          </h2>
          <p className="text-xs text-gray-400 mb-5">
            {isSignUp ? "Isi data untuk mendaftar." : "Masukkan detail akunmu."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-2.5">
            <div className="relative">
              <input
                type="email"
                placeholder="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 pl-3.5 pr-10 text-sm rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ "--tw-ring-color": "hsl(228 82% 47% / 0.3)" } as any}
              />
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300 pointer-events-none" />
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 pl-3.5 pr-10 text-sm rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ "--tw-ring-color": "hsl(228 82% 47% / 0.3)" } as any}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-70 mt-0.5"
              style={{ background: BLUE }}
            >
              {loading ? "Memuat..." : isSignUp ? "Daftar" : "Masuk"}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4">
            {isSignUp ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
            <button
              type="button"
              onClick={() => setIsSignUp((v) => !v)}
              className="font-semibold"
              style={{ color: BLUE }}
            >
              {isSignUp ? "Masuk" : "Daftar"}
            </button>
          </p>
        </div>

        {/* brand logos row — on animated bg */}
        <div className="relative z-10 flex items-center justify-center gap-6 mt-6">
          <img src="/darcia-logo.png"    alt="Darcia"      className="h-7 w-7 object-contain opacity-70" />
          <img src="/temantiket-logo.png" alt="Temantiket" className="h-7 w-7 object-contain opacity-70" style={{ mixBlendMode: "screen" }} />
          <img src="/symp-logo.png"       alt="SYMP"        className="h-7 w-7 object-contain opacity-70" />
          <img src="/aigypt-logo.png"     alt="AIGYPT"      className="h-7 w-7 object-contain opacity-70" />
        </div>
      </div>

      {/* ═══════════════════════════════════════
          DESKTOP layout  (≥ sm)
          Split card: white left + animated right
          ═══════════════════════════════════════ */}
      <div
        className="hidden sm:flex w-full overflow-hidden"
        style={{
          maxWidth: "820px",
          minHeight: "500px",
          borderRadius: "28px",
          boxShadow: "0 32px 80px rgba(0,0,20,0.5)",
          margin: "2rem",
        }}
      >
        {/* left form */}
        <div className="relative flex flex-col justify-center bg-white px-8 py-10 w-[400px] shrink-0 z-10">
          <div className="mb-7">
            <img src="/darcia-logo.png" alt="Darcia" className="h-10 w-auto object-contain mb-5" style={{ filter: "brightness(0)" }} />
            <h1 className="text-[26px] font-bold text-gray-900 leading-tight">
              {isSignUp ? "Buat akun baru" : "Selamat datang"}
            </h1>
            <p className="text-sm text-gray-400 mt-1.5">
              {isSignUp ? "Isi data untuk membuat akun Darcia Business Hub." : "Masukkan detail akunmu untuk masuk."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="relative">
              <input
                type="email"
                placeholder="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 pl-4 pr-11 text-sm rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                style={{ "--tw-ring-color": "hsl(228 82% 47% / 0.25)" } as any}
              />
              <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 pointer-events-none" />
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 pl-4 pr-11 text-sm rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                style={{ "--tw-ring-color": "hsl(228 82% 47% / 0.25)" } as any}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-70 mt-1"
              style={{ background: BLUE }}
            >
              {loading ? "Memuat..." : isSignUp ? "Daftar" : "Masuk"}
            </button>
          </form>

          <p className="text-sm text-gray-400 text-center mt-6">
            {isSignUp ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
            <button
              type="button"
              onClick={() => setIsSignUp((v) => !v)}
              className="font-semibold hover:opacity-80 transition-opacity"
              style={{ color: BLUE }}
            >
              {isSignUp ? "Masuk" : "Daftar"}
            </button>
          </p>
        </div>

        {/* right animated panel */}
        <div className="relative flex-1 overflow-hidden">
          <AnimatedOrb className="absolute inset-0" />
          <GridOverlay />
          <div
            className="absolute top-0 left-0 w-48 h-48 pointer-events-none"
            style={{ background: "radial-gradient(circle at top left, rgba(100,130,255,0.25), transparent 70%)" }}
          />
          <div className="absolute bottom-8 left-8 right-8 z-10">
            <p className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-1">
              Business Operating System
            </p>
            <p className="text-white/60 text-xs leading-relaxed mb-5">
              Kelola semua customer, pipeline, dan review bisnis kamu dalam satu dashboard.
            </p>
            {/* brand logos */}
            <div className="flex items-center gap-5">
              <img src="/darcia-logo.png"    alt="Darcia"      className="h-6 w-6 object-contain opacity-50" />
              <img src="/temantiket-logo.png" alt="Temantiket" className="h-6 w-6 object-contain opacity-50" style={{ mixBlendMode: "screen" }} />
              <img src="/symp-logo.png"       alt="SYMP"        className="h-6 w-6 object-contain opacity-50" />
              <img src="/aigypt-logo.png"     alt="AIGYPT"      className="h-6 w-6 object-contain opacity-50" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
