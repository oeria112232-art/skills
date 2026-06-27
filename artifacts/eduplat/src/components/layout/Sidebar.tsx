import { Link, useLocation } from "wouter";
import { useAuth } from "./AuthContext";
import { useTheme } from "./ThemeContext";
import {
  LayoutDashboard, Briefcase, BookOpen, Award, Trophy,
  MessageSquare, Users, LogOut, Sun, Moon, Monitor,
  GraduationCap, ChevronRight, Menu, X
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const studentLinks = [
  { href: "/", icon: LayoutDashboard, label: "Home" },
  { href: "/jobs", icon: Briefcase, label: "Job Board" },
  { href: "/workshops", icon: BookOpen, label: "Workshops" },
  { href: "/learn", icon: GraduationCap, label: "Learning Paths" },
  { href: "/certificates", icon: Award, label: "Certificates" },
  { href: "/leaderboard", icon: Trophy, label: "Leaderboard" },
  { href: "/mock-interview", icon: MessageSquare, label: "Mock Interview" },
];

const adminLinks = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/jobs", icon: Briefcase, label: "Jobs" },
  { href: "/admin/applications", icon: Users, label: "Applications" },
  { href: "/admin/workshops", icon: BookOpen, label: "Workshops" },
  { href: "/admin/users", icon: Users, label: "Users" },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = user?.role === "admin" || user?.role === "instructor";

  const themeIcon = theme === "dark" ? Sun : theme === "light" ? Moon : Monitor;
  const ThemeIcon = themeIcon;
  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const linkClass = (href: string, isAdminAnchor = false) => {
    const exactRoot = href === "/" || href === "/admin";
    const active = exactRoot
      ? location === href
      : location.startsWith(href);
    return cn(
      "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
      active
        ? "bg-primary text-primary-foreground font-medium"
        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-5 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="font-bold text-lg text-sidebar-foreground">EduPlat</span>
      </div>

      {user && (
        <div className="px-4 py-3 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
              {user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-primary">{user.points}</p>
              <p className="text-xs text-muted-foreground">pts</p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {isAdmin && (
          <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Platform</p>
        )}
        {studentLinks.map(({ href, icon: Icon, label }) => {
          const exact = href === "/";
          const active = exact ? location === href : location.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              data-testid={`nav-link-${label.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
              {active && <ChevronRight className="w-3 h-3 ml-auto" />}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <p className="px-2 py-1.5 mt-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Admin</p>
            {adminLinks.map(({ href, icon: Icon, label }) => {
              const exact = href === "/admin";
              const active = exact ? location === href : location.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  data-testid={`admin-nav-link-${label.toLowerCase().replace(/\s+/g, "-")}`}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    active
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                  {active && <ChevronRight className="w-3 h-3 ml-auto" />}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="px-2 py-3 border-t border-sidebar-border space-y-0.5">
        <button
          onClick={cycleTheme}
          data-testid="button-toggle-theme"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent w-full transition-colors"
        >
          <ThemeIcon className="w-4 h-4" />
          {theme === "dark" ? "Dark mode" : theme === "light" ? "Light mode" : "System theme"}
        </button>
        <button
          onClick={logout}
          data-testid="button-logout"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        data-testid="button-mobile-menu"
        className="fixed top-4 left-4 z-50 p-2 rounded-md bg-card border border-border shadow-sm lg:hidden"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className="hidden lg:flex flex-col w-60 bg-sidebar border-r border-sidebar-border h-screen sticky top-0">
        <SidebarContent />
      </aside>

      <aside className={cn(
        "fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border z-50 transition-transform duration-300 lg:hidden",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <SidebarContent />
      </aside>
    </>
  );
}
