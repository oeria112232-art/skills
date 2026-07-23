import { useState, useEffect } from "react";
import { 
  useListWorkshops, 
  useUpdateWorkshop, 
  useListCertificates,
  getListWorkshopsQueryKey,
  useListTracks,
  getListTracksQueryKey,
  getListCertificatesQueryKey,
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
import { Award, ShieldCheck, Settings, Eye, Users, Sparkles, Check, Sliders, DollarSign, Link2, Layers, Star, Plus, Trash2, Download } from "lucide-react";
import { Link } from "wouter";
import { OfficialCertificate } from "@/components/shared/OfficialCertificate";

export default function AdminCertificatesPage() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: workshops, isLoading: loadingWorkshops } = useListWorkshops();
  const { data: issuedCerts, isLoading: loadingCerts } = useListCertificates();
  const { data: tracks } = useListTracks();
  const updateWorkshop = useUpdateWorkshop();

  const certsList = Array.isArray(issuedCerts) ? issuedCerts : (issuedCerts && Array.isArray((issuedCerts as any).data) ? (issuedCerts as any).data : []);
  const workshopsList = Array.isArray(workshops) ? workshops : (workshops && Array.isArray((workshops as any).data) ? (workshops as any).data : []);
  const tracksList = Array.isArray(tracks) ? tracks : (tracks && Array.isArray((tracks as any).data) ? (tracks as any).data : []);

  // Entity selection for template designer (workshop or track)
  const [targetType, setTargetType] = useState<"workshop" | "track">("workshop");
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null);

  // Certificate Settings state (per-level pricing, shape, linked entity)
  const [certSettings, setCertSettings] = useState({
    level4Cost: "500",
    level3Cost: "250",
    level2Cost: "100",
    level1Cost: "0",
    level4Entity: "track",
    level3Entity: "track",
    level2Entity: "workshop",
    level1Entity: "workshop",
    level4Style: "gold",
    level3Style: "purple",
    level2Style: "blue",
    level1Style: "slate",
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [certForm, setCertForm] = useState({
    certSignTitle: "",
    certSignName: "",
    certEkey: "",
    certTemplateType: "default"
  });

  // Manual Issuance State
  const [manualEntityType, setManualEntityType] = useState<string>("track");
  const [manualEntityId, setManualEntityId] = useState<string>("");
  const [manualScore, setManualScore] = useState<number>(100);
  const [manualLevel, setManualLevel] = useState<number>(3); // default to 3 (Professional)
  const [manualIssuing, setManualIssuing] = useState(false);

  const selectedWorkshop = workshopsList.find((w: any) => w.id === selectedEntityId);
  const selectedTrack = tracksList.find((t: any) => t.id === selectedEntityId);
  const selectedEntity = targetType === "workshop" ? selectedWorkshop : selectedTrack;

  // Sync form state with selected entity
  useEffect(() => {
    if (selectedEntity) {
      setCertForm({
        certSignTitle: selectedEntity.certSignTitle || "رئيس الهيئة / Board Chairman",
        certSignName: selectedEntity.certSignName || "أحمد الرشيدي / Ahmed Al-Rashidi",
        certEkey: selectedEntity.certEkey || "MHARAT-SECURE-ESIGN-88192-VERIFIED",
        certTemplateType: selectedEntity.certTemplateType || "default"
      });
    }
  }, [selectedEntityId, targetType, workshopsList, tracksList]);

  // Select first item by default when list or targetType changes
  useEffect(() => {
    if (targetType === "workshop" && workshopsList.length > 0 && (selectedEntityId === null || !selectedWorkshop)) {
      setSelectedEntityId(workshopsList[0].id);
    } else if (targetType === "track" && tracksList.length > 0 && (selectedEntityId === null || !selectedTrack)) {
      setSelectedEntityId(tracksList[0].id);
    }
  }, [targetType, workshopsList, tracksList, selectedEntityId]);

  const handleSaveTemplate = async () => {
    if (!selectedEntityId) return;
    setSavingSettings(true);
    try {
      if (targetType === "workshop") {
        await updateWorkshop.mutateAsync({
          id: selectedEntityId,
          data: {
            certSignTitle: certForm.certSignTitle,
            certSignName: certForm.certSignName,
            certEkey: certForm.certEkey,
            certTemplateType: certForm.certTemplateType
          }
        });
      } else {
        const response = await fetch(`/api/tracks/${selectedEntityId}`, {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("mharat-token")}`
          },
          body: JSON.stringify({
            certSignTitle: certForm.certSignTitle,
            certSignName: certForm.certSignName,
            certEkey: certForm.certEkey,
            certTemplateType: certForm.certTemplateType
          })
        });
        if (!response.ok) throw new Error("Failed to update track template");
      }

      toast({ 
        title: isAr ? "تم الحفظ بنجاح!" : "Template Saved!", 
        description: isAr ? "تم تحديث التواقيع وبصمة التحقق لقالب هذه الشهادة." : "Certificate template updated successfully."
      });
      queryClient.invalidateQueries({ queryKey: getListWorkshopsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListTracksQueryKey() });
    } catch (err: any) {
      toast({ 
        title: isAr ? "خطأ في الحفظ" : "Save Error", 
        description: err.message, 
        variant: "destructive" 
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRemoveTemplate = async () => {
    if (!selectedEntityId) return;
    setUploading(true);
    try {
      const endpoint = targetType === "workshop" 
        ? `/api/workshops/${selectedEntityId}/template`
        : `/api/tracks/${selectedEntityId}/template`;
      
      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("mharat-token")}`
        }
      });
      if (!response.ok) throw new Error("Failed to remove template");

      queryClient.invalidateQueries({ queryKey: getListWorkshopsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListTracksQueryKey() });

      toast({
        title: isAr ? "تم إزالة القالب" : "Template Removed",
        description: isAr ? "تم التراجع إلى القالب التفاعلي الافتراضي" : "Reverted to standard template"
      });
    } catch (err: any) {
      toast({
        title: isAr ? "خطأ في الإزالة" : "Removal Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    await new Promise(r => setTimeout(r, 600));
    toast({
      title: isAr ? "تم حفظ إعدادات الشهادات" : "Certificate Settings Saved",
      description: isAr ? "تم تحديث مستويات الأسعار والهيكلية بنجاح." : "Level pricing & hierarchy configuration updated successfully."
    });
    setSavingSettings(false);
  };

  const handleManualIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEntityId) {
      toast({
        title: isAr ? "يرجى تحديد البرنامج" : "Please select a program",
        description: isAr ? "اختر مسار تعليمي أو ورشة عمل." : "Choose a learning track or workshop.",
        variant: "destructive"
      });
      return;
    }

    setManualIssuing(true);
    try {
      const response = await fetch("/api/certificates/batch-issue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("mharat-token")}`
        },
        body: JSON.stringify({
          type: manualEntityType,
          entityId: Number(manualEntityId),
          score: manualScore,
          level: manualLevel
        })
      });

      if (!response.ok) throw new Error("Failed to issue certificates");
      const result = await response.json();

      if (result.issuedCount === 0) {
        toast({
          title: isAr ? "لا توجد شهادات جديدة" : "No new certificates",
          description: isAr
            ? `${result.message} — جميع الطلاب الحاصلين على إكمال المسار لديهم شهادة بالفعل.`
            : `${result.message} — All students who completed the program already have a certificate.`
        });
      } else {
        toast({
          title: isAr ? `تم إصدار ${result.issuedCount} شهادة!` : `${result.issuedCount} Certificate(s) Issued!`,
          description: isAr
            ? `تم منح الشهادة لـ ${result.issuedCount} طالب (${result.skippedCount} لديهم شهادة بالفعل).`
            : `Granted certificates to ${result.issuedCount} students (${result.skippedCount} already had one).`
        });
      }

      setManualEntityId("");
      setManualScore(100);
      queryClient.invalidateQueries({ queryKey: getListCertificatesQueryKey() });
    } catch (err: any) {
      toast({
        title: isAr ? "خطأ في الإصدار" : "Issuance Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setManualIssuing(false);
    }
  };

  // Helper variables for rendering preview templates cleanly
  const isImageUrl = (url?: string) => {
    if (!url) return false;
    const cleanUrl = url.split("?")[0].split("#")[0].toLowerCase();
    return (
      cleanUrl.endsWith(".png") ||
      cleanUrl.endsWith(".jpg") ||
      cleanUrl.endsWith(".jpeg") ||
      cleanUrl.endsWith(".svg") ||
      cleanUrl.endsWith(".webp")
    );
  };
  const isImageTemplate = !!selectedEntity?.certTemplateUrl && (
    selectedEntity.certTemplateType === "png" ||
    selectedEntity.certTemplateType === "jpg" ||
    selectedEntity.certTemplateType === "jpeg" ||
    selectedEntity.certTemplateType === "svg" ||
    selectedEntity.certTemplateType === "webp" ||
    selectedEntity.certTemplateType?.startsWith("image/") ||
    selectedEntity.certTemplateType?.startsWith("overlay") ||
    isImageUrl(selectedEntity?.certTemplateUrl)
  );
  const isDocTemplate = !!selectedEntity?.certTemplateUrl && !isImageTemplate;

  const renderPreview = () => {
    if (!selectedEntity) return null;

    const cacheBuster = (selectedEntity as any)?.updatedAt ? new Date((selectedEntity as any).updatedAt).getTime() : Date.now();

    return (
      <div className="space-y-4">
        {/* Banner if PDF/Document is attached */}
        {isDocTemplate && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-3 sm:p-4 rounded-2xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-400 font-bold min-w-0">
              <Award className="w-5 h-5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="truncate font-extrabold">{isAr ? "تم تعيين مستند قالب مخصص (PDF / Word)" : "Custom Document Template Attached"}</p>
                <p className="text-[10px] text-amber-600/80 font-mono truncate">{selectedEntity.certTemplateUrl?.split("/").pop()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <a href={selectedEntity.certTemplateUrl} target="_blank" rel="noreferrer">
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs font-bold border-amber-500/30 text-amber-700 dark:text-amber-300">
                  <Download className="w-3.5 h-3.5" />
                  <span>{isAr ? "تحميل" : "Download"}</span>
                </Button>
              </a>
              <Button size="sm" variant="destructive" onClick={handleRemoveTemplate} disabled={uploading} className="h-8 gap-1 text-xs font-bold">
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isAr ? "إزالة القالب" : "Remove"}</span>
              </Button>
            </div>
          </div>
        )}

        {/* Banner if Custom Image Template is attached */}
        {isImageTemplate && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 sm:p-4 rounded-2xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-emerald-700 dark:text-emerald-400 font-bold min-w-0">
              <Sparkles className="w-5 h-5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="truncate font-extrabold">{isAr ? "تم تعيين قالب صورة مخصص (PNG / JPG)" : "Custom Image Template Background Active"}</p>
                <p className="text-[10px] text-emerald-600/80 font-mono truncate">{selectedEntity.certTemplateUrl?.split("/").pop()}</p>
              </div>
            </div>
            <Button size="sm" variant="destructive" onClick={handleRemoveTemplate} disabled={uploading} className="h-8 gap-1 text-xs font-bold flex-shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isAr ? "إزالة القالب" : "Remove"}</span>
            </Button>
          </div>
        )}

        {/* Official Certificate Visual Canvas (100% Match to Skills of Youth Template) */}
        <OfficialCertificate
          recipientName={isAr ? "مقتدى علي منصور (نموذج)" : "Muqtada Ali Mansour (Sample)"}
          workshopTitle={selectedEntity.title}
          issueDate={new Date().toLocaleDateString(isAr ? "ar-EG" : "en-US", { day: "numeric", month: "short", year: "numeric" })}
          certSignTitle={certForm.certSignTitle.split(" / ")[0]}
          certSignName={certForm.certSignName.split(" / ")[0]}
          certEkey={certForm.certEkey}
          certTemplateUrl={selectedEntity.certTemplateUrl}
          certTemplateType={certForm.certTemplateType}
          updatedAt={(selectedEntity as any)?.updatedAt}
          isAr={isAr}
          certType={targetType === "track" ? "track" : "participation"}
        />
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="mb-8 text-start">
        <div className="flex items-center gap-2 mb-1.5">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold px-3 py-0.5 rounded-full text-[10px]">
            {isAr ? "لوحة التواقيع والشهادات المعتمدة" : "Verification & Certificate Hub"}
          </Badge>
        </div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
          {isAr ? "إدارة وتوثيق الشهادات" : "Manage Certificates"}
        </h1>
        <p className="text-sm text-muted-foreground font-medium mt-1">
          {isAr
            ? "صمم قوالب الشهادات، واضبط التواقيع وبصمات التحقق، واستعرض سجل الشهادات الممنوحة للطلاب."
            : "Customize certificate designs, configure e-signatures, and monitor the issued students registry."}
        </p>
      </div>

      <Tabs defaultValue="designer" className="w-full text-start">
        <TabsList className="flex md:grid w-full md:grid-cols-4 overflow-x-auto md:overflow-visible rounded-2xl bg-muted/60 p-1 mb-8 max-w-2xl scrollbar-none snap-x snap-mandatory">
          <TabsTrigger value="designer" className="rounded-xl font-bold text-xs py-2 gap-1.5 flex-1 md:flex-initial whitespace-nowrap snap-start shrink-0">
            <Settings className="w-4 h-4" />
            <span>{isAr ? "تصميم القوالب" : "Templates"}</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-xl font-bold text-xs py-2 gap-1.5 flex-1 md:flex-initial whitespace-nowrap snap-start shrink-0">
            <Sliders className="w-4 h-4" />
            <span>{isAr ? "إعدادات الشهادات" : "Cert Settings"}</span>
          </TabsTrigger>
          <TabsTrigger value="issue" className="rounded-xl font-bold text-xs py-2 gap-1.5 flex-1 md:flex-initial whitespace-nowrap snap-start shrink-0">
            <Plus className="w-4 h-4" />
            <span>{isAr ? "منح شهادات" : "Auto Issue"}</span>
          </TabsTrigger>
          <TabsTrigger value="ledger" className="rounded-xl font-bold text-xs py-2 gap-1.5 flex-1 md:flex-initial whitespace-nowrap snap-start shrink-0">
            <Users className="w-4 h-4" />
            <span>{isAr ? "الشهادات المصدرة" : "Issued Ledger"}</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Template Designer */}
        <TabsContent value="designer" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Control Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              <div className="p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm space-y-4">
                <h2 className="font-extrabold text-sm text-foreground flex items-center gap-1.5 border-b border-border/40 pb-2">
                  <Eye className="w-4 h-4 text-primary" />
                  {isAr ? "اختر نوع وقالب الشهادة" : "Select Certificate Template"}
                </h2>

                <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/60 rounded-xl">
                  <Button
                    type="button"
                    variant={targetType === "workshop" ? "default" : "ghost"}
                    onClick={() => {
                      setTargetType("workshop");
                      if (workshopsList.length > 0) setSelectedEntityId(workshopsList[0].id);
                    }}
                    className="h-8 text-xs font-bold rounded-lg"
                  >
                    {isAr ? "ورش العمل" : "Workshops"}
                  </Button>
                  <Button
                    type="button"
                    variant={targetType === "track" ? "default" : "ghost"}
                    onClick={() => {
                      setTargetType("track");
                      if (tracksList.length > 0) setSelectedEntityId(tracksList[0].id);
                    }}
                    className="h-8 text-xs font-bold rounded-lg"
                  >
                    {isAr ? "المسارات التعليمية" : "Tracks"}
                  </Button>
                </div>
                
                {targetType === "workshop" ? (
                  loadingWorkshops ? (
                    <div className="space-y-2">
                      {[1, 2].map(i => <Skeleton key={i} className="h-11 rounded-xl bg-muted/65" />)}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                      {workshopsList.map((w: any) => (
                        <button
                          key={w.id}
                          onClick={() => setSelectedEntityId(w.id)}
                          className={`w-full text-right p-3 rounded-xl transition-all duration-200 border flex items-center justify-between ${
                            selectedEntityId === w.id
                              ? "border-primary bg-primary/5 shadow-sm font-semibold"
                              : "border-border/40 hover:border-primary/40 bg-background/50"
                          }`}
                        >
                          <span className="text-xs font-bold text-foreground line-clamp-1">{w.title}</span>
                          <span className="text-[9.5px] text-muted-foreground font-semibold">MH-{w.id}</span>
                        </button>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                    {tracksList.map((t: any) => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedEntityId(t.id)}
                        className={`w-full text-right p-3 rounded-xl transition-all duration-200 border flex items-center justify-between ${
                          selectedEntityId === t.id
                            ? "border-primary bg-primary/5 shadow-sm font-semibold"
                            : "border-border/40 hover:border-primary/40 bg-background/50"
                        }`}
                      >
                        <span className="text-xs font-bold text-foreground line-clamp-1">{t.title}</span>
                        <span className="text-[9.5px] text-muted-foreground font-semibold">TRK-{t.id}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedEntity && (
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

                    {selectedEntity?.certTemplateUrl && isImageTemplate && (
                      <div className="flex items-start gap-2 pt-2.5 border-t border-border/40 mt-1">
                        <input
                          type="checkbox"
                          id="overlay-only-checkbox"
                          checked={certForm.certTemplateType?.startsWith("overlay") || false}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            const currentType = selectedEntity.certTemplateType || "png";
                            const cleanType = currentType.replace("overlay_", "");
                            const newType = isChecked ? `overlay_${cleanType}` : cleanType;
                            setCertForm(f => ({ ...f, certTemplateType: newType }));
                          }}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary mt-0.5"
                        />
                        <Label htmlFor="overlay-only-checkbox" className="text-xs font-bold text-foreground cursor-pointer select-none leading-normal">
                          {isAr 
                            ? "طباعة النصوص فقط فوق القالب (إخفاء الإطار الافتراضي والترويسة والتواقيع)" 
                            : "Overlay text only (hides default frame, header, signatures, and stamp)"}
                        </Label>
                      </div>
                    )}

                    <Button onClick={handleSaveTemplate} disabled={savingSettings} className="w-full gap-2 rounded-xl font-bold h-10 text-xs shadow-md mt-2">
                      <Check className="w-4 h-4" />
                      <span>{savingSettings ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ وتثبيت التغييرات" : "Save Template Settings")}</span>
                    </Button>
                  </div>

                  {/* Custom Template Upload Section */}
                  <div className="pt-4 border-t border-border/40 mt-4 space-y-3">
                    <Label className="font-bold text-[10.5px] text-muted-foreground block">
                      {isAr ? "إرفاق قالب مخصص (PDF / Word / صورة)" : "Upload Custom Template (PDF / Word / Image)"}
                    </Label>
                    
                    <div className="flex flex-col gap-2">
                      {selectedEntity?.certTemplateUrl ? (
                        <div className="bg-primary/5 border border-primary/20 p-3 rounded-xl flex items-center justify-between text-xs font-semibold text-foreground">
                          <span className="truncate max-w-[170px]">{selectedEntity.certTemplateUrl.split("/").pop()}</span>
                          <Badge variant="secondary" className="text-[9px] uppercase font-bold px-1.5 py-0">
                            {selectedEntity.certTemplateType}
                          </Badge>
                        </div>
                      ) : (
                        <div className="text-[10px] text-muted-foreground italic">
                          {isAr ? "لا يوجد قالب مخصص حالياً (يتم استخدام القالب الافتراضي المعتمد)" : "Using standard default template."}
                        </div>
                      )}
                      
                      <div className="relative mt-1">
                        <Input
                          type="file"
                          accept=".pdf,.docx,.png,.jpg,.jpeg,.svg"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file || !selectedEntityId) return;
                            
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
                                const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf';
                                const fileType = file.type || fileExt;
                                const endpoint = targetType === "workshop" 
                                  ? `/api/workshops/${selectedEntityId}/template`
                                  : `/api/tracks/${selectedEntityId}/template`;

                                const response = await fetch(endpoint, {
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
                                
                                const updated = await response.json();
                                queryClient.invalidateQueries({ queryKey: getListWorkshopsQueryKey() });
                                queryClient.invalidateQueries({ queryKey: getListTracksQueryKey() });
                                
                                toast({
                                  title: isAr ? "تم رفع القالب بنجاح" : "Template Uploaded",
                                  description: isAr ? `تم تعيين القالب لـ ${updated.title}` : `Template set for ${updated.title}`,
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

            <div className="lg:col-span-8">
              {selectedEntity ? renderPreview() : (
                <div className="border border-dashed border-border/60 p-20 text-center rounded-2xl bg-card/45">
                  <Award className="w-12 h-12 mx-auto opacity-20 text-primary mb-3" />
                  <p className="text-xs font-bold text-muted-foreground">{isAr ? "اختر برنامجا لعرض وتعديل الشهادة." : "Select a program to preview template."}</p>
                </div>
              )}
            </div>

          </div>
        </TabsContent>

        {/* Tab 2: Certificate Settings — Level Config */}
        <TabsContent value="settings" className="space-y-8">

          {/* Level Hierarchy Overview */}
          <div className="p-5 rounded-2xl border border-primary/20 bg-primary/3 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-primary" />
              <h2 className="font-extrabold text-base text-foreground">
                {isAr ? "هيكلية مستويات الشهادات (1 → 4)" : "Certificate Level Hierarchy (1 → 4)"}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground font-medium mb-4 leading-relaxed">
              {isAr
                ? "المستوى 1 هو الأعلى قيمةً ويظهر أولاً في الملف الشخصي وطلبات التوظيف. كل مستوى له سعره وارتباطه بمسار أو ورشة تعليمية."
                : "Level 1 is the highest-value certificate and appears first in profiles and job applications. Each level has its own price and is linked to a track or workshop."}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { level: 1, labelAr: "خبير متقدم", labelEn: "Master Expert", color: "from-amber-500/20 to-yellow-500/10 border-amber-500/30", textColor: "text-amber-600", badge: "" },
                { level: 2, labelAr: "خبير متخصص", labelEn: "Expert Specialist", color: "from-purple-500/20 to-violet-500/10 border-purple-500/30", textColor: "text-purple-600", badge: "" },
                { level: 3, labelAr: "أخصائي محترف", labelEn: "Professional Specialist", color: "from-blue-500/20 to-cyan-500/10 border-blue-500/30", textColor: "text-blue-600", badge: "" },
                { level: 4, labelAr: "حضور ومشاركة", labelEn: "Participation", color: "from-slate-500/10 to-gray-500/5 border-slate-500/25", textColor: "text-slate-500", badge: "" },
              ].map(l => (
                <Link key={l.level} href={`/admin/certificates/level/${l.level}`}>
                  <div className={`p-4 rounded-xl border bg-gradient-to-br ${l.color} flex flex-col gap-1.5 cursor-pointer hover:scale-[1.02] transition-all`}>
                    <div className="flex items-center justify-between">
                      <span className="text-lg">{l.badge}</span>
                      <Badge variant="outline" className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg border ${l.color} ${l.textColor}`}>
                        LVL {l.level}
                      </Badge>
                    </div>
                    <p className={`font-extrabold text-[11px] ${l.textColor}`}>{isAr ? l.labelAr : l.labelEn}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Per-Level Config Cards (1 → 4) */}
          <div className="space-y-5">
            {[
              {
                level: 1, badge: "", labelAr: "المستوى 1 — خبير متقدم (Master)",
                labelEn: "Level 1 — Master Certification",
                descAr: "أعلى مستوى — يُمنح عند إتمام مسارات متقدمة أو بقرار من الأدمن.",
                descEn: "Highest tier — awarded upon advanced track completion or admin decision.",
                borderColor: "border-amber-500/30", bgColor: "bg-amber-500/5",
                costKey: "level4Cost" as const, entityKey: "level4Entity" as const, styleKey: "level4Style" as const,
                badgeColor: "text-amber-600"
              },
              {
                level: 2, badge: "", labelAr: "المستوى 2 — خبير متخصص (Expert)",
                labelEn: "Level 2 — Expert Specialist",
                descAr: "يُمنح عند إتمام مسار تعليمي كامل بنجاح.",
                descEn: "Awarded upon completing a full learning track with passing score.",
                borderColor: "border-purple-500/30", bgColor: "bg-purple-500/5",
                costKey: "level3Cost" as const, entityKey: "level3Entity" as const, styleKey: "level3Style" as const,
                badgeColor: "text-purple-600"
              },
              {
                level: 3, badge: "", labelAr: "المستوى 3 — أخصائي محترف (Professional)",
                labelEn: "Level 3 — Professional Specialist",
                descAr: "يُمنح عند اجتياز اختبار ورشة عمل بدرجة مقبولة.",
                descEn: "Awarded upon passing a workshop exam with an acceptable score.",
                borderColor: "border-blue-500/30", bgColor: "bg-blue-500/5",
                costKey: "level2Cost" as const, entityKey: "level2Entity" as const, styleKey: "level2Style" as const,
                badgeColor: "text-blue-600"
              },
              {
                level: 4, badge: "", labelAr: "المستوى 4 — حضور ومشاركة (Participation)",
                labelEn: "Level 4 — Participation",
                descAr: "يُمنح تلقائياً لكل من يكمل ورشة العمل حتى النهاية دون اختبار.",
                descEn: "Automatically awarded to every student who completes a workshop attendance.",
                borderColor: "border-slate-500/25", bgColor: "bg-slate-500/5",
                costKey: "level1Cost" as const, entityKey: "level1Entity" as const, styleKey: "level1Style" as const,
                badgeColor: "text-slate-500"
              },
            ].map(cfg => (
              <div key={cfg.level} className={`p-5 rounded-2xl border ${cfg.borderColor} ${cfg.bgColor} space-y-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{cfg.badge}</span>
                    <div>
                      <h3 className={`font-extrabold text-sm ${cfg.badgeColor}`}>{isAr ? cfg.labelAr : cfg.labelEn}</h3>
                      <p className="text-[10.5px] text-muted-foreground font-medium">{isAr ? cfg.descAr : cfg.descEn}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/admin/certificates/level/${cfg.level}`}>
                      <Button size="sm" variant="outline" className="rounded-xl text-[10.5px] h-8.5 font-bold gap-1 shadow-sm border-primary/20 text-primary hover:bg-primary hover:text-white transition-all">
                        <Link2 className="w-3.5 h-3.5" />
                        {isAr ? "إدارة القسم بصفحة منفصلة" : "Manage Level"}
                      </Button>
                    </Link>
                    <Badge variant="outline" className={`text-[10px] font-extrabold border ${cfg.borderColor} ${cfg.badgeColor} shrink-0`}>
                      LVL {cfg.level}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Price */}
                  <div className="space-y-1.5">
                    <Label className="font-bold text-[10.5px] text-muted-foreground flex items-center gap-1.5">
                      <DollarSign className="w-3 h-3" />
                      {isAr ? "السعر (نقطة)" : "Cost (points)"}
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        value={certSettings[cfg.costKey]}
                        onChange={e => setCertSettings(p => ({ ...p, [cfg.costKey]: e.target.value }))}
                        className="rounded-xl text-xs font-bold h-10 bg-background/50 border-border/60 pr-12"
                        placeholder="0"
                        disabled={cfg.level === 1}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">pts</span>
                    </div>
                    {cfg.level === 1 && (
                      <p className="text-[9px] text-muted-foreground font-semibold">{isAr ? "مجاني دائماً" : "Always free"}</p>
                    )}
                  </div>

                  {/* Entity Type */}
                  <div className="space-y-1.5">
                    <Label className="font-bold text-[10.5px] text-muted-foreground flex items-center gap-1.5">
                      <Link2 className="w-3 h-3" />
                      {isAr ? "مرتبط بـ" : "Linked to"}
                    </Label>
                    <select
                      value={certSettings[cfg.entityKey]}
                      onChange={e => setCertSettings(p => ({ ...p, [cfg.entityKey]: e.target.value }))}
                      className="w-full h-10 rounded-xl border border-border/60 bg-background/60 px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="track">{isAr ? "مسار تعليمي" : "Learning Track"}</option>
                      <option value="workshop">{isAr ? "ورشة عمل" : "Workshop"}</option>
                    </select>
                  </div>

                  {/* Visual Style */}
                  <div className="space-y-1.5">
                    <Label className="font-bold text-[10.5px] text-muted-foreground flex items-center gap-1.5">
                      <Star className="w-3 h-3" />
                      {isAr ? "شكل وطراز الشهادة" : "Certificate Style"}
                    </Label>
                    <select
                      value={certSettings[cfg.styleKey]}
                      onChange={e => setCertSettings(p => ({ ...p, [cfg.styleKey]: e.target.value }))}
                      className="w-full h-10 rounded-xl border border-border/60 bg-background/60 px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="gold">{isAr ? "ذهبي — أعمال تنفيذية" : "Gold — Executive"}</option>
                      <option value="purple">{isAr ? "بنفسجي — أكاديمي" : "Purple — Academic"}</option>
                      <option value="blue">{isAr ? "أزرق — مهني" : "Blue — Professional"}</option>
                      <option value="slate">{isAr ? "رصاصي — مشاركة" : "Slate — Participation"}</option>
                      <option value="custom">{isAr ? "قالب مخصص (PDF/صورة)" : "Custom Template (PDF/Image)"}</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="gap-2 rounded-xl font-bold h-11 px-8 shadow-md shadow-primary/20"
            >
              <Check className="w-4 h-4" />
              {savingSettings ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ إعدادات الشهادات" : "Save Certificate Settings")}
            </Button>
          </div>
        </TabsContent>

        {/* Tab: Manual Certificate Issuance */}
        <TabsContent value="issue" className="space-y-6 max-w-xl">
          <div className="p-6 rounded-2xl border border-border bg-card/65 backdrop-blur-sm shadow-sm space-y-4">
            <div>
              <h2 className="font-extrabold text-sm text-foreground flex items-center gap-1.5 border-b border-border/40 pb-2">
                <Plus className="w-4.5 h-4.5 text-primary" />
                {isAr ? "منح شهادات تلقائي" : "Auto-Issue Certificates"}
              </h2>
              <p className="text-[10.5px] text-muted-foreground font-medium mt-1">
                {isAr
                  ? "اختر المسار أو الورشة وسيتم منح الشهادة تلقائياً لجميع الطلاب الذين أكملوا البرنامج."
                  : "Select a track or workshop and certificates will be granted automatically to all students who completed the program."}
              </p>
            </div>

            <form onSubmit={handleManualIssue} className="space-y-4">
              {/* Entity Type */}
              <div className="space-y-1.5">
                <Label className="font-bold text-[10.5px] text-muted-foreground block">
                  {isAr ? "نوع الربط" : "Linked Type"}
                </Label>
                <select
                  value={manualEntityType}
                  onChange={e => {
                    setManualEntityType(e.target.value);
                    setManualEntityId("");
                  }}
                  className="w-full h-10 rounded-xl border border-border/60 bg-background/60 px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="track">{isAr ? "مسار تعليمي" : "Learning Track"}</option>
                  <option value="workshop">{isAr ? "ورشة عمل" : "Workshop"}</option>
                </select>
              </div>

              {/* Entity Selector (Track or Workshop) */}
              <div className="space-y-1.5">
                <Label className="font-bold text-[10.5px] text-muted-foreground block">
                  {manualEntityType === "track"
                    ? (isAr ? "اختر المسار التعليمي" : "Select Track")
                    : (isAr ? "اختر الورشة التدريبية" : "Select Workshop")}
                </Label>
                <select
                  value={manualEntityId}
                  onChange={e => setManualEntityId(e.target.value)}
                  className="w-full h-10 rounded-xl border border-border/60 bg-background/60 px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                >
                  <option value="">{isAr ? "— اختر البرنامج —" : "— Select Program —"}</option>
                  {manualEntityType === "track" ? (
                    tracksList.map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)
                  ) : (
                    workshopsList.map((w: any) => <option key={w.id} value={w.id}>{w.title}</option>)
                  )}
                </select>
              </div>

              {/* Score */}
              <div className="space-y-1.5">
                <Label className="font-bold text-[10.5px] text-muted-foreground block">
                  {isAr ? "الدرجة (%)" : "Score (%)"}
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={manualScore}
                  onChange={e => setManualScore(Number(e.target.value))}
                  className="rounded-xl text-xs font-bold h-10 bg-background/50 border-border/60"
                />
              </div>

              {/* Level Selector */}
              <div className="space-y-1.5">
                <Label className="font-bold text-[10.5px] text-muted-foreground block">
                  {isAr ? "نوع ومستوى الشهادة" : "Certificate Level"}
                </Label>
                <select
                  value={manualLevel}
                  onChange={e => setManualLevel(Number(e.target.value))}
                  className="w-full h-10 rounded-xl border border-border/60 bg-background/60 px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="1">{isAr ? "المستوى 1 — خبير متقدم (Master)" : "Level 1 — Master Expert"}</option>
                  <option value="2">{isAr ? "المستوى 2 — خبير متخصص (Expert)" : "Level 2 — Expert Specialist"}</option>
                  <option value="3">{isAr ? "المستوى 3 — أخصائي محترف (Professional)" : "Level 3 — Professional Specialist"}</option>
                  <option value="4">{isAr ? "المستوى 4 — حضور ومشاركة (Participation)" : "Level 4 — Participation"}</option>
                </select>
              </div>

              <Button
                type="submit"
                disabled={manualIssuing || !manualEntityId}
                className="w-full gap-2 rounded-xl font-bold h-11 text-xs shadow-md mt-4 shadow-primary/20"
              >
                {manualIssuing
                  ? (isAr ? "جاري الإصدار..." : "Issuing...")
                  : (isAr ? "منح الشهادات لكل من أكمل" : "Issue to All Who Completed")}
              </Button>
            </form>
          </div>
        </TabsContent>

        {/* Tab 3: Issued Ledger */}
        <TabsContent value="ledger" className="space-y-4">
          <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm overflow-x-auto shadow-sm">
            <table className="w-full text-xs min-w-[700px]">
              <thead>
                <tr className="bg-muted/70 text-left border-b border-border">
                  <th className="px-4 py-3.5 font-bold uppercase">{isAr ? "الرقم المرجعي" : "Cert Number"}</th>
                  <th className="px-4 py-3.5 font-bold uppercase">{isAr ? "الطالب" : "Student"}</th>
                  <th className="px-4 py-3.5 font-bold uppercase">{isAr ? "النوع" : "Type"}</th>
                  <th className="px-4 py-3.5 font-bold uppercase">{isAr ? "المسار / الورشة" : "Track / Workshop"}</th>
                  <th className="px-4 py-3.5 font-bold uppercase text-center">{isAr ? "كود التحقق" : "Verification Code"}</th>
                  <th className="px-4 py-3.5 font-bold uppercase text-center">{isAr ? "الدرجة" : "Score"}</th>
                  <th className="px-4 py-3.5 font-bold uppercase hidden sm:table-cell">{isAr ? "تاريخ الإصدار" : "Issued Date"}</th>
                  <th className="px-4 py-3.5 font-bold uppercase text-right">{isAr ? "الإجراء" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loadingCerts ? (
                  [1, 2].map(i => (
                    <tr key={i}><td colSpan={8} className="p-4"><Skeleton className="h-10 rounded-xl bg-muted/65" /></td></tr>
                  ))
                ) : certsList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-muted-foreground">
                      <Award className="w-10 h-10 mx-auto opacity-20 text-primary mb-3" />
                      <p className="font-bold">{isAr ? "لا توجد شهادات صادرة للطلاب بعد." : "No certificates issued to students yet."}</p>
                    </td>
                  </tr>
                ) : (
                  certsList.map((c: any) => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-500 text-[10px]">{c.certificateNumber}</td>
                      <td className="px-4 py-3 font-bold text-foreground">{c.userName}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={`font-bold text-[9px] px-2 py-0.5 rounded-lg ${
                            c.type === "track"
                              ? "border-blue-500/30 bg-blue-500/5 text-blue-600"
                              : c.type === "participation"
                                ? "border-violet-500/30 bg-violet-500/5 text-violet-600"
                                : "border-amber-500/30 bg-amber-500/5 text-amber-600"
                          }`}
                        >
                          {c.type === "track"
                            ? (isAr ? "مسار" : "Track")
                            : c.type === "participation"
                              ? (isAr ? "حضور" : "Participation")
                              : (isAr ? "ورشة" : "Workshop")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium text-muted-foreground">
                        {c.type === "track" ? c.trackTitle : c.workshopTitle}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className="font-mono font-bold text-[10px] bg-amber-500/5 text-amber-600 border-amber-500/20 px-2.5 py-0.5 rounded-lg select-all">
                          {c.verificationCode}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="secondary" className="font-bold">{c.score}%</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-medium hidden sm:table-cell">
                        {new Date(c.issuedAt).toLocaleDateString(isAr ? "ar-EG" : "en-US")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/certificate/${c.id}`}>
                          <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs text-primary font-bold">
                            <Eye className="w-3.5 h-3.5" />
                            <span>{isAr ? "عرض" : "View"}</span>
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
