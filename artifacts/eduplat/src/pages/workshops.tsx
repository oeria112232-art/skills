import { Link } from "wouter";
import { useListWorkshops } from "@workspace/api-client-react";
import { BookOpen, Calendar, Clock, Users, ChevronRight, CheckCircle, Award, Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLanguage } from "@/components/layout/LanguageContext";
import { useState } from "react";
import { motion } from "framer-motion";
import { CertificatePreviewModal } from "@/components/shared/CertificatePreviewModal";

const statusColors: Record<string, string> = {
  upcoming: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  ongoing: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  completed: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-border/60",
};

const arStatusNames: Record<string, string> = {
  upcoming: "قريباً",
  ongoing: "جارية حالياً",
  completed: "منتهية",
};

const arFilterNames: Record<string, string> = {
  all: "الكل",
  upcoming: "القادمة",
  ongoing: "الجارية",
  completed: "المنتهية",
};

export default function WorkshopsPage() {
  const [filter, setFilter] = useState("all");
  const { data: workshopsData, isLoading } = useListWorkshops(filter !== "all" ? { status: filter } : undefined);
  const workshops = Array.isArray(workshopsData) ? workshopsData : (workshopsData && Array.isArray((workshopsData as any).data) ? (workshopsData as any).data : []);
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [previewWorkshop, setPreviewWorkshop] = useState<any | null>(null);

  return (
    <AppLayout>
      <div className="mb-10 text-start">
        <div className="flex items-center gap-2 mb-1.5">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold px-3 py-0.5 rounded-full text-[10px]">
            {isAr ? "الورش التفاعلية المباشرة" : "Interactive Live Sessions"}
          </Badge>
        </div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight" data-testid="heading-workshops">
          {isAr ? "ورش العمل والندوات | Workshops" : "Workshops"}
        </h1>
        <p className="text-sm text-muted-foreground font-medium mt-1">
          {isAr
            ? "سجّل في الورش العملية المباشرة بقيادة نخبة من المدربين، واجتز الاختبارات لتصدر لك الشهادات فوراً."
            : "Enroll in live trainer-led workshops, pass certification exams, and build your portfolio."}
        </p>
      </div>

      <div className="flex overflow-x-auto gap-2 mb-8 text-start pb-2 scrollbar-none snap-x snap-mandatory max-w-full">
        {["all", "upcoming", "ongoing", "completed"].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            data-testid={`filter-${s}`}
            className={`px-4.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap snap-start shrink-0 ${
              filter === s 
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/10" 
                : "bg-card border border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent/40"
            }`}
          >
            {isAr ? (arFilterNames[s] || s) : (s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1))}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-2xl bg-card border border-border/50" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-start">
          {!Array.isArray(workshops) || workshops.length === 0 ? (
            <div className="col-span-full text-center py-20 rounded-2xl border border-dashed border-border/60 bg-card/30 max-w-md mx-auto">
              <BookOpen className="w-14 h-14 mx-auto mb-3 opacity-25 text-primary" />
              <h4 className="font-extrabold text-lg">{isAr ? "لا توجد ورش عمل حالياً" : "No workshops found"}</h4>
              <p className="text-xs text-muted-foreground mt-1">{isAr ? "يرجى التحقق من الفلاتر أو ترقب إطلاق ورش جديدة قريباً." : "Please check your filters or wait for upcoming workshops."}</p>
            </div>
          ) : (
            workshops.map(w => (
              <motion.div 
                whileHover={{ y: -5 }}
                key={w.id} 
                className="rounded-2xl border border-border/55 bg-gradient-to-b from-card to-background hover:border-primary/50 hover:shadow-lg transition-all duration-300 overflow-hidden shadow-sm flex flex-col hover-sheen relative" 
                data-testid={`workshop-card-${w.id}`}
              >
                {/* Certificate preview button over workshop cover */}
                {w.hasCertificate !== 0 && (
                  <div className={`absolute top-3 ${isAr ? "left-3" : "right-3"} z-20`}>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPreviewWorkshop(w);
                      }}
                      className="h-7 px-2.5 text-[10px] rounded-lg bg-background/95 text-foreground hover:bg-background backdrop-blur-md shadow-md border border-border/45 font-bold gap-1"
                      data-testid={`preview-cert-btn-${w.id}`}
                    >
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      <span>{isAr ? "شكل الشهادة" : "Preview Cert"}</span>
                    </Button>
                  </div>
                )}

                {w.imageUrl ? (
                  <img src={w.imageUrl} alt={w.title} className="w-full h-40 object-cover border-b border-border/40" />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-primary/10 to-primary/5 border-b border-border/40 flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-primary/30" />
                  </div>
                )}
                
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3.5">
                      <Badge variant="outline" className={statusColors[w.status] || ""}>
                        {isAr ? (arStatusNames[w.status] || w.status) : w.status}
                      </Badge>
                      <div className="flex items-center gap-2">
                        {w.status === "completed" && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                        {(w.price ?? 0) > 0 && (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-bold gap-1">
                            <Coins className="w-3 h-3" />
                            {w.price} {isAr ? "نقطة" : "pts"}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <h3 className="font-extrabold text-base text-foreground mb-1 leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                      {w.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed font-medium">{w.description}</p>
                    
                    <div className="flex items-center gap-3 text-[10.5px] text-muted-foreground mb-5 font-semibold flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-primary/70" />
                        {new Date(w.date).toLocaleDateString(isAr ? "ar-EG" : "en-US")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-primary/70" />
                        {w.duration} {isAr ? "دقيقة" : "min"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-primary/70" />
                        {w.enrolledCount}/{w.capacity} {isAr ? "مسجل" : "enrolled"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/30">
                    <Link href={`/workshops/${w.id}`}>
                      <Button size="sm" className="w-full gap-1 rounded-xl font-bold h-9 text-xs shadow-md shadow-primary/5" variant={w.status === "upcoming" ? "default" : "outline"} data-testid={`button-workshop-view-${w.id}`}>
                        {w.status === "upcoming" ? (isAr ? "سجّل الآن" : "Enroll Now") : w.status === "completed" ? (isAr ? "عرض والاختبار" : "View & Exam") : (isAr ? "عرض التفاصيل" : "View Details")}
                        <ChevronRight className={`w-3.5 h-3.5 ${isAr ? "rotate-180" : ""}`} />
                      </Button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {previewWorkshop && (
        <CertificatePreviewModal
          isOpen={!!previewWorkshop}
          onClose={() => setPreviewWorkshop(null)}
          workshopTitle={previewWorkshop.title}
          certSignTitle={previewWorkshop.certSignTitle || (isAr ? "رئيس الهيئة / Board Chairman" : "Board Chairman")}
          certSignName={previewWorkshop.certSignName || (isAr ? "أحمد الرشيدي / Ahmed Al-Rashidi" : "Ahmed Al-Rashidi")}
          certEkey={previewWorkshop.certEkey || "MHARAT-SECURE-ESIGN-88192-VERIFIED"}
          isAr={isAr}
        />
      )}
    </AppLayout>
  );
}
