import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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
import { Menu } from "lucide-react";

const queryClient = new QueryClient();

function AppLayout() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <div className="flex min-h-screen">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 overflow-auto">
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b bg-background sticky top-0 z-40">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold text-sm">CRM Hub</span>
        </div>
        <div className="p-4 md:p-6">
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
