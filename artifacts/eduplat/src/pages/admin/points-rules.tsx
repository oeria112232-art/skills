import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLanguage } from "@/components/layout/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { 
  Award, Sparkles, Check, Sliders, ShieldCheck, Flame, BookOpen, 
  GraduationCap, CheckCircle2, Zap, ArrowLeft, RefreshCw, Layers, DollarSign
} from "lucide-react";

export default function AdminPointsRulesPage() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Points Rules State
  const [enabled, setEnabled] = useState(true);
  const [workshopPoints, setWorkshopPoints] = useState(50);
  const [trackPoints, setTrackPoints] = useState(200);
  const [quizPoints, setQuizPoints] = useState(25);
  const [attendancePoints, setAttendancePoints] = useState(15);
  const [streakPoints, setStreakPoints] = useState(5);
  const [enrollmentPoints, setEnrollmentPoints] = useState(10);

  // Fetch current rules from API
  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/platform-settings");
      if (!res.ok) throw new Error("Failed to load settings");
      const settings: { key: string; value: string }[] = await res.json();
      const map = new Map(settings.map(s => [s.key, s.value]));

      setEnabled((map.get("earned_points_active_flag") ?? "true") === "true");
      setWorkshopPoints(parseInt(map.get("earned_points_workshop_completion") ?? "50", 10));
      setTrackPoints(parseInt(map.get("earned_points_track_completion") ?? "200", 10));
      setQuizPoints(parseInt(map.get("earned_points_quiz_high_score") ?? "25", 10));
      setAttendancePoints(parseInt(map.get("earned_points_attendance_bonus") ?? "15", 10));
      setStreakPoints(parseInt(map.get("earned_points_daily_streak") ?? "5", 10));
      setEnrollmentPoints(parseInt(map.get("earned_points_first_enrollment") ?? "10", 10));
    } catch (err: any) {
      toast({
        title: isAr ? "خطأ في تحميل القواعد" : "Failed to load rules",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleSaveRules = async () => {
    setSaving(true);
    try {
      const payload = {
        settings: [
          { key: "earned_points_active_flag", value: String(enabled) },
          { key: "earned_points_workshop_completion", value: String(workshopPoints) },
          { key: "earned_points_track_completion", value: String(trackPoints) },
          { key: "earned_points_quiz_high_score", value: String(quizPoints) },
          { key: "earned_points_attendance_bonus", value: String(attendancePoints) },
          { key: "earned_points_daily_streak", value: String(streakPoints) },
          { key: "earned_points_first_enrollment", value: String(enrollmentPoints) },
        ]
      };

      const res = await fetch("/api/admin/platform-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save rules");

      toast({
        title: isAr ? "تم حفظ قواعد النقاط بنجاح" : "Points Rules Saved Successfully",
        description: isAr ? "تم تحديث مكافآت الورش والمسارات في كافة أنحاء المنصة." : "Updated earned points rewards across platform."
      });
    } catch (err: any) {
      toast({
        title: isAr ? "خطأ أثناء الحفظ" : "Save Error",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-muted/40 pb-16 text-start">
        
        {/* Header Bar */}
        <div className="bg-card border-b sticky top-0 z-40 px-6 py-4 shadow-sm backdrop-blur-md bg-card/90">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            
            <div className="flex items-center gap-4">
              <Link href="/admin/dashboard">
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted/80">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-black text-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <span>{isAr ? "نظام قواعد نقاط الإنجاز والمسارات" : "Earned Learning Points Rules"}</span>
                </h1>
                <p className="text-xs text-muted-foreground font-semibold">
                  {isAr ? "إدارة التكريم المالي والمكافآت التلقائية للطلاب عند إتمام الورش والمسارات" : "Manage automated point rewards for learning achievements."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button 
                onClick={fetchRules}
                variant="outline" 
                size="sm"
                disabled={loading}
                className="rounded-xl gap-2 font-bold h-9 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>{isAr ? "تحديث" : "Refresh"}</span>
              </Button>

              <Button 
                onClick={handleSaveRules}
                disabled={saving || loading}
                size="sm"
                className="rounded-xl gap-2 font-extrabold h-9 text-xs shadow-md shadow-primary/10"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ التغييرات" : "Save Changes")}</span>
              </Button>
            </div>

          </div>
        </div>

        {/* Content Container */}
        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-8">
          
          {/* Master System Status & Overview */}
          <div className="p-6 rounded-3xl border border-primary/20 bg-gradient-to-r from-amber-500/10 via-primary/5 to-purple-500/10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 font-black px-3 py-1 rounded-full text-xs">
                  ⚡ {isAr ? "محرك النقاط التعليمية الثابتة" : "Fixed Learning Reward Engine"}
                </Badge>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-extrabold px-3 py-1 rounded-full text-xs flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{isAr ? "مأمون بنسبة 100%" : "HMAC Secured"}</span>
                </Badge>
              </div>
              <h2 className="text-lg font-black text-foreground">
                {isAr ? "تحكم كامل بمكافآت النقاط المكتسبة للطلاب" : "Full Control Over Student Reward Rules"}
              </h2>
              <p className="text-xs text-muted-foreground font-medium leading-relaxed max-w-2xl">
                {isAr 
                  ? "هذه النقاط تمنح للطلاب فقط عند التفوق وإتمام الورش والمسارات، وهي منفصلة كلياً عن رصيد الشراء، وتمنع عمليات التعديل غير المصرحة باستخدام توقيع رقمي مشفر."
                  : "Points configured here are granted automatically to students upon completing courses and workshops, cryptographically signed."}
              </p>
            </div>

            <div className="flex items-center gap-4 bg-card/80 backdrop-blur-md p-4 rounded-2xl border shadow-xs shrink-0">
              <div className="space-y-0.5 text-center">
                <Label className="text-[10.5px] font-bold text-muted-foreground block">
                  {isAr ? "حالة النظام الإجمالي" : "Global System Status"}
                </Label>
                <div className="flex items-center gap-2 justify-center pt-1">
                  <Switch 
                    checked={enabled} 
                    onCheckedChange={setEnabled} 
                  />
                  <span className={`text-xs font-black ${enabled ? "text-emerald-600" : "text-slate-400"}`}>
                    {enabled ? (isAr ? "نشط ومفعل" : "Active") : (isAr ? "معطل" : "Disabled")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Rules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Rule 1: Workshop Completion */}
            <Card className="rounded-2xl border-primary/20 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-1 bg-blue-500" />
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-black flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    <span>{isAr ? "إتمام ورشة عمل" : "Workshop Completion"}</span>
                  </span>
                  <Badge variant="secondary" className="font-extrabold text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                    +{workshopPoints} {isAr ? "نقطة" : "pts"}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  {isAr ? "تمنح تلقائياً فور إنهاء الطالب لكافة محتويات ورشة العمل" : "Granted automatically when student finishes a workshop."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground">{isAr ? "عدد النقاط الممنوحة" : "Points Amount"}</Label>
                  <div className="relative">
                    <Input 
                      type="number"
                      value={workshopPoints}
                      onChange={e => setWorkshopPoints(Math.max(0, parseInt(e.target.value || "0", 10)))}
                      className="rounded-xl font-black text-sm h-10 pr-10"
                    />
                    <Zap className="w-4 h-4 text-blue-500 absolute left-3 top-3" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rule 2: Path Completion */}
            <Card className="rounded-2xl border-primary/20 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-1 bg-purple-500" />
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-black flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-purple-500" />
                    <span>{isAr ? "إتمام مسار تعليمي" : "Track Completion"}</span>
                  </span>
                  <Badge variant="secondary" className="font-extrabold text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                    +{trackPoints} {isAr ? "نقطة" : "pts"}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  {isAr ? "تمنح عند إكمال مسار تخصصي كامل يتضمن عدة ورش ورابط تخرج" : "Granted upon achieving a full specialized track certificate."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground">{isAr ? "عدد النقاط الممنوحة" : "Points Amount"}</Label>
                  <div className="relative">
                    <Input 
                      type="number"
                      value={trackPoints}
                      onChange={e => setTrackPoints(Math.max(0, parseInt(e.target.value || "0", 10)))}
                      className="rounded-xl font-black text-sm h-10 pr-10"
                    />
                    <Zap className="w-4 h-4 text-purple-500 absolute left-3 top-3" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rule 3: Quiz High Score */}
            <Card className="rounded-2xl border-primary/20 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-black flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-500" />
                    <span>{isAr ? "تفوق الاختبار (90%+)" : "Quiz Excellence"}</span>
                  </span>
                  <Badge variant="secondary" className="font-extrabold text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                    +{quizPoints} {isAr ? "نقطة" : "pts"}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  {isAr ? "مكافأة إضافية تشجيعية عند حصول الطالب على 90% فما فوق في الامتحان" : "Bonus points awarded for scoring 90%+ on final exam."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground">{isAr ? "عدد النقاط الممنوحة" : "Points Amount"}</Label>
                  <div className="relative">
                    <Input 
                      type="number"
                      value={quizPoints}
                      onChange={e => setQuizPoints(Math.max(0, parseInt(e.target.value || "0", 10)))}
                      className="rounded-xl font-black text-sm h-10 pr-10"
                    />
                    <Zap className="w-4 h-4 text-emerald-500 absolute left-3 top-3" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rule 4: Live Attendance */}
            <Card className="rounded-2xl border-primary/20 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500" />
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-black flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-500" />
                    <span>{isAr ? "الفيلم المباشر والتفاعل" : "Live Attendance"}</span>
                  </span>
                  <Badge variant="secondary" className="font-extrabold text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                    +{attendancePoints} {isAr ? "نقطة" : "pts"}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  {isAr ? "مكافأة حضور الجلسات التفاعلية المباشرة مع المدرب" : "Reward for actively attending live session broadcasts."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground">{isAr ? "عدد النقاط الممنوحة" : "Points Amount"}</Label>
                  <div className="relative">
                    <Input 
                      type="number"
                      value={attendancePoints}
                      onChange={e => setAttendancePoints(Math.max(0, parseInt(e.target.value || "0", 10)))}
                      className="rounded-xl font-black text-sm h-10 pr-10"
                    />
                    <Zap className="w-4 h-4 text-amber-500 absolute left-3 top-3" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rule 5: Daily Streak */}
            <Card className="rounded-2xl border-primary/20 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-1 bg-rose-500" />
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-black flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-rose-500" />
                    <span>{isAr ? "الاستمرارية اليومية (Streak)" : "Daily Streak"}</span>
                  </span>
                  <Badge variant="secondary" className="font-extrabold text-[10px] bg-rose-50 text-rose-700 border-rose-200">
                    +{streakPoints} {isAr ? "نقطة/يوم" : "pts/day"}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  {isAr ? "نقاط يومية تراكمية للمواظبة على دخول المنصة ومتابعة التعلم" : "Daily streak bonus for consistent learning progress."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground">{isAr ? "عدد النقاط الممنوحة" : "Points Amount"}</Label>
                  <div className="relative">
                    <Input 
                      type="number"
                      value={streakPoints}
                      onChange={e => setStreakPoints(Math.max(0, parseInt(e.target.value || "0", 10)))}
                      className="rounded-xl font-black text-sm h-10 pr-10"
                    />
                    <Zap className="w-4 h-4 text-rose-500 absolute left-3 top-3" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rule 6: First Track Enrollment */}
            <Card className="rounded-2xl border-primary/20 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-1 bg-cyan-500" />
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-black flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-500" />
                    <span>{isAr ? "التسجيل في أول مسار" : "First Enrollment"}</span>
                  </span>
                  <Badge variant="secondary" className="font-extrabold text-[10px] bg-cyan-50 text-cyan-700 border-cyan-200">
                    +{enrollmentPoints} {isAr ? "نقطة" : "pts"}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  {isAr ? "مكافأة تشجيعية فورية عند تسجّيل الطالب في أول مسار تعليمي بالمنصة" : "Welcome bonus for student's first course enrollment."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground">{isAr ? "عدد النقاط الممنوحة" : "Points Amount"}</Label>
                  <div className="relative">
                    <Input 
                      type="number"
                      value={enrollmentPoints}
                      onChange={e => setEnrollmentPoints(Math.max(0, parseInt(e.target.value || "0", 10)))}
                      className="rounded-xl font-black text-sm h-10 pr-10"
                    />
                    <Zap className="w-4 h-4 text-cyan-500 absolute left-3 top-3" />
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Action Bar */}
          <div className="p-4 bg-card border rounded-2xl flex justify-end gap-3 shadow-xs">
            <Button 
              onClick={handleSaveRules}
              disabled={saving || loading}
              className="rounded-xl gap-2 font-extrabold text-xs px-6 h-10 shadow-md"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ وتطبيق القواعد" : "Save & Apply Rules")}</span>
            </Button>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
