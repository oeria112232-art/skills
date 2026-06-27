import { useState } from "react";
import { useRoute, Link } from "wouter";
import {
  useGetWorkshop, useGetWorkshopExam, useEnrollWorkshop, useSubmitExam,
  getGetWorkshopQueryKey,
} from "@workspace/api-client-react";
import { ArrowLeft, Calendar, Clock, Users, CheckCircle, XCircle, Award, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/components/layout/AuthContext";
import { useToast } from "@/hooks/use-toast";

type Phase = "info" | "exam" | "result";

export default function WorkshopDetailPage() {
  const [, params] = useRoute("/workshops/:id");
  const workshopId = parseInt(params?.id || "0", 10);
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: workshop, isLoading } = useGetWorkshop(workshopId, { query: { enabled: !!workshopId, queryKey: getGetWorkshopQueryKey(workshopId) } });
  const { data: exam } = useGetWorkshopExam(workshopId, { query: { enabled: !!workshopId } });

  const enroll = useEnrollWorkshop();
  const submitExam = useSubmitExam();

  const [phase, setPhase] = useState<Phase>("info");
  const [enrolled, setEnrolled] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<{ score: number; passed: boolean; total: number; message: string; certificateId?: number | null } | null>(null);

  if (isLoading) return <AppLayout><Skeleton className="h-96 w-full rounded-xl" /></AppLayout>;
  if (!workshop) return <AppLayout><p className="text-center text-muted-foreground mt-16">Workshop not found</p></AppLayout>;

  const questions = exam?.questions ?? [];

  const handleEnroll = async () => {
    if (!user) return;
    await enroll.mutateAsync({ id: workshopId, data: { userId: user.id, userName: user.name, userEmail: user.email } });
    setEnrolled(true);
    toast({ title: "Enrolled!", description: `You're now enrolled in ${workshop.title}` });
  };

  const handleAnswer = (idx: number) => {
    const a = [...answers];
    a[current] = idx;
    setAnswers(a);
  };

  const handleNext = async () => {
    if (current < questions.length - 1) {
      setCurrent(c => c + 1);
    } else {
      if (!user) return;
      const res = await submitExam.mutateAsync({ id: workshopId, data: { userId: user.id, answers } });
      setResult(res);
      setPhase("result");
    }
  };

  const handleStartExam = () => {
    setAnswers(new Array(questions.length).fill(-1));
    setCurrent(0);
    setPhase("exam");
  };

  return (
    <AppLayout>
      <Link href="/workshops">
        <a className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors" data-testid="link-back-workshops">
          <ArrowLeft className="w-4 h-4" /> Back to Workshops
        </a>
      </Link>

      {phase === "info" && (
        <div className="max-w-3xl">
          {workshop.imageUrl && (
            <img src={workshop.imageUrl} alt={workshop.title} className="w-full h-56 object-cover rounded-xl mb-6" />
          )}
          <div className="p-6 rounded-xl border border-border bg-card mb-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl font-bold mb-1" data-testid="heading-workshop-title">{workshop.title}</h1>
                <p className="text-muted-foreground text-sm">by {workshop.instructor}</p>
              </div>
              <Badge>{workshop.status}</Badge>
            </div>
            <p className="text-muted-foreground mb-6">{workshop.description}</p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground mb-6 flex-wrap">
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{new Date(workshop.date).toLocaleString()}</span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{workshop.duration} minutes</span>
              <span className="flex items-center gap-1"><Users className="w-4 h-4" />{workshop.enrolledCount}/{workshop.capacity} enrolled</span>
              <span className="flex items-center gap-1"><Award className="w-4 h-4" />Pass score: {workshop.passScore}%</span>
            </div>
            {workshop.tags && workshop.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {workshop.tags.map(t => <Badge key={t} variant="outline">{t}</Badge>)}
              </div>
            )}
            <div className="flex gap-3">
              {!enrolled && workshop.status === "upcoming" && (
                <Button onClick={handleEnroll} disabled={enroll.isPending} data-testid="button-enroll-workshop">
                  {enroll.isPending ? "Enrolling..." : "Enroll Now"}
                </Button>
              )}
              {(enrolled || workshop.status !== "upcoming") && questions.length > 0 && (
                <Button onClick={handleStartExam} variant={enrolled ? "default" : "outline"} data-testid="button-start-exam">
                  Take Certification Exam
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {phase === "exam" && questions.length > 0 && (
        <div className="max-w-2xl">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">{workshop.title} — Certification Exam</h2>
              <span className="text-sm text-muted-foreground">{current + 1}/{questions.length}</span>
            </div>
            <Progress value={((current + 1) / questions.length) * 100} className="h-2" data-testid="progress-exam" />
          </div>
          <div className="p-6 rounded-xl border border-border bg-card">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Timer className="w-3 h-3" /> Question {current + 1}</p>
            <h3 className="font-semibold text-lg mb-6" data-testid="text-exam-question">{questions[current].question}</h3>
            <div className="space-y-3">
              {questions[current].options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  data-testid={`button-exam-option-${idx}`}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${answers[current] === idx ? "border-primary bg-primary/10 font-medium" : "border-border hover:border-primary/50"}`}
                >
                  <span className="inline-flex w-6 h-6 rounded-full items-center justify-center text-xs font-bold mr-2 border border-current">{String.fromCharCode(65 + idx)}</span>
                  {opt}
                </button>
              ))}
            </div>
            <Button onClick={handleNext} disabled={answers[current] === -1 || submitExam.isPending} className="w-full mt-6" data-testid="button-next-exam">
              {current < questions.length - 1 ? "Next" : "Submit Exam"}
            </Button>
          </div>
        </div>
      )}

      {phase === "result" && result && (
        <div className="max-w-xl text-center">
          <div className="p-8 rounded-xl border border-border bg-card">
            {result.passed ? (
              <Award className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            ) : (
              <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            )}
            <h2 className="text-2xl font-bold mb-2">{result.passed ? "Certified!" : "Keep Practicing"}</h2>
            <p className="text-muted-foreground mb-4">{result.message}</p>
            <div className="text-5xl font-bold text-primary mb-6" data-testid="text-exam-score">{result.score}%</div>
            <Progress value={result.score} className="h-3 mb-6" />
            {result.passed && result.certificateId && (
              <Link href={`/certificate/${result.certificateId}`}>
                <Button className="w-full mb-3" data-testid="button-view-certificate">View My Certificate</Button>
              </Link>
            )}
            <Link href="/workshops">
              <Button variant="outline" className="w-full" data-testid="button-back-workshops-from-result">Back to Workshops</Button>
            </Link>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
