import { LayoutDashboard, Users, CalendarCheck, LogOut, Plus, BarChart2, CalendarDays, Kanban, X } from "lucide-react";
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

  const sidebarContent = (
    <aside className="w-56 h-full bg-sidebar flex flex-col border-r border-sidebar-border">
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-sidebar-primary font-semibold text-lg tracking-tight">CRM Hub</h1>
          <p className="text-xs text-sidebar-foreground mt-0.5 font-mono truncate">{user?.email}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="md:hidden text-sidebar-foreground hover:text-sidebar-accent-foreground ml-2">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </NavLink>
        ))}

        <div className="pt-3 pb-1">
          <p className="px-3 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">Insights</p>
        </div>

        {insightItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-2 border-t border-sidebar-border">
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground w-full transition-colors"
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
          <div className="fixed inset-0 bg-black/50" onClick={onClose} />
          <div className="relative z-10 w-56 min-h-screen">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
