import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import {
  useGetJob, useGetJobScreeningQuestions, useCreateApplication, useSubmitScreening, useUpdateApplicationStatus,
  getListJobsQueryKey, getGetJobScreeningQuestionsQueryKey, getGetJobQueryKey,
} from "@workspace/api-client-react";
import { ArrowLeft, MapPin, Clock, Coins, Wifi, Timer, CheckCircle, XCircle, AlertTriangle, FileText, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/components/layout/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/components/layout/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";

type Phase = "info" | "quiz" | "result" | "apply" | "submitted";

export default function JobDetailPage() {
  const [, params] = useRoute("/jobs/:id");
  const jobId = parseInt(params?.id || "0", 10);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { language } = useLanguage();
  const isAr = language === "ar";

  const { data: job, isLoading: jobLoading } = useGetJob(jobId, { query: { enabled: !!jobId, queryKey: getGetJobQueryKey(jobId) } });
  const { data: questions } = useGetJobScreeningQuestions(jobId, { query: { enabled: !!jobId, queryKey: getGetJobScreeningQuestionsQueryKey(jobId) } });

  const createApp = useCreateApplication();
  const submitScreening = useSubmitScreening();
  const updateAppStatus = useUpdateApplicationStatus();

  const [phase, setPhase] = useState<Phase>("info");
  const [answers, setAnswers] = useState<number[]>([]);
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<{ score: number; passed: boolean; total: number; message?: string } | null>(null);
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "", coverLetter: "" });

  useEffect(() => {
    if (user) {
      setForm(f => ({ ...f, name: user.name || f.name, email: user.email || f.email }));
    }
  }, [user]);

  if (jobLoading) return <AppLayout><Skeleton className="h-96 w-full rounded-2xl bg-card border border-border/50" /></AppLayout>;
  if (!job) return <AppLayout><p className="text-center text-muted-foreground mt-16 font-bold">{isAr ? "الوظيفة غير موجودة" : "Job not found"}</p></AppLayout>;

  const q = [] as Exclude<typeof questions, undefined>; // Disabled screening quizzes per user request to cancel all job exams

  const handleStartQuiz = async () => {
    try {
      const app = await createApp.mutateAsync({ data: { jobId, applicantName: form.name || "Applicant", applicantEmail: form.email || "applicant@email.com", userId: user?.id } });
      setApplicationId(app.id);
      if (q.length > 0) {
        setAnswers(new Array(q.length).fill(-1));
        setCurrent(0);
        setPhase("quiz");
      } else {
        setPhase("apply");
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: isAr ? "خطأ في إنشاء الطلب" : "Error creating application",
        description: e.message
      });
    }
  };

  const handleAnswer = (idx: number) => {
    const newAnswers = [...answers];
    newAnswers[current] = idx;
    setAnswers(newAnswers);
  };

  const handleNext = async () => {
    if (current < q.length - 1) {
      setCurrent(c => c + 1);
    } else {
      if (!applicationId) return;
      try {
        const res = await submitScreening.mutateAsync({ id: applicationId, data: { answers } });
        setResult(res);
        setPhase("result");
      } catch (e: any) {
        toast({
          variant: "destructive",
          title: isAr ? "فشل تقديم الإجابات" : "Error submitting quiz",
          description: e.message
        });
      }
    }
  };

  const handleSubmitApplication = async () => {
    if (!applicationId) return;
    try {
      await updateAppStatus.mutateAsync({
        id: applicationId,
        data: {
          status: "pending",
          coverLetter: form.coverLetter
        } as any
      });
      toast({ title: isAr ? "تم تقديم طلبك!" : "Application submitted!", description: isAr ? "تم استلام معلومات طلبك بنجاح." : "Your application has been received." });
      setPhase("submitted");
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: isAr ? "فشل التقديم" : "Submission Failed",
        description: e.message
      });
    }
  };

  return (
    <AppLayout>
      <div className="mb-6 no-print text-start">
        <Link href="/jobs">
          <a className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary mb-6 transition-colors" data-testid="link-back-jobs">
            <ArrowLeft className="w-4 h-4" /> {isAr ? "العودة للوحة الوظائف" : "Back to Jobs"}
          </a>
        </Link>
      </div>

      <AnimatePresence mode="wait">
        {phase === "info" && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-3xl text-start"
          >
            <div className="p-6 sm:p-8 rounded-2xl border border-border/55 bg-gradient-to-b from-card to-background shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/4 rounded-full blur-2xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                <div className="flex items-start gap-4">
                  {(job as any).companyLogo ? (
                    <img 
                      src={(job as any).companyLogo} 
                      alt={job.company} 
                      className="w-12 h-12 rounded-xl object-cover border border-primary/20 shadow-sm flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center flex-shrink-0 text-primary font-bold shadow-inner">
                      {job.company.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-tight" data-testid="heading-job-title">
                      {job.title}
                    </h1>
                    <p className="text-primary font-bold mt-1 text-sm">{job.company}</p>
                  </div>
                </div>
                <Badge variant={job.status === "open" ? "default" : "secondary"} className="rounded-xl font-bold w-fit">
                  {job.status === "open" ? (isAr ? "مفتوح للتقديم" : "Open") : job.status}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground flex-wrap mb-6 pb-5 border-b border-border/40">
                {job.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-primary/70" /> {job.location}</span>}
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-primary/70" /> 
                  <span className="capitalize">{isAr ? (job.type === "full-time" ? "دوام كامل" : job.type === "part-time" ? "دوام جزئي" : "تدريب") : job.type}</span> · {isAr ? (job.level === "junior" ? "مبتدئ" : job.level === "mid" ? "متوسط" : "متقدم") : job.level} {isAr ? "" : "level"}
                </span>
                {job.isRemote && <span className="flex items-center gap-1"><Wifi className="w-3.5 h-3.5 text-primary/70" /> {isAr ? "عن بعد" : "Remote"}</span>}
                {job.salaryMin && job.salaryMax && (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Coins className="w-3.5 h-3.5" /> 
                    {job.salaryMin}K - {job.salaryMax}K {isAr ? "د.ع" : "IQD"}
                  </span>
                )}
              </div>

              <div className="prose prose-sm max-w-none mb-6">
                <h3 className="font-extrabold text-sm text-foreground mb-2">{isAr ? "وصف الوظيفة والمهام:" : "Description:"}</h3>
                <p className="whitespace-pre-wrap text-muted-foreground text-xs leading-relaxed font-medium bg-muted/20 p-4 rounded-xl border border-border/30">{job.description}</p>
              </div>

              {q.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/25 flex items-start gap-3 mb-6">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-extrabold text-amber-800 dark:text-amber-300 text-xs">{isAr ? "يتطلب اختبار تأهيلي قصير" : "Screening Test Required"}</p>
                    <p className="text-amber-700 dark:text-amber-400 text-[11px] leading-relaxed font-medium">
                      {isAr 
                        ? `هذه الوظيفة تتطلب اجتياز اختبار تحديد مستوى مكون من ${q.length} أسئلة. يجب أن تحصل على درجة ${job.passScore}% أو أعلى لتتمكن من إرسال السيرة الذاتية.`
                        : `This job requires passing a screening test of ${q.length} questions. You must score ${job.passScore}% or higher to apply.`}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4 mb-8 pt-4 border-t border-border/30">
                <h3 className="font-extrabold text-sm text-foreground mb-1">{isAr ? "معلومات المتقدم:" : "Applicant Details:"}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="applicant-name" className="text-xs font-bold text-muted-foreground">{isAr ? "الاسم الكامل" : "Full Name"}</Label>
                    <Input id="applicant-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={isAr ? "أدخل اسمك الكامل" : "Enter your full name"} className="rounded-xl border-border/60 bg-background/50 text-xs font-semibold h-10" data-testid="input-applicant-name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="applicant-email" className="text-xs font-bold text-muted-foreground">{isAr ? "البريد الإلكتروني" : "Email Address"}</Label>
                    <Input id="applicant-email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="yourname@email.com" className="rounded-xl border-border/60 bg-background/50 text-xs font-semibold h-10" data-testid="input-applicant-email" />
                  </div>
                </div>
                {user && (
                  <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
                    <FileText className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                        {isAr ? "سيتم إرفاق سيرتك الذاتية تلقائياً" : "Your CV will be automatically attached"}
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        {isAr ? "نظامنا سيقوم بإرسال ملفك الشخصي وسيرتك الذاتية ومعلومات التواصل مع هذا الطلب." : "Our system will attach your profile, CV, and contact information with this application."}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Button 
                onClick={handleStartQuiz} 
                disabled={!form.name || !form.email || createApp.isPending} 
                className="w-full rounded-xl font-bold h-11 shadow-md shadow-primary/10 text-xs" 
                data-testid="button-start-screening"
              >
                {q.length > 0 ? (isAr ? "ابدأ اختبار التأهيل القصير" : "Start Screening Quiz") : (isAr ? "قدّم الآن فوراً" : "Apply Now")}
              </Button>
            </div>
          </motion.div>
        )}

        {phase === "quiz" && q.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-2xl text-start"
          >
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-muted-foreground">
                  {isAr ? `السؤال ${current + 1} من ${q.length}` : `Question ${current + 1} of ${q.length}`}
                </span>
                <Badge variant="outline" className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-bold rounded-lg text-[10px]">
                  <Timer className="w-3.5 h-3.5" /> {isAr ? "مؤقت نشط" : "Timer Active"}
                </Badge>
              </div>
              <Progress value={((current + 1) / q.length) * 100} className="h-2 rounded-full" data-testid="progress-quiz" />
            </div>

            <div className="p-6 sm:p-8 rounded-2xl border border-border/55 bg-gradient-to-b from-card to-background shadow-lg">
              <h2 className="font-extrabold text-base sm:text-lg text-foreground mb-6 leading-snug" data-testid="text-quiz-question">
                {q[current].question}
              </h2>
              
              <div className="space-y-3.5">
                {q[current].options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    data-testid={`button-answer-option-${idx}`}
                    className={`w-full p-4 rounded-xl border text-xs leading-relaxed transition-all duration-200 flex items-center ${isAr ? "text-right" : "text-left"} ${
                      answers[current] === idx 
                        ? "border-primary bg-primary/10 font-bold text-primary shadow-sm" 
                        : "border-border/60 bg-card/60 hover:border-primary/50 text-muted-foreground hover:text-foreground font-medium"
                    }`}
                  >
                    <span className={`inline-flex w-6 h-6 rounded-lg items-center justify-center text-[10px] font-bold border ${isAr ? "ml-3" : "mr-3"} ${
                      answers[current] === idx ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/40 bg-muted/50"
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    {opt}
                  </button>
                ))}
              </div>
              
              <Button
                onClick={handleNext}
                disabled={answers[current] === -1 || submitScreening.isPending}
                className="w-full mt-8 rounded-xl font-bold h-11 shadow-sm shadow-primary/10 text-xs"
                data-testid="button-next-question"
              >
                {current < q.length - 1 ? (isAr ? "السؤال التالي" : "Next Question") : (isAr ? "تسليم إجابات الاختبار" : "Submit Answers")}
              </Button>
            </div>
          </motion.div>
        )}

        {phase === "result" && result && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="max-w-md mx-auto text-center"
          >
            <div className="p-8 rounded-2xl border border-border/55 bg-gradient-to-b from-card to-background shadow-xl">
              {result.passed ? (
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/25 mx-auto mb-4 shadow-inner text-emerald-500">
                  <CheckCircle className="w-8 h-8" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center border border-destructive/25 mx-auto mb-4 shadow-inner text-destructive">
                  <XCircle className="w-8 h-8" />
                </div>
              )}
              
              <h2 className="text-xl font-extrabold text-foreground mb-2">
                {result.passed 
                  ? (isAr ? "تهانينا! لقد اجتزت الاختبار" : "Congratulations! You passed") 
                  : (isAr ? "لم يحالفك الحظ هذه المرة" : "Better luck next time")}
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed font-semibold mb-6">
                {isAr 
                  ? (result.passed ? "لقد حققت متطلبات التقديم وبإمكانك إتمام الطلب الآن." : "درجتك أقل من متطلبات القبول لهذه الوظيفة. حاول مجدداً لاحقاً.")
                  : result.message}
              </p>
              
              <div className="text-4xl font-black text-primary mb-6 text-glow-primary" data-testid="text-screening-score">
                {result.score}%
              </div>
              <Progress value={result.score} className="h-2.5 mb-8 rounded-full" />
              
              {result.passed ? (
                <Button onClick={() => setPhase("apply")} className="w-full rounded-xl font-bold h-10 shadow-md shadow-primary/10 text-xs gap-1.5" data-testid="button-proceed-apply">
                  <FileText className="w-4 h-4" /> {isAr ? "المتابعة لتقديم الملف" : "Continue to Application"}
                </Button>
              ) : (
                <Link href="/jobs">
                  <Button variant="outline" className="w-full rounded-xl font-bold h-10 text-xs border-border/80 hover:bg-accent/40" data-testid="button-back-to-jobs">
                    {isAr ? "العودة للوحة الوظائف" : "Back to Jobs"}
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>
        )}

        {phase === "apply" && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-2xl text-start"
          >
            <div className="p-6 sm:p-8 rounded-2xl border border-border/55 bg-gradient-to-b from-card to-background shadow-lg">
              <h2 className="text-xl font-extrabold text-foreground mb-1">{isAr ? "إكمال طلب التقديم للوظيفة" : "Complete Application"}</h2>
              <p className="text-xs text-muted-foreground font-medium mb-6">{isAr ? "أدخل رسالة التغطية الخاصة بك لإقناع مسؤولي التوظيف." : "Introduce yourself with a cover letter to the hiring team."}</p>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cover-letter" className="text-xs font-bold text-muted-foreground">{isAr ? "خطاب التقديم" : "Cover Letter"}</Label>
                  <Textarea
                    id="cover-letter"
                    value={form.coverLetter}
                    onChange={e => setForm(f => ({ ...f, coverLetter: e.target.value }))}
                    placeholder={isAr ? "اشرح لمسؤولي التوظيف باختصار لماذا تعتبر المرشح الأفضل لهذه الوظيفة وما هي مهاراتك الرئيسية..." : "Explain briefly why you are the best fit for this role..."}
                    rows={6}
                    className="rounded-xl border-border/60 bg-background/50 text-xs font-semibold leading-relaxed focus-visible:ring-primary focus-visible:border-primary"
                    data-testid="textarea-cover-letter"
                  />
                </div>
              </div>
              
              <Button onClick={handleSubmitApplication} disabled={updateAppStatus.isPending} className="w-full mt-8 rounded-xl font-bold h-11 shadow-md shadow-primary/10 text-xs gap-1.5" data-testid="button-submit-application">
                <Send className="w-4 h-4" /> {updateAppStatus.isPending ? (isAr ? "جاري الإرسال..." : "Sending...") : (isAr ? "إرسال الطلب النهائي" : "Submit Final Application")}
              </Button>
            </div>
          </motion.div>
        )}

        {phase === "submitted" && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl mx-auto text-center"
          >
            <div className="p-8 rounded-2xl border border-border/55 bg-gradient-to-b from-card to-background shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/25 mx-auto mb-5 text-emerald-500 shadow-inner">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-extrabold text-foreground mb-2">{isAr ? "تم تقديم طلبك بنجاح!" : "Application Submitted!"}</h2>
              <p className="text-xs text-muted-foreground leading-relaxed font-semibold mb-6">
                {isAr 
                  ? `تم استلام طلب التقديم الخاص بك لوظيفة ${job.title} لدى ${job.company}. سنقوم بمراجعته والتواصل معك قريباً.`
                  : `Your application for ${job.title} at ${job.company} has been received. We will contact you soon.`}
              </p>
              <Link href="/jobs">
                <Button variant="outline" className="rounded-xl font-bold px-6 text-xs border-border/80 hover:bg-accent/40" data-testid="button-back-after-apply">
                  {isAr ? "تصفح المزيد من الفرص المهنية" : "Browse More Jobs"}
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
