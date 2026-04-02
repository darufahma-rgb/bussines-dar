import {
  LayoutDashboard, Users, CalendarCheck, LogOut, Plus,
  BarChart2, CalendarDays, Kanban, X, CalendarRange, Sparkles, UserCircle, FileUp,
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

const navSections = [
  {
    label: "Utama",
    items: [
      { to: "/", icon: LayoutDashboard, label: "Dasbor", end: true, hasBadge: false },
    ],
  },
  {
    label: "Customer",
    items: [
      { to: "/customers", icon: Users, label: "Daftar Customer", end: false, hasBadge: false },
      { to: "/pipeline", icon: Kanban, label: "Pipeline", end: true, hasBadge: false },
      { to: "/follow-ups", icon: CalendarCheck, label: "Follow-ups", end: true, hasBadge: true },
      { to: "/customers/new", icon: Plus, label: "Tambah Customer", end: true, hasBadge: false },
      { to: "/import", icon: FileUp, label: "Import Customer", end: true, hasBadge: false },
    ],
  },
  {
    label: "AI & Tools",
    items: [
      { to: "/chat", icon: Sparkles, label: "Chat AI", end: true, hasBadge: false },
    ],
  },
  {
    label: "Laporan",
    items: [
      { to: "/weekly", icon: CalendarDays, label: "Mingguan", end: true, hasBadge: false },
      { to: "/monthly", icon: BarChart2, label: "Bulanan", end: true, hasBadge: false },
      { to: "/yearly", icon: CalendarRange, label: "Tahunan", end: true, hasBadge: false },
    ],
  },
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
  const initials = (user?.name || user?.email || "CR").slice(0, 2).toUpperCase();
  const avatarUrl = user?.avatar ? `/uploads/${user.avatar}` : null;

  return (
    <aside
      className={cn(
        "h-full bg-white border-r border-border flex flex-col transition-all duration-300",
        collapsed ? "w-[60px]" : "w-[210px]"
      )}
    >
      {/* Brand header */}
      <div className={cn(
        "flex items-center border-b border-border shrink-0 h-14",
        collapsed ? "justify-center" : "px-4 gap-3"
      )}>
        <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
          <img src="/darcia-logo.png" alt="Darcia" className="h-5 w-5 object-contain" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight text-foreground">Darcia Business Hub</p>
            <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">{user?.email}</p>
          </div>
        )}
        {onClose && !collapsed && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0 transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav sections */}
      <nav className={cn(
        "flex-1 py-3 overflow-y-auto",
        collapsed ? "px-[10px] flex flex-col items-center gap-0.5" : "px-3"
      )}>
        {collapsed ? (
          /* Collapsed: flat icon list with dividers between sections */
          <>
            {navSections.map((section, si) => (
              <div key={section.label} className={cn("flex flex-col items-center gap-0.5", si > 0 && "mt-1")}>
                {si > 0 && <div className="my-2 w-7 border-t border-border" />}
                {section.items.map((item) => (
                  <NavItem
                    key={item.to}
                    to={item.to}
                    icon={item.icon}
                    label={item.label}
                    end={item.end}
                    badge={item.hasBadge ? overdueCount : null}
                    collapsed={true}
                  />
                ))}
              </div>
            ))}
          </>
        ) : (
          /* Expanded: sections with category labels */
          <div className="space-y-4">
            {navSections.map((section) => (
              <div key={section.label}>
                <p className="section-label px-2 mb-1.5">{section.label}</p>
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <NavItem
                      key={item.to}
                      to={item.to}
                      icon={item.icon}
                      label={item.label}
                      end={item.end}
                      badge={item.hasBadge ? overdueCount : null}
                      collapsed={false}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* Bottom: Profile + Logout */}
      <div className={cn(
        "border-t border-border shrink-0",
        collapsed ? "py-3 flex flex-col items-center gap-1.5" : "px-3 py-3 space-y-0.5"
      )}>
        {collapsed ? (
          <>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <NavLink to="/profile" className={({ isActive }) => cn(
                  "h-8 w-8 rounded-xl flex items-center justify-center transition-colors overflow-hidden",
                  isActive ? "bg-primary text-white" : "bg-primary/10 text-primary hover:bg-primary/20"
                )}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    : <span className="text-xs font-bold">{initials}</span>}
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">Profil · {user?.email}</TooltipContent>
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
          <>
            <p className="section-label px-2 mb-1.5">Akun</p>
            <NavLink
              to="/profile"
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] w-full transition-colors",
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              <div className="h-[18px] w-[18px] rounded-md overflow-hidden bg-primary/10 flex items-center justify-center shrink-0">
                {avatarUrl
                  ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  : <span className="text-[9px] font-bold text-primary">{initials}</span>}
              </div>
              <span className="truncate">{user?.name || "Profil Saya"}</span>
            </NavLink>
            <button
              onClick={signOut}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] text-muted-foreground hover:bg-muted/80 hover:text-foreground w-full transition-colors"
            >
              <LogOut className="h-[16px] w-[16px] shrink-0" />
              Keluar
            </button>
          </>
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
