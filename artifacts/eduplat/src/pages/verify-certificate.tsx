import { useState } from "react";
import { useVerifyCertificate, getVerifyCertificateQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLanguage } from "@/components/layout/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Award, ShieldCheck, AlertTriangle, Calendar, Search, QrCode, FileText } from "lucide-react";
import { Link } from "wouter";

// Helper to resolve level tags
const getLevelDetails = (level: number, isAr: boolean) => {
  switch (level) {
    case 1:
      return {
        title: isAr ? "المستوى 1: خبير متقدم" : "Lvl 1: Master Certification",
        color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
      };
    case 2:
      return {
        title: isAr ? "المستوى 2: خبير متخصص" : "Lvl 2: Expert Specialist",
        color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
      };
    case 3:
      return {
        title: isAr ? "المستوى 3: أخصائي محترف" : "Lvl 3: Professional Specialist",
        color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
      };
    case 4:
      return {
        title: isAr ? "المستوى 4: حضور ومشاركة" : "Lvl 4: Participation",
        color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
      };
    default:
      return {
        title: isAr ? "مستوى مخصص" : "Custom Level",
        color: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-border"
      };
  }
};

export default function VerifyCertificatePage() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [code, setCode] = useState("");
  const [searchCode, setSearchCode] = useState("");

  const { data, isLoading, isError, error } = useVerifyCertificate(searchCode, {
    query: {
      enabled: !!searchCode,
      queryKey: getVerifyCertificateQueryKey(searchCode),
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      setSearchCode(code.trim());
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto text-start">
        {/* Header */}
        <div className="mb-10 text-center lg:text-start">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold px-3 py-0.5 rounded-full text-[10px] mb-3">
            {isAr ? "نظام التحقق الرقمي المشفر" : "Cryptographic Seal Verification"}
          </Badge>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
            {isAr ? "التحقق من صحة الشهادات" : "Verify Certificates"}
          </h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            {isAr 
              ? "أدخل رمز التحقق المكتوب أسفل الشهادة للتأكد من هويتها وتوقيعها المشفر."
              : "Enter the verification code printed on the certificate to validate its cryptographic seal."}
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8 flex gap-3">
          <div className="relative flex-1">
            <QrCode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground/60" />
            <Input 
              placeholder={isAr ? "مثال: MH-VFY-XXXXXX-YYYY" : "e.g., MH-VFY-XXXXXX-YYYY"}
              value={code}
              onChange={e => setCode(e.target.value)}
              className="pl-10 h-11.5 rounded-xl border-border/70 focus-visible:ring-primary/25 placeholder:text-muted-foreground/60 text-sm font-semibold tracking-wide uppercase"
            />
          </div>
          <Button type="submit" disabled={isLoading} className="h-11.5 px-6 rounded-xl font-bold gap-2 text-xs shadow-md shadow-primary/10">
            <Search className="w-4 h-4" />
            <span>{isAr ? "تحقق" : "Verify"}</span>
          </Button>
        </form>

        {/* Results Panel */}
        <AnimatePresence mode="wait">
          {isLoading && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-16"
            >
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-muted-foreground font-bold">{isAr ? "جاري فحص الختم التشفيري للشهادة..." : "Checking cryptographic seal..."}</p>
            </motion.div>
          )}

          {isError && (
            <motion.div 
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center space-y-3"
            >
              <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
              <h3 className="font-extrabold text-sm text-foreground">{isAr ? "خطأ في الاتصال بالسيرفر" : "Network error"}</h3>
              <p className="text-xs text-muted-foreground font-medium">{(error as any)?.message || "Failed to fetch verification detail"}</p>
            </motion.div>
          )}

          {data && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {data.verified === false ? (
                /* Unverified / Error */
                <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center space-y-3">
                  <AlertTriangle className="w-10 h-10 text-destructive mx-auto animate-pulse" />
                  <h3 className="font-extrabold text-sm text-foreground">{isAr ? "فشل التحقق الرقمي" : "Verification Failed"}</h3>
                  <p className="text-xs text-destructive font-semibold leading-relaxed">
                    {data.error || (isAr ? "هذا الكود غير مسجل أو لم يتم إصدار شهادته بعد." : "This code is not registered or not yet issued.")}
                  </p>
                </div>
              ) : (
                /* Verified */
                <div className="rounded-2xl border border-emerald-500/20 bg-card p-6 md:p-8 shadow-sm space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/3 rounded-full blur-2xl pointer-events-none" />
                  
                  {/* Stamp */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold px-3 py-1 rounded-lg text-[10.5px] gap-1 shadow-sm">
                        <ShieldCheck className="w-4 h-4" />
                        {isAr ? "شهادة موثقة ورسمية" : "Verified Credential"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-semibold block pt-1">
                        {isAr ? "رقم الشهادة:" : "Cert No:"} <span className="font-mono text-foreground font-bold">{data.certificate?.certificateNumber}</span>
                      </span>
                    </div>

                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shrink-0">
                      <Award className="w-7 h-7" />
                    </div>
                  </div>

                  <div className="h-px bg-border/50" />

                  {/* Metadata fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                    <div className="space-y-1">
                      <span className="text-muted-foreground block">{isAr ? "المتدرب(ة):" : "Student Name:"}</span>
                      <span className="text-foreground text-sm font-extrabold">{data.certificate?.userName}</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-muted-foreground block">{isAr ? "مستوى الشهادة:" : "Certificate Level:"}</span>
                      {data.certificate && (
                        <span className={`inline-flex px-2 py-0.5 rounded-lg border text-[10px] font-bold ${getLevelDetails(data.certificate.level, isAr).color}`}>
                          {getLevelDetails(data.certificate.level, isAr).title}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <span className="text-muted-foreground block">{isAr ? "العنوان والموضوع:" : "Title / Subject:"}</span>
                      <span className="text-foreground text-sm font-extrabold leading-relaxed">
                        "{data.certificate?.type === "track" ? data.certificate.trackTitle : data.certificate?.workshopTitle}"
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-muted-foreground block">{isAr ? "تاريخ الإصدار الفعلي:" : "Issue Date:"}</span>
                      <div className="flex items-center gap-1.5 text-foreground font-extrabold">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span>{data.certificate && new Date(data.certificate.issuedAt).toLocaleDateString(isAr ? "ar-EG" : "en-US", { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-muted-foreground block">{isAr ? "درجة الاجتياز:" : "Completion Score:"}</span>
                      <span className="text-foreground text-sm font-extrabold">{data.certificate?.score}%</span>
                    </div>
                  </div>

                  <div className="h-px bg-border/50" />

                  {/* Cryptographic Seal info */}
                  <div className="bg-muted/40 p-4 rounded-xl space-y-2">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{isAr ? "الختم والتوقيع الرقمي المشفر" : "Cryptographic Seal & Verification Signature"}</span>
                    </div>
                    <div className="font-mono text-[8.5px] text-muted-foreground font-semibold leading-relaxed space-y-1">
                      <div className="truncate">CODE: <span className="text-foreground select-all">{data.certificate?.verificationCode}</span></div>
                      <div className="truncate">SIG: <span className="text-primary select-all">{data.certificate?.signatureHash}</span></div>
                    </div>
                  </div>

                  {/* Link to view */}
                  <Link href={`/certificate/${data.certificate?.id}`}>
                    <Button className="w-full rounded-xl font-bold h-11 gap-1.5">
                      <FileText className="w-4.5 h-4.5" />
                      <span>{isAr ? "عرض واستخراج الشهادة الرسمية" : "View Official Certificate Page"}</span>
                    </Button>
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
