import { useState } from "react";
import { useRoute, Link } from "wouter";
import {
  useGetJob, useGetJobScreeningQuestions, useCreateApplication, useSubmitScreening,
  getListJobsQueryKey,
} from "@workspace/api-client-react";
import { ArrowLeft, MapPin, Clock, DollarSign, Wifi, Timer, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
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

type Phase = "info" | "quiz" | "result" | "apply" | "submitted";

export default function JobDetailPage() {
  const [, params] = useRoute("/jobs/:id");
  const jobId = parseInt(params?.id || "0", 10);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: job, isLoading: jobLoading } = useGetJob(jobId, { query: { enabled: !!jobId, queryKey: getListJobsQueryKey() } });
  const { data: questions } = useGetJobScreeningQuestions(jobId, { query: { enabled: !!jobId } });

  const createApp = useCreateApplication();
  const submitScreening = useSubmitScreening();

  const [phase, setPhase] = useState<Phase>("info");
  const [answers, setAnswers] = useState<number[]>([]);
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<{ score: number; passed: boolean; total: number; message: string } | null>(null);
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "", coverLetter: "" });

  if (jobLoading) return <AppLayout><Skeleton className="h-96 w-full rounded-xl" /></AppLayout>;
  if (!job) return <AppLayout><p className="text-center text-muted-foreground mt-16">Job not found</p></AppLayout>;

  const q = questions ?? [];

  const handleStartQuiz = async () => {
    // Create application first
    const app = await createApp.mutateAsync({ data: { jobId, applicantName: form.name || "Applicant", applicantEmail: form.email || "applicant@email.com", userId: user?.id } });
    setApplicationId(app.id);
    setAnswers(new Array(q.length).fill(-1));
    setCurrent(0);
    setPhase("quiz");
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
      // Submit
      if (!applicationId) return;
      const res = await submitScreening.mutateAsync({ id: applicationId, data: { answers } });
      setResult(res);
      setPhase("result");
    }
  };

  const handleSubmitApplication = async () => {
    toast({ title: "Application submitted!", description: "Your application has been received." });
    setPhase("submitted");
  };

  return (
    <AppLayout>
      <Link href="/jobs">
        <a className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors" data-testid="link-back-jobs">
          <ArrowLeft className="w-4 h-4" /> Back to Jobs
        </a>
      </Link>

      {phase === "info" && (
        <div className="max-w-3xl">
          <div className="p-6 rounded-xl border border-border bg-card mb-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl font-bold mb-1" data-testid="heading-job-title">{job.title}</h1>
                <p className="text-primary font-medium">{job.company}</p>
              </div>
              <Badge variant={job.status === "open" ? "default" : "secondary"}>{job.status}</Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap mb-6">
              {job.location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{job.location}</span>}
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{job.type} · {job.level}</span>
              {job.isRemote && <span className="flex items-center gap-1"><Wifi className="w-4 h-4" />Remote</span>}
              {job.salaryMin && job.salaryMax && <span className="flex items-center gap-1"><DollarSign className="w-4 h-4" />${job.salaryMin.toLocaleString()} – ${job.salaryMax.toLocaleString()}</span>}
            </div>
            <div className="prose prose-sm max-w-none text-foreground mb-6">
              <p className="whitespace-pre-wrap text-muted-foreground">{job.description}</p>
            </div>
            {q.length > 0 && (
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-start gap-3 mb-6">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-300 text-sm">Screening Test Required</p>
                  <p className="text-amber-700 dark:text-amber-400 text-xs mt-1">
                    This position requires a {q.length}-question screening test. You need {job.passScore}% or higher to unlock the application form.
                  </p>
                </div>
              </div>
            )}
            <div className="space-y-3 mb-6">
              <div>
                <Label htmlFor="applicant-name">Full Name</Label>
                <Input id="applicant-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your full name" data-testid="input-applicant-name" />
              </div>
              <div>
                <Label htmlFor="applicant-email">Email</Label>
                <Input id="applicant-email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Your email" data-testid="input-applicant-email" />
              </div>
            </div>
            <Button onClick={handleStartQuiz} disabled={!form.name || !form.email || createApp.isPending} className="w-full" data-testid="button-start-screening">
              {q.length > 0 ? "Start Screening Test" : "Apply Now"}
            </Button>
          </div>
        </div>
      )}

      {phase === "quiz" && q.length > 0 && (
        <div className="max-w-2xl">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Question {current + 1} of {q.length}</span>
              <Badge variant="outline" className="gap-1"><Timer className="w-3 h-3" />Timed</Badge>
            </div>
            <Progress value={((current + 1) / q.length) * 100} className="h-2" data-testid="progress-quiz" />
          </div>
          <div className="p-6 rounded-xl border border-border bg-card">
            <h2 className="font-semibold text-lg mb-6" data-testid="text-quiz-question">{q[current].question}</h2>
            <div className="space-y-3">
              {q[current].options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  data-testid={`button-answer-option-${idx}`}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${answers[current] === idx ? "border-primary bg-primary/10 font-medium" : "border-border bg-card hover:border-primary/50"}`}
                >
                  <span className="inline-flex w-6 h-6 rounded-full items-center justify-center text-xs font-bold mr-2 border border-current">{String.fromCharCode(65 + idx)}</span>
                  {opt}
                </button>
              ))}
            </div>
            <Button
              onClick={handleNext}
              disabled={answers[current] === -1 || submitScreening.isPending}
              className="w-full mt-6"
              data-testid="button-next-question"
            >
              {current < q.length - 1 ? "Next Question" : "Submit Screening"}
            </Button>
          </div>
        </div>
      )}

      {phase === "result" && result && (
        <div className="max-w-xl text-center">
          <div className="p-8 rounded-xl border border-border bg-card">
            {result.passed ? (
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            ) : (
              <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            )}
            <h2 className="text-2xl font-bold mb-2">{result.passed ? "You Passed!" : "Not Quite"}</h2>
            <p className="text-muted-foreground mb-4">{result.message}</p>
            <div className="text-4xl font-bold text-primary mb-6" data-testid="text-screening-score">{result.score}%</div>
            <Progress value={result.score} className="h-3 mb-6" />
            {result.passed ? (
              <Button onClick={() => setPhase("apply")} className="w-full" data-testid="button-proceed-apply">
                Proceed to Application
              </Button>
            ) : (
              <Link href="/jobs">
                <Button variant="outline" className="w-full" data-testid="button-back-to-jobs">Back to Jobs</Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {phase === "apply" && (
        <div className="max-w-2xl">
          <div className="p-6 rounded-xl border border-border bg-card">
            <h2 className="text-xl font-bold mb-6">Complete Your Application</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="cover-letter">Cover Letter</Label>
                <Textarea
                  id="cover-letter"
                  value={form.coverLetter}
                  onChange={e => setForm(f => ({ ...f, coverLetter: e.target.value }))}
                  placeholder="Tell us why you're the right fit..."
                  rows={5}
                  data-testid="textarea-cover-letter"
                />
              </div>
            </div>
            <Button onClick={handleSubmitApplication} className="w-full mt-6" data-testid="button-submit-application">
              Submit Application
            </Button>
          </div>
        </div>
      )}

      {phase === "submitted" && (
        <div className="max-w-xl text-center">
          <div className="p-8 rounded-xl border border-border bg-card">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Application Submitted!</h2>
            <p className="text-muted-foreground mb-6">Your application for <strong>{job.title}</strong> at <strong>{job.company}</strong> has been received. We'll be in touch soon.</p>
            <Link href="/jobs">
              <Button variant="outline" data-testid="button-back-after-apply">Browse More Jobs</Button>
            </Link>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
