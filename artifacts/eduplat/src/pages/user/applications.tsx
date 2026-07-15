import { useState } from "react";
import { useListApplications, useListJobs, getListApplicationsQueryKey } from "@workspace/api-client-react";
import { Briefcase, Clock, CheckCircle, XCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/components/layout/AuthContext";
import { useLanguage } from "@/components/layout/LanguageContext";
import { Link } from "wouter";

export default function UserApplicationsPage() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { user } = useAuth();
  const { data: applications, isLoading } = useListApplications({ userId: user?.id });
  const { data: jobs } = useListJobs();
  const appsList = Array.isArray(applications) ? applications : (applications && Array.isArray((applications as any).data) ? (applications as any).data : []);
  const jobsList = Array.isArray(jobs) ? jobs : (jobs && Array.isArray((jobs as any).data) ? (jobs as any).data : []);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending': return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">{isAr ? "قيد الانتظار" : "Pending"}</Badge>;
      case 'approved': return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">{isAr ? "مقبول" : "Approved"}</Badge>;
      case 'rejected': return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">{isAr ? "مرفوض" : "Rejected"}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {isAr ? "طلباتي" : "My Applications"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isAr ? "تتبع حالة طلبات التوظيف التي قدمت عليها" : "Track the status of your job applications"}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))
          ) : appsList.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-2xl">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-4">{isAr ? "لم تقم بالتقديم على أي وظيفة بعد" : "You haven't applied to any jobs yet"}</p>
              <Link href="/jobs">
                <Button>{isAr ? "تصفح الوظائف" : "Browse Jobs"}</Button>
              </Link>
            </div>
          ) : (
            appsList.map((app: any) => {
              const job = jobsList?.find((j: any) => j.id === app.jobId);
              return (
                <div key={app.id} className="group p-6 rounded-2xl border bg-card hover:shadow-xl hover:border-primary/50 transition-all duration-300 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 pr-4">
                      <h3 className="font-bold text-lg leading-tight mb-1 line-clamp-2">{job?.title || app.jobTitle || (isAr ? "وظيفة غير معروفة" : "Unknown Job")}</h3>
                      <p className="text-sm text-primary font-medium mb-3">{job?.company || (isAr ? "شركة غير معروفة" : "Unknown Company")}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(app.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t flex items-center justify-between">
                    <span className="text-sm font-semibold">{isAr ? "حالة الطلب:" : "Status:"}</span>
                    {getStatusBadge(app.status)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}
