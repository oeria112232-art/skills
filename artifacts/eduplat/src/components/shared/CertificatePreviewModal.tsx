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
}: CertificatePreviewModalProps) {
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

        {/* Certificate Frame Container */}
        <div className="relative w-full overflow-hidden bg-white text-slate-800 p-6 sm:p-10 rounded-xl border-[12px] border-double border-amber-600/35 shadow-inner font-serif select-none max-w-full mx-auto print:border-none print:shadow-none">
          {/* Background watermark seal */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
            <Award className="w-[300px] h-[300px] text-amber-700" />
          </div>

          {/* Top Header Section */}
          <div className="flex items-start justify-between border-b-2 border-amber-600/20 pb-4 mb-6 text-[10px] sm:text-xs">
            <div className="text-left leading-relaxed">
              <p className="font-bold text-amber-800 uppercase tracking-wider">Skills Project</p>
              <p className="text-[9px] text-slate-500">Ministry of Labor & Social Affairs</p>
              <p className="text-[8px] font-mono text-slate-400">Ref: CERT-PREVIEW-XXXX</p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 mb-1">
                <Award className="w-5.5 h-5.5 text-amber-600" />
              </div>
              <span className="text-[9px] font-bold text-amber-700 uppercase tracking-widest">مهارات</span>
            </div>
            
            <div className="text-right leading-relaxed font-sans">
              <p className="font-bold text-amber-800">مشروع مهارات</p>
              <p className="text-[9px] text-slate-500">وزارة العمل والشؤون الاجتماعية</p>
              <p className="text-[8px] font-mono text-slate-400">تاريخ المعاينة: {new Date().toLocaleDateString(isAr ? "ar-EG" : "en-US")}</p>
            </div>
          </div>

          {/* Certificate Main Text */}
          <div className="text-center my-6 space-y-5">
            <h1 className="text-xl sm:text-3xl font-black text-slate-800 tracking-widest font-serif uppercase">
              {isAr ? "شهادة تخرج واجتياز" : "Certificate of Completion"}
            </h1>
            
            <p className="text-xs sm:text-sm text-slate-500 italic max-w-lg mx-auto font-sans leading-relaxed">
              {isAr 
                ? "تشهد إدارة مشروع مهارات الوطنية للتدريب والتأهيل المهني بأن المتدرب:"
                : "The administration of the Skills Project certifies that:"}
            </p>
            
            <div className="my-4">
              <h2 className="text-lg sm:text-2xl font-extrabold text-amber-700 underline decoration-double decoration-1 underline-offset-8" data-testid="certificate-recipient-name">
                {recipientName || (isAr ? "اسم المتدرب (نموذج)" : "Student Name (Sample)")}
              </h2>
              <p className="text-[8px] sm:text-[9px] text-slate-400 font-mono mt-2 uppercase">VERIFIED STUDENT ID: #00000</p>
            </div>
            
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed font-sans">
              {isAr
                ? `قد أكمل بنجاح المسار التدريبي المكثف واجتاز كافة الاختبارات والورش العملية المقررة لـ:`
                : `has successfully completed the intensive career development path and passed all screening tests and practical workshops prescribed for:`}
            </p>
            
            <h3 className="text-sm sm:text-lg font-bold text-slate-800 tracking-wide font-sans bg-amber-50/50 py-1.5 px-4 rounded-lg border border-amber-500/10 inline-block">
              {workshopTitle || (isAr ? "[عنوان الورشة التدريبية]" : "[Workshop Title]")}
            </h3>
          </div>

          {/* Signatures & Security Lock Row */}
          <div className="mt-8 pt-6 border-t border-amber-600/10 grid grid-cols-1 sm:grid-cols-3 gap-6 items-end text-xs">
            {/* Signature Authority */}
            <div className="text-center sm:text-left space-y-1.5">
              <p className="text-[10px] text-slate-400 font-bold uppercase">{isAr ? "جهة التوقيع" : "Authorized Signature"}</p>
              <div className="h-10 flex items-center justify-center sm:justify-start">
                <span className="font-serif italic text-amber-700/80 text-sm font-semibold tracking-wider">
                  {certSignName.split(" / ")[0]}
                </span>
              </div>
              <div className="border-t border-slate-300 pt-1.5">
                <p className="font-bold text-slate-700 text-[10px]">{certSignName}</p>
                <p className="text-[9px] text-slate-400 font-medium">{certSignTitle}</p>
              </div>
            </div>

            {/* Official Stamps / Security Lock */}
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="relative w-16 h-16 rounded-full border-2 border-double border-amber-600/30 flex items-center justify-center bg-amber-50/20 shadow-sm">
                <ShieldCheck className="w-8 h-8 text-amber-600" />
                <span className="absolute text-[6px] font-bold text-amber-700 uppercase tracking-widest animate-spin-slow">
                  MHARAT * IRAQ * SECURE *
                </span>
              </div>
              <span className="text-[9px] font-extrabold text-amber-700 uppercase tracking-widest">{isAr ? "معتمد رسمياً" : "Verified Official"}</span>
            </div>

            {/* Electronic Verification Cryptographic signature */}
            <div className="text-center sm:text-right space-y-1">
              <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200/50 rounded px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider mb-1 shadow-sm">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>{isAr ? "توقيع إلكتروني موثق" : "Verified E-Signature"}</span>
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase">{isAr ? "بصمة التحقق الإلكترونية" : "Cryptographic Signature Hash"}</p>
              <p className="text-[8px] font-mono text-slate-500 break-all leading-tight max-w-[200px] sm:ml-auto">
                {certEkey || "MHARAT-SECURE-ESIGN-88192-VERIFIED"}
              </p>
              <p className="text-[7.5px] text-slate-400 italic">
                {isAr 
                  ? "يضمن هذا التوقيع الرقمي مصداقية الشهادة وحقوق مشروعنا التقنية." 
                  : "This digital block secures certificate authenticity and project technical copyrights."}
              </p>
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
