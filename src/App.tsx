import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import AppSidebar from "@/components/AppSidebar";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import CustomerList from "@/pages/CustomerList";
import CustomerDetail from "@/pages/CustomerDetail";
import NewCustomer from "@/pages/NewCustomer";
import FollowUps from "@/pages/FollowUps";
import Pipeline from "@/pages/Pipeline";
import Weekly from "@/pages/Weekly";
import Monthly from "@/pages/Monthly";
import Yearly from "@/pages/Yearly";
import Profile from "@/pages/Profile";
import AiChat from "@/pages/AiChat";
import NotFound from "@/pages/NotFound";
import { Menu, PanelLeftClose, PanelLeftOpen, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const queryClient = new QueryClient();

const PAGE_TITLES: Record<string, string> = {
  "/": "Command Center",
  "/customers": "Daftar Customer",
  "/customers/new": "Tambah Customer",
  "/pipeline": "Pipeline",
  "/follow-ups": "Follow-ups",
  "/weekly": "Laporan Mingguan",
  "/monthly": "Laporan Bulanan",
  "/yearly": "Tinjauan Tahunan",
  "/chat": "Chat AI",
  "/profile": "Profil Saya",
};

function TopBar({
  onMobileMenuClick,
  sidebarCollapsed,
  onToggleCollapse,
}: {
  onMobileMenuClick: () => void;
  sidebarCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const initials = (user?.name || user?.email || "CR").slice(0, 2).toUpperCase();
  const today = format(new Date(), "EEEE, d MMMM yyyy", { locale: idLocale });

  const getTitle = () => {
    if (location.pathname.startsWith("/customers/") && location.pathname !== "/customers/new") {
      return "Detail Customer";
    }
    return PAGE_TITLES[location.pathname] ?? "Darcia Business Hub";
  };

  return (
    <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-border px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={onMobileMenuClick}
          className="md:hidden flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
          aria-label="Buka menu"
        >
          <Menu className="h-[18px] w-[18px]" />
        </button>

        <button
          onClick={onToggleCollapse}
          className="hidden md:flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
          aria-label={sidebarCollapsed ? "Buka sidebar" : "Tutup sidebar"}
        >
          {sidebarCollapsed
            ? <PanelLeftOpen className="h-[15px] w-[15px]" />
            : <PanelLeftClose className="h-[15px] w-[15px]" />
          }
        </button>

        <div className="min-w-0">
          <h1 className="font-semibold text-foreground text-sm sm:text-[15px] leading-tight truncate">{getTitle()}</h1>
          <p className="text-[11px] text-muted-foreground hidden sm:block capitalize leading-tight mt-0.5">{today}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => navigate("/profile")}
          title="Profil saya"
          className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shadow-sm hover:opacity-85 transition-opacity"
        >
          <span className="text-[11px] font-bold text-white">{initials}</span>
        </button>
      </div>
    </div>
  );
}

function AppLayout() {
  const { user, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar-collapsed") === "true"; } catch { return false; }
  });

  function toggleCollapse() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem("sidebar-collapsed", String(next)); } catch {}
      return next;
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-md">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          onMobileMenuClick={() => setMobileOpen(true)}
          sidebarCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleCollapse}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/customers" element={<CustomerList />} />
              <Route path="/customers/new" element={<NewCustomer />} />
              <Route path="/customers/:id" element={<CustomerDetail />} />
              <Route path="/follow-ups" element={<FollowUps />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/weekly" element={<Weekly />} />
              <Route path="/monthly" element={<Monthly />} />
              <Route path="/yearly" element={<Yearly />} />
              <Route path="/chat" element={<AiChat />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
