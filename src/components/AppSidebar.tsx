import {
  LayoutDashboard, Users, CalendarCheck, LogOut, Plus,
  BarChart2, CalendarDays, Kanban, TrendingUp, X,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useEffect } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AppSidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const mainItems = [
  { to: "/", icon: LayoutDashboard, label: "Dasbor", end: true, hasBadge: false },
  { to: "/customers", icon: Users, label: "Customer", end: false, hasBadge: false },
  { to: "/pipeline", icon: Kanban, label: "Pipeline", end: true, hasBadge: false },
  { to: "/follow-ups", icon: CalendarCheck, label: "Follow-ups", end: true, hasBadge: true },
  { to: "/customers/new", icon: Plus, label: "Tambah Customer", end: true, hasBadge: false },
];

const insightItems = [
  { to: "/weekly", icon: CalendarDays, label: "Mingguan", end: true },
  { to: "/monthly", icon: BarChart2, label: "Bulanan", end: true },
];

function NavItem({
  to, icon: Icon, label, end, badge, collapsed,
}: {
  to: string; icon: React.ElementType; label: string; end: boolean;
  badge?: number | null; collapsed: boolean;
}) {
  const inner = (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-xl transition-all duration-150 font-medium text-[13px]",
          collapsed ? "h-9 w-9 justify-center" : "px-3 py-2 w-full",
          isActive
            ? "bg-primary text-white shadow-sm"
            : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
        )
      }
    >
      <div className="relative shrink-0">
        <Icon className="h-[17px] w-[17px]" />
        {badge != null && badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5 leading-none">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs font-medium">{label}</TooltipContent>
      </Tooltip>
    );
  }
  return inner;
}

function SidebarContent({
  collapsed, onClose, overdueCount,
}: {
  collapsed: boolean; onClose?: () => void; overdueCount: number;
}) {
  const { signOut, user } = useAuth();
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "CR";

  return (
    <aside
      className={cn(
        "h-full bg-white border-r border-border flex flex-col transition-all duration-300",
        collapsed ? "w-[60px]" : "w-[210px]"
      )}
    >
      <div className={cn(
        "flex items-center border-b border-border shrink-0 h-14",
        collapsed ? "justify-center" : "px-4 gap-3"
      )}>
        <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-sm">
          <TrendingUp className="h-[15px] w-[15px] text-white" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight text-foreground">CRM Hub</p>
            <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">{user?.email}</p>
          </div>
        )}
        {onClose && !collapsed && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0 transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className={cn(
        "flex-1 py-4 overflow-y-auto",
        collapsed ? "px-[10px] flex flex-col items-center gap-1" : "px-3 space-y-0.5"
      )}>
        {!collapsed && (
          <p className="section-label px-2 mb-2.5">Menu</p>
        )}
        {mainItems.map((item) => (
          <NavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            end={item.end}
            badge={item.hasBadge ? overdueCount : null}
            collapsed={collapsed}
          />
        ))}

        {collapsed ? (
          <div className="my-3 w-7 border-t border-border" />
        ) : (
          <div className="pt-4 pb-2">
            <p className="section-label px-2">Insights</p>
          </div>
        )}

        {insightItems.map((item) => (
          <NavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            end={item.end}
            collapsed={collapsed}
          />
        ))}
      </nav>

      <div className={cn(
        "border-t border-border shrink-0",
        collapsed ? "py-3 flex flex-col items-center gap-1.5" : "px-3 py-3"
      )}>
        {collapsed ? (
          <>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center cursor-default">
                  <span className="text-xs font-bold text-primary">{initials}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">{user?.email}</TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={signOut}
                  className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <LogOut className="h-[16px] w-[16px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">Keluar</TooltipContent>
            </Tooltip>
          </>
        ) : (
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] text-muted-foreground hover:bg-muted/80 hover:text-foreground w-full transition-colors"
          >
            <LogOut className="h-[16px] w-[16px] shrink-0" />
            Keluar
          </button>
        )}
      </div>
    </aside>
  );
}

export default function AppSidebar({ collapsed, mobileOpen, onMobileClose }: AppSidebarProps) {
  const location = useLocation();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.interactions.stats(),
    refetchInterval: 60000,
  });

  const overdueCount = stats?.overdue ?? 0;

  useEffect(() => {
    onMobileClose();
  }, [location.pathname]);

  return (
    <>
      <div className="hidden md:block shrink-0 h-screen sticky top-0">
        <SidebarContent collapsed={collapsed} overdueCount={overdueCount} />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onMobileClose} />
          <div className="relative z-10 shadow-2xl">
            <SidebarContent collapsed={false} onClose={onMobileClose} overdueCount={overdueCount} />
          </div>
        </div>
      )}
    </>
  );
}
