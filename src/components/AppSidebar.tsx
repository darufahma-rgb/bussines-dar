import { LayoutDashboard, Users, CalendarCheck, LogOut, Plus, BarChart2, CalendarDays } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/customers", icon: Users, label: "Customers", end: false },
  { to: "/customers/new", icon: Plus, label: "Add Customer", end: true },
  { to: "/follow-ups", icon: CalendarCheck, label: "Follow-ups", end: true },
];

const insightItems = [
  { to: "/weekly", icon: CalendarDays, label: "Weekly", end: true },
  { to: "/monthly", icon: BarChart2, label: "Monthly", end: true },
];

export default function AppSidebar() {
  const { signOut, user } = useAuth();

  return (
    <aside className="w-56 min-h-screen bg-sidebar flex flex-col border-r border-sidebar-border">
      <div className="p-4 border-b border-sidebar-border">
        <h1 className="text-sidebar-primary font-semibold text-lg tracking-tight">CRM Hub</h1>
        <p className="text-xs text-sidebar-foreground mt-0.5 font-mono truncate">{user?.email}</p>
      </div>

      <nav className="flex-1 p-2 space-y-0.5">
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
            {item.label}
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
}
