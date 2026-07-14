import { useState } from "react";
import { Link } from "wouter";
import { useListCertificates, useClaimCertificate, useGetWallet, getListCertificatesQueryKey, getGetWalletQueryKey } from "@workspace/api-client-react";
import { Award, Eye, Calendar, ShieldCheck, Download, Lock, Coins, ShieldAlert, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLanguage } from "@/components/layout/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Helper to resolve level tags
const getLevelDetails = (level: number, isAr: boolean) => {
  switch (level) {
    case 1:
      return {
        title: isAr ? "المستوى 1: حضور" : "Lvl 1: Participation",
        color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
      };
    case 2:
      return {
        title: isAr ? "المستوى 2: محترف" : "Lvl 2: Professional",
        color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
      };
    case 3:
      return {
        title: isAr ? "المستوى 3: خبير" : "Lvl 3: Expert",
        color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
      };
    case 4:
      return {
        title: isAr ? "المستوى 4: ماستر" : "Lvl 4: Master Specialist",
        color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
      };
    default:
      return {
        title: isAr ? "شهادة مخصصة" : "Special",
        color: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-border"
      };
  }
};

export default function CertificatesPage() {
  const { data: certs, isLoading } = useListCertificates();
  const { data: wallet } = useGetWallet();
  const claimMutation = useClaimCertificate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { language } = useLanguage();
  const isAr = language === "ar";

  const [confirmCert, setConfirmCert] = useState<any>(null);

  const handleClaim = async () => {
    if (!confirmCert) return;
    try {
      await claimMutation.mutateAsync({ id: confirmCert.id });
      
      // Success toast
      toast({
        title: isAr ? "تم استلام الشهادة بنجاح!" : "Certificate Claimed Successfully!",
        description: isAr 
          ? `تم تفعيل الشهادة وخصم ${confirmCert.cost} نقطة من محفظتك.`
          : `Certificate unlocked. ${confirmCert.cost} points deducted.`,
      });

      // Invalidate queries to refresh listing and points
      queryClient.invalidateQueries({ queryKey: getListCertificatesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
      setConfirmCert(null);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: isAr ? "خطأ في استلام الشهادة" : "Claim Failed",
        description: err?.message || (isAr ? "رصيد نقاطك غير كافٍ لتفعيل هذه الشهادة." : "Insufficient points balance."),
      });
    }
  };

  const renderCertGrid = (list: any[]) => {
    if (list.length === 0) {
      return (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border/50 bg-card/30">
          <Award className="w-12 h-12 mx-auto mb-3 opacity-20 text-amber-500" />
          <p className="text-xs font-bold text-muted-foreground">
            {isAr ? "لا توجد شهادات في هذا القسم حالياً." : "No certificates in this category yet."}
          </p>
        </div>
      );
    }

    // Group certificates by level
    const level4 = list.filter(c => c.level === 4);
    const level3 = list.filter(c => c.level === 3);
    const level2 = list.filter(c => c.level === 2);
    const level1 = list.filter(c => c.level === 1 || !c.level);

    const renderLevelSection = (titleAr: string, titleEn: string, levelCerts: any[], badge: string, themeColor: string) => {
      if (levelCerts.length === 0) return null;
      return (
        <div className="space-y-4 pt-6 border-t border-border/20 first:border-0 first:pt-0">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">{badge}</span>
            <h3 className={`text-sm font-extrabold tracking-tight ${themeColor}`}>
              {isAr ? titleAr : titleEn} ({levelCerts.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {levelCerts.map(cert => {
              const isLocked = cert.status === "locked";
              const levelInfo = getLevelDetails(cert.level, isAr);
              return (
                <motion.div
                  whileHover={{ y: -5 }}
                  key={cert.id}
                  className={`p-6 rounded-2xl border bg-gradient-to-b from-card to-background hover:shadow-lg transition-all duration-300 shadow-sm relative overflow-hidden group text-start flex flex-col justify-between ${
                    isLocked 
                      ? "border-amber-500/20 opacity-90 shadow-inner" 
                      : cert.level === 4 
                        ? "border-amber-500/30 hover:border-amber-500/60 shadow-[0_4px_20px_rgba(245,158,11,0.05)]"
                        : cert.level === 3
                          ? "border-purple-500/30 hover:border-purple-500/60 shadow-[0_4px_20px_rgba(168,85,247,0.05)]"
                          : cert.level === 2
                            ? "border-blue-500/30 hover:border-blue-500/60 shadow-[0_4px_20px_rgba(59,130,246,0.05)]"
                            : "border-emerald-500/25 hover:border-emerald-500/50"
                  }`}
                  data-testid={`certificate-card-${cert.id}`}
                >
                  {/* Background visual accents */}
                  {!isLocked && cert.level === 4 && <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/4 rounded-full blur-2xl pointer-events-none animate-pulse" />}
                  {!isLocked && cert.level === 3 && <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/4 rounded-full blur-2xl pointer-events-none animate-pulse" />}
                  {!isLocked && cert.level === 2 && <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/4 rounded-full blur-2xl pointer-events-none animate-pulse" />}

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                        isLocked 
                          ? "bg-amber-500/10 border-amber-500/25 text-amber-500" 
                          : cert.level === 4
                            ? "bg-amber-500/15 border-amber-500/30 text-amber-600"
                            : cert.level === 3
                              ? "bg-purple-500/15 border-purple-500/30 text-purple-600"
                              : cert.level === 2
                                ? "bg-blue-500/15 border-blue-500/30 text-blue-600"
                                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                      }`}>
                        {isLocked ? <Lock className="w-5 h-5" /> : <Award className="w-5.5 h-5.5" />}
                      </div>
                      
                      <div className="flex gap-1.5 items-center">
                        <Badge variant="outline" className={`font-bold px-2 py-0.5 rounded-lg text-[9px] ${levelInfo.color}`}>
                          {levelInfo.title}
                        </Badge>
                      </div>
                    </div>

                    <h3 className="font-extrabold text-sm text-foreground mb-1 line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                      {cert.type === "track" ? cert.trackTitle : cert.workshopTitle}
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-semibold leading-relaxed mb-4">
                      {isAr ? `المستفيد: ${cert.userName}` : `Issued to: ${cert.userName}`}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-1 text-[10px] text-muted-foreground mb-5 font-bold border-t border-border/40 pt-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-500/80" />
                        <span>{isAr ? "التاريخ:" : "Date:"} {cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString(isAr ? "ar-EG" : "en-US") : ""}</span>
                      </div>
                      
                      {isLocked && (
                        <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          <Coins className="w-3.5 h-3.5" />
                          <span>{cert.cost} {isAr ? "نقطة" : "pts"}</span>
                        </div>
                      )}
                    </div>

                    {isLocked ? (
                      <button
                        onClick={() => setConfirmCert(cert)}
                        className="w-full h-9 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500 hover:text-white font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Coins className="w-3.5 h-3.5" />
                        <span>{isAr ? `تفعيل الشهادة (${cert.cost} نقطة)` : `Claim Certificate (${cert.cost} pts)`}</span>
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <Link href={`/certificate/${cert.id}`} className="flex-1">
                          <button
                            className="w-full h-9 rounded-xl border border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                            data-testid={`button-view-cert-${cert.id}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{isAr ? "عرض" : "View"}</span>
                          </button>
                        </Link>
                        <Link href={`/certificate/${cert.id}?download=1`} className="flex-1">
                          <button
                            className="w-full h-9 rounded-xl border border-primary/25 bg-primary/5 text-primary hover:bg-primary hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                            data-testid={`button-download-cert-${cert.id}`}
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{isAr ? "تنزيل" : "Download"}</span>
                          </button>
                        </Link>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-8">
        {renderLevelSection("شهادات خبير متقدم — المستوى 4 (Master)", "Level 4 — Master Expert Certificates", level4, "", "text-amber-600 dark:text-amber-400")}
        {renderLevelSection("شهادات خبير متخصص — المستوى 3 (Expert)", "Level 3 — Expert Specialist Certificates", level3, "", "text-purple-600 dark:text-purple-400")}
        {renderLevelSection("شهادات أخصائي محترف — المستوى 2 (Professional)", "Level 2 — Professional Specialist Certificates", level2, "", "text-blue-600 dark:text-blue-400")}
        {renderLevelSection("شهادات حضور ومشاركة — المستوى 1 (Participation)", "Level 1 — Participation Certificates", level1, "", "text-slate-600 dark:text-slate-400")}
      </div>
    );
  };

  const pointsBalance = wallet?.points ?? 0;

  return (
    <AppLayout>
      {/* Title Header */}
      <div className="mb-10 text-start flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-bold px-3 py-0.5 rounded-full text-[10px]">
              {isAr ? "شهادات معتمدة مشفرة رقمياً" : "Digitally Secured Credentials"}
            </Badge>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight" data-testid="heading-certificates">
            {isAr ? "شهاداتي الرسمية" : "My Certificates"}
          </h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            {isAr
              ? "استعرض شهادات الورش والمسارات التدريبية الصادرة والجاهزة للتفعيل بالنقاط."
              : "Review issued workshop and track complete certificates or claim them using points."}
          </p>
        </div>

        {/* User points widget */}
        <div className="bg-card border border-border/80 p-4 rounded-2xl flex items-center gap-3.5 min-w-[200px] shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Coins className="w-5.5 h-5.5" />
          </div>
          <div className="text-start">
            <span className="text-[10px] text-muted-foreground block font-bold uppercase">{isAr ? "رصيد محفظتك" : "Your Wallet"}</span>
            <span className="text-base font-extrabold text-foreground">{pointsBalance} <span className="text-[11px] font-bold text-amber-500">{isAr ? "نقطة" : "pts"}</span></span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-56 rounded-2xl bg-card border border-border/50" />)}
        </div>
      ) : !Array.isArray(certs) || certs.length === 0 ? (
        <div className="text-center py-24 rounded-2xl border border-dashed border-border/60 bg-card/30 max-w-xl mx-auto">
          <Award className="w-16 h-16 mx-auto mb-4 opacity-25 text-amber-500" />
          <h3 className="font-extrabold text-lg">{isAr ? "لم تحصل على شهادات بعد" : "No certificates earned yet"}</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto mb-6 leading-relaxed font-medium">
            {isAr 
              ? "سجل في ورش العمل التفاعلية والمسارات التدريبية، واجتز الاختبارات بنجاح لتصدر لك الشهادات تلقائياً."
              : "Enroll in live workshops and career paths, pass the exams successfully, and your certificates will be generated automatically."}
          </p>
          <Link href="/workshops">
            <button className="h-10 px-6 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-md shadow-primary/10" data-testid="button-browse-workshops-certs">
              {isAr ? "استكشف ورش العمل" : "Explore Workshops"}
            </button>
          </Link>
        </div>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="flex md:grid w-full md:grid-cols-5 overflow-x-auto md:overflow-visible rounded-2xl bg-muted/60 p-1 mb-8 max-w-3xl scrollbar-none snap-x snap-mandatory">
            <TabsTrigger value="all" className="rounded-xl font-bold text-xs py-2 flex-1 md:flex-initial whitespace-nowrap snap-start">
              {isAr ? "الكل" : "All"}
            </TabsTrigger>
            <TabsTrigger value="active" className="rounded-xl font-bold text-xs py-2 flex-1 md:flex-initial whitespace-nowrap snap-start">
              {isAr ? "المفعلة" : "Active"}
            </TabsTrigger>
            <TabsTrigger value="locked" className="rounded-xl font-bold text-xs py-2 flex-1 md:flex-initial whitespace-nowrap snap-start border-amber-500/20 text-amber-600 dark:text-amber-400">
              {isAr ? "بانتظار التفعيل" : "Pending Unlock"}
            </TabsTrigger>
            <TabsTrigger value="tracks" className="rounded-xl font-bold text-xs py-2 flex-1 md:flex-initial whitespace-nowrap snap-start">
              {isAr ? "المسارات" : "Tracks"}
            </TabsTrigger>
            <TabsTrigger value="workshops" className="rounded-xl font-bold text-xs py-2 flex-1 md:flex-initial whitespace-nowrap snap-start">
              {isAr ? "الورش والحضور" : "Workshops"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 outline-none">
            {renderCertGrid(certs)}
          </TabsContent>
          
          <TabsContent value="active" className="space-y-4 outline-none">
            {renderCertGrid(certs.filter(c => c.status === "issued"))}
          </TabsContent>

          <TabsContent value="locked" className="space-y-4 outline-none">
            {renderCertGrid(certs.filter(c => c.status === "locked"))}
          </TabsContent>
          
          <TabsContent value="tracks" className="space-y-4 outline-none">
            {renderCertGrid(certs.filter(c => c.type === "track"))}
          </TabsContent>

          <TabsContent value="workshops" className="space-y-4 outline-none">
            {renderCertGrid(certs.filter(c => c.type !== "track"))}
          </TabsContent>
        </Tabs>
      )}

      {/* Claim Confirmation Dialog */}
      <Dialog open={!!confirmCert} onOpenChange={(open) => !open && setConfirmCert(null)}>
        <DialogContent className="sm:max-w-md text-start rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-extrabold text-lg">
              <ShieldAlert className="w-5.5 h-5.5 text-amber-500" />
              <span>{isAr ? "تفعيل شهادة معتمدة" : "Unlock Certificate"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-semibold leading-relaxed pt-1.5">
              {isAr 
                ? "سيتم خصم النقاط من محفظتك وإصدار شهادة موثقة رقمياً وموقعة تشفيرياً."
                : "Points will be deducted to generate your digitally secured and cryptographically signed certificate."}
            </DialogDescription>
          </DialogHeader>

          {confirmCert && (
            <div className="bg-muted/40 p-4 rounded-xl space-y-3 font-semibold text-xs border border-border/30 my-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{isAr ? "الشهادة:" : "Certificate:"}</span>
                <span className="text-foreground font-bold text-end truncate max-w-[200px]">
                  "{confirmCert.type === "track" ? confirmCert.trackTitle : confirmCert.workshopTitle}"
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{isAr ? "التكلفة:" : "Cost:"}</span>
                <span className="text-amber-500 font-extrabold">{confirmCert.cost} {isAr ? "نقطة" : "pts"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{isAr ? "رصيدك الحالي:" : "Your Balance:"}</span>
                <span className={pointsBalance >= confirmCert.cost ? "text-emerald-500 font-extrabold" : "text-destructive font-extrabold"}>
                  {pointsBalance} {isAr ? "نقطة" : "pts"}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="flex sm:justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmCert(null)}
              className="rounded-xl font-bold text-xs"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              type="button"
              onClick={handleClaim}
              disabled={claimMutation.isPending || (confirmCert && pointsBalance < confirmCert.cost)}
              className="rounded-xl font-bold text-xs gap-1.5 shadow-md shadow-primary/10"
            >
              {claimMutation.isPending ? "Loading..." : <CheckCircle className="w-4 h-4" />}
              <span>{isAr ? "تأكيد واستلام" : "Confirm & Unlock"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
