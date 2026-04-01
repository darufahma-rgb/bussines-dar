import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Home, TrendingUp } from "lucide-react";

export default function NotFound() {
  const location = useLocation();

  useEffect(() => {
    console.error("404: Route not found —", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-6">
        <TrendingUp className="h-7 w-7 text-muted-foreground/40" />
      </div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">404</p>
      <h1 className="text-2xl font-bold text-foreground mb-2">Halaman Tidak Ditemukan</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs leading-relaxed">
        Halaman yang kamu cari tidak ada atau sudah dipindahkan.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-sm"
      >
        <Home className="h-4 w-4" />
        Kembali ke Dashboard
      </Link>
    </div>
  );
}
