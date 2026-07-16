import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import {
  useGetWorkshop, useGetWorkshopExam, useEnrollWorkshop, useSubmitExam, useListCertificates,
  getGetWorkshopQueryKey, getGetWorkshopExamQueryKey, getListCertificatesQueryKey,
} from "@workspace/api-client-react";
import { ArrowLeft, Calendar, Clock, Users, CheckCircle, XCircle, Award, Timer, ShieldAlert, Bell, Video, VideoOff, Mic, MicOff, Coins, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/components/layout/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/components/layout/LanguageContext";
import { CertificatePreviewModal } from "@/components/shared/CertificatePreviewModal";
import { DailyStreamView } from "@/components/shared/daily-stream-view";

type Phase = "info" | "exam" | "result";

const arStatusNames: Record<string, string> = {
  upcoming: "قريباً",
  ongoing: "جارية حالياً",
  completed: "منتهية",
};

export default function WorkshopDetailPage() {
  const [, params] = useRoute("/workshops/:id");
  const workshopId = parseInt(params?.id || "0", 10);
  const { user, login } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const isAr = language === "ar";

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: isAr ? "تم نسخ الرابط!" : "Link Copied!",
      description: isAr 
        ? "تم نسخ رابط الورشة إلى الحافظة بنجاح." 
        : "Workshop link has been copied to your clipboard.",
    });
  };

  const { data: workshop, isLoading } = useGetWorkshop(workshopId, {
    query: {
      enabled: !!workshopId,
      queryKey: getGetWorkshopQueryKey(workshopId),
      refetchInterval: (query: any) => query.state.data?.status === "completed" ? false : 5000
    }
  });
  const { data: exam } = useGetWorkshopExam(workshopId, { query: { enabled: !!workshopId, queryKey: getGetWorkshopExamQueryKey(workshopId) } });

  const enroll = useEnrollWorkshop();
  const submitExam = useSubmitExam();

  const queryClient = useQueryClient();
  const { data: certs } = useListCertificates();
  const certsList = Array.isArray(certs) ? certs : (certs && Array.isArray((certs as any).data) ? (certs as any).data : []);
  const hasEarnedCert = certsList.some((c: any) => c.workshopId === workshopId);
  const [claiming, setClaiming] = useState(false);

  const handleClaimCertificate = async () => {
    if (!user || !workshopId) return;
    setClaiming(true);
    try {
      const res = await fetch(`/api/workshops/${workshopId}/certificate/claim`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("mharat-token")}`
        },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) throw new Error("Failed to claim certificate");
      
      toast({
        title: isAr ? "تهانينا! تم إصدار الشهادة" : "Certificate Issued!",
        description: isAr ? "تم إصدار شهادة حضور الورشة بنجاح." : "Your workshop certificate has been issued successfully.",
      });
      
      queryClient.invalidateQueries({ queryKey: getListCertificatesQueryKey() });
      setPreviewOpen(true);
    } catch (err: any) {
      toast({
        title: isAr ? "خطأ في استلام الشهادة" : "Claim Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setClaiming(false);
    }
  };

  const [phase, setPhase] = useState<Phase>("info");
  const [enrolled, setEnrolled] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("enrolled_workshops");
        if (saved) {
          const ids = JSON.parse(saved);
          if (ids.includes(workshopId)) return true;
        }
      } catch (e) {}
    }
    return false;
  });
  // Stream session state — persisted in sessionStorage for page refresh survival
  const [activeStream, setActiveStream] = useState<{ roomUrl: string; token: string; initialMicEnabled?: boolean; initialCamEnabled?: boolean } | null>(() => {
    try {
      const saved = sessionStorage.getItem(`stream_session_${workshopId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });
  const [loadingStream, setLoadingStream] = useState(false);
  const [restoringStream, setRestoringStream] = useState(false);
  const [showPreJoinCheck, setShowPreJoinCheck] = useState(false);
  const [preJoinMicEnabled, setPreJoinMicEnabled] = useState(false);
  const [preJoinCamEnabled, setPreJoinCamEnabled] = useState(false);
  const [preJoinHasPermission, setPreJoinHasPermission] = useState(false);
  const [requestingPermissions, setRequestingPermissions] = useState(false);

  // Helper: persist stream session
  const setAndSaveStream = (data: { roomUrl: string; token: string; initialMicEnabled?: boolean; initialCamEnabled?: boolean } | null) => {
    if (data) {
      sessionStorage.setItem(`stream_session_${workshopId}`, JSON.stringify(data));
    } else {
      sessionStorage.removeItem(`stream_session_${workshopId}`);
    }
    setActiveStream(data);
  };

  // Smooth scroll to top when stream is active or pre-join check is shown
  useEffect(() => {
    if (activeStream || showPreJoinCheck) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeStream, showPreJoinCheck]);

  // Request camera and microphone permissions when showing the pre-join dialog
  useEffect(() => {
    if (showPreJoinCheck) {
      const requestMediaPermissions = async () => {
        setRequestingPermissions(true);
        try {
          // Trigger browser mic and camera permission prompt
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          // Stop tracks immediately as we are only checking permissions
          stream.getTracks().forEach(track => track.stop());
          setPreJoinHasPermission(true);
        } catch (err) {
          console.warn("Media permissions not granted or not available:", err);
          // Fallback to allow continuing without blocking entirely
          setPreJoinHasPermission(true);
        } finally {
          setRequestingPermissions(false);
        }
      };
      requestMediaPermissions();
    }
  }, [showPreJoinCheck]);

  // Auto-restore stream: if sessionStorage has a saved session, re-fetch a fresh token
  // to handle page refresh (old token may still be valid, but we refresh for safety)
  useEffect(() => {
    const savedRaw = sessionStorage.getItem(`stream_session_${workshopId}`);
    if (!savedRaw || !user || !workshopId) return;

    // We have a saved session — validate and get a fresh token
    const restore = async () => {
      setRestoringStream(true);
      try {
        const isMod = user.role === "admin" || user.role === "instructor";
        const endpoint = isMod
          ? `/api/workshops/${workshopId}/start-stream`
          : `/api/workshops/${workshopId}/join-stream`;
        const method = isMod ? "POST" : "GET";

        const response = await fetch(endpoint, {
          method,
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("mharat-token")}`
          }
        });

        if (!response.ok) {
          // Stream ended or not available — clear saved session
          sessionStorage.removeItem(`stream_session_${workshopId}`);
          setActiveStream(null);
          return;
        }

        const data = await response.json();
        setAndSaveStream({ roomUrl: data.roomUrl, token: data.token });
      } catch (err) {
        console.error("Failed to restore stream session:", err);
        // Don't clear — keep the old session as fallback
      } finally {
        setRestoringStream(false);
      }
    };

    restore();
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, workshopId]);
  const [isSubscribed, setIsSubscribed] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("subscribed_workshops");
        if (saved) {
          const ids = JSON.parse(saved);
          if (ids.includes(workshopId)) return true;
        }
      } catch (e) {}
    }
    return false;
  });
  const [answers, setAnswers] = useState<(number | string)[]>([]);
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<{ score: number; passed: boolean; total: number; message?: string; certificateId?: number | null } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Time Lock & Lock Countdown State
  const [timeLeftStr, setTimeLeftStr] = useState<string>("");
  const [isExamLocked, setIsExamLocked] = useState(true);

  // Anti-Cheat System State
  const [focusWarnings, setFocusWarnings] = useState(0);
  const [antiCheatViolated, setAntiCheatViolated] = useState(false);

  useEffect(() => {
    if (!workshop) return;
    const calculateTime = () => {
      const startTime = new Date(workshop.date).getTime();
      const endTime = startTime + (workshop.duration || 60) * 60 * 1000;
      const now = Date.now();
      
      if (now >= endTime) {
        setIsExamLocked(false);
        setTimeLeftStr("");
        return;
      }
      
      setIsExamLocked(true);
      const diffMs = endTime - now;
      const diffSecs = Math.floor(diffMs / 1000);
      const hours = Math.floor(diffSecs / 3600);
      const mins = Math.floor((diffSecs % 3600) / 60);
      const secs = diffSecs % 60;
      
      const pad = (n: number) => String(n).padStart(2, "0");
      setTimeLeftStr(`${pad(hours)}:${pad(mins)}:${pad(secs)}`);
    };
    
    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [workshop]);

  // Request fullscreen wrapper
  const requestFullscreen = async () => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      }
    } catch (e) {
      console.warn("Fullscreen request rejected", e);
    }
  };

  // Exit fullscreen wrapper
  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  // 1. Anti-Cheat: Enforce Fullscreen changes
  useEffect(() => {
    if (phase !== "exam" || !workshop || workshop.antiCheatEnabled !== 1) return;

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setFocusWarnings(w => {
          const next = w + 1;
          const maxWarnings = workshop.maxFocusWarnings || 3;
          toast({
            variant: "destructive",
            title: isAr ? "تحذير حماية: غادرت وضع ملء الشاشة!" : "Anti-Cheat Warning: Exited Fullscreen!",
            description: isAr 
              ? `متبقي لك ${Math.max(0, maxWarnings - next)} تحذير قبل الاستبعاد التلقائي.` 
              : `You have ${Math.max(0, maxWarnings - next)} warning(s) left before automatic submission.`,
          });
          if (next >= maxWarnings) {
            setAntiCheatViolated(true);
          }
          return next;
        });
      }
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [phase, workshop, isAr]);

  // 2. Anti-Cheat: Visibility and Focus change alerts
  useEffect(() => {
    if (phase !== "exam" || !workshop || workshop.antiCheatEnabled !== 1) return;

    const handleFocusLoss = () => {
      setFocusWarnings(w => {
        const next = w + 1;
        const maxWarnings = workshop.maxFocusWarnings || 3;
        toast({
          variant: "destructive",
          title: isAr ? "تحذير حماية: تم رصد محاولة مغادرة صفحة الاختبار!" : "Anti-Cheat Alert: Browser Focus Lost!",
          description: isAr
            ? `ممنوع مغادرة الصفحة أو تبديل النوافذ. متبقي لك ${Math.max(0, maxWarnings - next)} محاولات.`
            : `Tab switching or focus loss is blocked. ${Math.max(0, maxWarnings - next)} attempt(s) remaining.`,
        });
        if (next >= maxWarnings) {
          setAntiCheatViolated(true);
        }
        return next;
      });
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        handleFocusLoss();
      }
    };

    const onBlur = () => {
      handleFocusLoss();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
    };
  }, [phase, workshop, isAr]);

  // 3. Anti-Cheat: Copy, Paste, Cut & ContextMenu prevention
  useEffect(() => {
    if (phase !== "exam" || !workshop || workshop.antiCheatEnabled !== 1) return;

    const blockEvent = (e: Event) => {
      e.preventDefault();
      toast({
        title: isAr ? "إجراء محظور" : "Action Prohibited",
        description: isAr 
          ? "النسخ واللصق والنقر بالزر الأيمن معطل تماماً لحماية سرية ومصداقية الاختبار." 
          : "Copy, paste, cut, and context menu are disabled during the secure exam.",
      });
    };

    document.addEventListener("copy", blockEvent);
    document.addEventListener("paste", blockEvent);
    document.addEventListener("cut", blockEvent);
    document.addEventListener("contextmenu", blockEvent);

    return () => {
      document.removeEventListener("copy", blockEvent);
      document.removeEventListener("paste", blockEvent);
      document.removeEventListener("cut", blockEvent);
      document.removeEventListener("contextmenu", blockEvent);
    };
  }, [phase, workshop, isAr]);

  // 4. Anti-Cheat: Auto-disqualification submission
  useEffect(() => {
    if (antiCheatViolated && phase === "exam") {
      const submitAuto = async () => {
        exitFullscreen();
        
        toast({
          variant: "destructive",
          title: isAr ? "تم إلغاء الاختبار تلقائياً!" : "Exam Terminated!",
          description: isAr
            ? "تم استبعادك وتصحيح الاختبار بنسبة 0% بسبب تكرار انتهاك الحماية ومغادرة الصفحة."
            : "Your exam was submitted and graded as 0% due to repeated window focus violations.",
        });

        const formattedAnswers = answers.map(ans => ans === -1 ? "" : ans);
        const res = await submitExam.mutateAsync({
          id: workshopId,
          data: {
            userId: user!.id,
            answers: formattedAnswers.map(String),
            focusWarningsCount: focusWarnings,
            antiCheatViolated: true
          }
        });
        setResult(res);
        setPhase("result");
      };
      submitAuto();
    }
  }, [antiCheatViolated]);

  // Check if current user is enrolled on mount/load
  useEffect(() => {
    if (!user || !workshopId) return;
    fetch(`/api/workshops/${workshopId}/join-stream`, {
      headers: { "Authorization": `Bearer ${localStorage.getItem("mharat-token")}` }
    }).then(res => {
      if (res.status !== 403) {
        setEnrolled(true);
      }
    }).catch(() => {});

    // Check notification subscriptions on load
    fetch("/api/workshops/my-subscriptions", {
      headers: { "Authorization": `Bearer ${localStorage.getItem("mharat-token")}` }
    })
      .then(res => res.json())
      .then((data: number[]) => {
        if (data.includes(workshopId)) {
          setIsSubscribed(true);
        }
      })
      .catch(console.error);
  }, [user, workshopId]);

  const handleSubscribe = async () => {
    if (!user || !workshopId) return;

    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast({
          title: isAr ? "الإشعارات معطلة" : "Notifications Blocked",
          description: isAr 
            ? "يجب السماح بالإشعارات في المتصفح لاستلام تنبيه بدء الورشة." 
            : "Please allow notifications in browser settings to receive start alert.",
          variant: "destructive"
        });
        return;
      }
    }

    try {
      const res = await fetch(`/api/workshops/${workshopId}/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("mharat-token")}`
        }
      });
      if (res.ok) {
        setIsSubscribed(true);
        if (typeof window !== "undefined") {
          try {
            const saved = localStorage.getItem("subscribed_workshops");
            const ids = saved ? JSON.parse(saved) : [];
            if (!ids.includes(workshopId)) {
              ids.push(workshopId);
              localStorage.setItem("subscribed_workshops", JSON.stringify(ids));
            }
          } catch (e) {}
        }
        toast({
          title: isAr ? "تم تفعيل التنبيه المسبق" : "Alerts Activated",
          description: isAr 
            ? "سنرسل إشعاراً مباشراً لجهازك بمجرد إطلاق البث للورشة." 
            : "We'll send a direct device alert as soon as the live stream begins."
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartStream = async (micEnabled: boolean, camEnabled: boolean) => {
    if (!user || !workshopId) return;
    setLoadingStream(true);
    try {
      const response = await fetch(`/api/workshops/${workshopId}/start-stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("mharat-token")}`
        }
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to start stream");
      }
      const data = await response.json();
      setAndSaveStream({ roomUrl: data.roomUrl, token: data.token, initialMicEnabled: micEnabled, initialCamEnabled: camEnabled });
      toast({
        title: isAr ? "تم بدء البث بنجاح" : "Stream Started",
        description: isAr ? "تم إنشاء غرفة البث المباشر وأنت الآن المنسق." : "The live room is active and you are the owner."
      });
    } catch (err: any) {
      toast({
        title: isAr ? "خطأ في تشغيل البث" : "Failed to start stream",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoadingStream(false);
    }
  };

  const handleJoinStream = async (micEnabled: boolean, camEnabled: boolean) => {
    if (!user || !workshopId) return;
    setLoadingStream(true);
    try {
      const response = await fetch(`/api/workshops/${workshopId}/join-stream`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("mharat-token")}`
        }
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to join stream");
      }
      const data = await response.json();
      setAndSaveStream({ roomUrl: data.roomUrl, token: data.token, initialMicEnabled: micEnabled, initialCamEnabled: camEnabled });
      toast({
        title: isAr ? "انضممت للبث المباشر" : "Joined Live Stream",
        description: isAr ? "مرحباً بك في البث التفاعلي للورشة." : "Welcome to the interactive workshop stream."
      });
    } catch (err: any) {
      toast({
        title: isAr ? "تعذر الانضمام" : "Failed to join",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoadingStream(false);
    }
  };

  const handleLeaveStream = async (durationMinutes: number) => {
    // Clear saved session so user doesn't auto-rejoin after intentional leave
    sessionStorage.removeItem(`stream_session_${workshopId}`);
    setActiveStream(null);
    if (durationMinutes <= 0) return;

    try {
      const response = await fetch(`/api/workshops/${workshopId}/attendance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("mharat-token")}`
        },
        body: JSON.stringify({ durationMinutes })
      });
      if (response.ok) {
        const data = await response.json();
        toast({
          title: isAr ? "تم تسجيل الحضور" : "Attendance Logged",
          description: isAr 
            ? `تم تسجيل حضورك لمدة ${durationMinutes} دقيقة. إجمالي حضورك الحالي: ${data.attendedMinutes} دقيقة.`
            : `Logged ${durationMinutes} minutes. Your total attendance is ${data.attendedMinutes} minutes.`
        });
      }
    } catch (err) {
      console.error("Failed to log attendance:", err);
    }
  };

  if (isLoading) return <AppLayout><Skeleton className="h-96 w-full rounded-xl bg-card border border-border/50" /></AppLayout>;
  if (!workshop) return <AppLayout><p className="text-center text-muted-foreground mt-16 font-bold">{isAr ? "الورشة غير موجودة" : "Workshop not found"}</p></AppLayout>;

  const questions = exam?.questions ?? [];

  const handleEnroll = async () => {
    if (!user) return;
    const res = await enroll.mutateAsync({ id: workshopId, data: {} });
    setEnrolled(true);
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("enrolled_workshops");
        const ids = saved ? JSON.parse(saved) : [];
        if (!ids.includes(workshopId)) {
          ids.push(workshopId);
          localStorage.setItem("enrolled_workshops", JSON.stringify(ids));
        }
      } catch (e) {}
    }
    const wasPaid = (res as any)?.pointsSpent > 0;
    if (wasPaid) {
      login({ ...user, points: (res as any).remainingPoints });
      toast({ 
        title: isAr ? "تم التسجيل بنجاح!" : "Enrolled!", 
        description: isAr 
          ? `تم خصم ${(res as any).pointsSpent} نقطة من محفظتك. الرصيد المتبقي: ${(res as any).remainingPoints} نقطة`
          : `${(res as any).pointsSpent} points deducted. Remaining balance: ${(res as any).remainingPoints} points`
      });
    } else {
      toast({ 
        title: isAr ? "تم التسجيل بنجاح!" : "Enrolled!", 
        description: isAr ? `أنت مسجّل الآن في ورشة ${workshop.title}` : `You're now enrolled in ${workshop.title}` 
      });
    }

    // Auto subscribe to notifications if allowed
    if ("Notification" in window) {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          fetch(`/api/workshops/${workshopId}/subscribe`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${localStorage.getItem("mharat-token")}`
            }
          }).then(() => {
            setIsSubscribed(true);
            if (typeof window !== "undefined") {
              try {
                const saved = localStorage.getItem("subscribed_workshops");
                const ids = saved ? JSON.parse(saved) : [];
                if (!ids.includes(workshopId)) {
                  ids.push(workshopId);
                  localStorage.setItem("subscribed_workshops", JSON.stringify(ids));
                }
              } catch (e) {}
            }
          }).catch(console.error);
        }
      });
    }
  };

  const handleAnswer = (val: number | string) => {
    const a = [...answers];
    a[current] = val;
    setAnswers(a);
  };

  const handleNext = async () => {
    if (current < questions.length - 1) {
      setCurrent(c => c + 1);
    } else {
      if (!user) return;
      exitFullscreen();
      
      const formattedAnswers = answers.map(ans => ans === -1 ? "" : ans);
      const res = await submitExam.mutateAsync({
        id: workshopId,
        data: {
          userId: user.id,
          answers: formattedAnswers.map(String),
          focusWarningsCount: focusWarnings,
          antiCheatViolated: false
        }
      });
      setResult(res);
      if (res.passed) {
        login({ ...user, points: (user.points || 0) + 100 });
      }
      setPhase("result");
    }
  };

  const handleStartExam = async () => {
    setAnswers(new Array(questions.length).fill(-1));
    setCurrent(0);
    setFocusWarnings(0);
    setAntiCheatViolated(false);

    if (workshop.antiCheatEnabled === 1) {
      await requestFullscreen();
    }
    setPhase("exam");
  };

  const isAnswered = answers[current] !== undefined && answers[current] !== -1 && answers[current] !== "";

  return (
    <AppLayout>
      <div className="text-start">
        <Link href="/workshops">
          <a className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary mb-6 transition-colors" data-testid="link-back-workshops">
            <ArrowLeft className="w-4 h-4" /> {isAr ? "العودة للورش" : "Back to Workshops"}
          </a>
        </Link>
      </div>

      {phase === "info" && (
        <div className="max-w-3xl text-start">
          {/* Auto-restoring indicator */}
          {restoringStream && (
            <div className="mb-6 flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border border-primary/20 bg-primary/5 text-center">
              <div className="relative flex h-10 w-10">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-30"></span>
                <span className="relative inline-flex rounded-full h-10 w-10 bg-primary/20 border border-primary/30 items-center justify-center text-primary">
                  <Video className="w-5 h-5" />
                </span>
              </div>
              <p className="text-sm font-bold text-foreground">
                {isAr ? "جاري استعادة البث المباشر..." : "Reconnecting to live stream..."}
              </p>
              <p className="text-xs text-muted-foreground font-medium">
                {isAr ? "تم اكتشاف جلسة بث سابقة، جاري تجديد الاتصال تلقائياً." : "A previous session was found. Refreshing your connection automatically."}
              </p>
            </div>
          )}

          {activeStream && !restoringStream ? (
            <div className="mb-6">
              <DailyStreamView
                roomUrl={activeStream.roomUrl}
                token={activeStream.token}
                workshopTitle={workshop.title}
                workshopId={workshop.id}
                initialMicEnabled={activeStream.initialMicEnabled ?? false}
                initialCamEnabled={activeStream.initialCamEnabled ?? false}
                onLeave={handleLeaveStream}
              />
            </div>
          ) : (
            !restoringStream && workshop.imageUrl && (
              <img src={workshop.imageUrl} alt={workshop.title} className="w-full h-56 object-cover rounded-2xl mb-6 border border-border/40" />
            )
          )}
          <div className="p-6 sm:p-8 rounded-2xl border border-border bg-gradient-to-b from-card to-background shadow-lg mb-6">
            <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
              <div>
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h1 className="text-2xl font-bold" data-testid="heading-workshop-title">{workshop.title}</h1>
                  <Button
                    onClick={handleShare}
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-8 gap-1.5 text-xs font-bold border-border/80 hover:bg-accent/40 text-muted-foreground hover:text-foreground"
                    title={isAr ? "مشاركة الورشة" : "Share Workshop"}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{isAr ? "مشاركة" : "Share"}</span>
                  </Button>
                </div>
                <p className="text-primary font-bold text-xs">{isAr ? `تقديم: ${workshop.instructor}` : `by ${workshop.instructor}`}</p>
              </div>
              <Badge className="rounded-xl font-bold">
                {isAr ? (arStatusNames[workshop.status] || workshop.status) : workshop.status}
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed font-semibold mb-6 bg-muted/20 p-4 rounded-xl border border-border/30">{workshop.description}</p>
            
            <div className="flex items-center gap-5 text-[11px] text-muted-foreground mb-8 flex-wrap font-bold border-b border-border/30 pb-5">
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4 text-primary/70" />{new Date(workshop.date).toLocaleString(isAr ? "ar-EG" : "en-US")}</span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-primary/70" />{workshop.duration} {isAr ? "دقيقة" : "minutes"}</span>
              <span className="flex items-center gap-1"><Users className="w-4 h-4 text-primary/70" />{workshop.enrolledCount}/{workshop.capacity} {isAr ? "مسجل" : "enrolled"}</span>
              <span className="flex items-center gap-1"><Award className="w-4 h-4 text-amber-500/80" />{isAr ? "علامة القبول للاختبار:" : "Pass score:"} {workshop.passScore}%</span>
              {(workshop.price ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                  <Coins className="w-4 h-4" />
                  {workshop.price} {isAr ? "نقطة" : "points"}
                </span>
              )}
            </div>
            
            {workshop.tags && workshop.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-6">
                {workshop.tags.map(t => <Badge key={t} variant="outline" className="text-xs font-medium">{t}</Badge>)}
              </div>
            )}
            
            <div className="flex flex-wrap gap-3 pt-2">
              {/* Stream Controls for Moderators */}
              {(user?.role === "admin" || user?.role === "instructor") && !activeStream && (
                <Button
                  onClick={async () => {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    await handleStartStream(false, false);
                  }}
                  disabled={loadingStream}
                  className="rounded-xl font-bold px-6 text-xs h-10 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/25"
                >
                  {loadingStream ? (isAr ? "جاري تشغيل البث..." : "Starting Stream...") : (isAr ? "بدء بث الورشة (صلاحية مدرب)" : "Start Live Stream (Instructor)")}
                </Button>
              )}

              {/* Stream Controls for Trainees */}
              {user?.role !== "admin" && user?.role !== "instructor" && enrolled && workshop.status === "ongoing" && !activeStream && (
                <Button
                  onClick={async () => {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    await handleJoinStream(false, false);
                  }}
                  disabled={loadingStream}
                  className="rounded-xl font-bold px-6 text-xs h-10 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/25 animate-pulse"
                >
                  {loadingStream ? (isAr ? "جاري الانضمام..." : "Joining...") : (isAr ? "دخول البث المباشر التفاعلي" : "Join Live Video Stream")}
                </Button>
              )}

              {/* 1. Upcoming Status */}
              {workshop.status === "upcoming" && (
                <>
                  {!enrolled ? (
                    <Button onClick={handleEnroll} disabled={enroll.isPending} className="rounded-xl font-bold px-6 shadow-md shadow-primary/10 text-xs h-10" data-testid="button-enroll-workshop">
                      {enroll.isPending ? (isAr ? "جاري التسجيل..." : "Enrolling...") : (isAr ? "سجّل الآن في الورشة" : "Enroll Now")}
                      {(workshop.price ?? 0) > 0 && !enroll.isPending && (
                        <span className="ms-1 opacity-80">({workshop.price} {isAr ? "نقطة" : "pts"})</span>
                      )}
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-4 py-2.5 rounded-xl border border-emerald-500/20">
                        {isAr ? "✓ تم التسجيل - بانتظار بدء الورشة" : "✓ Enrolled - Waiting for Start"}
                      </span>
                      {!isSubscribed ? (
                        <Button onClick={handleSubscribe} variant="outline" size="sm" className="rounded-xl h-10 gap-1.5 text-xs font-bold border-amber-500/35 hover:bg-amber-500/5 text-amber-600">
                          <Bell className="w-3.5 h-3.5" />
                          <span>{isAr ? "تفعيل التنبيه المسبق" : "Enable Alerts"}</span>
                        </Button>
                      ) : (
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-500/10 px-4 py-2.5 rounded-xl border border-indigo-500/20 flex items-center gap-1">
                          <Bell className="w-3.5 h-3.5 animate-bounce" />
                          {isAr ? "التنبيهات مفعلة" : "Alerts Active"}
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* 2. Ongoing Status */}
              {workshop.status === "ongoing" && (
                <>
                  {!enrolled ? (
                    <Button onClick={handleEnroll} disabled={enroll.isPending} className="rounded-xl font-bold px-6 shadow-md shadow-primary/10 text-xs h-10">
                      {enroll.isPending ? (isAr ? "جاري التسجيل..." : "Enrolling...") : (isAr ? "سجّل الآن في الورشة" : "Enroll Now")}
                    </Button>
                  ) : (
                    !activeStream && (
                      <span className="text-xs font-bold text-primary bg-primary/10 px-4 py-2.5 rounded-xl border border-primary/20">
                        {isAr ? "● الورشة جارية حالياً" : "● Workshop is Ongoing"}
                      </span>
                    )
                  )}
                </>
              )}

              {/* 3. Completed Status */}
              {workshop.status === "completed" && (
                <div className="flex items-center gap-2 font-bold text-xs flex-wrap">
                  {hasEarnedCert ? (
                    <Button 
                      onClick={() => setPreviewOpen(true)} 
                      className="rounded-xl font-bold px-6 text-xs h-10 bg-amber-500 hover:bg-amber-600 text-white gap-1.5 shadow-md shadow-amber-500/25"
                    >
                      <Award className="w-4 h-4" />
                      <span>{isAr ? "عرض شهادتي الرسمية" : "View My Official Certificate"}</span>
                    </Button>
                  ) : (
                    <>
                      {/* Requires Exam */}
                      {workshop.hasExam !== 0 && (
                        <Button 
                          onClick={handleStartExam} 
                          className="rounded-xl font-bold px-6 text-xs h-10 shadow-md shadow-primary/10" 
                          data-testid="button-start-exam"
                        >
                          {isAr ? "التقدم لاختبار الشهادة" : "Take Certification Exam"}
                        </Button>
                      )}
                      
                      {/* Attend-only Certificate */}
                      {workshop.hasExam === 0 && workshop.hasCertificate !== 0 && (
                        <Button 
                          onClick={handleClaimCertificate} 
                          disabled={claiming}
                          className="rounded-xl font-bold px-6 text-xs h-10 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/25"
                        >
                          {claiming ? (isAr ? "جاري إصدار الشهادة..." : "Issuing Certificate...") : (isAr ? "استلام شهادة التخرج" : "Claim Certificate")}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Preview Layout Certificate Button */}
              {workshop.hasCertificate !== 0 && !hasEarnedCert && (
                <Button 
                  onClick={() => setPreviewOpen(true)} 
                  variant="outline" 
                  className="rounded-xl font-bold px-5 text-xs h-10 border-amber-500/35 hover:bg-amber-500/5 text-amber-600 gap-1.5"
                  data-testid="button-preview-cert"
                >
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>{isAr ? "شكل شهادة التخرج" : "Preview Certificate"}</span>
                </Button>
              )}
            </div>

          </div>
        </div>
      )}

      {phase === "exam" && questions.length > 0 && (
        <div className="max-w-2xl text-start select-none">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-sm text-foreground">{workshop.title} — {isAr ? "اختبار شهادة الاجتياز" : "Certification Exam"}</h2>
                {workshop.antiCheatEnabled === 1 && (
                  <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg text-[10px] flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> {isAr ? "بيئة اختبار محمية" : "Secure Exam Mode"}
                  </Badge>
                )}
              </div>
              <span className="text-xs font-bold text-muted-foreground">{current + 1}/{questions.length}</span>
            </div>
            <Progress value={((current + 1) / questions.length) * 100} className="h-2 rounded-full" data-testid="progress-exam" />
            
            {workshop.antiCheatEnabled === 1 && focusWarnings > 0 && (
              <div className="mt-2.5 p-2 bg-destructive/10 text-destructive text-[11px] rounded-lg font-bold border border-destructive/25 flex items-center gap-1.5 animate-pulse">
                <ShieldAlert className="w-3.5 h-3.5" />
                {isAr 
                  ? `تنبيه: تم رصد مغادرة الصفحة! التحذيرات: ${focusWarnings}/${workshop.maxFocusWarnings || 3}` 
                  : `Focus warnings: ${focusWarnings}/${workshop.maxFocusWarnings || 3}. Do not exit page!`
                }
              </div>
            )}
          </div>
          
          <div className="p-6 sm:p-8 rounded-2xl border border-border/55 bg-gradient-to-b from-card to-background shadow-lg">
            <p className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1 font-semibold">
              <Timer className="w-3.5 h-3.5 text-primary/70" /> 
              {isAr ? `السؤال ${current + 1} (${questions[current].points || 10} نقاط)` : `Question ${current + 1} (${questions[current].points || 10} pts)`}
            </p>
            <h3 className="font-extrabold text-base sm:text-lg text-foreground mb-6 leading-snug" data-testid="text-exam-question">
              {questions[current].question}
            </h3>
            
            <div className="space-y-3.5">
              {/* 1. MCQ rendering */}
              {questions[current].type === "mcq" && questions[current].options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  data-testid={`button-exam-option-${idx}`}
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

              {/* 2. True / False rendering */}
              {questions[current].type === "true_false" && (
                [
                  { label: isAr ? "صح / صواب" : "True", val: 0 },
                  { label: isAr ? "خطأ / خطأ" : "False", val: 1 }
                ].map((opt) => (
                  <button
                    key={opt.val}
                    onClick={() => handleAnswer(opt.val)}
                    className={`w-full p-4 rounded-xl border text-xs leading-relaxed transition-all duration-200 flex items-center ${isAr ? "text-right" : "text-left"} ${
                      answers[current] === opt.val 
                        ? "border-primary bg-primary/10 font-bold text-primary shadow-sm" 
                        : "border-border/60 bg-card/60 hover:border-primary/50 text-muted-foreground hover:text-foreground font-medium"
                    }`}
                  >
                    <span className={`inline-flex w-6 h-6 rounded-lg items-center justify-center text-[10px] font-bold border ${isAr ? "ml-3" : "mr-3"} ${
                      answers[current] === opt.val ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/40 bg-muted/50"
                    }`}>
                      {opt.val === 0 ? "T" : "F"}
                    </span>
                    {opt.label}
                  </button>
                ))
              )}

              {/* 3. Short Answer text input rendering */}
              {questions[current].type === "short_answer" && (
                <div className="space-y-2 text-start">
                  <label className="text-xs font-bold text-muted-foreground">
                    {isAr ? "اكتب الإجابة النموذجية:" : "Type your answer here:"}
                  </label>
                  <input
                    type="text"
                    value={answers[current] === -1 ? "" : answers[current]}
                    onChange={(e) => handleAnswer(e.target.value)}
                    placeholder={isAr ? "اكتب الإجابة..." : "Type your answer..."}
                    className="w-full h-11 bg-card/60 border border-border/85 rounded-xl px-4 text-xs font-semibold text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              )}
            </div>
            
            <Button 
              onClick={handleNext} 
              disabled={!isAnswered || submitExam.isPending} 
              className="w-full mt-8 rounded-xl font-bold h-11 text-xs shadow-sm shadow-primary/10" 
              data-testid="button-next-exam"
            >
              {current < questions.length - 1 ? (isAr ? "السؤال التالي" : "Next") : (isAr ? "تسليم ورقة الاختبار" : "Submit Exam")}
            </Button>
          </div>
        </div>
      )}

      {phase === "result" && result && (
        <div className="max-w-xl text-center mx-auto">
          <div className="p-8 rounded-2xl border border-border bg-gradient-to-b from-card to-background shadow-xl">
            {result.passed ? (
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/25 mx-auto mb-4 text-amber-500 shadow-inner">
                <Award className="w-8 h-8" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center border border-destructive/25 mx-auto mb-4 text-destructive shadow-inner">
                <XCircle className="w-8 h-8" />
              </div>
            )}
            
            <h2 className="text-xl font-extrabold text-foreground mb-2">
              {result.passed ? (isAr ? "تهانينا! لقد حصلت على الشهادة" : "Certified!") : (isAr ? "حاول مجدداً لاحقاً" : "Keep Practicing")}
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed font-semibold mb-6">{result.message}</p>
            
            <div className="text-5xl font-black text-primary mb-6 text-glow-primary" data-testid="text-exam-score">{result.score}%</div>
            <Progress value={result.score} className="h-2.5 mb-6 rounded-full" />
            
            {result.passed && result.certificateId && (
              <Link href={`/certificate/${result.certificateId}`}>
                <Button className="w-full mb-3 rounded-xl font-bold h-10 text-xs shadow-md shadow-primary/10" data-testid="button-view-certificate">
                  {isAr ? "عرض وتحميل شهادتي المعتمدة" : "View My Certificate"}
                </Button>
              </Link>
            )}
            <Link href="/workshops">
              <Button variant="outline" className="w-full rounded-xl font-bold h-10 text-xs border-border/80 hover:bg-accent/40" data-testid="button-back-workshops-from-result">
                {isAr ? "العودة لـ ورش العمل" : "Back to Workshops"}
              </Button>
            </Link>
          </div>
        </div>
      )}

      {previewOpen && (
        <CertificatePreviewModal
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          workshopTitle={workshop.title}
          certSignTitle={workshop.certSignTitle || (isAr ? "رئيس الهيئة / Board Chairman" : "Board Chairman")}
          certSignName={workshop.certSignName || (isAr ? "أحمد الرشيدي / Ahmed Al-Rashidi" : "Ahmed Al-Rashidi")}
          certEkey={workshop.certEkey || "MHARAT-SECURE-ESIGN-88192-VERIFIED"}
          isAr={isAr}
          recipientName={hasEarnedCert ? user?.name : undefined}
        />
      )}
    </AppLayout>
  );
}
