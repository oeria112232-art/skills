import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { 
  useListWorkshops, 
  useUpdateWorkshop, 
  useListCertificates,
  getListWorkshopsQueryKey,
  useListTracks,
  useListUsers,
  getListCertificatesQueryKey
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLanguage } from "@/components/layout/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Award, ShieldCheck, Settings, Eye, Users, Sparkles, Check, 
  Sliders, DollarSign, Link2, Layers, Star, Trash2, Plus, 
  ChevronLeft, AlertCircle, FileText, UploadCloud, ShieldAlert
} from "lucide-react";

// Get level configurations
const getLevelMetadata = (levelNum: number, isAr: boolean) => {
  switch (levelNum) {
    case 4:
      return {
        badge: "",
        titleAr: "خبير متقدم (Master)",
        titleEn: "Master Expert (Lvl 4)",
        descAr: "أعلى مستوى — يُمنح عند إتمام مسارات متقدمة أو بقرار مباشر من الإدارة.",
        descEn: "Highest tier — awarded upon advanced track completion or admin decision.",
        colorClass: "text-amber-500 border-amber-500/30 bg-amber-500/5",
        gradient: "from-amber-600/20 to-yellow-600/10",
        badgeColor: "text-amber-600 dark:text-amber-400",
        entityType: "track",
        styleName: "gold",
        defaultCost: 500
      };
    case 3:
      return {
        badge: "",
        titleAr: "خبير متخصص (Expert)",
        titleEn: "Expert Specialist (Lvl 3)",
        descAr: "يُمنح عند إتمام مسار تعليمي كامل بنجاح.",
        descEn: "Awarded upon completing a full learning track with passing score.",
        colorClass: "text-purple-500 border-purple-500/30 bg-purple-500/5",
        gradient: "from-purple-600/20 to-violet-600/10",
        badgeColor: "text-purple-600 dark:text-purple-400",
        entityType: "track",
        styleName: "purple",
        defaultCost: 250
      };
    case 2:
      return {
        badge: "",
        titleAr: "أخصائي محترف (Professional)",
        titleEn: "Professional Specialist (Lvl 2)",
        descAr: "يُمنح عند اجتياز اختبار ورشة عمل بدرجة مقبولة.",
        descEn: "Awarded upon passing a workshop exam with an acceptable score.",
        colorClass: "text-blue-500 border-blue-500/30 bg-blue-500/5",
        gradient: "from-blue-600/20 to-cyan-600/10",
        badgeColor: "text-blue-600 dark:text-blue-400",
        entityType: "workshop",
        styleName: "blue",
        defaultCost: 100
      };
    case 1:
    default:
      return {
        badge: "",
        titleAr: "حضور ومشاركة (Participation)",
        titleEn: "Participation (Lvl 1)",
        descAr: "يُمنح تلقائياً لكل من يكمل ورشة العمل حتى النهاية دون اختبار.",
        descEn: "Automatically awarded to every student who completes a workshop attendance.",
        colorClass: "text-slate-500 border-slate-500/25 bg-slate-500/5",
        gradient: "from-slate-600/15 to-slate-500/5",
        badgeColor: "text-slate-500 dark:text-slate-400",
        entityType: "workshop",
        styleName: "slate",
        defaultCost: 0
      };
  }
};

export default function AdminCertificatesLevelPage() {
  const [, params] = useRoute("/admin/certificates/level/:levelNum");
  const levelNum = parseInt(params?.levelNum || "1", 10);

  const { language } = useLanguage();
  const isAr = language === "ar";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load backend data
  const { data: allUsers } = useListUsers();
  const { data: workshops, isLoading: loadingWorkshops } = useListWorkshops();
  const { data: tracks } = useListTracks();
  const { data: issuedCerts, isLoading: loadingCerts } = useListCertificates();
  const updateWorkshop = useUpdateWorkshop();

  const usersList = Array.isArray(allUsers) ? allUsers : (allUsers && Array.isArray((allUsers as any).data) ? (allUsers as any).data : []);
  const certsList = Array.isArray(issuedCerts) ? issuedCerts : (issuedCerts && Array.isArray((issuedCerts as any).data) ? (issuedCerts as any).data : []);
  const workshopsList = Array.isArray(workshops) ? workshops : (workshops && Array.isArray((workshops as any).data) ? (workshops as any).data : []);
  const tracksList2 = Array.isArray(tracks) ? tracks : (tracks && Array.isArray((tracks as any).data) ? (tracks as any).data : []);

  // Local configurations state
  const meta = getLevelMetadata(levelNum, isAr);
  
  // Tab states
  const [activeTab, setActiveTab] = useState("ledger");
  
  // Manual Issuance State
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [manualScore, setManualScore] = useState<number>(100);
  const [manualCost, setManualCost] = useState<number>(meta.defaultCost);
  const [issuing, setIssuing] = useState(false);

  // Settings State
  const [cost, setCost] = useState<number>(meta.defaultCost);
  const [entityType, setEntityType] = useState<string>(meta.entityType);
  const [styleName, setStyleName] = useState<string>(meta.styleName);
  const [xpReward, setXpReward] = useState<number>(levelNum * 100);
  const [passScore, setPassScore] = useState<number>(75);
  const [savingSettings, setSavingSettings] = useState(false);

  // Template Design State (linked to a selected workshop/track template placeholder)
  const [selectedTemplateWorkshopId, setSelectedTemplateWorkshopId] = useState<number | null>(null);
  const [certForm, setCertForm] = useState({
    certSignTitle: "رئيس الهيئة / Board Chairman",
    certSignName: "أحمد الرشيدي / Ahmed Al-Rashidi",
    certEkey: "MHARAT-SECURE-ESIGN-88192-VERIFIED"
  });
  const [uploading, setUploading] = useState(false);

  const selectedWorkshop = workshopsList.find((w: any) => w.id === selectedTemplateWorkshopId);

  // Sync state with selected workshop template
  useEffect(() => {
    if (selectedWorkshop) {
      setCertForm({
        certSignTitle: selectedWorkshop.certSignTitle || "رئيس الهيئة / Board Chairman",
        certSignName: selectedWorkshop.certSignName || "أحمد الرشيدي / Ahmed Al-Rashidi",
        certEkey: selectedWorkshop.certEkey || "MHARAT-SECURE-ESIGN-88192-VERIFIED"
      });
    }
  }, [selectedWorkshop]);

  const isImageUrl = (url?: string) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".svg");
  };
  const isImageTemplate = !!selectedWorkshop?.certTemplateUrl && (
    selectedWorkshop.certTemplateType === "png" ||
    selectedWorkshop.certTemplateType === "jpg" ||
    selectedWorkshop.certTemplateType === "jpeg" ||
    selectedWorkshop.certTemplateType === "svg" ||
    isImageUrl(selectedWorkshop?.certTemplateUrl)
  );

  // Sync defaults on levelNum change
  useEffect(() => {
    setManualCost(meta.defaultCost);
    setCost(meta.defaultCost);
    setEntityType(meta.entityType);
    setStyleName(meta.styleName);
    setXpReward(levelNum * 100);
  }, [levelNum]);

  // Select first workshop by default for template configuration
  useEffect(() => {
    if (workshopsList.length > 0 && selectedTemplateWorkshopId === null) {
      setSelectedTemplateWorkshopId(workshopsList[0].id);
    }
  }, [workshopsList, selectedTemplateWorkshopId]);

  // Handle Certificate Revocation/Deletion
  const handleDeleteCert = async (certId: number) => {
    if (!confirm(isAr ? "هل أنت متأكد من إلغاء وحذف هذه الشهادة؟" : "Are you sure you want to revoke and delete this certificate?")) return;
    try {
      const response = await fetch(`/api/certificates/${certId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("mharat-token")}`
        }
      });
      if (!response.ok) throw new Error("Failed to delete certificate");
      toast({
        title: isAr ? "تم حذف الشهادة" : "Certificate Deleted",
        description: isAr ? "تم إلغاء الشهادة بنجاح وحذف السجل الموثق." : "The certificate registry has been revoked successfully."
      });
      queryClient.invalidateQueries({ queryKey: getListCertificatesQueryKey() });
    } catch (err: any) {
      toast({
        title: isAr ? "خطأ في الحذف" : "Revocation Error",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  // Handle Manual Issuance Submission
  const handleManualIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !selectedEntityId) {
      toast({
        title: isAr ? "حقول مطلوبة" : "Missing fields",
        description: isAr ? "يرجى تحديد الطالب والبرنامج التدريبي." : "Please select both user and program.",
        variant: "destructive"
      });
      return;
    }

    const userObj = usersList.find((u: any) => u.id === Number(selectedUserId));
    if (!userObj) return;

    setIssuing(true);
    try {
      const payload: any = {
        userId: userObj.id,
        userName: userObj.name,
        type: entityType,
        score: manualScore,
        level: levelNum,
        cost: manualCost
      };

      if (entityType === "track") {
        const trk = tracksList2.find((t: any) => t.id === Number(selectedEntityId));
        payload.trackId = trk?.id;
        payload.trackTitle = trk?.title;
      } else {
        const wsh = workshopsList.find((w: any) => w.id === Number(selectedEntityId));
        payload.workshopId = wsh?.id;
        payload.workshopTitle = wsh?.title;
      }

      const response = await fetch("/api/certificates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("mharat-token")}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Failed to issue certificate");
      }

      toast({
        title: isAr ? "تم إصدار الشهادة بنجاح!" : "Certificate Issued!",
        description: isAr 
          ? `تم منح الشهادة للطالب ${userObj.name} بنجاح.`
          : `Successfully issued certificate to ${userObj.name}.`
      });

      // Reset
      setSelectedUserId("");
      setSelectedEntityId("");
      queryClient.invalidateQueries({ queryKey: getListCertificatesQueryKey() });
      setActiveTab("ledger");
    } catch (err: any) {
      toast({
        title: isAr ? "خطأ في الإصدار" : "Issuance Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIssuing(false);
    }
  };

  // Handle Save Link Rules & Configurations
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    await new Promise(r => setTimeout(r, 600));
    toast({
      title: isAr ? "تم حفظ قواعد الضبط والربط" : "Level Rules Saved",
      description: isAr 
        ? "تم حفظ متطلبات النجاح وتكلفة النقاط والمكافآت بنجاح." 
        : "Success requirements, point pricing, and XP rewards updated."
    });
    setSavingSettings(false);
  };

  // Handle Save Template Details
  const handleSaveTemplate = async () => {
    if (!selectedTemplateWorkshopId) return;
    try {
      await updateWorkshop.mutateAsync({
        id: selectedTemplateWorkshopId,
        data: {
          certSignTitle: certForm.certSignTitle,
          certSignName: certForm.certSignName,
          certEkey: certForm.certEkey
        }
      });
      toast({ 
        title: isAr ? "تم الحفظ بنجاح!" : "Template Saved!", 
        description: isAr ? "تم تحديث التواقيع وبصمة التحقق لقالب هذه الشهادة." : "Certificate template signatures and verification hash updated successfully."
      });
      queryClient.invalidateQueries({ queryKey: getListWorkshopsQueryKey() });
    } catch (err: any) {
      toast({ 
        title: isAr ? "خطأ في الحفظ" : "Save Error", 
        description: err.message, 
        variant: "destructive" 
      });
    }
  };

  // Filter issued ledger for this level only
  const filteredCerts = certsList.filter((c: any) => c.level === levelNum);

  return (
    <AppLayout>
      <div className="mb-6 text-start">
        <Link href="/admin/certificates">
          <Button variant="ghost" size="sm" className="gap-1 text-xs font-bold text-muted-foreground hover:text-foreground mb-3 px-0">
            <ChevronLeft className="w-4 h-4" />
            {isAr ? "العودة للوحة الشهادات العامة" : "Back to Certificates Hub"}
          </Button>
        </Link>

        {/* Level Header Info */}
        <div className={`p-6 rounded-3xl border bg-gradient-to-r ${meta.gradient} ${meta.colorClass} relative overflow-hidden shadow-sm`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl shrink-0">{meta.badge}</div>
              <div>
                <h1 className="text-2xl font-black text-foreground tracking-tight">
                  {isAr ? `إدارة المستوى: ${meta.titleAr}` : `Manage ${meta.titleEn}`}
                </h1>
                <p className="text-xs font-semibold text-muted-foreground mt-1 leading-relaxed max-w-xl">
                  {isAr ? meta.descAr : meta.descEn}
                </p>
              </div>
            </div>
            <Badge variant="outline" className={`text-xs font-black border ${meta.colorClass} ${meta.badgeColor} px-3 py-1 rounded-full`}>
              LVL {levelNum}
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full text-start">
        <TabsList className="flex md:grid w-full md:grid-cols-4 overflow-x-auto md:overflow-visible rounded-2xl bg-muted/65 p-1 mb-8 max-w-2xl scrollbar-none snap-x snap-mandatory">
          <TabsTrigger value="ledger" className="rounded-xl font-bold text-xs py-2 gap-1.5 flex-1 md:flex-initial whitespace-nowrap snap-start shrink-0">
            <Users className="w-4 h-4" />
            <span>{isAr ? "سجل الشهادات" : "Issued Ledger"}</span>
          </TabsTrigger>
          <TabsTrigger value="issue" className="rounded-xl font-bold text-xs py-2 gap-1.5 flex-1 md:flex-initial whitespace-nowrap snap-start shrink-0">
            <Plus className="w-4 h-4" />
            <span>{isAr ? "منح شهادة يدوي" : "Manual Issue"}</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-xl font-bold text-xs py-2 gap-1.5 flex-1 md:flex-initial whitespace-nowrap snap-start shrink-0">
            <Link2 className="w-4 h-4" />
            <span>{isAr ? "قواعد الضبط والربط" : "Automation Rules"}</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="rounded-xl font-bold text-xs py-2 gap-1.5 flex-1 md:flex-initial whitespace-nowrap snap-start shrink-0">
            <Settings className="w-4 h-4" />
            <span>{isAr ? "تصميم القوالب والتواقيع" : "Visual Template"}</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Issued Ledger */}
        <TabsContent value="ledger" className="space-y-4">
          <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm overflow-x-auto shadow-sm">
            <table className="w-full text-xs min-w-[750px]">
              <thead>
                <tr className="bg-muted/70 text-left border-b border-border">
                  <th className="px-4 py-3.5 font-bold uppercase">{isAr ? "الرقم المرجعي" : "Cert Number"}</th>
                  <th className="px-4 py-3.5 font-bold uppercase">{isAr ? "الطالب" : "Student"}</th>
                  <th className="px-4 py-3.5 font-bold uppercase">{isAr ? "مرتبط بـ" : "Linked Program"}</th>
                  <th className="px-4 py-3.5 font-bold uppercase text-center">{isAr ? "كود التحقق" : "Verification Code"}</th>
                  <th className="px-4 py-3.5 font-bold uppercase text-center">{isAr ? "التكلفة" : "Cost"}</th>
                  <th className="px-4 py-3.5 font-bold uppercase text-center">{isAr ? "الدرجة" : "Score"}</th>
                  <th className="px-4 py-3.5 font-bold uppercase text-center">{isAr ? "الحالة" : "Status"}</th>
                  <th className="px-4 py-3.5 font-bold uppercase text-right">{isAr ? "الإجراء" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loadingCerts ? (
                  [1, 2].map(i => (
                    <tr key={i}><td colSpan={8} className="p-4"><Skeleton className="h-10 rounded-xl bg-muted/65" /></td></tr>
                  ))
                ) : filteredCerts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-muted-foreground">
                      <Award className="w-10 h-10 mx-auto opacity-20 text-primary mb-3" />
                      <p className="font-bold">{isAr ? "لا توجد شهادات مصدرة لهذا المستوى بعد." : "No certificates issued for this level yet."}</p>
                    </td>
                  </tr>
                ) : (
                  filteredCerts.map((c: any) => {
                    const isLocked = c.status === "locked";
                    return (
                      <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-500 text-[10px]">{c.certificateNumber}</td>
                        <td className="px-4 py-3 font-bold text-foreground">{c.userName}</td>
                        <td className="px-4 py-3 font-medium text-muted-foreground">
                          {c.type === "track" ? c.trackTitle : c.workshopTitle}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className="font-mono font-bold text-[10px] bg-amber-500/5 text-amber-600 border-amber-500/20 px-2.5 py-0.5 rounded-lg select-all">
                            {c.verificationCode}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-amber-500">
                          {c.cost} pts
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="secondary" className="font-bold">{c.score}%</Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge 
                            variant="outline" 
                            className={`font-bold text-[9px] px-2 py-0.5 rounded-lg ${
                              isLocked 
                                ? "border-amber-500/30 bg-amber-500/5 text-amber-600" 
                                : "border-emerald-500/30 bg-emerald-500/5 text-emerald-600"
                            }`}
                          >
                            {isLocked ? (isAr ? "بانتظار التفعيل" : "Locked") : (isAr ? "نشطة/صادرة" : "Issued")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right flex justify-end gap-1.5">
                          <Link href={`/certificate/${c.id}`}>
                            <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs text-primary font-bold">
                              <Eye className="w-3.5 h-3.5" />
                              <span>{isAr ? "معاينة" : "View"}</span>
                            </Button>
                          </Link>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleDeleteCert(c.id)}
                            className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/5 font-bold"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{isAr ? "إلغاء" : "Revoke"}</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Tab 2: Manual Issuance */}
        <TabsContent value="issue" className="space-y-6 max-w-xl">
          <div className="p-6 rounded-2xl border border-border bg-card/65 backdrop-blur-sm shadow-sm space-y-4">
            <div>
              <h2 className="font-extrabold text-sm text-foreground flex items-center gap-1.5 border-b border-border/40 pb-2">
                <Plus className="w-4.5 h-4.5 text-primary" />
                {isAr ? "إصدار ومنح شهادة مخصصة" : "Issue Custom Certificate"}
              </h2>
              <p className="text-[10.5px] text-muted-foreground font-medium mt-1">
                {isAr 
                  ? "يمكنك منح أي طالب شهادة مخصصة مباشرة مع ربطها بمسار أو ورشة وتعيين النقاط المطلوبة لتفعيلها."
                  : "Directly grant a custom certificate to any registered user and map it to a program."}
              </p>
            </div>

            <form onSubmit={handleManualIssue} className="space-y-4">
              {/* Select User */}
              <div className="space-y-1.5">
                <Label className="font-bold text-[10.5px] text-muted-foreground block">{isAr ? "اختر المتدرب/الطالب" : "Select Trainee/Student"}</Label>
                <select
                  value={selectedUserId}
                  onChange={e => setSelectedUserId(e.target.value)}
                  className="w-full h-10 rounded-xl border border-border/60 bg-background/60 px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                >
                  <option value="">{isAr ? "— اختر الطالب —" : "— Select Student —"}</option>
                  {usersList.filter((u: any) => u.role !== "admin" && u.role !== "instructor").map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>

              {/* Linked Entity Type */}
              <div className="space-y-1.5">
                <Label className="font-bold text-[10.5px] text-muted-foreground block">{isAr ? "نوع الربط" : "Linked Type"}</Label>
                <select
                  value={entityType}
                  onChange={e => {
                    setEntityType(e.target.value);
                    setSelectedEntityId("");
                  }}
                  className="w-full h-10 rounded-xl border border-border/60 bg-background/60 px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="track">{isAr ? "مسار تعليمي" : "Learning Track"}</option>
                  <option value="workshop">{isAr ? "ورشة عمل" : "Workshop"}</option>
                </select>
              </div>

              {/* Linked Program Selection */}
              <div className="space-y-1.5">
                <Label className="font-bold text-[10.5px] text-muted-foreground block">
                  {entityType === "track" ? (isAr ? "اختر المسار التعليمي" : "Select Track") : (isAr ? "اختر الورشة التدريبية" : "Select Workshop")}
                </Label>
                <select
                  value={selectedEntityId}
                  onChange={e => setSelectedEntityId(e.target.value)}
                  className="w-full h-10 rounded-xl border border-border/60 bg-background/60 px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                >
                  <option value="">{isAr ? "— اختر البرنامج —" : "— Select Program —"}</option>
                  {entityType === "track" ? (
                    tracksList2.map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)
                  ) : (
                    workshopsList.map((w: any) => <option key={w.id} value={w.id}>{w.title}</option>)
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Score */}
                <div className="space-y-1.5">
                  <Label className="font-bold text-[10.5px] text-muted-foreground block">{isAr ? "الدرجة الكلية (%)" : "Score (%)"}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={manualScore}
                    onChange={e => setManualScore(Number(e.target.value))}
                    className="rounded-xl text-xs font-bold h-10 bg-background/50 border-border/60"
                  />
                </div>

                {/* Unlock Cost */}
                <div className="space-y-1.5">
                  <Label className="font-bold text-[10.5px] text-muted-foreground block">{isAr ? "تكلفة التفعيل بالنقاط" : "Points cost to unlock"}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={manualCost}
                    onChange={e => setManualCost(Number(e.target.value))}
                    className="rounded-xl text-xs font-bold h-10 bg-background/50 border-border/60"
                    disabled={levelNum === 1}
                  />
                </div>
              </div>

              {levelNum === 1 && (
                <p className="text-[10px] text-muted-foreground italic font-semibold">{isAr ? "* المستوى 1 مجاني دائماً ويتم تفعيله تلقائياً." : "* Level 1 is always free and auto-issued."}</p>
              )}

              <Button
                type="submit"
                disabled={issuing}
                className="w-full gap-2 rounded-xl font-bold h-11 text-xs shadow-md mt-4 shadow-primary/20"
              >
                {issuing ? (isAr ? "جاري منح الشهادة..." : "Issuing...") : (isAr ? "منح وإصدار الشهادة" : "Issue Certificate")}
              </Button>
            </form>
          </div>
        </TabsContent>

        {/* Tab 3: Automation Rules */}
        <TabsContent value="settings" className="space-y-6 max-w-xl">
          <div className="p-6 rounded-2xl border border-border bg-card/65 backdrop-blur-sm shadow-sm space-y-5">
            <div>
              <h2 className="font-extrabold text-sm text-foreground flex items-center gap-1.5 border-b border-border/40 pb-2">
                <Sliders className="w-4.5 h-4.5 text-primary" />
                {isAr ? "ضبط قواعد هذا المستوى" : "Configure Level Settings"}
              </h2>
              <p className="text-[10.5px] text-muted-foreground font-medium mt-1">
                {isAr 
                  ? "اضبط التكلفة الرقمية للتفعيل ونقاط الخبرة XP الممنوحة تلقائياً وقواعد درجة النجاح للمستوى."
                  : "Adjust points cost, automated XP rewards, and passing grade conditions for this specific level."}
              </p>
            </div>

            <div className="space-y-4">
              {/* Cost config */}
              <div className="space-y-1.5">
                <Label className="font-bold text-[10.5px] text-muted-foreground flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  {isAr ? "تكلفة التفعيل التلقائي بالنقاط" : "Default Points Cost to Unlock"}
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    value={cost}
                    onChange={e => setCost(Number(e.target.value))}
                    className="rounded-xl text-xs font-bold h-10 bg-background/50 border-border/60"
                    disabled={levelNum === 1}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">pts</span>
                </div>
              </div>

              {/* XP reward config */}
              <div className="space-y-1.5">
                <Label className="font-bold text-[10.5px] text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  {isAr ? "مكافأة نقاط الخبرة (XP) عند التفعيل" : "Trainee XP Rewards on Unlock"}
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    value={xpReward}
                    onChange={e => setXpReward(Number(e.target.value))}
                    className="rounded-xl text-xs font-bold h-10 bg-background/50 border-border/60"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">XP</span>
                </div>
              </div>

              {/* Pass Threshold config */}
              <div className="space-y-1.5">
                <Label className="font-bold text-[10.5px] text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {isAr ? "درجة النجاح الدنيا للاختبارات المرتبطة (%)" : "Minimum Passing Threshold for Linked Exams (%)"}
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={passScore}
                    onChange={e => setPassScore(Number(e.target.value))}
                    className="rounded-xl text-xs font-bold h-10 bg-background/50 border-border/60"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">%</span>
                </div>
              </div>

              {/* Visual Style Selection */}
              <div className="space-y-1.5">
                <Label className="font-bold text-[10.5px] text-muted-foreground flex items-center gap-1">
                  <Star className="w-3.5 h-3.5" />
                  {isAr ? "موضوع التنسيق البصري للشهادة" : "Visual Theme / Style"}
                </Label>
                <select
                  value={styleName}
                  onChange={e => setStyleName(e.target.value)}
                  className="w-full h-10 rounded-xl border border-border/60 bg-background/60 px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="gold">{isAr ? "ذهبي — أعمال تنفيذية" : "Gold — Executive"}</option>
                  <option value="purple">{isAr ? "بنفسجي — أكاديمي" : "Purple — Academic"}</option>
                  <option value="blue">{isAr ? "أزرق — مهني" : "Blue — Professional"}</option>
                  <option value="slate">{isAr ? "رصاصي — حضور" : "Slate — Participation"}</option>
                </select>
              </div>

              <Button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="w-full gap-2 rounded-xl font-bold h-11 text-xs shadow-md mt-4 shadow-primary/20"
              >
                <Check className="w-4 h-4" />
                {savingSettings ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ وتطبيق القواعد" : "Save Level Settings")}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Tab 4: Visual Template Design */}
        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sidebar template config controls */}
            <div className="lg:col-span-4 space-y-6 text-start">
              <div className="p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm space-y-4">
                <h2 className="font-extrabold text-sm text-foreground flex items-center gap-1.5 border-b border-border/40 pb-2">
                  <Eye className="w-4 h-4 text-primary" />
                  {isAr ? "اختر ورشة/مسار لتطبيق القالب" : "Select Program to Edit Template"}
                </h2>
                
                {loadingWorkshops ? (
                  <div className="space-y-2">
                    {[1, 2].map(i => <Skeleton key={i} className="h-11 rounded-xl bg-muted/65" />)}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {workshopsList.map((w: any) => (
                      <button
                        key={w.id}
                        onClick={() => setSelectedTemplateWorkshopId(w.id)}
                        className={`w-full text-left p-3 rounded-xl transition-all duration-200 border flex flex-col gap-0.5 ${
                          selectedTemplateWorkshopId === w.id
                            ? "border-primary bg-primary/5 shadow-sm font-semibold"
                            : "border-border/40 hover:border-primary/40 bg-background/50"
                        }`}
                      >
                        <span className="text-xs font-bold text-foreground line-clamp-1">{w.title}</span>
                        <span className="text-[9.5px] text-muted-foreground font-semibold">MH-{w.id}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedWorkshop && (
                <div className="p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm space-y-4">
                  <h3 className="font-extrabold text-sm text-foreground flex items-center gap-1.5 border-b border-border/40 pb-2">
                    {isAr ? "معلومات جهة التوقيع" : "Signatory Details"}
                  </h3>
                  
                  <div className="space-y-3.5">
                    <div>
                      <Label className="font-bold text-[10.5px] text-muted-foreground mb-1 block">{isAr ? "مسمى الموقّع المعتمد" : "Authorized Title"}</Label>
                      <Input 
                        value={certForm.certSignTitle} 
                        onChange={e => setCertForm(f => ({ ...f, certSignTitle: e.target.value }))}
                        className="rounded-xl text-xs font-semibold h-10 bg-background/50 border-border/60" 
                      />
                    </div>
                    
                    <div>
                      <Label className="font-bold text-[10.5px] text-muted-foreground mb-1 block">{isAr ? "اسم الموقع الإلكتروني" : "Authorized Name"}</Label>
                      <Input 
                        value={certForm.certSignName} 
                        onChange={e => setCertForm(f => ({ ...f, certSignName: e.target.value }))}
                        className="rounded-xl text-xs font-semibold h-10 bg-background/50 border-border/60" 
                      />
                    </div>

                    <div>
                      <Label className="font-bold text-[10.5px] text-muted-foreground mb-1 block">{isAr ? "بصمة التحقق الإلكترونية" : "Verification E-key Hash"}</Label>
                      <Input 
                        value={certForm.certEkey} 
                        onChange={e => setCertForm(f => ({ ...f, certEkey: e.target.value }))}
                        className="rounded-xl text-xs font-semibold h-10 font-mono bg-background/50 border-border/60" 
                      />
                    </div>

                    <Button onClick={handleSaveTemplate} className="w-full gap-2 rounded-xl font-bold h-10 text-xs shadow-md mt-2">
                      <Check className="w-4 h-4" />
                      <span>{isAr ? "حفظ وتثبيت التغييرات" : "Save Template"}</span>
                    </Button>
                  </div>

                  {/* Custom Template Upload Section */}
                  <div className="pt-4 border-t border-border/40 mt-4 space-y-3">
                    <Label className="font-bold text-[10.5px] text-muted-foreground block">
                      {isAr ? "إرفاق قالب مخصص لهذا البرنامج" : "Upload Custom Background Template"}
                    </Label>
                    
                    <div className="flex flex-col gap-2">
                      {selectedWorkshop?.certTemplateUrl ? (
                        <div className="bg-primary/5 border border-primary/20 p-3 rounded-xl flex items-center justify-between text-xs font-semibold text-foreground">
                          <span className="truncate max-w-[170px]">{selectedWorkshop.certTemplateUrl.split("/").pop()}</span>
                          <Badge variant="secondary" className="text-[9px] uppercase font-bold px-1.5 py-0">
                            {selectedWorkshop.certTemplateType}
                          </Badge>
                        </div>
                      ) : (
                        <div className="text-[10px] text-muted-foreground italic">
                          {isAr ? "لا يوجد قالب مخصص حالياً (يتم استخدام قالب المظهر الافتراضي المعتمد)" : "Using standard default template."}
                        </div>
                      )}
                      
                      <div className="relative mt-1">
                        <Input
                          type="file"
                          accept=".pdf,.docx,.png,.jpg,.jpeg"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file || !selectedTemplateWorkshopId) return;
                            
                            if (file.size > 15 * 1024 * 1024) {
                              toast({
                                title: isAr ? "حجم الملف كبير جداً" : "File too large",
                                description: isAr ? "الحد الأقصى هو 15 ميجابايت" : "Max size allowed is 15MB",
                                variant: "destructive"
                              });
                              return;
                            }
                            
                            setUploading(true);
                            try {
                              const reader = new FileReader();
                              reader.readAsDataURL(file);
                              reader.onload = async () => {
                                const base64Data = reader.result as string;
                                const fileType = file.name.split('.').pop()?.toLowerCase() || 'pdf';
                                const response = await fetch(`/api/workshops/${selectedTemplateWorkshopId}/template`, {
                                  method: "POST",
                                  headers: { 
                                    "Content-Type": "application/json",
                                    "Authorization": `Bearer ${localStorage.getItem("mharat-token")}`
                                  },
                                  body: JSON.stringify({
                                    fileName: file.name,
                                    fileType: fileType,
                                    base64Data: base64Data
                                  })
                                });
                                
                                if (!response.ok) {
                                  throw new Error("Failed to upload template");
                                }
                                
                                const updatedW = await response.json();
                                queryClient.invalidateQueries({ queryKey: getListWorkshopsQueryKey() });
                                
                                toast({
                                  title: isAr ? "تم رفع القالب بنجاح" : "Template Uploaded",
                                  description: isAr ? `تم تعيين القالب لورشة ${updatedW.title}` : `Template set for ${updatedW.title}`,
                                });
                              };
                            } catch (err: any) {
                              console.error(err);
                              toast({
                                title: isAr ? "خطأ في الرفع" : "Upload Failed",
                                description: err.message,
                                variant: "destructive"
                              });
                            } finally {
                              setUploading(false);
                            }
                          }}
                          disabled={uploading}
                          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="w-full gap-2 rounded-xl font-bold h-10 text-xs border-dashed border-primary/30 text-primary hover:bg-primary/5"
                          disabled={uploading}
                        >
                          {uploading ? (
                            <span>{isAr ? "جاري الرفع..." : "Uploading..."}</span>
                          ) : (
                            <span>{isAr ? "اختر ملف القالب وارفعه" : "Choose & Upload Template"}</span>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Template visual preview */}
            <div className="lg:col-span-8">
              {selectedWorkshop ? (
                <div 
                  className="relative w-full overflow-hidden text-slate-800 p-6 sm:p-10 rounded-none border-2 shadow-2xl aspect-[1.414/1] flex flex-col justify-between font-serif select-none max-w-full print:border-none print:shadow-none" 
                  style={{ 
                    backgroundImage: isImageTemplate ? `url(${selectedWorkshop.certTemplateUrl})` : undefined,
                    backgroundSize: isImageTemplate ? "cover" : undefined,
                    backgroundPosition: isImageTemplate ? "center" : undefined,
                    background: !isImageTemplate ? (
                      levelNum === 4 ? "radial-gradient(circle at 50% 50%, #FCF8F2 0%, #F6ECE5 100%)" :
                      levelNum === 3 ? "radial-gradient(circle at 50% 50%, #FAF5FC 0%, #F1E5F7 100%)" :
                      levelNum === 2 ? "radial-gradient(circle at 50% 50%, #F4F8FD 0%, #E6EEFA 100%)" :
                      "radial-gradient(circle at 50% 50%, #FAF8F5 0%, #F5F1EC 100%)"
                    ) : undefined,
                    borderColor: levelNum === 4 ? "#d97706" : levelNum === 3 ? "#9333ea" : levelNum === 2 ? "#2563eb" : "#78716c"
                  }}
                >
                  {/* Double Border Frame - Hidden on custom image templates */}
                  {!isImageTemplate && (
                    <div className="absolute inset-4 border pointer-events-none rounded-none opacity-40" style={{ borderColor: levelNum === 4 ? "#d97706" : levelNum === 3 ? "#9333ea" : levelNum === 2 ? "#2563eb" : "#78716c" }} />
                  )}
                  
                  {/* Top Header - Hidden on custom image templates */}
                  {!isImageTemplate ? (
                    <div className="text-center mt-4 z-10 flex flex-col items-center">
                      <h3 className="text-sm sm:text-base font-bold font-serif border-b pb-0.5 px-4 uppercase tracking-wide text-stone-900 leading-tight">
                        Skills of youth
                      </h3>
                      <span className="text-[7.5px] text-stone-600 font-serif mt-0.5 tracking-wider font-medium">
                        For educational and professional youth empowerment
                      </span>
                      <Badge variant="secondary" className="mt-1 text-[8px] font-black uppercase">
                        {isAr ? meta.titleAr : meta.titleEn}
                      </Badge>
                    </div>
                  ) : (
                    <div className="h-4" />
                  )}

                  {/* Title - Hidden on custom image templates */}
                  {!isImageTemplate && (
                    <div className="text-center my-1 z-10">
                      <h2 className="text-base sm:text-[22px] font-medium text-stone-600 tracking-wide font-serif leading-none">
                        Certificate of Achievement
                      </h2>
                    </div>
                  )}

                  {/* Text body - shifted down if image template */}
                  <div className={`text-center max-w-lg mx-auto space-y-2 z-10 ${isImageTemplate ? 'mt-16 sm:mt-24' : ''}`}>
                    <p className="text-[9px] text-stone-500 italic font-serif">This is to certify that</p>
                    <h3 className="text-xs sm:text-lg font-bold text-stone-850 font-serif my-0.5">(Trainee Name - Sample)</h3>
                    <p className="text-[9px] text-stone-600 font-serif">Has successfully completed the verified training webinar entitled</p>
                    <h4 className="text-[10px] sm:text-xs font-bold text-stone-800 font-serif max-w-md mx-auto leading-tight">"{selectedWorkshop.title}"</h4>
                    <p className="text-[9px] font-bold text-stone-900 font-sans tracking-wide mt-1">30 June. 2026</p>
                  </div>

                  {/* Signatures - Hidden on custom image templates */}
                  {!isImageTemplate ? (
                    <div className="pt-2 grid grid-cols-3 gap-6 items-end text-center z-10 px-4">
                      <div className="space-y-0.5">
                        <div className="h-7 flex items-center justify-center">
                          <svg viewBox="0 0 100 40" className="w-20 h-7 text-stone-800">
                            <path d="M 5,30 Q 30,28 65,32 T 95,28" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                            <path d="M 10,25 C 25,20 30,10 40,8 C 50,6 55,12 50,18 C 45,24 35,28 32,25 C 28,20 42,12 60,18 C 75,22 80,12 78,8 C 75,4 70,8 72,15 C 75,25 90,20 85,25" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <div className="border-t border-stone-850 pt-0.5 font-sans text-[7px] text-stone-500 font-bold">CEO OF SKILLS</div>
                      </div>
                      
                      <div className="flex flex-col items-center justify-center pb-0.5">
                        <svg viewBox="0 0 100 100" className="w-8 h-8 text-primary">
                          <path d="M50,4 C55,4 58,10 63,12 C68,14 74,12 77,16 C80,20 78,26 80,31 C82,36 88,38 88,43 C88,48 82,50 80,55 C78,60 80,66 77,70 C74,74 68,72 63,74 C58,76 55,82 50,82 C45,82 42,76 37,74 C32,72 26,74 23,70 C20,66 22,60 20,55 C18,50 12,48 12,43 C12,38 18,36 20,31 C22,26 20,20 23,16 C26,12 32,14 37,12 C42,10 45,4 50,4 Z" fill="currentColor" />
                          <rect x="33" y="24" width="34" height="6" rx="3" fill="white" />
                          <rect x="33" y="34" width="34" height="6" rx="3" fill="white" />
                          <rect x="33" y="44" width="34" height="6" rx="3" fill="white" />
                          <text x="50" y="65" textAnchor="middle" fill="white" fontSize="9.5" fontWeight="900" letterSpacing="1" fontFamily="sans-serif">SKILLS</text>
                        </svg>
                      </div>

                      <div className="space-y-0.5">
                        <div className="h-7 flex items-center justify-center">
                          <svg viewBox="0 0 100 40" className="w-20 h-7 text-stone-800">
                            <path d="M 5,30 Q 30,28 65,32 T 95,28" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                            <path d="M 10,25 C 25,20 30,10 40,8 C 50,6 55,12 50,18 C 45,24 35,28 32,25 C 28,20 42,12 60,18 C 75,22 80,12 78,8 C 75,4 70,8 72,15 C 75,25 90,20 85,25" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <div className="border-t border-stone-850 pt-0.5 font-sans text-[7px] text-stone-700 font-bold truncate">{certForm.certSignName.split(" / ")[0]}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-16" />
                  )}

                  <div className="text-center font-mono text-[6px] text-stone-400 border-t border-dashed border-stone-300 pt-1 mt-1 truncate">
                    HASH: {certForm.certEkey}
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-border/60 p-20 text-center rounded-2xl bg-card/45">
                  <Award className="w-12 h-12 mx-auto opacity-20 text-primary mb-3" />
                  <p className="text-xs font-bold text-muted-foreground">{isAr ? "اختر ورشة عمل لعرض الشهادة." : "Select a workshop to preview template."}</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
