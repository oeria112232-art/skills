import { useState, useEffect, useCallback } from "react";
import { 
  useListConsultations, 
  useCreateConsultation, 
  useCloseConsultation, 
  useListUsers, 
  getListConsultationsQueryKey,
  useGetWallet,
  getGetWalletQueryKey
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLanguage } from "@/components/layout/LanguageContext";
import { useAuth } from "@/components/layout/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MessageSquare, 
  Plus, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  GraduationCap, 
  Clock, 
  Lock, 
  Loader2,
  ChevronRight,
  FileText,
  User
} from "lucide-react";

// CONSTANTS
const CONSULTATION_COST = 100;
const POINT_PRICE_CENTS = 2;
const getDraftKey = (userId?: number) => userId ? `consultation_draft_v2_${userId}` : "consultation_draft_v2";

const categories = [
  { value: "tot", label: "إعداد المدربين TOT" },
  { value: "networking", label: "شبكات CCNA" },
  { value: "cybersecurity", label: "الأمن السيبراني" },
  { value: "fullstack", label: "تطوير الويب الشامل" },
  { value: "computer-basics", label: "أساسيات الحاسوب" },
  { value: "mobile", label: "تطوير تطبيقات الموبايل" },
  { value: "other", label: "استشارة عامة" },
];

// API HELPERS
async function applyDiscountCode(code: string, baseCost: number) {
  const r = await fetch("/api/points/apply-discount", {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, baseCost }),
  });
  const json = await r.json();
  if (!r.ok) throw new Error(json.error || "فشل التحقق من الكود");
  return json;
}

export default function ConsultationsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const isAr = language === "ar";

  const { data: consultations, isLoading } = useListConsultations();
  const { data: allUsers } = useListUsers();
  const createMutation = useCreateConsultation();
  const closeMutation = useCloseConsultation();

  // Wallet
  const { data: wallet, isLoading: isWalletLoading, refetch: refetchWallet } = useGetWallet();

  const [activeConsultationId, setActiveConsultationId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  // Consultation Multi-Step Flow
  const [consultStep, setConsultStep] = useState<0 | 1 | 2 | 3>(0);
  const [consultCategory, setConsultCategory] = useState("");
  const [consultTitle, setConsultTitle] = useState("");
  const [consultMessage, setConsultMessage] = useState("");
  const [consultAssignedTo, setConsultAssignedTo] = useState("general");
  const [consultDiscountCode, setConsultDiscountCode] = useState("");
  const [discountResult, setDiscountResult] = useState<any>(null);
  const [discountLoading, setDiscountLoading] = useState(false);

  const draftKey = getDraftKey(user?.id);

  // LocalStorage draft
  const saveDraft = useCallback(() => {
    if (consultCategory || consultTitle || consultMessage) {
      localStorage.setItem(draftKey, JSON.stringify({
        category: consultCategory, title: consultTitle, message: consultMessage, assignedTo: consultAssignedTo,
        savedAt: new Date().toISOString(),
      }));
    }
  }, [draftKey, consultCategory, consultTitle, consultMessage, consultAssignedTo]);

  useEffect(() => { saveDraft(); }, [saveDraft]);

  const loadDraft = useCallback(() => {
    const raw = localStorage.getItem(draftKey);
    if (!raw) return false;
    try {
      const d = JSON.parse(raw);
      setConsultCategory(d.category || ""); setConsultTitle(d.title || "");
      setConsultMessage(d.message || ""); setConsultAssignedTo(d.assignedTo || "general");
      return true;
    } catch { return false; }
  }, [draftKey]);

  const clearDraft = useCallback(() => { localStorage.removeItem(draftKey); }, [draftKey]);

  const hasDraft = !!localStorage.getItem(draftKey);

  function openConsultModal() {
    setConsultStep(1);
    setDiscountResult(null);
    setConsultDiscountCode("");
    const hadDraft = loadDraft();
    if (hadDraft) {
      toast({ title: isAr ? "تم استعادة مسودتك المحفوظة" : "Your saved draft was restored" });
    }
  }

  function closeConsultModal() {
    saveDraft();
    setConsultStep(0);
    setDiscountResult(null);
  }

  async function applyDiscount() {
    if (!consultDiscountCode.trim()) return;
    setDiscountLoading(true);
    try {
      const result = await applyDiscountCode(consultDiscountCode, CONSULTATION_COST);
      setDiscountResult(result);
      toast({ title: isAr ? `كود الخصم صالح! وفرت ${result.savings} نقطة` : `Coupon applied! Saved ${result.savings} pts` });
    } catch (e: any) {
      toast({ title: e.message || "Failed to apply code", variant: "destructive" });
      setDiscountResult(null);
    } finally { setDiscountLoading(false); }
  }

  async function handleConfirmPaymentAndProceed() {
    const finalCost = discountResult?.finalCost ?? CONSULTATION_COST;
    const points = wallet?.points ?? 0;
    
    if (points < finalCost) {
      toast({ 
        title: isAr ? `رصيدك غير كافٍ (${points} نقطة). تحتاج ${finalCost} نقطة` : `Insufficient balance (${points} pts). You need ${finalCost} pts`, 
        variant: "destructive" 
      });
      return;
    }
    setConsultStep(3);
  }

  async function handleConsultationSubmit() {
    if (!consultCategory) { toast({ title: isAr ? "يرجى اختيار القسم" : "Please select department", variant: "destructive" }); return; }
    if (!consultTitle.trim()) { toast({ title: isAr ? "يرجى كتابة العنوان" : "Please enter a title", variant: "destructive" }); return; }
    if (!consultMessage.trim() || consultMessage.trim().length < 20) { 
      toast({ title: isAr ? "الرسالة قصيرة جداً (20 حرف على الأقل)" : "Message is too short (min 20 characters)", variant: "destructive" }); return; 
    }

    const finalCost = discountResult?.finalCost ?? CONSULTATION_COST;
    const points = wallet?.points ?? 0;
    if (points < finalCost) {
      toast({ title: isAr ? "رصيدك غير كافٍ" : "Insufficient balance", variant: "destructive" });
      return;
    }

    try {
      await createMutation.mutateAsync({
        data: {
          category: consultCategory,
          title: consultTitle,
          message: consultMessage,
          assignedTo: consultAssignedTo !== "general" ? parseInt(consultAssignedTo, 10) : null,
        }
      });
      
      clearDraft();
      setConsultStep(0);
      setConsultCategory(""); setConsultTitle(""); setConsultMessage(""); setConsultAssignedTo("general");
      setDiscountResult(null); setConsultDiscountCode("");
      
      queryClient.invalidateQueries({ queryKey: getListConsultationsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
      refetchWallet();
      
      toast({ title: isAr ? "تم إرسال الاستشارة وخصم نقاط من محفظتك" : "Consultation sent and points deducted from wallet" });
    } catch (e: any) {
      toast({ title: e.message || "Failed to submit", variant: "destructive" });
    }
  }

  async function handleClose(id: number) {
    const confirm = window.confirm(isAr ? "هل أنت متأكد من رغبتك في إغلاق هذه الاستشارة؟" : "Are you sure you want to close this consultation?");
    if (!confirm) return;
    try {
      await closeMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListConsultationsQueryKey() });
      setActiveConsultationId(null);
      toast({ title: isAr ? "تم إغلاق الاستشارة" : "Consultation closed" });
    } catch (e: any) { 
      toast({ title: e.message || "Error closing thread", variant: "destructive" }); 
    }
  }

  // Derived values
  const usersList = Array.isArray(allUsers) ? allUsers : (allUsers && Array.isArray((allUsers as any).data) ? (allUsers as any).data : []);
  const instructors = usersList.filter((u: any) => u.role === "instructor" || u.role === "admin");
  const activeConsultation = consultations?.find((c: any) => c.id === activeConsultationId);
  const filteredConsultations = (consultations || []).filter((c: any) => {
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    const matchCat = filterCategory === "all" || c.category === filterCategory;
    return matchStatus && matchCat;
  });
  
  const points = wallet?.points ?? 0;
  const finalCost = discountResult?.finalCost ?? CONSULTATION_COST;
  const canAfford = points >= finalCost;

  return (
    <AppLayout>
      <div className="text-start p-4 sm:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Heading */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold px-3 py-0.5 rounded-full text-[10px]">
              {isAr ? "الاستشارات الفنية والمهنية" : "Expert Consultations"}
            </Badge>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-foreground tracking-tight" data-testid="heading-consultations">
                {isAr ? "الاستشارات وبوابة الدعم" : "Consultations"}
              </h1>
              <p className="text-sm text-muted-foreground font-medium mt-1">
                {isAr
                  ? `احصل على استشارة خبراء مقابل ${CONSULTATION_COST} نقطة فقط (${CONSULTATION_COST * POINT_PRICE_CENTS} سنت = $${(CONSULTATION_COST * POINT_PRICE_CENTS / 100).toFixed(2)})`
                  : `Get expert advice for only ${CONSULTATION_COST} points ($${(CONSULTATION_COST * POINT_PRICE_CENTS / 100).toFixed(2)})`}
              </p>
            </div>
            <Button onClick={openConsultModal} className="rounded-xl font-bold shadow-md shadow-primary/10 gap-2 h-11 px-6">
              <Plus className="w-4 h-4" />
              <span>{isAr ? "استشارة جديدة" : "New Consultation"}</span>
              {hasDraft && <span className="bg-primary-foreground/20 text-xs px-2 py-0.5 rounded-md">{isAr ? "مسودة" : "Draft"}</span>}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Panel: Wallet + Filters + List */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Wallet Card */}
            <div className="rounded-2xl border border-border/55 bg-gradient-to-b from-card to-background p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-xl pointer-events-none" />
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <span className="text-xs text-muted-foreground font-semibold block mb-1">{isAr ? "رصيد المحفظة" : "Wallet Balance"}</span>
                  <span className="text-3xl font-black text-foreground">
                    {isWalletLoading ? "..." : points.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium block mt-1">
                    {isAr ? `نقطة = $${(points * POINT_PRICE_CENTS / 100).toFixed(2)}` : `pts = $${(points * POINT_PRICE_CENTS / 100).toFixed(2)}`}
                  </span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => refetchWallet()} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>

              {/* Progress bar */}
              <div className="mt-4 h-1.5 bg-accent rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500 ease-out" 
                  style={{ width: `${Math.min((points / 500) * 100, 100)}%` }} 
                />
              </div>

              {/* Actions */}
              <div className="mt-5">
                <Button 
                  onClick={() => setLocation("/user/wallet")} 
                  className="w-full rounded-xl font-bold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                >
                  {isAr ? "إدارة شحن وتحويل النقاط" : "Manage Top Up & Transfers"}
                </Button>
              </div>

              <div className="mt-4 p-3 bg-accent/30 rounded-xl text-center text-[10.5px] text-muted-foreground font-semibold">
                {isAr ? `1 نقطة = ${POINT_PRICE_CENTS} سنت | الاستشارة = 100 نقطة` : `1 pt = ${POINT_PRICE_CENTS}¢ | Consultation = 100 pts`}
              </div>
            </div>

            {/* Filters */}
            <div className="rounded-2xl border border-border/55 bg-card p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-muted-foreground">{isAr ? "تصفية الاستشارات" : "Filter Consultations"}</h3>
              <select 
                value={filterStatus} 
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full bg-background border border-border/60 rounded-xl p-2.5 text-xs text-foreground font-semibold focus:outline-none focus:border-primary"
              >
                <option value="all">{isAr ? "كل الحالات" : "All Statuses"}</option>
                <option value="pending">{isAr ? "قيد المراجعة" : "Pending"}</option>
                <option value="replied">{isAr ? "تم الرد" : "Replied"}</option>
                <option value="closed">{isAr ? "مغلقة" : "Closed"}</option>
              </select>
              <select 
                value={filterCategory} 
                onChange={e => setFilterCategory(e.target.value)}
                className="w-full bg-background border border-border/60 rounded-xl p-2.5 text-xs text-foreground font-semibold focus:outline-none focus:border-primary"
              >
                <option value="all">{isAr ? "كل الأقسام" : "All Categories"}</option>
                {categories.map(c => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Consultations List */}
            <div className="flex flex-col gap-3.5 max-h-[500px] overflow-y-auto pr-1">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-2xl bg-card border border-border/50" />
                ))
              ) : filteredConsultations.length === 0 ? (
                <div className="text-center py-8 rounded-2xl border border-dashed border-border/60 bg-card/30 space-y-2">
                  <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/45" />
                  <div className="text-xs text-muted-foreground font-semibold">{isAr ? "لا توجد استشارات" : "No consultations found"}</div>
                </div>
              ) : (
                filteredConsultations.map((c: any) => (
                  <motion.div 
                    key={c.id} 
                    whileHover={{ y: -2 }} 
                    onClick={() => setActiveConsultationId(c.id === activeConsultationId ? null : c.id)}
                    className={`rounded-2xl border p-4.5 cursor-pointer transition-all duration-200 text-start flex flex-col ${
                      activeConsultationId === c.id 
                        ? "border-primary bg-primary/5 shadow-md shadow-primary/5" 
                        : "border-border/55 bg-card hover:border-primary/40 hover:bg-accent/10"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h4 className="text-xs font-bold text-foreground line-clamp-1 flex-1">{c.title}</h4>
                      <Badge 
                        variant="outline" 
                        className={`text-[9px] px-2 py-0.5 font-bold ${
                          c.status === "pending" 
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" 
                            : c.status === "replied" 
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                              : "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-border/60"
                        }`}
                      >
                        {c.status === "pending" ? (isAr ? "معلق" : "Pending") : c.status === "replied" ? (isAr ? "مجاب" : "Replied") : (isAr ? "مغلق" : "Closed")}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
                      <span>{categories.find(x => x.value === c.category)?.label}</span>
                      <span>{new Date(c.createdAt).toLocaleDateString(isAr ? "ar-EG" : "en-US")}</span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Right Panel: Consultation Detail */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {activeConsultation ? (
                <motion.div 
                  key={activeConsultation.id} 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-2xl border border-border/55 bg-card p-6 shadow-sm min-h-[400px] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start gap-4 mb-6">
                      <div>
                        <h2 className="text-xl font-extrabold text-foreground leading-snug">{activeConsultation.title as string}</h2>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 font-semibold flex-wrap">
                          <span>{categories.find(x => x.value === activeConsultation.category)?.label}</span>
                          <span>•</span>
                          <span>{new Date(activeConsultation.createdAt as string).toLocaleString(isAr ? "ar-EG" : "en-US")}</span>
                        </div>
                      </div>
                      {(activeConsultation as any).status !== "closed" && (user?.role === "admin" || user?.role === "instructor" || (activeConsultation as any).userId === user?.id) && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleClose(activeConsultation.id as number)} 
                          className="h-8 border-destructive/20 text-destructive bg-destructive/5 hover:bg-destructive/10 rounded-lg text-xs font-bold gap-1"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>{isAr ? "إغلاق الاستشارة" : "Close Thread"}</span>
                        </Button>
                      )}
                    </div>

                    {/* Messages list */}
                    <div className="space-y-4">
                      {/* User's Message */}
                      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 relative">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-xs font-extrabold">
                            {((activeConsultation as any).userName || "U")[0].toUpperCase()}
                          </div>
                          <span className="text-xs font-bold text-foreground">{(activeConsultation as any).userName}</span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed font-medium whitespace-pre-line">{activeConsultation.message as string}</p>
                      </div>

                      {/* Reply Message */}
                      {(activeConsultation as any).response ? (
                        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 relative">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-7 h-7 rounded-xl bg-emerald-505 bg-emerald-600 text-white flex items-center justify-center text-xs">
                              <GraduationCap className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold text-foreground">{(activeConsultation as any).repliedName || (isAr ? "الخبير" : "Expert")}</span>
                            {(activeConsultation as any).repliedAt && (
                              <span className="text-[10px] text-muted-foreground font-semibold">
                                {new Date((activeConsultation as any).repliedAt).toLocaleString(isAr ? "ar-EG" : "en-US")}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-foreground leading-relaxed font-medium whitespace-pre-line">{(activeConsultation as any).response}</p>
                        </div>
                      ) : (
                        <div className="text-center py-10 rounded-2xl border border-dashed border-border/60 bg-accent/10">
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground font-bold">{isAr ? "في انتظار رد الخبير المختص..." : "Waiting for expert response..."}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="empty" 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }}
                  className="rounded-2xl border border-dashed border-border/60 bg-card/20 flex flex-col items-center justify-center min-h-[400px] text-muted-foreground p-6"
                >
                  <MessageSquare className="w-12 h-12 mb-4 opacity-40 text-muted-foreground" />
                  <h4 className="text-base font-extrabold text-foreground mb-1">{isAr ? "بوابة الاستشارات الفنية" : "Technical Consultation Gate"}</h4>
                  <p className="text-xs font-semibold max-w-xs text-center leading-relaxed">
                    {isAr 
                      ? "اختر أي استشارة من القائمة الجانبية لقراءة التفاصيل والردود، أو أنشئ استشارة جديدة لتطرحها على خبرائنا."
                      : "Choose a consultation from the side list to view responses, or create a new thread."}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          MODAL: CONSULTATION MULTI-STEP
      ══════════════════════════════════════════════ */}
      <AnimatePresence>
        {consultStep > 0 && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto text-start"
            >
              {/* Step indicator */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50">
                <h3 className="font-extrabold text-lg text-foreground">{isAr ? "استشارة جديدة" : "New Consultation"}</h3>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3].map(s => (
                    <div 
                      key={s} 
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${
                        consultStep === s 
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/10" 
                          : consultStep > s 
                            ? "bg-primary/20 text-primary" 
                            : "bg-accent text-muted-foreground"
                      }`}
                    >
                      {consultStep > s ? "✓" : s}
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 1: Info */}
              {consultStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-2">{isAr ? "القسم الفني للطلب *" : "Technical Department *"}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {categories.map(cat => (
                        <button 
                          key={cat.value} 
                          onClick={() => setConsultCategory(cat.value)}
                          className={`p-3 rounded-xl border text-xs font-bold transition-all text-start flex items-center gap-2 ${
                            consultCategory === cat.value 
                              ? "bg-primary/10 border-primary text-primary shadow-sm" 
                              : "bg-background border-border hover:bg-accent/40"
                          }`}
                        >
                          <span className="truncate">{cat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1.5">{isAr ? "عنوان الاستشارة *" : "Consultation Title *"}</label>
                    <Input 
                      value={consultTitle} 
                      onChange={e => setConsultTitle(e.target.value)} 
                      placeholder={isAr ? "مثال: مشكلة في إعداد خادم محلي" : "e.g., Local server setup issue"}
                      className="rounded-xl border-border/60"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-2">{isAr ? "توجيه السؤال لمعلم محدد (اختياري)" : "Direct to Specific Instructor (Optional)"}</label>
                    <Select value={consultAssignedTo} onValueChange={setConsultAssignedTo}>
                      <SelectTrigger className="rounded-xl border-border/60">
                        <SelectValue placeholder={isAr ? "اختر المعلم" : "Select instructor"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">{isAr ? "توجيه للكل (أسرع إجابة)" : "General Support (Fastest)"}</SelectItem>
                        {instructors.map((ins: any) => (
                          <SelectItem key={ins.id} value={String(ins.id)}>{ins.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2.5 pt-4">
                    <Button 
                      onClick={() => setConsultStep(2)} 
                      disabled={!consultCategory || !consultTitle.trim()}
                      className="flex-1 rounded-xl font-bold h-11"
                    >
                      {isAr ? "الاستمرار للمراجعة والدفع" : "Continue to Payment"}
                    </Button>
                    <Button variant="ghost" onClick={closeConsultModal} className="rounded-xl font-bold h-11">
                      {isAr ? "إلغاء" : "Cancel"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Payment and checkout details */}
              {consultStep === 2 && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border/60 bg-muted/30 p-5 space-y-4">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-muted-foreground">{isAr ? "تكلفة الخدمة:" : "Service Cost:"}</span>
                      <span className="text-foreground">{CONSULTATION_COST} {isAr ? "نقطة" : "pts"}</span>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{isAr ? "هل لديك كود خصم؟" : "Have a promo code?"}</label>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="e.g. DISCOUNT10" 
                          value={consultDiscountCode}
                          onChange={e => setConsultDiscountCode(e.target.value.toUpperCase())}
                          className="rounded-xl h-10 border-border/60 text-xs font-bold"
                        />
                        <Button 
                          onClick={applyDiscount} 
                          disabled={discountLoading || !consultDiscountCode.trim()} 
                          className="h-10 px-4 rounded-xl text-xs font-bold"
                        >
                          {discountLoading ? "..." : (isAr ? "تطبيق" : "Apply")}
                        </Button>
                      </div>
                    </div>

                    {discountResult && (
                      <div className="border-t border-dashed pt-3 space-y-2 text-xs font-bold">
                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                          <span>{isAr ? "الخصم المطبق:" : "Applied Discount:"}</span>
                          <span>-{discountResult.savings} {isAr ? "نقطة" : "pts"}</span>
                        </div>
                        <div className="flex justify-between text-foreground text-sm font-black pt-1">
                          <span>{isAr ? "التكلفة النهائية:" : "Final Cost:"}</span>
                          <span>{discountResult.finalCost} {isAr ? "نقطة" : "pts"}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={`rounded-xl border p-4 ${canAfford ? "bg-emerald-500/5 border-emerald-500/20" : "bg-destructive/5 border-destructive/20"}`}>
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className={canAfford ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
                        {canAfford ? (isAr ? "رصيدك كافٍ" : "Sufficient Balance") : (isAr ? "رصيدك غير كافٍ" : "Insufficient Balance")}
                      </span>
                      <span className="text-foreground">{points} {isAr ? "نقطة متوفرة" : "pts available"}</span>
                    </div>
                    {!canAfford && (
                      <Button onClick={() => { setConsultStep(0); setLocation("/user/wallet"); }} size="sm" className="w-full mt-3 rounded-lg font-bold bg-primary text-primary-foreground">
                        {isAr ? "شحن رصيد المحفظة الآن" : "Top up wallet now"}
                      </Button>
                    )}
                  </div>

                  <div className="flex gap-2.5 pt-4">
                    <Button 
                      onClick={handleConfirmPaymentAndProceed} 
                      disabled={!canAfford}
                      className="flex-1 rounded-xl font-bold h-11"
                    >
                      {isAr ? "تأكيد الدفع والاستمرار" : "Confirm & Write Message"}
                    </Button>
                    <Button variant="ghost" onClick={() => setConsultStep(1)} className="rounded-xl font-bold h-11">
                      {isAr ? "رجوع" : "Back"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Write message */}
              {consultStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-2">
                      {isAr ? "تفاصيل طلب الاستشارة أو السؤال *" : "Consultation Message details *"}
                      <span className="text-[10px] text-muted-foreground font-semibold float-left">
                        ({consultMessage.length} {isAr ? "حرف، الحد الأدنى 20" : "chars, min 20"})
                      </span>
                    </label>
                    <Textarea 
                      value={consultMessage} 
                      onChange={e => setConsultMessage(e.target.value)} 
                      placeholder={isAr ? "اكتب سؤالك أو مشكلتك الفنية بالتفصيل هنا ليجيبك الخبير بأفضل شكل ممكن..." : "Describe your problem here..."}
                      className="min-h-[180px] rounded-xl border-border/60 text-sm font-medium"
                    />
                  </div>

                  {hasDraft && (
                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-center text-[10.5px] text-amber-600 dark:text-amber-400 font-semibold">
                      {isAr ? "مسودتك يتم حفظها تلقائياً بالمتصفح ولن تضيع." : "Draft is autosaved locally."}
                    </div>
                  )}

                  <div className="flex gap-2.5 pt-4">
                    <Button 
                      onClick={handleConsultationSubmit} 
                      disabled={createMutation.isPending || consultMessage.trim().length < 20}
                      className="flex-1 rounded-xl font-bold h-11"
                    >
                      {createMutation.isPending ? "⏳..." : (isAr ? `إرسال وخصم ${finalCost} نقطة` : `Send & Spend ${finalCost} pts`)}
                    </Button>
                    <Button variant="ghost" onClick={closeConsultModal} className="rounded-xl font-bold h-11">
                      {isAr ? "حفظ كمسودة وإغلاق" : "Save & Close"}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
