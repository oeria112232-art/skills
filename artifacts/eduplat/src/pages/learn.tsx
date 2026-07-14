import { Link } from "wouter";
import { useListTracks } from "@workspace/api-client-react";
import { GraduationCap, Clock, Users, ChevronRight, Shield, Globe, Code, Cpu, MessageSquare, Smartphone, Sparkles, Coins, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLanguage } from "@/components/layout/LanguageContext";
import { motion } from "framer-motion";

const trackIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  tot: MessageSquare,
  networking: Globe,
  cybersecurity: Shield,
  fullstack: Code,
  "computer-basics": Cpu,
  mobile: Smartphone,
};

const trackColors: Record<string, { border: string; bg: string; text: string; glow: string; iconBg: string }> = {
  tot: { border: "border-violet-500/35 dark:border-violet-500/20", bg: "from-violet-500/10 to-violet-600/5", text: "text-violet-500", glow: "hover:shadow-violet-500/10", iconBg: "bg-violet-500/10 text-violet-500" },
  networking: { border: "border-blue-500/35 dark:border-blue-500/20", bg: "from-blue-500/10 to-blue-600/5", text: "text-blue-500", glow: "hover:shadow-blue-500/10", iconBg: "bg-blue-500/10 text-blue-500" },
  cybersecurity: { border: "border-red-500/35 dark:border-red-500/20", bg: "from-red-500/10 to-red-600/5", text: "text-red-500", glow: "hover:shadow-red-500/10", iconBg: "bg-red-500/10 text-red-500" },
  fullstack: { border: "border-emerald-500/35 dark:border-emerald-500/20", bg: "from-emerald-500/10 to-emerald-600/5", text: "text-emerald-500", glow: "hover:shadow-emerald-500/10", iconBg: "bg-emerald-500/10 text-emerald-500" },
  "computer-basics": { border: "border-orange-500/35 dark:border-orange-500/20", bg: "from-orange-500/10 to-orange-600/5", text: "text-orange-500", glow: "hover:shadow-orange-500/10", iconBg: "bg-orange-500/10 text-orange-500" },
  mobile: { border: "border-pink-500/35 dark:border-pink-500/20", bg: "from-pink-500/10 to-pink-600/5", text: "text-pink-500", glow: "hover:shadow-pink-500/10", iconBg: "bg-pink-500/10 text-pink-500" },
};

const levelColors: Record<string, string> = {
  beginner: "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 font-bold",
  intermediate: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold",
  advanced: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-bold",
};

const arLevelNames: Record<string, string> = {
  beginner: "مبتدئ",
  intermediate: "متوسط",
  advanced: "متقدم",
};

const arTrackTitles: Record<string, string> = {
  tot: "إعداد المدربين TOT",
  networking: "شبكات CCNA",
  cybersecurity: "الأمن السيبراني",
  fullstack: "تطوير الويب الشامل",
  "computer-basics": "أساسيات الحاسوب",
  mobile: "تطوير تطبيقات الموبايل",
};

const arTrackDescs: Record<string, string> = {
  tot: "مسار متكامل لبناء وتأهيل المدربين المحترفين ونقل الخبرات بأساليب تعليمية حديثة.",
  networking: "تعلم مبادئ وبروتوكولات الشبكات وتأهيلك لشهادة سيسكو CCNA المعتمدة.",
  cybersecurity: "منهج مكثف في أمن المعلومات واختراق الشبكات الأخلاقي وحماية الأنظمة الرقمية.",
  fullstack: "مسار شامل لتطوير واجهات المستخدم وبرمجة الخوادم وقواعد البيانات وتكامل الأنظمة.",
  "computer-basics": "دورة شاملة في محو الأمية الرقمية والتعامل مع الحاسوب والبرمجيات المكتبية الأساسية.",
  mobile: "تعلم تصميم وتطوير تطبيقات الهواتف الذكية الهجينة والأصلية وتكامل المتاجر.",
};

export default function LearnPage() {
  const { data: tracks, isLoading, isError, refetch } = useListTracks();
  const { language } = useLanguage();
  const isAr = language === "ar";

  return (
    <AppLayout>
      <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-start">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold px-3 py-0.5 rounded-full text-[10px]">
              {isAr ? "مسارات التأهيل المهني" : "Professional Career Paths"}
            </Badge>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight" data-testid="heading-learn">
            {isAr ? "مسارات التعلم | Learning Paths" : "Learning Paths"}
          </h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            {isAr 
              ? "خرائط طريق متكاملة مصممة لنقلك خطوة بخطوة من مرحلة التأسيس إلى الجاهزية التامة للتوظيف."
              : "Structured roadmaps designed to take you from core foundations to absolute job readiness."}
          </p>
        </div>
        
        {tracks && Array.isArray(tracks) && tracks.length > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-xl bg-card border border-border/50 text-xs font-semibold text-muted-foreground w-fit shadow-sm">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span>{tracks.length} {isAr ? "مسارات دراسية نشطة" : "Active Paths"}</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-56 rounded-2xl bg-card border border-border/50" />
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-24 rounded-2xl border border-destructive/30 bg-destructive/5">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-30 text-destructive" />
          <h3 className="font-extrabold text-lg mb-1">{isAr ? "حدث خطأ في تحميل المسارات" : "Error loading tracks"}</h3>
          <p className="text-xs text-muted-foreground mb-4">{isAr ? "تحقق من اتصالك بالإنترنت وحاول مرة أخرى." : "Check your connection and try again."}</p>
          <Button onClick={() => refetch()} variant="outline" className="rounded-xl font-bold text-xs gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            {isAr ? "إعادة المحاولة" : "Retry"}
          </Button>
        </div>
      ) : !Array.isArray(tracks) || tracks.length === 0 ? (
        <div className="text-center py-24 rounded-2xl border border-dashed border-border/60 bg-card/30">
          <GraduationCap className="w-16 h-16 mx-auto mb-4 opacity-25 text-primary" />
          <h3 className="font-extrabold text-lg">{isAr ? "لا توجد مسارات تعلم متاحة حالياً" : "No learning paths available yet"}</h3>
          <p className="text-xs text-muted-foreground mt-1">{isAr ? "ترقب إطلاق مسارات جديدة قريباً." : "New pathways will be launched soon."}</p>
        </div>
      ) : (
        <motion.div 
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.08
              }
            }
          }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {tracks.map(track => {
            const Icon = trackIcons[track.slug] || GraduationCap;
            const style = trackColors[track.slug] || { 
              border: "border-border/60", 
              bg: "from-gray-500/10 to-gray-600/5", 
              text: "text-gray-500", 
              glow: "hover:shadow-gray-500/5",
              iconBg: "bg-muted text-muted-foreground"
            };
            return (
              <motion.div
                key={track.id}
                variants={{
                  hidden: { opacity: 0, y: 15 },
                  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120 } }
                }}
                whileHover={{ y: -6 }}
                className="group text-start"
              >
                <Link
                  href={`/learn/${track.slug}`}
                  className={`block h-full p-6 rounded-2xl border bg-gradient-to-br ${style.bg} ${style.border} ${style.glow} hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-lg relative overflow-hidden hover-sheen`}
                  data-testid={`track-card-${track.slug}`}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

                  <div className="flex items-start justify-between mb-5">
                    <div className={`w-12 h-12 rounded-xl ${style.iconBg} flex items-center justify-center border shadow-inner group-hover:scale-105 transition-transform duration-350`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge className={levelColors[track.level] || ""}>
                        {isAr ? (arLevelNames[track.level] || track.level) : track.level}
                      </Badge>
                      {(track.price ?? 0) > 0 && (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-bold gap-1 text-[10px]">
                          <Coins className="w-3 h-3" />
                          {track.price} {isAr ? "نقطة" : "pts"}
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground font-mono uppercase">{track.level}</span>
                    </div>
                  </div>

                  <h3 className="font-extrabold text-lg text-foreground mb-1 group-hover:text-primary transition-colors leading-tight font-sans" data-testid={`track-title-${track.slug}`}>
                    {isAr ? (arTrackTitles[track.slug] || track.title) : track.title}
                  </h3>
                  
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-6 leading-relaxed font-medium">
                    {isAr ? (arTrackDescs[track.slug] || track.description) : track.description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-4 border-t border-border/30 font-semibold mt-auto">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-primary/70" />
                        {track.estimatedHours} {isAr ? "ساعة" : "hours"}
                      </span>
                      <span className="flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-primary/70" />
                        {track.moduleCount} {isAr ? "وحدات" : "modules"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-primary/70" />
                        {track.enrolledCount} {isAr ? "طالب" : "students"}
                      </span>
                    </div>
                    <div className="w-6 h-6 rounded-lg bg-card border border-border/50 flex items-center justify-center text-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all">
                      <ChevronRight className={`w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform ${isAr ? "rotate-180" : ""}`} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </AppLayout>
  );
}
