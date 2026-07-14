import { useState } from "react";
import { useListApplications, useUpdateApplicationStatus, getListApplicationsQueryKey } from "@workspace/api-client-react";
import { Users, CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/components/layout/LanguageContext";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  screening_passed: "bg-green-500/10 text-green-600 dark:text-green-400",
  screening_failed: "bg-red-500/10 text-red-600 dark:text-red-400",
  approved: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  rejected: "bg-gray-500/10 text-gray-500",
};

export default function AdminApplicationsPage() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: applications, isLoading } = useListApplications(statusFilter !== "all" ? { status: statusFilter } : undefined);
  const updateStatus = useUpdateApplicationStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleStatusChange = async (id: number, status: string) => {
    await updateStatus.mutateAsync({ id, data: { status } });
    queryClient.invalidateQueries({ queryKey: getListApplicationsQueryKey() });
    toast({ title: `Application ${status}` });
  };

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1" data-testid="heading-admin-applications">
            {isAr ? "تتبع المتقدمين" : "Applicant Tracking"}
          </h1>
          <p className="text-muted-foreground">
            {isAr ? "مراجعة وإدارة طلبات التقديم للوظائف" : "Review and manage job applications"}
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="select-status-filter">
            <SelectValue placeholder={isAr ? "تصفية حسب الحالة" : "Filter by status"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? "كل الحالات" : "All Statuses"}</SelectItem>
            <SelectItem value="pending">{isAr ? "معلق" : "Pending"}</SelectItem>
            <SelectItem value="screening_passed">{isAr ? "اجتياز الفحص" : "Screening Passed"}</SelectItem>
            <SelectItem value="screening_failed">{isAr ? "فشل الفحص" : "Screening Failed"}</SelectItem>
            <SelectItem value="approved">{isAr ? "مقبول" : "Approved"}</SelectItem>
            <SelectItem value="rejected">{isAr ? "مرفوض" : "Rejected"}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full min-w-[650px]">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{isAr ? "المتقدم" : "Applicant"}</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">{isAr ? "المسمى الوظيفي" : "Position"}</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">{isAr ? "النتيجة" : "Score"}</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{isAr ? "الحالة" : "Status"}</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{isAr ? "الإجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!Array.isArray(applications) || applications.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-muted-foreground"><Users className="w-8 h-8 mx-auto mb-2 opacity-20" /><p>{isAr ? "لا توجد طلبات تقديم" : "No applications"}</p></td></tr>
              ) : applications.map(app => (
                <tr key={app.id} className="hover:bg-muted/30 transition-colors" data-testid={`application-row-${app.id}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-sm">{app.applicantName}</p>
                    <p className="text-xs text-muted-foreground">{app.applicantEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-sm hidden sm:table-cell">{app.jobTitle || `Job #${app.jobId}`}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {app.screeningScore != null ? (
                      <span className={`text-sm font-semibold ${app.screeningPassed ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {app.screeningPassed ? <CheckCircle className="w-4 h-4 inline mr-1" /> : <XCircle className="w-4 h-4 inline mr-1" />}
                        {app.screeningScore}%
                      </span>
                    ) : <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{isAr ? "معلق" : "Pending"}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={statusColors[app.status] || ""}>
                      {isAr 
                        ? (app.status === "pending" ? "معلق" 
                           : app.status === "screening_passed" ? "اجتياز الفحص" 
                           : app.status === "screening_failed" ? "فشل الفحص" 
                           : app.status === "approved" ? "مقبول" 
                           : "مرفوض")
                        : app.status.replace("_", " ")
                      }
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Select value={app.status} onValueChange={v => handleStatusChange(app.id, v)}>
                      <SelectTrigger className="h-8 w-28 text-xs" data-testid={`select-app-status-${app.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">{isAr ? "معلق" : "Pending"}</SelectItem>
                        <SelectItem value="approved">{isAr ? "موافقة" : "Approve"}</SelectItem>
                        <SelectItem value="rejected">{isAr ? "رفض" : "Reject"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
