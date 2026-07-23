import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Award, ShieldCheck, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OfficialCertificate } from "@/components/shared/OfficialCertificate";

interface CertificatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  workshopTitle: string;
  certSignTitle: string;
  certSignName: string;
  certEkey: string;
  isAr: boolean;
  recipientName?: string;
  certTemplateUrl?: string | null;
  certTemplateType?: string | null;
  updatedAt?: string | null;
}

export function CertificatePreviewModal({
  isOpen,
  onClose,
  workshopTitle,
  certSignTitle,
  certSignName,
  certEkey,
  isAr,
  recipientName,
  certTemplateUrl,
  certTemplateType,
  updatedAt,
}: CertificatePreviewModalProps) {
  const isImageUrl = (url?: string | null) => {
    if (!url) return false;
    const cleanUrl = url.split("?")[0].split("#")[0].toLowerCase();
    return cleanUrl.endsWith(".png") || cleanUrl.endsWith(".jpg") || cleanUrl.endsWith(".jpeg") || cleanUrl.endsWith(".svg");
  };
  const isImageTemplate = !!certTemplateUrl && (
    certTemplateType === "png" ||
    certTemplateType === "jpg" ||
    certTemplateType === "jpeg" ||
    certTemplateType === "svg" ||
    isImageUrl(certTemplateUrl)
  );
  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-6 sm:p-8 rounded-2xl bg-card border border-border/80 shadow-2xl overflow-y-auto max-h-[92vh]">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <DialogTitle className="text-sm font-extrabold text-foreground">
              {isAr ? "معاينة تصميم الشهادة الرسمية" : "Official Certificate Blueprint"}
            </DialogTitle>
          </div>
          <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 gap-1.5 text-xs font-bold rounded-lg border-border/60">
            <Printer className="w-3.5 h-3.5" />
            <span>{isAr ? "طباعة تجريبية" : "Test Print"}</span>
          </Button>
        </DialogHeader>

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
        <OfficialCertificate
          recipientName={recipientName || (isAr ? "اسم المتدرب (نموذج)" : "Student Name (Sample)")}
          workshopTitle={workshopTitle || (isAr ? "[عنوان الورشة التدريبية]" : "[Workshop Title]")}
          issueDate={isAr ? "6 حزيران 2026" : "6 June. 2026"}
          certSignTitle={certSignTitle}
          certSignName={certSignName}
          certEkey={certEkey}
          certTemplateUrl={certTemplateUrl}
          certTemplateType={certTemplateType}
          updatedAt={updatedAt}
          isAr={isAr}
          certType="participation"
        />

        {/* Informative Footer */}
        <div className="mt-5 text-start text-xs text-muted-foreground bg-muted/30 p-4 rounded-xl border border-border/50">
          <p className="font-bold flex items-center gap-1.5 mb-1 text-primary">
            <ShieldCheck className="w-4 h-4" />
            {isAr ? "حماية الملكية والحقوق الرقمية لمشروع مهارات" : "Skills Project Digital Right Guarantee"}
          </p>
          <p className="leading-relaxed text-[11px] font-semibold">
            {isAr 
              ? "يتم تشفير وتوليد هذه البصمة الإلكترونية الفريدة تلقائياً فور اجتياز المتدرب للاختبار التدريبي للورشة بنجاح، مما يمنع التزييف تماماً ويؤكد تسجيل وتخزين الشهادة في قواعد بيانات مشروع مهارات الرسمية." 
              : "This cryptographic signature is generated automatically upon scoring the passing grade. It links the student ID with the workshop block and guarantees immediate authenticity across any printing medium."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
