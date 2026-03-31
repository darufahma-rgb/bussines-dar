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
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function AppLayout() {
  const { user, loading } = useAuth();

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
      <AppSidebar />
      <main className="flex-1 p-6 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/customers" element={<CustomerList />} />
          <Route path="/customers/new" element={<NewCustomer />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/follow-ups" element={<FollowUps />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
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
