import { Link, useLocation } from "wouter";
import { useAuth } from "./AuthContext";
import { useTheme } from "./ThemeContext";
import { useLanguage } from "./LanguageContext";
import {
  LayoutDashboard, Briefcase, BookOpen, Award, Trophy,
  MessageSquare, Users, LogOut, Sun, Moon, Monitor,
  GraduationCap, ChevronRight, Menu, X, Globe, FileText, LogIn,
  ChevronLeft, ChevronRight as ChevronRightIcon, Building2,
  Home, UserCircle, Settings, Wallet, ShieldCheck, Video
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { SkillsLogo } from "../shared/SkillsLogo";

const studentLinks = [
  { href: "/", icon: LayoutDashboard, label: "Home", arLabel: "الرئيسية" },
  { href: "/learn", icon: GraduationCap, label: "Learn", arLabel: "التعلم" },
  { href: "/workshops", icon: BookOpen, label: "Workshops", arLabel: "الورش" },
  { href: "/consultations", icon: MessageSquare, label: "Consultations", arLabel: "الاستشارات" },
  { href: "/certificates", icon: Award, label: "Certificates", arLabel: "الشهادات" },
  { href: "/jobs", icon: Briefcase, label: "Jobs", arLabel: "الوظائف" },
  { href: "/user/applications", icon: Briefcase, label: "My Applications", arLabel: "طلباتي" },
  { href: "/user/wallet", icon: Wallet, label: "My Wallet", arLabel: "المحفظة" },
  { href: "/leaderboard", icon: Trophy, label: "Leaderboard", arLabel: "المتصدرين" },
];

const adminLinks = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard", arLabel: "لوحة التحكم" },
  { href: "/admin/jobs", icon: Briefcase, label: "Jobs", arLabel: "الوظائف" },
  { href: "/admin/applications", icon: Users, label: "Applications", arLabel: "التقديمات" },
  { href: "/admin/workshops", icon: BookOpen, label: "Workshops", arLabel: "الورش" },
  { href: "/admin/streams", icon: Video, label: "Live Streaming", arLabel: "البث المباشر" },
  { href: "/admin/tracks", icon: GraduationCap, label: "Learning Tracks", arLabel: "المسارات التعليمية" },
  { href: "/admin/exams", icon: FileText, label: "Manage Exams", arLabel: "إدارة الاختبارات" },
  { href: "/admin/certificates", icon: Award, label: "Manage Certificates", arLabel: "الشهادات" },
  { href: "/admin/instructors", icon: GraduationCap, label: "Instructors", arLabel: "المعلمين" },
  { href: "/admin/companies", icon: Building2, label: "Companies", arLabel: "الشركات" },
  { href: "/admin/consultations", icon: MessageSquare, label: "Consultations", arLabel: "الاستشارات" },
  { href: "/admin/deposits", icon: Wallet, label: "Points Deposits", arLabel: "شحن النقاط" },
];

const companyLinks = [
  { href: "/company/dashboard", icon: LayoutDashboard, label: "Dashboard", arLabel: "لوحة التحكم" },
  { href: "/company/jobs", icon: Briefcase, label: "My Jobs", arLabel: "وظائفي" },
  { href: "/company/applications", icon: Users, label: "Applications", arLabel: "الطلبات" },
];

// Bottom nav items for mobile (most-used shortcuts)
const mobileBottomNavStudent = [
  { href: "/", icon: Home, label: "Home", arLabel: "الرئيسية" },
  { href: "/learn", icon: GraduationCap, label: "Learn", arLabel: "التعلم" },
  { href: "/workshops", icon: BookOpen, label: "Workshops", arLabel: "الورش" },
  { href: "/certificates", icon: Award, label: "Certs", arLabel: "شهاداتي" },
  { href: "/user/settings", icon: UserCircle, label: "Me", arLabel: "حسابي" },
];

const mobileBottomNavAdmin = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard", arLabel: "التحكم" },
  { href: "/admin/workshops", icon: BookOpen, label: "Workshops", arLabel: "الورش" },
  { href: "/admin/tracks", icon: GraduationCap, label: "Tracks", arLabel: "المسارات" },
  { href: "/admin/certificates", icon: Award, label: "Certs", arLabel: "الشهادات" },
  { href: "/user/settings", icon: UserCircle, label: "Me", arLabel: "حسابي" },
];

const mobileBottomNavCompany = [
  { href: "/company/dashboard", icon: LayoutDashboard, label: "Dashboard", arLabel: "التحكم" },
  { href: "/company/jobs", icon: Briefcase, label: "Jobs", arLabel: "وظائفي" },
  { href: "/company/applications", icon: Users, label: "Apps", arLabel: "الطلبات" },
  { href: "/user/settings", icon: UserCircle, label: "Me", arLabel: "حسابي" },
];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isAdmin = user?.role === "admin" || user?.role === "instructor";
  const isCompany = user?.role === "company";
  const isAr = language === "ar";

  const themeIcon = theme === "dark" ? Sun : theme === "light" ? Moon : Monitor;
  const ThemeIcon = themeIcon;
  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const handleNavClick = () => {
    setMobileOpen(false);
    setCollapsed(true);
  };

  const mobileBottomLinks = isAdmin
    ? mobileBottomNavAdmin
    : isCompany
      ? mobileBottomNavCompany
      : mobileBottomNavStudent;

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar/80 backdrop-blur-md">
      <div className="flex items-center justify-between gap-2.5 px-4 py-5 border-b border-sidebar-border/50">
        {/* Logo and Title: Desktop Only */}
        <div className="hidden lg:flex items-center gap-2.5 min-w-0">
          <SkillsLogo className="h-8 w-8" />
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-lg leading-tight truncate text-foreground tracking-tight">Mharat</span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{isAr ? "منصة تعليمية" : "Edu Platform"}</span>
          </div>
        </div>
        {/* Mobile Header Title instead of duplicate logo */}
        <span className="lg:hidden font-extrabold text-sm text-foreground tracking-wide">{isAr ? "القائمة الرئيسية" : "Main Menu"}</span>
        
        <button
          onClick={() => {
            setCollapsed(true);
            setMobileOpen(false);
          }}
          className="p-1.5 rounded-lg hover:bg-sidebar-accent/50 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title={isAr ? "إخفاء القائمة الجانبية" : "Hide Sidebar"}
        >
          {isAr ? <ChevronRight className="h-4.5 w-4.5" /> : <ChevronLeft className="h-4.5 w-4.5" />}
        </button>
      </div>

      {user ? (
        <div className="px-4 py-4 border-b border-sidebar-border/40 bg-card/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden relative">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary font-bold text-sm">
                  {user.name?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-primary/10 text-primary dark:text-emerald-400 capitalize">
                {isAr
                  ? (user.role === "admin" ? "مسؤول" : user.role === "instructor" ? "معلم" : user.role === "company" ? "شركة" : "طالب")
                  : user.role}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 py-4 border-b border-sidebar-border/50 bg-gradient-to-b from-primary/5 to-transparent">
          <Link href="/auth">
            <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-md shadow-primary/10 hover:bg-primary/95 transition-all">
              <LogIn className="w-4 h-4" />
              <span>{isAr ? "تسجيل الدخول" : "Sign In"}</span>
            </button>
          </Link>
        </div>
      )}

      <div className="px-4 py-2 border-b border-sidebar-border/40 bg-muted/20">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-[10px] font-bold bg-card border border-sidebar-border/50 text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors flex-1"
          >
            <Globe className="w-3.5 h-3.5 text-primary" />
            <span>{isAr ? "English" : "العربية"}</span>
          </button>
          <button
            onClick={cycleTheme}
            data-testid="button-toggle-theme"
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-[10px] font-bold bg-card border border-sidebar-border/50 text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors flex-1"
          >
            <ThemeIcon className="w-3.5 h-3.5 text-primary" />
            <span>
              {theme === "dark" ? (isAr ? "داكن" : "Dark") : theme === "light" ? (isAr ? "فاتح" : "Light") : (isAr ? "تلقائي" : "System")}
            </span>
          </button>
        </div>
      </div>

      <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto">
        {(isAdmin || isCompany) && (
          <p className="px-2.5 py-1 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{isAr ? "الطلاب" : "STUDENTS"}</p>
        )}
        {studentLinks.map(({ href, icon: Icon, label, arLabel }) => {
          const exact = href === "/";
          const active = exact ? location === href : location.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              data-testid={`nav-link-${label.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={handleNavClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group relative",
                active
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm shadow-primary/20"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className={cn("w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110", active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
              <div className="flex-1 flex items-center justify-between min-w-0">
                <span className="truncate">{isAr ? arLabel : label}</span>
              </div>
              {active && <ChevronRight className="w-3.5 h-3.5 text-primary-foreground" />}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <p className="px-2.5 py-1 mt-4 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{isAr ? "الإدارة" : "ADMINISTRATION"}</p>
            {adminLinks
              .filter(link => {
                if (user?.role === "admin") return true;
                if (user?.role === "instructor") {
                   const pageId = link.href === "/admin" ? "dashboard" : link.href.split("/admin/")[1];
                   return user.allowedPages?.includes(pageId) || pageId === "dashboard";
                }
                return false;
              })
              .map(({ href, icon: Icon, label, arLabel }) => {
              const exact = href === "/admin";
              const active = exact ? location === href : location.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  data-testid={`admin-nav-link-${label.toLowerCase().replace(/\s+/g, "-")}`}
                  onClick={handleNavClick}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group",
                    active
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm shadow-primary/20"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-primary-foreground" : "text-muted-foreground")} />
                  <div className="flex-1 flex items-center justify-between min-w-0">
                    <span className="truncate">{isAr ? arLabel : label}</span>
                  </div>
                  {active && <ChevronRight className="w-3.5 h-3.5 text-primary-foreground" />}
                </Link>
              );
            })}
          </>
        )}

        {isCompany && (
          <>
            <p className="px-2.5 py-1 mt-4 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{isAr ? "الشركة" : "COMPANY"}</p>
            {companyLinks.map(({ href, icon: Icon, label, arLabel }) => {
              const exact = href === "/company/dashboard";
              const active = exact ? location === href : location.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={handleNavClick}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group",
                    active
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm shadow-primary/20"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-primary-foreground" : "text-muted-foreground")} />
                  <div className="flex-1 flex items-center justify-between min-w-0">
                    <span className="truncate">{isAr ? arLabel : label}</span>
                  </div>
                  {active && <ChevronRight className="w-3.5 h-3.5 text-primary-foreground" />}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="px-2.5 py-4 border-t border-sidebar-border/50">
        <Link href={user ? "/user/settings" : "/auth"}>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 group cursor-pointer mb-2">
            <Users className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            <span className="flex-1 truncate">{isAr ? "حسابي" : "My Account"}</span>
          </div>
        </Link>
        {user && (
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-all duration-200 group"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left truncate">{isAr ? "تسجيل الخروج" : "Log out"}</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {isDesktop ? (
        /* Desktop Sidebar: Only rendered on desktop screen widths */
        <div className={cn(
          "shrink-0 transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] border-sidebar-border/50",
          collapsed ? "w-0 min-w-0 border-none overflow-hidden" : "w-72 min-w-72 border-r"
        )}>
          <SidebarContent />
        </div>
      ) : (
        /* Mobile Layout: Only rendered on mobile/tablet screen widths */
        <>
          {/* Mobile Top Bar */}
          <div className="fixed top-0 left-0 right-0 h-16 border-b bg-background/90 backdrop-blur-md z-40 flex items-center justify-between px-4 shadow-sm">
            <div className="flex items-center gap-3">
              <SkillsLogo className="h-8 w-8" />
              <span className="font-bold text-lg text-foreground tracking-tight">Mharat</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={cycleTheme}
                className="p-2 rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
              >
                <ThemeIcon className="h-4.5 w-4.5" />
              </button>
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="p-2 rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors active:scale-95"
                aria-label="Menu"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Drawer Backdrop */}
          {mobileOpen && (
            <div
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 animate-in fade-in duration-200"
              onClick={() => setMobileOpen(false)}
            />
          )}

          {/* Mobile Drawer */}
          <aside className={cn(
            "fixed inset-y-0 z-50 w-72 bg-sidebar border-sidebar-border/50 transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
            isAr ? "right-0 border-l" : "left-0 border-r",
            mobileOpen 
              ? "translate-x-0 shadow-2xl opacity-100 visible" 
              : isAr 
                ? "translate-x-full opacity-0 invisible pointer-events-none" 
                : "-translate-x-full opacity-0 invisible pointer-events-none"
          )}>
            <SidebarContent />
          </aside>

          {/* Mobile Bottom Navigation Bar */}
          <nav className={cn(
            "fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/60 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] transition-all duration-300",
            mobileOpen ? "opacity-0 pointer-events-none translate-y-full" : "opacity-100 translate-y-0"
          )}>
            <div className="flex items-center justify-around px-2 py-2 safe-area-bottom">
              {mobileBottomLinks.map(({ href, icon: Icon, label, arLabel }) => {
                const exact = href === "/" || href === "/admin" || href === "/company/dashboard";
                const active = exact ? location === href : location.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl min-w-[52px] transition-all duration-200 active:scale-90",
                      active
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className={cn(
                      "p-1.5 rounded-xl transition-all duration-200",
                      active ? "bg-primary/10" : ""
                    )}>
                      <Icon className={cn("w-5 h-5", active ? "text-primary" : "")} />
                    </div>
                    <span className={cn(
                      "text-[9px] font-bold leading-none",
                      active ? "text-primary" : "text-muted-foreground"
                    )}>
                      {isAr ? arLabel : label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </>
      )}
    </>
  );
}
