import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/layout/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  ShieldAlert, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Activity, 
  Search, 
  RefreshCw, 
  UserCheck, 
  Key, 
  Zap, 
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface AuditLogItem {
  id: number;
  action: string;
  userId: number | null;
  userName: string;
  userEmail: string;
  userRole: string;
  targetType: string | null;
  targetId: number | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

const PAGE_SECTIONS = [
  { id: "workshops", nameAr: "الورشات التدريبية", desc: "إغلاق تصفح والتسجيل بالورش التدريبية" },
  { id: "jobs", nameAr: "سوق الوظائف", desc: "إغلاق قائمة الوظائف والتقديم عليها" },
  { id: "consultations", nameAr: "قسم الاستشارات", desc: "إغلاق طلبات وإجابات الاستشارات" },
  { id: "certificates", nameAr: "نظام الشهادات", desc: "إغلاق فحص وإصدار الشهادات" },
  { id: "downloads", nameAr: "تنزيل التطبيق", desc: "إغلاق مسار تنزيل تطبيق الموبايل" },
];

export default function SecurityMonitorPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [lockedMap, setLockedMap] = useState<Record<string, boolean>>({});

  // Fetch Maintenance Status
  const { data: maintenanceData, refetch: refetchMaintenance } = useQuery({
    queryKey: ["maintenance-status"],
    queryFn: async () => {
      const res = await fetch("/api/system/maintenance");
      if (!res.ok) throw new Error("Failed to fetch maintenance status");
      return res.json();
    },
  });

  useEffect(() => {
    if (maintenanceData && Array.isArray(maintenanceData.lockedPages)) {
      const map: Record<string, boolean> = {};
      maintenanceData.lockedPages.forEach((p: string) => { map[p] = true; });
      setLockedMap(map);
    }
  }, [maintenanceData]);

  // Fetch Audit Logs Feed
  const { data: auditData, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ["security-audit-feed", page, search],
    queryFn: async () => {
      const res = await fetch(`/api/admin/security/audit-feed?page=${page}&limit=25&search=${encodeURIComponent(search)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!res.ok) throw new Error("Failed to fetch audit feed");
      return res.json();
    },
    refetchInterval: 5000, // Live polling every 5s
  });

  // Fetch Security Alerts
  const { data: alertsData, refetch: refetchAlerts } = useQuery({
    queryKey: ["security-alerts"],
    queryFn: async () => {
      const res = await fetch("/api/admin/security/alerts", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!res.ok) throw new Error("Failed to fetch security alerts");
      return res.json();
    },
    refetchInterval: 5000,
  });

  // Toggle Maintenance Mode Mutation
  const toggleMaintenance = useMutation({
    mutationFn: async ({ pageId, locked }: { pageId: string; locked: boolean }) => {
      const res = await fetch("/api/admin/maintenance/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ pageId, locked })
      });
      if (!res.ok) throw new Error("Failed to toggle maintenance mode");
      return res.json();
    },
    onSuccess: (data, vars) => {
      toast({
        title: vars.locked ? "تم إغلاق الصفحة للصيانة" : "تم فتح الصفحة للجمهور",
        description: `تم تغيير حالة قسم ${vars.pageId} بنجاح.`,
      });
      refetchMaintenance();
      refetchLogs();
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  });

  // Run Security Audit Mutation
  const runSecurityAudit = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/security-audit", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!res.ok) throw new Error("Failed to run security audit");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "تم التدقيق التشفيري بنجاح",
        description: `حالة النظام التشفيرية: ${data.status || "HEALTHY"}.`,
      });
    }
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-emerald-400" />
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">محطة المراقبة والأمان المركزية</h1>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-extrabold">
              Super Admin Control
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            مراقبة كل تحركات الحسابات والصلاحيات وإدارة وضع صيانة الصفحات وتنبيهات الأمان المباشرة.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => runSecurityAudit.mutate()}
            disabled={runSecurityAudit.isPending}
            className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-2 shadow-md"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>تشغيل فحص التشفير الأمني</span>
          </Button>
        </div>
      </div>

      {/* Security Alerts Summary */}
      {alertsData?.alerts && alertsData.alerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-extrabold text-foreground flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500 animate-bounce" />
            <span>التنبيهات الأمنية النشطة ({alertsData.alerts.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alertsData.alerts.map((alert: any) => (
              <div key={alert.id} className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-foreground">{alert.title}</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{alert.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Page Lockout & Maintenance Console */}
      <Card className="rounded-3xl border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/60 pb-4">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base font-black flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                لوحة التحكم بحالة صيانة الصفحات (Page Maintenance Console)
              </CardTitle>
              <CardDescription className="text-xs">
                إغلاق أي قسم في الموقع فوراً أمام المستخدمين مع إبقائه متاحاً للتجربة بحساب الأدمن الرئيسي.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PAGE_SECTIONS.map((sec) => {
              const isLocked = Boolean(lockedMap[sec.id]);
              return (
                <div 
                  key={sec.id} 
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                    isLocked ? "bg-amber-500/10 border-amber-500/40 shadow-sm" : "bg-card border-border/80"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-foreground">{sec.nameAr}</span>
                      <Badge variant={isLocked ? "destructive" : "secondary"} className="text-[10px] font-bold">
                        {isLocked ? "مغلق للصيانة" : "نشط للجمهور"}
                      </Badge>
                    </div>
                    <p className="text-[10.5px] text-muted-foreground leading-tight">{sec.desc}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-[10px] font-bold text-muted-foreground">تغيير الوضع:</span>
                    <Switch
                      checked={isLocked}
                      onCheckedChange={(checked) => {
                        setLockedMap(prev => ({ ...prev, [sec.id]: checked }));
                        toggleMaintenance.mutate({ pageId: sec.id, locked: checked });
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Live Audit Activity Stream */}
      <Card className="rounded-3xl border-border/80 shadow-sm">
        <CardHeader className="bg-muted/30 border-b border-border/60 pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-base font-black flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                سجل المراقبة والتحركات المباشرة (Live Audit Activity Stream)
              </CardTitle>
              <CardDescription className="text-xs">
                تسجيل كافة تحركات الحسابات والتغييرات الحساسة لحظة بلحظة.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute right-3 top-3 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث في السجلات..."
                  className="pr-8 rounded-xl h-9 text-xs"
                />
              </div>
              <Button size="icon" variant="outline" onClick={() => refetchLogs()} className="rounded-xl h-9 w-9">
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/60">
            {logsLoading ? (
              <div className="p-8 text-center text-xs text-muted-foreground font-bold">جاري تحميل سجلات الأمان...</div>
            ) : auditData?.logs?.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground font-bold">لا توجد سجلات مطابقة للبحث.</div>
            ) : (
              auditData?.logs?.map((log: AuditLogItem) => (
                <div key={log.id} className="p-4 hover:bg-muted/20 transition-colors flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px] font-bold bg-primary/5 border-primary/20">
                        {log.action}
                      </Badge>
                      <span className="text-xs font-black text-foreground">{log.userName}</span>
                      {log.userEmail && <span className="text-[10px] text-muted-foreground">({log.userEmail})</span>}
                      {log.userRole && (
                        <Badge variant="secondary" className="text-[9px] font-bold uppercase">
                          {log.userRole}
                        </Badge>
                      )}
                    </div>
                    {log.details && (
                      <p className="text-[11px] font-mono text-muted-foreground bg-muted/40 p-1.5 rounded-md inline-block max-w-xl truncate">
                        {log.details}
                      </p>
                    )}
                  </div>

                  <div className="text-left shrink-0 space-y-0.5">
                    <span className="text-[10px] font-bold text-muted-foreground block">
                      {new Date(log.createdAt).toLocaleString("ar-IQ")}
                    </span>
                    {log.ipAddress && (
                      <span className="text-[9.5px] font-mono text-slate-400 block">IP: {log.ipAddress}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
