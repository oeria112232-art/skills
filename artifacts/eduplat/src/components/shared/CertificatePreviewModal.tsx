import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Award, ShieldCheck, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";

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
}: CertificatePreviewModalProps) {
  const isImageUrl = (url?: string | null) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".svg");
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

        {/* Certificate Frame Container */}
        <div 
          className="relative w-full overflow-hidden text-slate-800 p-8 sm:p-14 border-2 shadow-2xl aspect-[1.414/1] flex flex-col justify-between select-none rounded-none certificate-print-container"
          style={{ 
            fontFamily: "'Lora', 'Georgia', serif", 
            backgroundImage: isImageTemplate ? `url(${certTemplateUrl})` : "radial-gradient(circle at 50% 50%, #FCFAF5 0%, #FAF0DF 100%)",
            backgroundSize: isImageTemplate ? "cover" : undefined,
            backgroundPosition: isImageTemplate ? "center" : undefined,
            borderColor: isImageTemplate ? "transparent" : "#d6d3d1"
          }}
        >
          {/* Double Border Frame with Sharp Corners - Hidden on custom image templates */}
          {!isImageTemplate && (
            <>
              <div className="absolute inset-4 border border-stone-800/70 pointer-events-none rounded-none" />
              <div className="absolute inset-5 border-2 border-double border-stone-800/50 pointer-events-none rounded-none" />
            </>
          )}

          {/* Victorian Corner flourishes - Hidden on custom image templates */}
          {!isImageTemplate && (
            <>
              {/* Victorian Corner flourishes */}
              {/* Top-Left */}
              <div className="absolute top-7 left-7 pointer-events-none opacity-95 text-stone-850">
                <svg viewBox="0 0 100 100" className="w-14 h-14 text-current">
                  <path d="M5,5 C35,5 45,12 55,25 C45,35 30,30 20,20 C35,35 25,55 5,55" fill="none" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M5,5 C5,25 12,45 25,55 C35,45 30,30 20,20 C35,35 55,25 55,5" fill="none" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M15,15 C35,15 40,30 30,35 C20,40 15,30 25,20 C35,10 45,25 40,35" fill="none" stroke="currentColor" strokeWidth="0.8" />
                  <circle cx="50" cy="20" r="1.5" fill="currentColor" />
                  <circle cx="20" cy="50" r="1.5" fill="currentColor" />
                </svg>
              </div>
              {/* Top-Right */}
              <div className="absolute top-7 right-7 pointer-events-none scale-x-[-1] opacity-90 text-stone-850">
                <svg viewBox="0 0 100 100" className="w-14 h-14 text-current">
                  <path d="M5,5 C35,5 45,12 55,25 C45,35 30,30 20,20 C35,35 25,55 5,55" fill="none" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M5,5 C5,25 12,45 25,55 C35,45 30,30 20,20 C35,35 55,25 55,5" fill="none" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M15,15 C35,15 40,30 30,35 C20,40 15,30 25,20 C35,10 45,25 40,35" fill="none" stroke="currentColor" strokeWidth="0.8" />
                  <circle cx="50" cy="20" r="1.5" fill="currentColor" />
                  <circle cx="20" cy="50" r="1.5" fill="currentColor" />
                </svg>
              </div>
              {/* Bottom-Left */}
              <div className="absolute bottom-7 left-7 pointer-events-none scale-y-[-1] opacity-90 text-stone-850">
                <svg viewBox="0 0 100 100" className="w-14 h-14 text-current">
                  <path d="M5,5 C35,5 45,12 55,25 C45,35 30,30 20,20 C35,35 25,55 5,55" fill="none" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M5,5 C5,25 12,45 25,55 C35,45 30,30 20,20 C35,35 55,25 55,5" fill="none" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M15,15 C35,15 40,30 30,35 C20,40 15,30 25,20 C35,10 45,25 40,35" fill="none" stroke="currentColor" strokeWidth="0.8" />
                  <circle cx="50" cy="20" r="1.5" fill="currentColor" />
                  <circle cx="20" cy="50" r="1.5" fill="currentColor" />
                </svg>
              </div>
              {/* Bottom-Right */}
              <div className="absolute bottom-7 right-7 pointer-events-none scale-x-[-1] scale-y-[-1] opacity-90 text-stone-850">
                <svg viewBox="0 0 100 100" className="w-14 h-14 text-current">
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
            <div className="text-center mt-2 z-10 flex flex-col items-center">
              <h3 className="text-lg sm:text-[24px] font-bold font-serif border-b-2 pb-0.5 px-6 tracking-wide text-stone-900 leading-tight border-stone-800">
                Skills of youth
              </h3>
              <p className="text-[9px] sm:text-[11px] text-stone-600 font-serif mt-1.5 tracking-wide text-center">
                For educational and<br />pedagogical services
              </p>
            </div>
          ) : (
            <div className="h-4" />
          )}

          {/* Certificate title - Hidden on custom image templates */}
          {!isImageTemplate && (
            <div className="text-center my-0.5 z-10">
              <h1 className="text-xl sm:text-[28px] font-medium text-stone-800 tracking-wide font-serif leading-none">
                {isAr ? "شهادة مشاركة وحضور" : "Certificate of participation"}
              </h1>
            </div>
          )}

          {/* Body content - shifted down if image template */}
          <div className={`text-center max-w-xl mx-auto space-y-3 z-10 ${isImageTemplate ? 'mt-20 sm:mt-28' : ''}`}>
            <p className="text-[10px] sm:text-[11px] text-stone-700 font-sans font-bold uppercase tracking-wider">
              {isAr ? "نشهد أن المتدرب(ة):" : "This is to certify that"}
            </p>

            {/* Student Name */}
            <h2 className="text-base sm:text-[22px] font-bold text-stone-800 font-sans my-0.5 tracking-wide">
              ({recipientName || (isAr ? "اسم المتدرب (نموذج)" : "Student Name (Sample)")})
            </h2>

            <p className="text-[10px] sm:text-[11px] text-stone-700 font-sans font-bold leading-relaxed">
              {isAr
                ? "قد حضر وشارك بنجاح في الورشة التدريبية بعنوان:"
                : "Has successfully participated in the training webinar entitled"}
            </p>

            {/* Course/Workshop title */}
            <h3 className="text-xs sm:text-[15px] font-bold text-stone-900 font-serif max-w-md mx-auto my-1 leading-normal">
              "{workshopTitle || (isAr ? "[عنوان الورشة التدريبية]" : "[Workshop Title]")}"
            </h3>

            {/* Issue date */}
            <p className="text-xs sm:text-[12px] font-bold text-stone-900 font-sans tracking-wide mt-2">
              {isAr ? "6 حزيران 2026" : "6 June. 2026"}
            </p>
          </div>

          {/* Footer Signature Blocks - Hidden on custom image templates */}
          {!isImageTemplate ? (
            <div className="grid grid-cols-3 gap-4 items-end text-center z-10 pt-2 px-4 sm:px-10">
              {/* Left Signatory - CEO */}
              <div className="space-y-0.5">
                <div className="h-8 flex items-center justify-center">
                  <svg viewBox="0 0 100 40" className="w-20 h-8 text-stone-800">
                    <path d="M 5,30 Q 30,28 65,32 T 95,28" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    <path d="M 10,25 C 25,20 30,10 40,8 C 50,6 55,12 50,18 C 45,24 35,28 32,25 C 28,20 42,12 60,18 C 75,22 80,12 78,8 C 75,4 70,8 72,15 C 75,25 90,20 85,25" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="border-t border-stone-800 pt-0.5 font-sans">
                  <p className="font-extrabold text-[7px] uppercase tracking-wider text-stone-500">
                    CEO OF SKILLS
                  </p>
                  <p className="text-[8px] font-bold text-stone-700 mt-0.5">
                    Ahmed Joudah Ghafil
                  </p>
                </div>
              </div>

              {/* Central Logo Stamp */}
              <div className="flex flex-col items-center justify-center pb-0.5">
                <div className="relative group flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-12 h-12 drop-shadow-md text-stone-750">
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
              <div className="space-y-0.5">
                <div className="h-8 flex items-center justify-center">
                  <svg viewBox="0 0 100 40" className="w-20 h-8 text-stone-800">
                    <path d="M 5,30 Q 30,28 65,32 T 95,28" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    <path d="M 10,25 C 25,20 30,10 40,8 C 50,6 55,12 50,18 C 45,24 35,28 32,25 C 28,20 42,12 60,18 C 75,22 80,12 78,8 C 75,4 70,8 72,15 C 75,25 90,20 85,25" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="border-t border-stone-800 pt-0.5 font-sans">
                  <p className="font-extrabold text-[7px] uppercase tracking-wider text-stone-500">
                    {certSignTitle || (isAr ? "المدرب" : "TRAINER")}
                  </p>
                  <p className="text-[8px] font-bold text-stone-700 mt-0.5">
                    {certSignName || "Ahmed Joudah Ghafil"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-16" />
          )}

          {/* Cryptographic verification seal block footer */}
          <div className="text-center font-mono text-[6.5px] sm:text-[7.5px] text-stone-400 z-10 border-t border-dashed border-stone-200/50 pt-2 mt-2 select-all leading-normal no-print">
            <p className="font-bold uppercase tracking-wider">Mharat Iraq Cryptographic Seal E-Verification Signature</p>
            <div className="flex gap-4 justify-center items-center mt-0.5">
              <span>YOUR VERIFICATION CODE: {certEkey || "MHARAT-EVAL-XXXX"}</span>
              <span>•</span>
              <span>HASH: {certEkey || "MHARAT-SECURE-ESIGN-88192-VERIFIED"}</span>
            </div>
          </div>
        </div>

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
