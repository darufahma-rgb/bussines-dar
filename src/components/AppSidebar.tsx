import {
  LayoutDashboard, Users, CalendarCheck, LogOut, Plus,
  BarChart2, CalendarDays, Kanban, TrendingUp, HelpCircle, X,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AppSidebarProps {
  open?: boolean;
  onClose?: () => void;
}

const allNavItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true, group: "main" },
  { to: "/customers", icon: Users, label: "Customers", end: false, group: "main" },
  { to: "/pipeline", icon: Kanban, label: "Pipeline", end: true, group: "main" },
  { to: "/customers/new", icon: Plus, label: "Tambah Customer", end: true, group: "main" },
  { to: "/follow-ups", icon: CalendarCheck, label: "Follow-ups", end: true, group: "main", hasBadge: true },
  { to: "/weekly", icon: CalendarDays, label: "Laporan Mingguan", end: true, group: "insight" },
  { to: "/monthly", icon: BarChart2, label: "Laporan Bulanan", end: true, group: "insight" },
];

function IconButton({
  to,
  icon: Icon,
  label,
  end,
  badge,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  end: boolean;
  badge?: number | null;
}) {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <NavLink
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              "relative flex items-center justify-center h-10 w-10 rounded-xl transition-all duration-150",
              isActive
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )
          }
        >
          <Icon className="h-5 w-5" />
          {badge != null && badge > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5 leading-none">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </NavLink>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs font-medium">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export default function AppSidebar({ open, onClose }: AppSidebarProps) {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "CR";

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.interactions.stats(),
    refetchInterval: 60000,
  });

  const overdueCount = stats?.overdue ?? 0;

  useEffect(() => {
    onClose?.();
  }, [location.pathname]);

  const mainItems = allNavItems.filter((i) => i.group === "main");
  const insightItems = allNavItems.filter((i) => i.group === "insight");

  const slimSidebar = (
    <aside className="w-[72px] h-full bg-white border-r border-border flex flex-col items-center py-4 gap-1">
      <div className="mb-4">
        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 flex-1">
        {mainItems.map((item) => (
          <IconButton
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            end={item.end}
            badge={item.hasBadge ? overdueCount : null}
          />
        ))}

        <div className="my-2 w-8 border-t border-border" />

        {insightItems.map((item) => (
          <IconButton
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            end={item.end}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-1 mt-auto">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center cursor-default">
              <span className="text-xs font-bold text-primary">{initials}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {user?.email}
          </TooltipContent>
        </Tooltip>

        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={signOut}
              className="h-10 w-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            Sign out
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );

  const fullSidebar = (
    <aside className="w-64 h-full bg-white border-r border-border flex flex-col">
      <div className="px-4 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-foreground">CRM Hub</h1>
            <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{user?.email}</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <p className="px-2 mb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Menu</p>
        {mainItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.hasBadge && overdueCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {overdueCount > 99 ? "99+" : overdueCount}
              </span>
            )}
          </NavLink>
        ))}

        <div className="pt-3 pb-1">
          <p className="px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Insights</p>
        </div>

        {insightItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
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
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted hover:text-foreground w-full transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden md:flex md:w-[72px] min-h-screen shrink-0">
        {slimSidebar}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/40" onClick={onClose} />
          <div className="relative z-10 w-64 min-h-screen">
            {fullSidebar}
          </div>
        </div>
      )}
    </>
  );
}
