import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, FolderKanban, ListChecks, Users, LogOut, CheckSquare } from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard" },
  { to: "/projects", label: "Projects", icon: FolderKanban, testId: "nav-projects" },
  { to: "/tasks", label: "My Tasks", icon: ListChecks, testId: "nav-tasks" },
];

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-white hidden md:flex md:flex-col">
        <div className="px-6 py-5 border-b border-border flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold text-lg leading-tight">TaskFlow</div>
            <div className="text-[11px] text-muted-foreground leading-tight">Team task manager</div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={item.testId}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/70 hover:bg-secondary hover:text-foreground"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
          {user?.role === "admin" && (
            <NavLink
              to="/team"
              data-testid="nav-team"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/70 hover:bg-secondary hover:text-foreground"
                }`
              }
            >
              <Users className="h-4 w-4" />
              Team
            </NavLink>
          )}
        </nav>

        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="h-9 w-9 rounded-full bg-secondary text-foreground flex items-center justify-center font-semibold">
              {user?.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate" data-testid="user-name">{user?.name}</div>
              <div className="text-xs text-muted-foreground truncate capitalize">{user?.role}</div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              data-testid="logout-btn"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        <div className="md:hidden border-b border-border bg-white px-4 py-3 flex items-center justify-between">
          <Link to="/dashboard" className="font-bold">TaskFlow</Link>
          <Button size="sm" variant="outline" onClick={handleLogout} data-testid="logout-btn-mobile">
            Logout
          </Button>
        </div>
        <div className="p-6 md:p-10 max-w-[1400px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
