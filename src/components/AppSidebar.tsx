import { LayoutDashboard, Users, CalendarCheck, LogOut, Plus, BarChart2, CalendarDays, Kanban, X, TrendingUp } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useEffect } from "react";

interface AppSidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export default function AppSidebar({ open, onClose }: AppSidebarProps) {
  const { signOut, user } = useAuth();
  const location = useLocation();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.interactions.stats(),
    refetchInterval: 60000,
  });

  const overdueCount = stats?.overdue ?? 0;

  useEffect(() => {
    onClose?.();
  }, [location.pathname]);

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/customers", icon: Users, label: "Customers", end: false },
    { to: "/pipeline", icon: Kanban, label: "Pipeline", end: true },
    { to: "/customers/new", icon: Plus, label: "Add Customer", end: true },
    {
      to: "/follow-ups",
      icon: CalendarCheck,
      label: "Follow-ups",
      end: true,
      badge: overdueCount > 0 ? overdueCount : null,
    },
  ];

  const insightItems = [
    { to: "/weekly", icon: CalendarDays, label: "Weekly", end: true },
    { to: "/monthly", icon: BarChart2, label: "Monthly", end: true },
  ];

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "CR";

  const sidebarContent = (
    <aside className="w-56 h-full bg-white flex flex-col border-r border-border">
      <div className="px-4 py-5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-sm tracking-tight text-foreground">CRM Hub</h1>
            <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="md:hidden text-muted-foreground hover:text-foreground ml-2 shrink-0">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <p className="px-2 mb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Menu</p>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </NavLink>
        ))}

        <div className="pt-4 pb-1">
          <p className="px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Insights</p>
        </div>

        {insightItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-border">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg mb-1">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-primary">{initials}</span>
          </div>
          <p className="text-xs text-muted-foreground truncate flex-1">{user?.email?.split("@")[0]}</p>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground w-full transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden md:flex md:w-56 min-h-screen shrink-0">
        {sidebarContent}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/40" onClick={onClose} />
          <div className="relative z-10 w-56 min-h-screen">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
