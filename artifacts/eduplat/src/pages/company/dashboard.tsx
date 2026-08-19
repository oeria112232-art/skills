import { useQuery } from "@tanstack/react-query";
import { Users, Briefcase, BookOpen, Award, TrendingUp, Clock, CheckCircle, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/AppLayout";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/layout/LanguageContext";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  screening_passed: "bg-green-500/10 text-green-600 dark:text-green-400",
  screening_failed: "bg-red-500/10 text-red-600 dark:text-red-400",
  approved: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  rejected: "bg-gray-500/10 text-gray-500",
};

export default function CompanyDashboard() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  
  const { data: stats, isLoading } = useQuery<any>({
    queryKey: ["stats", "company"],
    queryFn: async () => {
      const response = await fetch("/api/stats/company", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("mharat-token")}`
        }
      });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    }
  });

  const statCards = stats ? [
    { 
      label: isAr ? "إجمالي الوظائف" : "Total Jobs", 
      value: stats.totalJobs, 
      icon: Briefcase, 
      color: "text-blue-500", 
      link: "/company/jobs" 
    },
    { 
      label: isAr ? "الوظائف المفتوحة" : "Open Jobs", 
      value: stats.openJobs, 
      icon: TrendingUp, 
      color: "text-green-500", 
      link: "/company/jobs" 
    },
    { 
      label: isAr ? "طلبات التقديم المعلقة" : "Pending Applications", 
      value: stats.pendingApplications, 
      sub: isAr ? `من إجمالي ${stats.totalApplications}` : `of ${stats.totalApplications} total`, 
      icon: Users, 
      color: "text-orange-500", 
      link: "/company/applications" 
    },
  ] : [];

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" data-testid="heading-admin-dashboard">
          {isAr ? "لوحة تحكم الشركة" : "Company Dashboard"}
        </h1>
        <p className="text-muted-foreground">
          {isAr ? "نظرة عامة على طلبات التوظيف والوظائف الشاغرة" : "Overview of job applications and vacancies"}
        </p>
      </div>

      {/* Stats cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {statCards.map(({ label, value, sub, icon: Icon, color, link }) => (
            <Link
              key={label}
              href={link}
              className="block p-5 rounded-xl border border-border bg-card hover:shadow-md hover:border-primary/30 transition-all"
              data-testid={`stat-card-${label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{label}</p>
                  <p className="text-3xl font-bold">{value?.toLocaleString()}</p>
                  {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
                </div>
                <Icon className={`w-8 h-8 ${color} opacity-80`} />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Recent applications */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold">{isAr ? "أحدث طلبات التقديم" : "Recent Applications"}</h2>
          <Link href="/company/applications" className="text-xs text-primary hover:underline" data-testid="link-view-all-applications">
            {isAr ? "عرض الكل" : "View all"}
          </Link>
        </div>
        {isLoading ? (
          <div className="p-4 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}</div>
        ) : !stats?.recentApplications || stats.recentApplications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
            {isAr ? "لا توجد طلبات تقديم حديثة" : "No recent applications"}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {stats.recentApplications.map((app: any) => (
              <div key={app.id} className="px-5 py-3 flex items-center justify-between gap-4" data-testid={`recent-app-${app.id}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{app.applicantName}</p>
                  <p className="text-xs text-muted-foreground truncate">{app.jobTitle || `Job #${app.jobId}`}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <Badge className={statusColors[app.status] || ""}>
                    {isAr 
                      ? (app.status === "pending" ? "معلق" 
                         : app.status === "screening_passed" ? "اجتاز الفحص" 
                         : app.status === "screening_failed" ? "لم يجتز الفحص" 
                         : app.status === "approved" ? "تمت الموافقة" 
                         : "مرفوض")
                      : app.status.replace("_", " ")
                    }
                  </Badge>
                  {app.screeningScore != null && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {isAr ? "النتيجة:" : "Score:"} {app.screeningScore}%
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
