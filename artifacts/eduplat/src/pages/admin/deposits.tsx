import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLanguage } from "@/components/layout/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useListDepositRequests,
  useApproveDepositRequest,
  useRejectDepositRequest,
  getListDepositRequestsQueryKey,
} from "@workspace/api-client-react";

// ========================
// TYPES
// ========================
interface DiscountCode {
  id: number;
  code: string;
  discountType: "percent" | "fixed_points";
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  description: string;
  createdAt: string;
}

interface PaymentMethod {
  id: number;
  name: string;
  accountName: string;
  accountNumber: string;
  icon: string;
  instructions: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

interface PlatformSetting {
  key: string;
  value: string;
  label: string;
}

interface Analytics {
  overview: {
    totalPointsSold: number;
    totalRevenueDollars: string;
    totalConsultations: number;
    totalPointsEarned: number;
    totalTransfers: number;
    totalUsersWithPoints: number;
    totalPointsInCirculation: number;
    pendingDeposits: number;
    approvedDeposits: number;
    rejectedDeposits: number;
  };
  dailyStats: { date: string; points: number; revenue: number }[];
}

// ========================
// API HELPERS
// ========================
async function adminFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem("mharat-token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const r = await fetch(`/api${path}`, {
    headers: { ...headers, ...options?.headers },
    ...options,
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: r.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return r.json();
}

// ========================
// MAIN COMPONENT
// ========================
export default function AdminPointsDashboard() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isAr = language === "ar";
  const [activeTab, setActiveTab] = useState<"deposits" | "codes" | "payments" | "settings" | "analytics">("deposits");

  // ── Deposit Requests ──────────────────────────────────────────
  const { data: requests, isLoading: reqLoading, refetch: refetchReqs } = useListDepositRequests();
  const approveMutation = useApproveDepositRequest();
  const rejectMutation = useRejectDepositRequest();
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [actingRequestId, setActingRequestId] = useState<number | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const filteredRequests = (requests || []).filter((r: any) => {
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || [r.userName, r.userEmail, String(r.pointsAmount), r.cashAmount].join(" ").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  async function handleApprove(id: number) {
    try {
      await approveMutation.mutateAsync({ id, data: { adminNotes } });
      qc.invalidateQueries({ queryKey: getListDepositRequestsQueryKey() });
      toast({ title: "تم قبول الطلب وشحن النقاط" });
      setActingRequestId(null); setAdminNotes("");
    } catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
  }
  async function handleReject(id: number) {
    if (!adminNotes.trim()) { toast({ title: "يجب كتابة سبب الرفض", variant: "destructive" }); return; }
    try {
      await rejectMutation.mutateAsync({ id, data: { adminNotes } });
      qc.invalidateQueries({ queryKey: getListDepositRequestsQueryKey() });
      toast({ title: "تم رفض الطلب" });
      setActingRequestId(null); setAdminNotes("");
    } catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
  }

  // ── Discount Codes ────────────────────────────────────────────
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [showCodeForm, setShowCodeForm] = useState(false);
  const [newCode, setNewCode] = useState({ code: "", discountType: "percent", discountValue: "20", maxUses: "", expiresAt: "", description: "" });

  async function loadCodes() {
    setCodesLoading(true);
    try { setCodes(await adminFetch("/admin/discount-codes")); }
    catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
    finally { setCodesLoading(false); }
  }

  async function handleCreateCode() {
    try {
      await adminFetch("/admin/discount-codes", { method: "POST", body: JSON.stringify({ ...newCode, maxUses: newCode.maxUses || null, expiresAt: newCode.expiresAt || null }) });
      toast({ title: "تم إنشاء الكود بنجاح" });
      setShowCodeForm(false);
      setNewCode({ code: "", discountType: "percent", discountValue: "20", maxUses: "", expiresAt: "", description: "" });
      loadCodes();
    } catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
  }

  async function toggleCode(id: number, current: boolean) {
    try {
      await adminFetch(`/admin/discount-codes/${id}`, { method: "PATCH", body: JSON.stringify({ isActive: !current }) });
      loadCodes();
    } catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
  }

  async function deleteCode(id: number) {
    if (!confirm("هل أنت متأكد من حذف هذا الكود؟")) return;
    try {
      await adminFetch(`/admin/discount-codes/${id}`, { method: "DELETE" });
      toast({ title: "تم حذف الكود" });
      loadCodes();
    } catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
  }

  // ── Payment Methods ───────────────────────────────────────────
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [methodsLoading, setMethodsLoading] = useState(false);
  const [showMethodForm, setShowMethodForm] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [newMethod, setNewMethod] = useState({ name: "", accountName: "", accountNumber: "", icon: "", instructions: "", sortOrder: "0" });

  async function loadMethods() {
    setMethodsLoading(true);
    try { setMethods(await adminFetch("/admin/payment-methods")); }
    catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
    finally { setMethodsLoading(false); }
  }

  async function handleSaveMethod() {
    try {
      if (editingMethod) {
        await adminFetch(`/admin/payment-methods/${editingMethod.id}`, { method: "PATCH", body: JSON.stringify(newMethod) });
        toast({ title: "تم تحديث طريقة الدفع" });
      } else {
        await adminFetch("/admin/payment-methods", { method: "POST", body: JSON.stringify(newMethod) });
        toast({ title: "تم إضافة طريقة الدفع" });
      }
      setShowMethodForm(false); setEditingMethod(null);
      setNewMethod({ name: "", accountName: "", accountNumber: "", icon: "", instructions: "", sortOrder: "0" });
      loadMethods();
    } catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
  }

  async function toggleMethod(id: number, current: boolean) {
    try {
      await adminFetch(`/admin/payment-methods/${id}`, { method: "PATCH", body: JSON.stringify({ isActive: !current }) });
      loadMethods();
    } catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
  }

  async function deleteMethod(id: number) {
    if (!confirm("حذف طريقة الدفع هذه؟")) return;
    try {
      await adminFetch(`/admin/payment-methods/${id}`, { method: "DELETE" });
      toast({ title: "تم حذف طريقة الدفع" });
      loadMethods();
    } catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
  }

  function openEditMethod(m: PaymentMethod) {
    setEditingMethod(m);
    setNewMethod({ name: m.name, accountName: m.accountName, accountNumber: m.accountNumber, icon: m.icon || "", instructions: m.instructions || "", sortOrder: String(m.sortOrder || 0) });
    setShowMethodForm(true);
  }

  // ── Platform Settings ─────────────────────────────────────────
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsEdits, setSettingsEdits] = useState<Record<string, string>>({});

  async function loadSettings() {
    setSettingsLoading(true);
    try {
      const data: PlatformSetting[] = await adminFetch("/admin/platform-settings");
      setSettings(data);
      const map: Record<string, string> = {};
      data.forEach(s => { map[s.key] = s.value; });
      setSettingsEdits(map);
    } catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
    finally { setSettingsLoading(false); }
  }

  async function saveSettings() {
    try {
      const payload = Object.entries(settingsEdits).map(([key, value]) => ({ key, value }));
      await adminFetch("/admin/platform-settings", { method: "POST", body: JSON.stringify({ settings: payload }) });
      toast({ title: "تم حفظ الإعدادات" });
      loadSettings();
    } catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
  }

  // ── Analytics ─────────────────────────────────────────────────
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  async function loadAnalytics() {
    setAnalyticsLoading(true);
    try { setAnalytics(await adminFetch("/admin/analytics")); }
    catch (e: any) { toast({ title: e.message, variant: "destructive" }); }
    finally { setAnalyticsLoading(false); }
  }

  useEffect(() => {
    if (activeTab === "codes") loadCodes();
    else if (activeTab === "payments") loadMethods();
    else if (activeTab === "settings") loadSettings();
    else if (activeTab === "analytics") loadAnalytics();
  }, [activeTab]);

  // ========================
  // RENDER
  // ========================
  const tabs = [
    { id: "deposits", label: "طلبات الشحن", badge: (requests || []).filter((r: any) => r.status === "pending").length },
    { id: "codes", label: "كودات الخصم", badge: 0 },
    { id: "payments", label: "طرق الدفع", badge: 0 },
    { id: "settings", label: "الإعدادات", badge: 0 },
    { id: "analytics", label: "التحليلات", badge: 0 },
  ] as const;

  return (
    <AppLayout>
      <div className="text-start">
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold px-3 py-0.5 rounded-full text-[10px]">
                {isAr ? "بوابة الإدارة والتحكم" : "Management Control Room"}
              </Badge>
            </div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
              {isAr ? "لوحة تحكم النقاط" : "Points Control Center"}
            </h1>
            <p className="text-sm text-muted-foreground font-medium mt-1">
              {isAr 
                ? "إدارة المحافظ • كودات الخصم • طرق الدفع • الإعدادات العامة • التحليلات"
                : "Manage deposits, promo codes, payment methods, config, and stats"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {analytics && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2 text-center">
                <span className="text-emerald-600 dark:text-emerald-400 text-lg font-bold block">${analytics.overview.totalRevenueDollars}</span>
                <span className="text-[10px] text-muted-foreground font-bold block">{isAr ? "إجمالي الإيرادات" : "Total Revenue"}</span>
              </div>
            )}
            <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-2 text-center">
              <span className="text-primary text-lg font-bold block">{(requests || []).filter((r: any) => r.status === "pending").length}</span>
              <span className="text-[10px] text-muted-foreground font-bold block">{isAr ? "طلب معلق" : "Pending"}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
          {tabs.map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap snap-start shrink-0 relative ${
                activeTab === tab.id 
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/10" 
                  : "bg-card border border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent/40"
              }`}
            >
              {tab.label}
              {tab.badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full text-[9px] font-black w-4.5 h-4.5 flex items-center justify-center shadow-sm">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeTab} 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }} 
              transition={{ duration: 0.2 }}
            >
              {/* ═══ TAB: DEPOSIT REQUESTS ═══ */}
              {activeTab === "deposits" && (
                <div className="space-y-4">
                  <div className="flex gap-3 mb-6 flex-wrap">
                    <input 
                      placeholder="بحث باسم الطالب أو الإيميل..." 
                      value={searchQuery} 
                      onChange={e => setSearchQuery(e.target.value)}
                      className="flex-1 min-w-[200px] bg-card border border-border/60 rounded-xl px-4 py-2 text-xs text-foreground font-semibold placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary"
                    />
                    <select 
                      value={filterStatus} 
                      onChange={e => setFilterStatus(e.target.value)}
                      className="bg-card border border-border/60 rounded-xl px-4 py-2 text-xs text-foreground font-bold focus:outline-none focus:border-primary cursor-pointer"
                    >
                      <option value="all">{isAr ? "كل الحالات" : "All Statuses"}</option>
                      <option value="pending">{isAr ? "معلق" : "Pending"}</option>
                      <option value="approved">{isAr ? "مقبول" : "Approved"}</option>
                      <option value="rejected">{isAr ? "مرفوض" : "Rejected"}</option>
                    </select>
                    <Button onClick={() => refetchReqs()} variant="outline" className="rounded-xl h-9.5 text-xs font-bold gap-2">
                      {isAr ? "تحديث" : "Refresh"}
                    </Button>
                  </div>

                  {reqLoading ? (
                    <div className="text-center py-20 text-muted-foreground font-semibold">{isAr ? "جاري تحميل الطلبات..." : "Loading requests..."}</div>
                  ) : filteredRequests.length === 0 ? (
                    <div className="text-center py-20 rounded-2xl border border-dashed border-border/60 bg-card/30 max-w-md mx-auto">
                      <h4 className="font-extrabold text-base">{isAr ? "لا توجد طلبات مطابقة" : "No requests found"}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{isAr ? "لم نعثر على أي طلب شحن للفلتر المحدد." : "Try changing filters or query."}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {filteredRequests.map((req: any) => (
                        <motion.div 
                          key={req.id} 
                          initial={{ opacity: 0, x: -10 }} 
                          animate={{ opacity: 1, x: 0 }}
                          className={`rounded-2xl border p-5 bg-card flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:border-primary/30 ${
                            req.status === "pending" 
                              ? "border-amber-500/30 bg-amber-500/[0.02]" 
                              : req.status === "approved" 
                                ? "border-emerald-500/20 bg-emerald-500/[0.01]" 
                                : "border-destructive/20"
                          }`}
                        >
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xs font-black">
                                {(req.userName || "U")[0].toUpperCase()}
                              </div>
                              <div>
                                <h4 className="text-xs font-extrabold text-foreground">{req.userName}</h4>
                                <span className="text-[10px] text-muted-foreground font-semibold block">{req.userEmail}</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2.5">
                              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold px-2 py-0.5 rounded-lg text-[10.5px]">
                                {req.pointsAmount} {isAr ? "نقطة" : "pts"}
                              </Badge>
                              <Badge variant="outline" className="bg-accent text-foreground border-border/80 font-bold px-2 py-0.5 rounded-lg text-[10.5px]">
                                {req.cashAmount}
                              </Badge>
                              <Badge 
                                variant="outline" 
                                className={`font-bold px-2 py-0.5 rounded-lg text-[10px] ${
                                  req.status === "pending" 
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" 
                                    : req.status === "approved" 
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                                      : "bg-destructive/10 text-destructive border-destructive/20"
                                }`}
                              >
                                {req.status === "pending" ? (isAr ? "معلق" : "Pending") : req.status === "approved" ? (isAr ? "مقبول" : "Approved") : (isAr ? "مرفوض" : "Rejected")}
                              </Badge>
                            </div>

                            {req.notes && (
                              <p className="text-[11px] text-muted-foreground font-medium bg-accent/40 px-3 py-1.5 rounded-lg inline-block">
                                {isAr ? "ملاحظات الطالب:" : "Student notes:"} {req.notes}
                              </p>
                            )}
                            {req.adminNotes && (
                              <p className="text-[11px] text-primary font-bold block">
                                {isAr ? "رد الإدارة:" : "Admin note:"} {req.adminNotes}
                              </p>
                            )}
                            <span className="text-[9.5px] text-muted-foreground/80 block font-semibold">
                              {new Date(req.createdAt).toLocaleString(isAr ? "ar-EG" : "en-US")}
                            </span>
                          </div>

                          <div className="flex gap-2 shrink-0 w-full md:w-auto">
                            {req.transferScreenshot && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setSelectedScreenshot(req.transferScreenshot)} 
                                className="flex-1 md:flex-none rounded-xl text-xs font-bold"
                              >
                                {isAr ? "إيصال التحويل" : "Proof"}
                              </Button>
                            )}
                            {req.status === "pending" && (
                              <Button 
                                onClick={() => setActingRequestId(req.id)} 
                                className="flex-1 md:flex-none rounded-xl text-xs font-bold"
                              >
                                {isAr ? "اتخاذ قرار" : "Review"}
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ TAB: DISCOUNT CODES ═══ */}
              {activeTab === "codes" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-border/50">
                    <div>
                      <h2 className="text-lg font-extrabold text-foreground">{isAr ? "كودات الخصم والترويج" : "Promo Codes"}</h2>
                      <p className="text-xs text-muted-foreground font-semibold mt-1">{isAr ? "أنشئ وأوقف كوبونات التخفيض للطلاب عند تقديم الاستشارات" : "Manage point discount codes for consultation orders"}</p>
                    </div>
                    <Button onClick={() => setShowCodeForm(!showCodeForm)} className="rounded-xl font-bold text-xs gap-1.5">
                      {showCodeForm ? "✕" : ""} {isAr ? "كود جديد" : "New Code"}
                    </Button>
                  </div>

                  {showCodeForm && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-card border border-border/60 rounded-2xl p-5 md:p-6 space-y-4"
                    >
                      <h3 className="text-xs font-extrabold text-foreground">{isAr ? "إنشاء كود خصم جديد" : "Create promo code"}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-[11px] font-bold text-muted-foreground block mb-1.5">{isAr ? "الكود الترويجي *" : "Code Name *"}</label>
                          <input 
                            value={newCode.code} 
                            onChange={e => setNewCode({...newCode, code: e.target.value.toUpperCase()})} 
                            placeholder="WELCOME20"
                            className="w-full bg-background border border-border/60 rounded-xl px-3 py-2 text-xs text-foreground font-bold focus:outline-none focus:border-primary uppercase"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-muted-foreground block mb-1.5">{isAr ? "نوع الخصم" : "Discount Type"}</label>
                          <select 
                            value={newCode.discountType} 
                            onChange={e => setNewCode({...newCode, discountType: e.target.value})}
                            className="w-full bg-background border border-border/60 rounded-xl px-3 py-2 text-xs text-foreground font-bold focus:outline-none focus:border-primary"
                          >
                            <option value="percent">{isAr ? "نسبة مئوية (%)" : "Percent (%)"}</option>
                            <option value="fixed_points">{isAr ? "نقاط ثابتة" : "Fixed Points"}</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-muted-foreground block mb-1.5">{isAr ? "قيمة الخصم *" : "Discount Value *"}</label>
                          <input 
                            type="number" 
                            value={newCode.discountValue} 
                            onChange={e => setNewCode({...newCode, discountValue: e.target.value})} 
                            placeholder="20"
                            className="w-full bg-background border border-border/60 rounded-xl px-3 py-2 text-xs text-foreground font-bold focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-muted-foreground block mb-1.5">{isAr ? "الحد الأقصى للاستخدام (فارغ = لا نهائي)" : "Max Uses (blank = unlimited)"}</label>
                          <input 
                            type="number" 
                            value={newCode.maxUses} 
                            onChange={e => setNewCode({...newCode, maxUses: e.target.value})} 
                            placeholder="100"
                            className="w-full bg-background border border-border/60 rounded-xl px-3 py-2 text-xs text-foreground font-bold focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-muted-foreground block mb-1.5">{isAr ? "تاريخ الانتهاء (اختياري)" : "Expires At (optional)"}</label>
                          <input 
                            type="date" 
                            value={newCode.expiresAt} 
                            onChange={e => setNewCode({...newCode, expiresAt: e.target.value})}
                            className="w-full bg-background border border-border/60 rounded-xl px-3 py-2 text-xs text-foreground font-bold focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-muted-foreground block mb-1.5">{isAr ? "وصف مختصر" : "Short Description"}</label>
                          <input 
                            value={newCode.description} 
                            onChange={e => setNewCode({...newCode, description: e.target.value})} 
                            placeholder="خصم للطلاب المتميزين"
                            className="w-full bg-background border border-border/60 rounded-xl px-3 py-2 text-xs text-foreground font-bold focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2.5 pt-2">
                        <Button onClick={handleCreateCode} className="rounded-xl font-bold text-xs h-10 px-5 bg-emerald-500 hover:bg-emerald-600 text-white border-none">
                          {isAr ? "إنشاء الكوبون" : "Create Code"}
                        </Button>
                        <Button variant="ghost" onClick={() => setShowCodeForm(false)} className="rounded-xl font-bold text-xs h-10">
                          {isAr ? "إلغاء" : "Cancel"}
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {codesLoading ? (
                    <div className="text-center py-20 text-muted-foreground font-semibold">{isAr ? "جاري تحميل الأكواد..." : "Loading codes..."}</div>
                  ) : codes.length === 0 ? (
                    <div className="text-center py-20 rounded-2xl border border-dashed border-border/60 bg-card/30 max-w-md mx-auto">
                      <h4 className="font-extrabold text-base">{isAr ? "لا توجد كودات خصم حالياً" : "No promo codes"}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{isAr ? "اضغط على زر كود جديد لإضافة كود تخفيض." : "Click new code button to add a discount code."}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {codes.map(code => (
                        <motion.div 
                          key={code.id} 
                          initial={{ opacity: 0, scale: 0.98 }} 
                          animate={{ opacity: 1, scale: 1 }}
                          className={`rounded-2xl border p-5 bg-card flex flex-col justify-between gap-4 transition-all duration-200 ${
                            code.isActive ? "border-emerald-500/20" : "border-border/55"
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-mono font-bold text-sm tracking-wide text-foreground">{code.code}</span>
                              <Badge 
                                variant="outline" 
                                className={`text-[9px] font-bold px-2 py-0.5 rounded-lg ${
                                  code.isActive 
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                                    : "bg-muted text-muted-foreground border-border/60"
                                }`}
                              >
                                {code.isActive ? (isAr ? "مفعّل" : "Active") : (isAr ? "موقوف" : "Inactive")}
                              </Badge>
                            </div>
                            <h4 className="text-lg font-black text-primary">
                              {code.discountType === "percent" ? `${code.discountValue}% ${isAr ? "خصم" : "Discount"}` : `${code.discountValue} ${isAr ? "نقطة خصم" : "pts Discount"}`}
                            </h4>
                            {code.description && <p className="text-xs text-muted-foreground mt-2 font-medium">{code.description}</p>}
                            
                            <div className="flex items-center gap-4 text-[10px] text-muted-foreground/80 mt-4 font-semibold">
                              <span>{isAr ? "الاستخدام:" : "Uses:"} {code.usedCount}{code.maxUses ? `/${code.maxUses}` : "/∞"}</span>
                              {code.expiresAt && <span>{new Date(code.expiresAt).toLocaleDateString(isAr ? "ar-EG" : "en-US")}</span>}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button 
                              onClick={() => toggleCode(code.id, code.isActive)} 
                              variant="outline" 
                              className={`flex-1 rounded-xl text-xs font-bold h-8.5 ${
                                code.isActive 
                                  ? "text-destructive border-destructive/20 bg-destructive/5 hover:bg-destructive/10" 
                                  : "text-emerald-500 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10"
                              }`}
                            >
                              {code.isActive ? (isAr ? "إيقاف" : "Deactivate") : (isAr ? "تفعيل" : "Activate")}
                            </Button>
                            <Button 
                              variant="ghost" 
                              onClick={() => deleteCode(code.id)} 
                              className="rounded-xl h-8.5 w-8.5 shrink-0 text-destructive bg-destructive/5 hover:bg-destructive/10 p-0"
                            >
                              ✕
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ TAB: PAYMENT METHODS ═══ */}
              {activeTab === "payments" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-border/50">
                    <div>
                      <h2 className="text-lg font-extrabold text-foreground">{isAr ? "طرق وقنوات الدفع" : "Payment Methods"}</h2>
                      <p className="text-xs text-muted-foreground font-semibold mt-1">{isAr ? "تحديد الحسابات التي تظهر للمستخدمين عند إرسال طلب الشحن" : "Configure target bank/USDT details shown to user"}</p>
                    </div>
                    <Button 
                      onClick={() => {
                        setEditingMethod(null);
                        setNewMethod({ name: "", accountName: "", accountNumber: "", icon: "", instructions: "", sortOrder: "0" });
                        setShowMethodForm(!showMethodForm);
                      }} 
                      className="rounded-xl font-bold text-xs gap-1.5"
                    >
                      {showMethodForm ? "✕" : ""} {isAr ? "إضافة طريقة" : "Add Method"}
                    </Button>
                  </div>

                  {showMethodForm && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-card border border-border/60 rounded-2xl p-5 md:p-6 space-y-4"
                    >
                      <h3 className="text-xs font-extrabold text-foreground">{editingMethod ? (isAr ? "تعديل طريقة الدفع" : "Edit Method") : (isAr ? "إضافة طريقة دفع جديدة" : "New Method")}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                          { key: "name", label: isAr ? "اسم القناة *" : "Method Name *", placeholder: "USDT TRC-20" },
                          { key: "accountName", label: isAr ? "اسم صاحب الحساب *" : "Account Name *", placeholder: "Ali Mohammed" },
                          { key: "accountNumber", label: isAr ? "رقم الحساب أو عنوان المحفظة *" : "Account/Address *", placeholder: "TXxxxxxxxxxx" },
                          { key: "icon", label: isAr ? "الأيقونة (اختياري)" : "Icon (Optional)", placeholder: "" },
                          { key: "sortOrder", label: isAr ? "ترتيب الظهور" : "Sort Order", placeholder: "0" },
                        ].map(field => (
                          <div key={field.key}>
                            <label className="text-[11px] font-bold text-muted-foreground block mb-1.5">{field.label}</label>
                            <input 
                              value={(newMethod as any)[field.key]} 
                              onChange={e => setNewMethod({...newMethod, [field.key]: e.target.value})} 
                              placeholder={field.placeholder}
                              className="w-full bg-background border border-border/60 rounded-xl px-3 py-2 text-xs text-foreground font-bold focus:outline-none focus:border-primary"
                            />
                          </div>
                        ))}
                        <div className="md:col-span-3">
                          <label className="text-[11px] font-bold text-muted-foreground block mb-1.5">{isAr ? "تعليمات الدفع التفصيلية" : "Instructions"}</label>
                          <textarea 
                            value={newMethod.instructions} 
                            onChange={e => setNewMethod({...newMethod, instructions: e.target.value})} 
                            placeholder={isAr ? "يرجى نسخ العنوان وتحويل المبلغ ثم رفع صورة الإيصال..." : "Pay then upload proof..."}
                            className="w-full bg-background border border-border/60 rounded-xl p-3 text-xs text-foreground font-medium focus:outline-none focus:border-primary h-20"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2.5 pt-2">
                        <Button onClick={handleSaveMethod} className="rounded-xl font-bold text-xs h-10 px-5">
                          {isAr ? "حفظ الطريقة" : "Save Method"}
                        </Button>
                        <Button variant="ghost" onClick={() => { setShowMethodForm(false); setEditingMethod(null); }} className="rounded-xl font-bold text-xs h-10">
                          {isAr ? "إلغاء" : "Cancel"}
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {methodsLoading ? (
                    <div className="text-center py-20 text-muted-foreground font-semibold">{isAr ? "جاري تحميل طرق الدفع..." : "Loading methods..."}</div>
                  ) : methods.length === 0 ? (
                    <div className="text-center py-20 rounded-2xl border border-dashed border-border/60 bg-card/30 max-w-md mx-auto">
                      <h4 className="font-extrabold text-base">{isAr ? "لم تقم بتعريف طرق دفع بعد" : "No payment methods"}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{isAr ? "أضف طرق دفع لإظهارها للطلاب في نموذج الشحن." : "Configure methods so students can pay."}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {methods.map(method => (
                        <motion.div 
                          key={method.id} 
                          initial={{ opacity: 0, scale: 0.98 }} 
                          animate={{ opacity: 1, scale: 1 }}
                          className={`rounded-2xl border p-5 bg-card flex flex-col justify-between gap-4 transition-all duration-200 ${
                            method.isActive ? "border-primary/20" : "border-border/55"
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-center mb-3">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-foreground">{method.name}</h4>
                              </div>
                              <Badge 
                                variant="outline" 
                                className={`text-[9px] font-bold px-2 py-0.5 rounded-lg ${
                                  method.isActive 
                                    ? "bg-primary/5 text-primary border-primary/20" 
                                    : "bg-muted text-muted-foreground border-border/60"
                                }`}
                              >
                                {method.isActive ? (isAr ? "مفعّل" : "Active") : (isAr ? "موقوف" : "Inactive")}
                              </Badge>
                            </div>
                            
                            <div className="space-y-2">
                              <div>
                                <span className="text-[10px] text-muted-foreground font-semibold block">{isAr ? "الاسم" : "Name"}</span>
                                <span className="text-xs font-extrabold text-foreground">{method.accountName}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-muted-foreground font-semibold block">{isAr ? "العنوان/رقم الحساب" : "Address/Account"}</span>
                                <span className="text-xs font-bold text-primary font-mono select-all break-all">{method.accountNumber}</span>
                              </div>
                              {method.instructions && (
                                <p className="text-[10.5px] text-muted-foreground font-medium italic bg-accent/40 p-2.5 rounded-lg">
                                  {method.instructions}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2 border-t border-border/40">
                            <Button 
                              onClick={() => openEditMethod(method)} 
                              variant="outline" 
                              className="flex-1 rounded-xl text-xs font-bold h-8.5"
                            >
                              {isAr ? "تعديل" : "Edit"}
                            </Button>
                            <Button 
                              onClick={() => toggleMethod(method.id, method.isActive)}
                              variant="outline" 
                              className={`flex-1 rounded-xl text-xs font-bold h-8.5 ${
                                method.isActive 
                                  ? "text-destructive border-destructive/20 bg-destructive/5 hover:bg-destructive/10" 
                                  : "text-emerald-500 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10"
                              }`}
                            >
                              {method.isActive ? (isAr ? "إيقاف" : "Disable") : (isAr ? "تفعيل" : "Enable")}
                            </Button>
                            <Button 
                              variant="ghost" 
                              onClick={() => deleteMethod(method.id)} 
                              className="rounded-xl h-8.5 w-8.5 shrink-0 text-destructive bg-destructive/5 hover:bg-destructive/10 p-0"
                            >
                              ✕
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ TAB: PLATFORM SETTINGS ═══ */}
              {activeTab === "settings" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-border/50">
                    <div>
                      <h2 className="text-lg font-extrabold text-foreground">{isAr ? "إعدادات المحفظة والمنصة" : "Platform Config"}</h2>
                      <p className="text-xs text-muted-foreground font-semibold mt-1">{isAr ? "تخصيص تسعير النقاط، وتكاليف الخدمات" : "Configure global values, messages, and bounds"}</p>
                    </div>
                    <Button onClick={saveSettings} className="rounded-xl font-bold text-xs gap-1.5 px-5">
                      {isAr ? "حفظ الإعدادات" : "Save Config"}
                    </Button>
                  </div>

                  {settingsLoading ? (
                    <div className="text-center py-20 text-muted-foreground font-semibold">{isAr ? "جاري تحميل الإعدادات..." : "Loading configuration..."}</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {settings.map(s => (
                        <div key={s.key} className="rounded-2xl border border-border/55 bg-card p-5 shadow-sm space-y-3.5">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-foreground">{s.label}</span>
                            <span className="font-mono text-[10px] text-muted-foreground bg-accent px-2 py-0.5 rounded-md">{s.key}</span>
                          </div>
                          
                          <input 
                            value={settingsEdits[s.key] ?? s.value} 
                            onChange={e => setSettingsEdits(prev => ({...prev, [s.key]: e.target.value}))}
                            className="w-full bg-background border border-border/60 rounded-xl px-3.5 py-2.5 text-xs text-foreground font-semibold focus:outline-none focus:border-primary"
                          />
                          
                          {s.key === "point_price_cents" && settingsEdits[s.key] && (
                            <span className="text-[10.5px] text-primary font-bold block mt-1">
                              💡 100 {isAr ? "نقطة" : "pts"} = ${(parseInt(settingsEdits[s.key]) * 100 / 100).toFixed(2)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ TAB: ANALYTICS ═══ */}
              {activeTab === "analytics" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-border/50">
                    <div>
                      <h2 className="text-lg font-extrabold text-foreground">{isAr ? "إحصائيات وتحليلات النظام" : "Stats Room"}</h2>
                      <p className="text-xs text-muted-foreground font-semibold mt-1">{isAr ? "عرض أداء المبيعات، ومعدلات تحويل وشراء الاستشارات" : "Monitor performance, circulating balance and transaction counts"}</p>
                    </div>
                    <Button onClick={loadAnalytics} variant="outline" className="rounded-xl font-bold text-xs h-9.5">
                      {isAr ? "تحديث البيانات" : "Refresh"}
                    </Button>
                  </div>

                  {analyticsLoading ? (
                    <div className="text-center py-20 text-muted-foreground font-semibold">{isAr ? "جاري تحميل البيانات..." : "Loading stats..."}</div>
                  ) : analytics ? (
                    <div className="space-y-6">
                      {/* Overview Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {[
                          { label: isAr ? "إجمالي المبيعات" : "Gross Revenue", value: `$${analytics.overview.totalRevenueDollars}`, color: "text-emerald-500" },
                          { label: isAr ? "نقاط مباعة" : "Points Sold", value: analytics.overview.totalPointsSold.toLocaleString(), color: "text-amber-500" },
                          { label: isAr ? "استشارات مدفوعة" : "Paid Consultations", value: analytics.overview.totalConsultations, color: "text-primary" },
                          { label: isAr ? "نقاط الاستشارات" : "Consultation Earned", value: analytics.overview.totalPointsEarned.toLocaleString(), color: "text-purple-500" },
                          { label: isAr ? "حجم التداول العام" : "Points Circulating", value: analytics.overview.totalPointsInCirculation.toLocaleString(), color: "text-pink-500" },
                          { label: isAr ? "أعضاء يملكون رصيد" : "Token Holders", value: analytics.overview.totalUsersWithPoints, color: "text-cyan-500" },
                          { label: isAr ? "طلبات معلقة" : "Pending requests", value: analytics.overview.pendingDeposits, color: "text-amber-400" },
                          { label: isAr ? "طلبات مقبولة" : "Approved requests", value: analytics.overview.approvedDeposits, color: "text-emerald-500" },
                        ].map((card, i) => (
                          <div key={i} className="rounded-2xl border border-border/55 bg-card p-5 text-center shadow-sm flex flex-col justify-center items-center min-h-[90px]">
                            <span className={`text-xl font-black ${card.color} block`}>{card.value}</span>
                            <span className="text-[10px] text-muted-foreground font-bold block mt-1">{card.label}</span>
                          </div>
                        ))}
                      </div>

                      {/* Day chart */}
                      <div className="rounded-2xl border border-border/55 bg-card p-5 shadow-sm">
                        <h3 className="text-xs font-bold text-muted-foreground mb-6">{isAr ? "أداء مبيعات آخر 7 أيام" : "Last 7 Days Points Sales"}</h3>
                        <div className="flex gap-2.5 items-end h-32 direction-ltr justify-between">
                          {analytics.dailyStats.map((day, i) => {
                            const maxPoints = Math.max(...analytics.dailyStats.map(d => d.points), 1);
                            const h = Math.max((day.points * 100) / (maxPoints || 1), 4);
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                                <span className="text-[9px] text-primary font-bold">{day.points > 0 ? day.points : ""}</span>
                                <div 
                                  className="w-full bg-primary rounded-t-md transition-all duration-700 ease-out"
                                  style={{ height: `${h}%` }}
                                />
                                <span className="text-[8.5px] text-muted-foreground font-bold mt-1 rotate-[-20deg] whitespace-nowrap">{day.date.slice(5)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Modal: Screenshot Viewer ── */}
        <AnimatePresence>
          {selectedScreenshot && (
            <div 
              onClick={() => setSelectedScreenshot(null)}
              className="fixed inset-0 bg-background/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
            >
              <div 
                onClick={e => e.stopPropagation()}
                className="bg-card border border-border rounded-2xl p-2 max-w-2xl w-full shadow-2xl relative"
              >
                <img src={selectedScreenshot} alt="receipt" className="w-full rounded-xl max-h-[75vh] object-contain" />
                <div className="flex justify-end p-2 pb-0">
                  <Button variant="ghost" onClick={() => setSelectedScreenshot(null)} className="rounded-xl font-bold text-xs h-9">
                    {isAr ? "إغلاق المعاينة" : "Close"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* ── Modal: Decision ── */}
        <AnimatePresence>
          {actingRequestId && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-card border border-border rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative">
                <h3 className="font-extrabold text-lg text-foreground mb-1">{isAr ? "اتخاذ قرار بشأن الطلب" : "Approve/Reject Deposit"}</h3>
                <p className="text-xs text-muted-foreground font-semibold mb-6">{isAr ? `رقم الطلب: #${actingRequestId}` : `Request ID: #${actingRequestId}`}</p>
                
                <textarea
                  placeholder={isAr ? "اكتب ملاحظة توضيحية للعميل (إلزامية عند الرفض)..." : "Reason for approval/rejection..."}
                  value={adminNotes} 
                  onChange={e => setAdminNotes(e.target.value)}
                  className="w-full bg-background border border-border/60 rounded-xl p-3 text-xs text-foreground font-medium focus:outline-none focus:border-primary h-24 mb-4"
                />

                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleApprove(actingRequestId)}
                    disabled={approveMutation.isPending}
                    className="flex-1 rounded-xl font-bold text-xs h-10.5 bg-emerald-500 hover:bg-emerald-600 text-white border-none"
                  >
                    {approveMutation.isPending ? "..." : (isAr ? "موافقة وشحن" : "Approve")}
                  </Button>
                  <Button 
                    onClick={() => handleReject(actingRequestId)}
                    disabled={rejectMutation.isPending}
                    variant="destructive"
                    className="flex-1 rounded-xl font-bold text-xs h-10.5"
                  >
                    {rejectMutation.isPending ? "..." : (isAr ? "رفض الطلب" : "Reject")}
                  </Button>
                </div>
                
                <Button 
                  variant="ghost" 
                  onClick={() => { setActingRequestId(null); setAdminNotes(""); }} 
                  className="w-full mt-3 rounded-xl font-bold text-xs h-10"
                >
                  {isAr ? "تراجع" : "Cancel"}
                </Button>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}

