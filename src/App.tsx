import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
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
import NotFound from "@/pages/NotFound";
import { Menu, Bell } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const queryClient = new QueryClient();

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/customers": "Customers",
  "/customers/new": "Tambah Customer",
  "/pipeline": "Pipeline",
  "/follow-ups": "Follow-ups",
  "/weekly": "Laporan Mingguan",
  "/monthly": "Laporan Bulanan",
};

function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useAuth();
  const location = useLocation();
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "CR";
  const today = format(new Date(), "EEEE, d MMMM yyyy", { locale: idLocale });

  const getTitle = () => {
    if (location.pathname.startsWith("/customers/") && location.pathname !== "/customers/new") {
      return "Detail Customer";
    }
    return PAGE_TITLES[location.pathname] ?? "CRM Hub";
  };

  return (
    <div className="sticky top-0 z-40 bg-white border-b border-border px-4 md:px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden text-muted-foreground hover:text-foreground"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-semibold text-foreground text-sm md:text-base leading-tight">{getTitle()}</h1>
          <p className="text-[11px] text-muted-foreground hidden md:block capitalize">{today}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors relative">
          <Bell className="h-4 w-4" />
        </button>
        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
          <span className="text-[11px] font-bold text-white">{initials}</span>
        </div>
      </div>
    </div>
  );
}

function AppLayout() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">CR</span>
          </div>
          <p className="text-sm text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 flex flex-col min-w-0 overflow-auto">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <div className="flex-1 p-4 md:p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers" element={<CustomerList />} />
            <Route path="/customers/new" element={<NewCustomer />} />
            <Route path="/customers/:id" element={<CustomerDetail />} />
            <Route path="/follow-ups" element={<FollowUps />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/weekly" element={<Weekly />} />
            <Route path="/monthly" element={<Monthly />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
