import { useState } from "react";
import { Link } from "wouter";
import { useListJobs } from "@workspace/api-client-react";
import { Briefcase, MapPin, Coins, Clock, Wifi, Search, Star, Filter, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLanguage } from "@/components/layout/LanguageContext";
import { motion } from "framer-motion";

function formatJobTime(createdAt: string | Date | undefined, isAr: boolean) {
  if (!createdAt) return "";
  const date = new Date(createdAt);
  const now = new Date();
  
  // Reset hours to compare calendar days accurately
  const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((dNow.getTime() - dDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    // Today
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? (isAr ? "م" : "PM") : (isAr ? "ص" : "AM");
    const formattedHours = hours % 12 || 12;
    return isAr 
      ? `اليوم الساعة ${formattedHours}:${minutes} ${ampm}`
      : `Today at ${formattedHours}:${minutes} ${ampm}`;
  }
  
  if (diffDays === 1) {
    // Yesterday
    return isAr ? "أمس" : "Yesterday";
  }
  
  if (diffDays < 7) {
    // Day name within current week
    const daysAr = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const daysEn = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayIndex = date.getDay();
    return isAr ? daysAr[dayIndex] : daysEn[dayIndex];
  }
  
  // Older dates: Month/Day format (e.g. 7/17)
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
}

export default function JobsPage() {
  const { language } = useLanguage();
  const isAr = language === "ar";

  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [level, setLevel] = useState("all");
  const [remote, setRemote] = useState("all");

  const params: Record<string, string | boolean> = {};
  if (search) params.search = search;
  if (type !== "all") params.type = type;
  if (level !== "all") params.level = level;
  if (remote !== "all") params.isRemote = remote === "remote";

  const { data: jobs, isLoading } = useListJobs(Object.keys(params).length > 0 ? params : undefined);
  const jobsList = Array.isArray(jobs) ? jobs : (jobs && Array.isArray((jobs as any).data) ? (jobs as any).data : []);

  return (
    <AppLayout>
      <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-start">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold px-3 py-0.5 rounded-full text-[10px]">
              {isAr ? "بوابة التوظيف المباشر" : "Direct Hiring Portal"}
            </Badge>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight" data-testid="heading-jobs">
            {isAr ? "لوحة الوظائف الشاغرة | Job Board" : "Job Board"}
          </h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            {isAr
              ? "استعرض الفرص الوظيفية المنسقة خصيصاً لشركائنا في العراق، واجتز اختبارات التصفية للتقديم الفوري."
              : "Browse career opportunities curated specifically for our partners in Iraq, and pass screening quizzes to apply."}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-8 p-5 rounded-2xl border border-border/50 bg-card/65 backdrop-blur-sm shadow-sm space-y-4 text-start">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground border-b border-border/40 pb-3 mb-2">
          <Filter className="w-4 h-4 text-primary" />
          <span>{isAr ? "فلاتر وتصفية الوظائف" : "Filters & Search"}</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={isAr ? "البحث باسم الوظيفة، المسمى أو الشركة..." : "Search by title, role or company..."}
              className="pl-10 rounded-xl border-border/60 bg-background/50 h-10 text-xs font-semibold placeholder:text-muted-foreground/75"
              data-testid="input-search-jobs"
            />
          </div>

          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-full sm:w-40 rounded-xl border-border/60 bg-background/50 h-10 text-xs font-semibold" data-testid="select-type">
              <SelectValue placeholder={isAr ? "كل أنواع الدوام" : "Job Type"} />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/50">
              <SelectItem value="all" className="text-xs font-medium">{isAr ? "كل أنواع الدوام" : "All Job Types"}</SelectItem>
              <SelectItem value="full-time" className="text-xs font-medium">{isAr ? "دوام كامل" : "Full-time"}</SelectItem>
              <SelectItem value="part-time" className="text-xs font-medium">{isAr ? "دوام جزئي" : "Part-time"}</SelectItem>
              <SelectItem value="internship" className="text-xs font-medium">{isAr ? "تدريب" : "Internship"}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-full sm:w-40 rounded-xl border-border/60 bg-background/50 h-10 text-xs font-semibold" data-testid="select-level">
              <SelectValue placeholder={isAr ? "كل المستويات" : "Career Level"} />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/50">
              <SelectItem value="all" className="text-xs font-medium">{isAr ? "كل المستويات" : "All Levels"}</SelectItem>
              <SelectItem value="junior" className="text-xs font-medium">{isAr ? "مبتدئ" : "Junior"}</SelectItem>
              <SelectItem value="mid" className="text-xs font-medium">{isAr ? "متوسط" : "Mid-level"}</SelectItem>
              <SelectItem value="senior" className="text-xs font-medium">{isAr ? "متقدم" : "Senior"}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={remote} onValueChange={setRemote}>
            <SelectTrigger className="w-full sm:w-40 rounded-xl border-border/60 bg-background/50 h-10 text-xs font-semibold" data-testid="select-remote">
              <SelectValue placeholder={isAr ? "موقع العمل" : "Location"} />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/50">
              <SelectItem value="all" className="text-xs font-medium">{isAr ? "كل مواقع العمل" : "All Locations"}</SelectItem>
              <SelectItem value="remote" className="text-xs font-medium">{isAr ? "عن بعد فقط" : "Remote Only"}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Jobs list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full rounded-2xl bg-card border border-border/50" />)}
        </div>
      ) : jobsList.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-dashed border-border/60 bg-card/30 max-w-md mx-auto">
          <Briefcase className="w-14 h-14 mx-auto mb-3 opacity-25 text-primary" />
          <h4 className="font-extrabold text-lg">{isAr ? "لم يتم العثور على وظائف" : "No jobs found"}</h4>
          <p className="text-xs text-muted-foreground mt-1">{isAr ? "حاول ضبط معايير البحث أو الفلاتر." : "Try adjusting your search criteria or filters."}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobsList.map((job: any) => (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.002 }}
              key={job.id}
              className="p-6 rounded-2xl border border-border/55 bg-gradient-to-r from-card to-background hover:border-primary/50 hover:shadow-lg transition-all duration-300 shadow-sm relative overflow-hidden group hover-sheen text-start"
              data-testid={`job-card-${job.id}`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/3 rounded-full blur-2xl pointer-events-none" />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  {job.companyLogo ? (
                    <img 
                      src={job.companyLogo} 
                      alt={job.company} 
                      className="w-12 h-12 rounded-xl object-cover border border-primary/20 shadow-sm flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center flex-shrink-0 text-primary font-bold shadow-inner">
                      {job.company.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="font-extrabold text-base text-foreground leading-snug group-hover:text-primary transition-colors duration-200">
                      {job.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs font-bold text-muted-foreground">{job.company}</p>
                      <span className="text-[10px] text-muted-foreground/40">•</span>
                      <span className="text-[10px] text-muted-foreground/75 font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-primary/60" />
                        {formatJobTime(job.createdAt, isAr)}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 mt-4 text-[10.5px] text-muted-foreground font-semibold">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-primary/70" />
                        <span className="capitalize">{isAr ? (job.type === "full-time" ? "دوام كامل" : job.type === "part-time" ? "دوام جزئي" : "تدريب") : job.type}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-primary/70" />
                        <span className="capitalize">{isAr ? (job.level === "junior" ? "مبتدئ" : job.level === "mid" ? "متوسط" : "متقدم") : job.level}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-primary/70" />
                        <span>{job.location || (isAr ? "العراق" : "Iraq")}</span>
                      </span>
                      {job.isRemote && (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <Wifi className="w-3.5 h-3.5" />
                          <span>{isAr ? "عن بعد" : "Remote"}</span>
                        </span>
                      )}
                      {(job.salaryMin || job.salaryMax) && (
                        <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-bold">
                          <Coins className="w-3.5 h-3.5" />
                          <span>
                            {job.salaryMin ? `${job.salaryMin}K` : ""} - {job.salaryMax ? `${job.salaryMax}K` : ""} {isAr ? "د.ع" : "IQD"}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 border-border/30 pt-4 md:pt-0 gap-3">
                  <div className="text-left md:text-right">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-bold py-1 px-2.5 rounded-lg">
                      {isAr ? `علامة القبول: ${job.passScore}%` : `Pass score: ${job.passScore}%`}
                    </Badge>
                  </div>
                  <Link href={`/jobs/${job.id}`}>
                    <button className="h-9 px-5 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 shadow-md shadow-primary/10 transition-all flex items-center gap-1.5 group-hover:scale-102">
                      <span>{isAr ? "التفاصيل والتقديم" : "View & Apply"}</span>
                      <ArrowRight className={`w-3.5 h-3.5 ${isAr ? "rotate-180" : ""}`} />
                    </button>
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
