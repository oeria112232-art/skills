import { useRoute, Link } from "wouter";
import { useGetCertificate, getGetCertificateQueryKey, useGetWorkshop, getGetWorkshopQueryKey, useListTracks } from "@workspace/api-client-react";
import { ArrowLeft, Printer, Award, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLanguage } from "@/components/layout/LanguageContext";
import { useEffect } from "react";
import { useSearch } from "wouter";
import { OfficialCertificate } from "@/components/shared/OfficialCertificate";

// Level-based styling configurations
const getThemeDetails = (level: number) => {
  switch (level) {
    case 1: // Master Expert
      return {
        bg: "radial-gradient(circle at 50% 50%, #FCFAF5 0%, #FAF0DF 100%)",
        borderColor: "border-amber-400",
        stoneColor: "text-amber-900",
        flourishColor: "text-amber-800/80",
        frameColor: "border-amber-600/70",
        doubleFrameColor: "border-amber-700/50",
        stampColor: "text-amber-700",
        accentLine: "bg-amber-600",
        badge: "Level 1: Master Expert Certification",
        badgeAr: "المستوى 1: شهادة خبير متقدم (Master)"
      };
    case 2: // Expert Specialist
      return {
        bg: "radial-gradient(circle at 50% 50%, #FAF5FF 0%, #F3E8FF 100%)",
        borderColor: "border-purple-400",
        stoneColor: "text-purple-950",
        flourishColor: "text-purple-800/80",
        frameColor: "border-purple-600/70",
        doubleFrameColor: "border-purple-700/50",
        stampColor: "text-purple-700",
        accentLine: "bg-purple-600",
        badge: "Level 2: Expert Specialist Certification",
        badgeAr: "المستوى 2: شهادة خبير متخصص (Expert)"
      };
    case 3: // Professional Specialist
      return {
        bg: "radial-gradient(circle at 50% 50%, #F0F9FF 0%, #E0F2FE 100%)",
        borderColor: "border-blue-400",
        stoneColor: "text-blue-950",
        flourishColor: "text-blue-800/80",
        frameColor: "border-blue-600/70",
        doubleFrameColor: "border-blue-700/50",
        stampColor: "text-blue-700",
        accentLine: "bg-blue-600",
        badge: "Level 3: Professional Specialist",
        badgeAr: "المستوى 3: أخصائي محترف (Professional)"
      };
    case 4: // Participation
    default:
      return {
        bg: "radial-gradient(circle at 50% 50%, #FAF8F5 0%, #F5F1EC 100%)",
        borderColor: "border-stone-400",
        stoneColor: "text-stone-850",
        flourishColor: "text-stone-850",
        frameColor: "border-stone-800",
        doubleFrameColor: "border-stone-855",
        stampColor: "text-stone-750",
        accentLine: "bg-stone-600",
        badge: "Level 4: Participation",
        badgeAr: "المستوى 4: حضور ومشاركة"
      };
  }
};

export default function CertificateViewPage() {
  const [, params] = useRoute("/certificate/:id");
  const certId = parseInt(params?.id || "0", 10);
  const { data: cert, isLoading } = useGetCertificate(certId, { query: { enabled: !!certId, queryKey: getGetCertificateQueryKey(certId) } });
  const { data: workshop } = useGetWorkshop(cert?.workshopId || 0, { query: { enabled: !!cert?.workshopId, queryKey: getGetWorkshopQueryKey(cert?.workshopId || 0) } });
  const { data: tracks } = useListTracks();
  const tracksList = Array.isArray(tracks) ? tracks : (tracks && Array.isArray((tracks as any).data) ? (tracks as any).data : []);
  const track = cert?.trackId ? tracksList.find((t: any) => t.id === cert.trackId) : null;
  const program: any = cert?.trackId ? track : workshop;
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
  const hasCustomTemplate = !!program?.certTemplateUrl;
  const isImageUrl = (url?: string | null) => {
    if (!url) return false;
    const cleanUrl = url.split("?")[0].split("#")[0].toLowerCase();
    return cleanUrl.endsWith(".png") || cleanUrl.endsWith(".jpg") || cleanUrl.endsWith(".jpeg") || cleanUrl.endsWith(".svg");
  };
  const isImageTemplate = hasCustomTemplate && (
    program?.certTemplateType === "png" ||
    program?.certTemplateType === "jpg" ||
    program?.certTemplateType === "jpeg" ||
    program?.certTemplateType === "svg" ||
    program?.certTemplateType?.startsWith("overlay") ||
    isImageUrl(program?.certTemplateUrl)
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
              href={program?.certTemplateUrl || "#"} 
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

      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .certificate-print-container,
          .certificate-print-container * {
            visibility: visible !important;
          }
          .certificate-print-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 297mm !important;
            height: 210mm !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background-size: cover !important;
            background-position: center !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 landscape !important;
            margin: 0 !important;
          }
        }
      `}</style>

      {/* Official Certificate Visual Canvas (100% Match to Skills of Youth Template) */}
      <div className="max-w-4xl mx-auto my-8 print:my-0">
        <OfficialCertificate
          recipientName={cert.userName}
          workshopTitle={cert.type === "track" ? cert.trackTitle : cert.workshopTitle}
          issueDate={cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString(isAr ? "ar-EG" : "en-US", { day: 'numeric', month: 'long', year: 'numeric' }) : ""}
          certSignTitle={program?.certSignTitle}
          certSignName={program?.certSignName}
          certEkey={program?.certEkey}
          certTemplateUrl={program?.certTemplateUrl}
          certTemplateType={program?.certTemplateType}
          updatedAt={(program as any)?.updatedAt}
          isAr={isAr}
          certType={cert.type as any}
          verificationCode={cert.verificationCode}
          signatureHash={cert.signatureHash}
        />
      </div>
    </AppLayout>
  );
}
