import { useRoute, Link } from "wouter";
import { useGetCertificate, getGetCertificateQueryKey, useGetWorkshop, getGetWorkshopQueryKey } from "@workspace/api-client-react";
import { ArrowLeft, Printer, Award, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLanguage } from "@/components/layout/LanguageContext";
import { useEffect } from "react";
import { useSearch } from "wouter";

// Level-based styling configurations
const getThemeDetails = (level: number) => {
  switch (level) {
    case 4: // Master Expert
      return {
        bg: "radial-gradient(circle at 50% 50%, #FCF8F2 0%, #F6ECE5 100%)",
        borderColor: "border-amber-600",
        stoneColor: "text-amber-900",
        flourishColor: "text-amber-700",
        frameColor: "border-amber-600/70",
        doubleFrameColor: "border-amber-800/50",
        stampColor: "text-amber-600",
        accentLine: "bg-amber-600",
        badge: "Level 4: Master Expert",
        badgeAr: "المستوى 4: خبير متقدم (Master)"
      };
    case 3: // Expert Specialist
      return {
        bg: "radial-gradient(circle at 50% 50%, #FAF5FC 0%, #F1E5F7 100%)",
        borderColor: "border-purple-600",
        stoneColor: "text-purple-900",
        flourishColor: "text-purple-700",
        frameColor: "border-purple-600/70",
        doubleFrameColor: "border-purple-800/50",
        stampColor: "text-purple-600",
        accentLine: "bg-purple-600",
        badge: "Level 3: Expert Specialist",
        badgeAr: "المستوى 3: خبير متخصص (Expert)"
      };
    case 2: // Professional Specialist
      return {
        bg: "radial-gradient(circle at 50% 50%, #F4F8FD 0%, #E6EEFA 100%)",
        borderColor: "border-blue-600",
        stoneColor: "text-blue-900",
        flourishColor: "text-blue-700",
        frameColor: "border-blue-600/70",
        doubleFrameColor: "border-blue-800/50",
        stampColor: "text-blue-600",
        accentLine: "bg-blue-600",
        badge: "Level 2: Professional Specialist",
        badgeAr: "المستوى 2: أخصائي محترف (Professional)"
      };
    case 1: // Participation
    default:
      return {
        bg: "radial-gradient(circle at 50% 50%, #FAF8F5 0%, #F5F1EC 100%)",
        borderColor: "border-stone-400",
        stoneColor: "text-stone-850",
        flourishColor: "text-stone-850",
        frameColor: "border-stone-800",
        doubleFrameColor: "border-stone-850",
        stampColor: "text-stone-750",
        accentLine: "bg-stone-600",
        badge: "Level 1: Participation",
        badgeAr: "المستوى 1: حضور ومشاركة"
      };
  }
};

export default function CertificateViewPage() {
  const [, params] = useRoute("/certificate/:id");
  const certId = parseInt(params?.id || "0", 10);
  const { data: cert, isLoading } = useGetCertificate(certId, { query: { enabled: !!certId, queryKey: getGetCertificateQueryKey(certId) } });
  const { data: workshop } = useGetWorkshop(cert?.workshopId || 0, { query: { enabled: !!cert?.workshopId, queryKey: getGetWorkshopQueryKey(cert?.workshopId || 0) } });
  const { language } = useLanguage();
  const isAr = language === "ar";

  // Dynamically load the Lora Google font on page mount for high-fidelity serif rendering
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  // Auto-trigger print dialog when ?download=1 is in the URL
  const search = useSearch();
  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("download") === "1") {
      // Small delay so the certificate renders first
      const t = setTimeout(() => window.print(), 800);
      return () => clearTimeout(t);
    }
    return;
  }, [search]);

  if (isLoading) return <AppLayout><Skeleton className="h-96 w-full rounded-2xl bg-card border border-border/50" /></AppLayout>;
  if (!cert) return <AppLayout><p className="text-center text-muted-foreground mt-16 font-bold">{isAr ? "الشهادة غير موجودة" : "Certificate not found"}</p></AppLayout>;

  // Detect custom template options
  const hasCustomTemplate = !!workshop?.certTemplateUrl;
  const isImageTemplate = hasCustomTemplate && (
    workshop?.certTemplateType === "png" ||
    workshop?.certTemplateType === "jpg" ||
    workshop?.certTemplateType === "jpeg"
  );
  const isDocTemplate = hasCustomTemplate && !isImageTemplate;

  const theme = getThemeDetails(cert.level || 1);

  return (
    <AppLayout>
      <div className="mb-6 no-print flex items-center justify-between text-start">
        <Link href="/certificates">
          <a className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors" data-testid="link-back-certs">
            <ArrowLeft className="w-4 h-4" /> {isAr ? "العودة للشهادات" : "Back to Certificates"}
          </a>
        </Link>
        <div className="flex gap-2">
          {isDocTemplate && (
            <a 
              href={workshop?.certTemplateUrl || "#"} 
              download 
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm" variant="outline" className="rounded-xl font-bold gap-1.5 text-xs px-4 border-primary/30 text-primary hover:bg-primary/5">
                <Download className="w-4 h-4" /> {isAr ? "تحميل ملف الشهادة" : "Download Certificate"}
              </Button>
            </a>
          )}
          <Button onClick={handlePrint} size="sm" className="rounded-xl font-bold gap-1.5 shadow-md shadow-primary/10 text-xs px-4" data-testid="button-print-cert">
            <Printer className="w-4 h-4" /> {isAr ? "طباعة الشهادة الرسمية" : "Print Certificate"}
          </Button>
        </div>
      </div>

      {/* 100% Match to the Original Certificate PDF template: Sharp rectangular corners, custom wave background */}
      <div 
        className="max-w-4xl mx-auto p-8 sm:p-16 text-slate-800 border-2 shadow-2xl relative overflow-hidden aspect-[1.414/1] flex flex-col justify-between my-8 print:my-0 print:shadow-none print:border-none select-none rounded-none" 
        style={{ 
          fontFamily: "'Lora', 'Georgia', serif", 
          backgroundImage: isImageTemplate ? `url(${workshop?.certTemplateUrl})` : theme.bg,
          backgroundSize: isImageTemplate ? "cover" : undefined,
          backgroundPosition: isImageTemplate ? "center" : undefined,
          borderColor: isImageTemplate ? undefined : undefined // color set by CSS class via theme.borderColor
        }}
      >
        
        {/* Double Border Frame with Sharp Corners - Hidden on custom image templates to avoid overlap */}
        {!isImageTemplate && (
          <>
            <div className={`absolute inset-4 border pointer-events-none rounded-none ${theme.frameColor} ${theme.borderColor}`} />
            <div className={`absolute inset-5 border-2 border-double pointer-events-none rounded-none ${theme.doubleFrameColor}`} />
          </>
        )}

        {/* High-fidelity Victorian Corner flourishes - Hidden on custom image templates */}
        {!isImageTemplate && (
          <>
            {/* Top-Left */}
            <div className={`absolute top-7 left-7 pointer-events-none opacity-95 ${theme.flourishColor}`}>
              <svg viewBox="0 0 100 100" className="w-16 h-16 text-current">
                <path d="M5,5 C35,5 45,12 55,25 C45,35 30,30 20,20 C35,35 25,55 5,55" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <path d="M5,5 C5,25 12,45 25,55 C35,45 30,30 20,20 C35,35 55,25 55,5" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <path d="M15,15 C35,15 40,30 30,35 C20,40 15,30 25,20 C35,10 45,25 40,35" fill="none" stroke="currentColor" strokeWidth="0.8" />
                <circle cx="50" cy="20" r="1.5" fill="currentColor" />
                <circle cx="20" cy="50" r="1.5" fill="currentColor" />
              </svg>
            </div>
            {/* Top-Right */}
            <div className={`absolute top-7 right-7 pointer-events-none scale-x-[-1] opacity-90 ${theme.flourishColor}`}>
              <svg viewBox="0 0 100 100" className="w-16 h-16 text-current">
                <path d="M5,5 C35,5 45,12 55,25 C45,35 30,30 20,20 C35,35 25,55 5,55" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <path d="M5,5 C5,25 12,45 25,55 C35,45 30,30 20,20 C35,35 55,25 55,5" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <path d="M15,15 C35,15 40,30 30,35 C20,40 15,30 25,20 C35,10 45,25 40,35" fill="none" stroke="currentColor" strokeWidth="0.8" />
                <circle cx="50" cy="20" r="1.5" fill="currentColor" />
                <circle cx="20" cy="50" r="1.5" fill="currentColor" />
              </svg>
            </div>
            {/* Bottom-Left */}
            <div className={`absolute bottom-7 left-7 pointer-events-none scale-y-[-1] opacity-90 ${theme.flourishColor}`}>
              <svg viewBox="0 0 100 100" className="w-16 h-16 text-current">
                <path d="M5,5 C35,5 45,12 55,25 C45,35 30,30 20,20 C35,35 25,55 5,55" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <path d="M5,5 C5,25 12,45 25,55 C35,45 30,30 20,20 C35,35 55,25 55,5" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <path d="M15,15 C35,15 40,30 30,35 C20,40 15,30 25,20 C35,10 45,25 40,35" fill="none" stroke="currentColor" strokeWidth="0.8" />
                <circle cx="50" cy="20" r="1.5" fill="currentColor" />
                <circle cx="20" cy="50" r="1.5" fill="currentColor" />
              </svg>
            </div>
            {/* Bottom-Right */}
            <div className={`absolute bottom-7 right-7 pointer-events-none scale-x-[-1] scale-y-[-1] opacity-90 ${theme.flourishColor}`}>
              <svg viewBox="0 0 100 100" className="w-16 h-16 text-current">
                <path d="M5,5 C35,5 45,12 55,25 C45,35 30,30 20,20 C35,35 25,55 5,55" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <path d="M5,5 C5,25 12,45 25,55 C35,45 30,30 20,20 C35,35 55,25 55,5" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <path d="M15,15 C35,15 40,30 30,35 C20,40 15,30 25,20 C35,10 45,25 40,35" fill="none" stroke="currentColor" strokeWidth="0.8" />
                <circle cx="50" cy="20" r="1.5" fill="currentColor" />
                <circle cx="20" cy="50" r="1.5" fill="currentColor" />
              </svg>
            </div>
          </>
        )}

        {/* Top Header Section - Hidden on custom image templates */}
        {!isImageTemplate ? (
          <div className="text-center mt-6 z-10 flex flex-col items-center">
            <h3 className="text-xl sm:text-[28px] font-bold font-serif border-b-2 pb-0.5 px-6 tracking-wide text-stone-900 leading-tight border-stone-850">
              Skills of youth
            </h3>
            <p className="text-[10px] sm:text-xs text-stone-600 font-serif mt-1.5 tracking-wider font-medium">
              For educational and professional youth empowerment
            </p>
            {/* Level Badge in Certificate document */}
            <span className={`mt-2 text-[9px] font-extrabold uppercase px-3 py-0.5 rounded-full border bg-background/80 shadow-sm ${theme.accentLine.replace('bg-', 'text-')}`}>
              {isAr ? theme.badgeAr : theme.badge}
            </span>
          </div>
        ) : (
          <div className="h-6" /> // spacer
        )}

        {/* Certificate title - Hidden on custom image templates */}
        {!isImageTemplate && (
          <div className="text-center my-1 z-10">
            <h1 className="text-2xl sm:text-[34px] font-medium text-stone-600 tracking-wide font-serif leading-none">
              {cert.type === "track" 
                ? (isAr ? "شهادة إتمام مسار" : "Certificate of Achievement")
                : cert.type === "participation"
                  ? (isAr ? "شهادة مشاركة وحضور" : "Certificate of Participation")
                  : (isAr ? "شهادة اجتياز ورشة عمل" : "Certificate of Achievement")}
            </h1>
          </div>
        )}

        {/* Body content - centered on image if template is custom */}
        <div className={`text-center max-w-2xl mx-auto space-y-4 z-10 ${isImageTemplate ? 'mt-24 sm:mt-32' : ''}`}>
          <p className="text-[11px] sm:text-sm text-stone-500 italic font-serif">
            {isAr ? "نشهد أن المتدرب(ة):" : "This is to certify that"}
          </p>

          {/* Student Name */}
          <h2 className="text-lg sm:text-[26px] font-bold text-stone-800 font-serif my-0.5 tracking-wide">
            {cert.userName}
          </h2>

          <p className="text-[11px] sm:text-sm text-stone-600 font-serif leading-relaxed">
            {cert.type === "track"
              ? (isAr ? "قد أكمل بنجاح المسار التعليمي المعتمد والموثق بعنوان:" : "Has successfully completed the verified learning track entitled:")
              : cert.type === "participation"
                ? (isAr ? "قد حضر وشارك بنجاح في ورشة العمل التدريبية بعنوان:" : "Has successfully participated in the training workshop entitled:")
                : (isAr ? "قد اجتاز بنجاح الورشة التدريبية والاختبار التقييمي المعتمد لـ:" : "Has successfully completed and passed the exam for:")
            }
          </p>

          {/* Course/Workshop title */}
          <h3 className="text-xs sm:text-[17px] font-bold text-stone-900 font-serif max-w-xl mx-auto my-1 leading-normal">
            "{cert.type === "track" ? cert.trackTitle : cert.workshopTitle}"
          </h3>

          {/* Issue date */}
          <p className="text-xs sm:text-[15px] font-bold text-stone-900 font-sans tracking-wide mt-3">
            {cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString(isAr ? "ar-EG" : "en-US", { day: 'numeric', month: 'long', year: 'numeric' }) : ""}
          </p>
        </div>

        {/* Footer Signature Blocks - Hidden on custom image templates */}
        {!isImageTemplate ? (
          <div className="grid grid-cols-3 gap-6 items-end text-center z-10 pt-4 px-4 sm:px-14">
            {/* Left Signatory - CEO */}
            <div className="space-y-1">
              <div className="h-10 flex items-center justify-center">
                <svg viewBox="0 0 100 40" className="w-24 h-10 text-stone-800">
                  <path d="M 5,30 Q 30,28 65,32 T 95,28" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <path d="M 10,25 C 25,20 30,10 40,8 C 50,6 55,12 50,18 C 45,24 35,28 32,25 C 28,20 42,12 60,18 C 75,22 80,12 78,8 C 75,4 70,8 72,15 C 75,25 90,20 85,25" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="border-t border-stone-800 pt-1 font-sans">
                <p className="font-extrabold text-[8px] uppercase tracking-wider text-stone-500">
                  CEO OF SKILLS
                </p>
                <p className="text-[9px] font-bold text-stone-700 mt-0.5">
                  Ahmed Joudah Ghafil
                </p>
              </div>
            </div>

            {/* Central Logo Stamp */}
            <div className="flex flex-col items-center justify-center pb-1">
              <div className="relative group flex items-center justify-center">
                <svg viewBox="0 0 100 100" className={`w-14 h-14 drop-shadow-md ${theme.stampColor}`}>
                  <path d="M50,4 C55,4 58,10 63,12 C68,14 74,12 77,16 C80,20 78,26 80,31 C82,36 88,38 88,43 C88,48 82,50 80,55 C78,60 80,66 77,70 C74,74 68,72 63,74 C58,76 55,82 50,82 C45,82 42,76 37,74 C32,72 26,74 23,70 C20,66 22,60 20,55 C18,50 12,48 12,43 C12,38 18,36 20,31 C22,26 20,20 23,16 C26,12 32,14 37,12 C42,10 45,4 50,4 Z" fill="currentColor" />
                  <circle cx="50" cy="43" r="32" fill="none" stroke="white" strokeWidth="1" opacity="0.15" />
                  <rect x="33" y="24" width="34" height="6" rx="3" fill="white" />
                  <rect x="33" y="34" width="34" height="6" rx="3" fill="white" />
                  <rect x="33" y="44" width="34" height="6" rx="3" fill="white" />
                  <text x="50" y="65" textAnchor="middle" fill="white" fontSize="9.5" fontWeight="900" letterSpacing="1" fontFamily="sans-serif">SKILLS</text>
                </svg>
              </div>
            </div>

            {/* Right Signatory - Trainer */}
            <div className="space-y-1">
              <div className="h-10 flex items-center justify-center">
                <svg viewBox="0 0 100 40" className="w-24 h-10 text-stone-800">
                  <path d="M 5,30 Q 30,28 65,32 T 95,28" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <path d="M 10,25 C 25,20 30,10 40,8 C 50,6 55,12 50,18 C 45,24 35,28 32,25 C 28,20 42,12 60,18 C 75,22 80,12 78,8 C 75,4 70,8 72,15 C 75,25 90,20 85,25" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="border-t border-stone-800 pt-1 font-sans">
                <p className="font-extrabold text-[8px] uppercase tracking-wider text-stone-500">
                  TRAINER
                </p>
                <p className="text-[9px] font-bold text-stone-700 mt-0.5">
                  {workshop?.certSignName || "Ahmed Joudah Ghafil"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-16" /> // spacer
        )}

        {/* Cryptographic verification seal block footer - kept subtle at the very bottom */}
        <div className="text-center font-mono text-[7px] sm:text-[8px] text-stone-400 z-10 border-t border-dashed border-stone-200/50 pt-2.5 mt-3 select-all leading-normal no-print">
          <p className="font-bold uppercase tracking-wider">Mharat Iraq Cryptographic Seal E-Verification Signature</p>
          <div className="flex gap-4 justify-center items-center mt-1">
            <span>YOUR VERIFICATION CODE: {cert.verificationCode || "MHARAT-EVAL-XXXX"}</span>
            <span>•</span>
            <span>HASH: {cert.signatureHash || "MHARAT-SECURE-ESIGN-88192-VERIFIED"}</span>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
