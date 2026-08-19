import { useState, useEffect } from "react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLanguage } from "@/components/layout/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  Video, Users, Calendar, Clock, RefreshCw, Sparkles, 
  Settings, Play, ExternalLink, ShieldCheck, HelpCircle, Bell
} from "lucide-react";

interface Workshop {
  id: number;
  title: string;
  description: string;
  date: string;
  duration: number;
  instructor: string;
  status: "upcoming" | "ongoing" | "completed";
  enrolledCount: number;
  capacity: number;
  dailyRoomUrl?: string | null;
  dailyRoomName?: string | null;
}

export default function AdminStreamsPage() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { toast } = useToast();

  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchWorkshops = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/workshops", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("mharat-token")}` }
      });
      if (response.ok) {
        const json = await response.json();
        const list = Array.isArray(json) ? json : (json && Array.isArray(json.data) ? json.data : []);
        setWorkshops(list);
      }
    } catch (e) {
      console.error(e);
      toast({
        title: isAr ? "خطأ في التحميل" : "Load Error",
        description: isAr ? "تعذر جلب قائمة الورش." : "Failed to load workshops list.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkshops();
  }, []);

  const handleStartStream = async (wId: number, title: string) => {
    setActionLoading(wId);
    try {
      const response = await fetch(`/api/workshops/${wId}/start-stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("mharat-token")}`
        }
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to initialize stream");
      }

      toast({
        title: isAr ? "🎥 تم إطلاق البث المباشر" : "🎥 Stream Launched!",
        description: isAr 
          ? `تم بدء بث الورشة "${title}" وإرسال إشعار فوري لجميع المتدربين المسجلين.` 
          : `Started stream for "${title}" and broadcasted notification to all trainees.`
      });

      fetchWorkshops();
    } catch (err: any) {
      toast({
        title: isAr ? "خطأ في بدء البث" : "Failed to start stream",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Filter workshops
  const upcoming = workshops.filter(w => w.status === "upcoming");
  const ongoing = workshops.filter(w => w.status === "ongoing");
  const completed = workshops.filter(w => w.status === "completed");

  return (
    <AppLayout>
      <div className="text-start space-y-6">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black px-2.5 py-0.5 rounded-full text-[10px] uppercase">
                {isAr ? "لوحة الإشراف والبث" : "Stream studio control"}
              </Badge>
            </div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
              <Video className="w-6 h-6 text-primary" />
              {isAr ? "إدارة البثوث المباشرة للورش" : "Live Streaming Studio"}
            </h1>
            <p className="text-xs text-muted-foreground font-semibold mt-1">
              {isAr 
                ? "ابدأ البث المباشر للورش التفاعلية، أرسل إشعارات فورية للأجهزة، وتابع إحصائيات حضور المتدربين." 
                : "Launch workshops live, dispatch system notification alerts, and monitor trainee registration."}
            </p>
          </div>

          <Button 
            onClick={fetchWorkshops} 
            variant="outline" 
            size="sm" 
            className="rounded-xl h-9.5 text-xs font-bold gap-1.5 self-start md:self-center"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isAr ? "تحديث البيانات" : "Refresh"}</span>
          </Button>
        </div>

        {/* Studio overview stats card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl border border-border bg-gradient-to-br from-indigo-500/5 to-primary/5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black text-muted-foreground uppercase">{isAr ? "الورش الجارية حالياً" : "Active streams"}</span>
              <h2 className="text-xl font-extrabold text-foreground mt-0.5">{ongoing.length}</h2>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-border bg-gradient-to-br from-emerald-500/5 to-teal-500/5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black text-muted-foreground uppercase">{isAr ? "الورش القادمة" : "Upcoming sessions"}</span>
              <h2 className="text-xl font-extrabold text-foreground mt-0.5">{upcoming.length}</h2>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-border bg-gradient-to-br from-amber-500/5 to-orange-500/5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black text-muted-foreground uppercase">{isAr ? "التنبيهات المشحونة" : "Broadcast alerts"}</span>
              <h2 className="text-xl font-extrabold text-foreground mt-0.5">
                {workshops.reduce((acc, curr) => acc + (curr.enrolledCount || 0), 0)}
              </h2>
            </div>
          </div>
        </div>

        {/* Main List Section */}
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        ) : workshops.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-3xl p-6">
            <HelpCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-extrabold text-sm text-foreground">{isAr ? "لا توجد ورش عمل مسجلة" : "No workshops found"}</h3>
            <p className="text-[11px] text-muted-foreground font-semibold mt-1">
              {isAr ? "يرجى إنشاء ورش جديدة من لوحة التحكم لإدارتها وبثها." : "Create new workshops from dashboard first."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* 1. ONGOING WORKSHOPS (ACTIVE ROOMS) */}
            {ongoing.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-extrabold text-xs text-primary flex items-center gap-1.5 uppercase tracking-wider">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                  </span>
                  {isAr ? "جلسات البث الجارية حالياً" : "Ongoing Live Streams"}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ongoing.map(w => (
                    <div key={w.id} className="p-5 rounded-2xl border border-primary/30 bg-primary/5 flex flex-col justify-between gap-4 transition-all hover:border-primary/55">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="font-extrabold text-sm text-foreground">{w.title}</h4>
                          <span className="text-[10px] text-muted-foreground font-bold mt-1 block">
                            {isAr ? `المدرب: ${w.instructor}` : `Instructor: ${w.instructor}`}
                          </span>
                        </div>
                        <Badge className="bg-destructive text-white hover:bg-destructive text-[9px] font-black uppercase">LIVE</Badge>
                      </div>

                      <div className="flex items-center gap-4 text-[10.5px] font-bold text-muted-foreground border-t border-border/40 pt-3">
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{w.enrolledCount} {isAr ? "متدرب مسجل" : "registered"}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{w.duration} {isAr ? "دقيقة" : "min"}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link href={`/workshops/${w.id}`}>
                          <Button size="sm" className="rounded-xl h-9.5 text-xs font-bold gap-1.5 flex-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20">
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>{isAr ? "دخول لوحة التحكم والبث" : "Enter Studio"}</span>
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. UPCOMING WORKSHOPS */}
            <div className="space-y-3">
              <h3 className="font-extrabold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {isAr ? "الورش القادمة (بانتظار البث)" : "Upcoming Workshops (Waiting to stream)"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcoming.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl font-bold text-xs italic">
                    {isAr ? "لا توجد ورش عمل قادمة حالياً." : "No upcoming workshops scheduled."}
                  </div>
                ) : (
                  upcoming.map(w => (
                    <div key={w.id} className="p-5 rounded-2xl border border-border bg-card/65 flex flex-col justify-between gap-4 transition-all hover:bg-card">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="font-extrabold text-sm text-foreground">{w.title}</h4>
                          <span className="text-[10px] text-muted-foreground font-bold mt-1 block">
                            {isAr ? `المدرب: ${w.instructor}` : `Instructor: ${w.instructor}`}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[9px] font-black">{isAr ? "قريباً" : "UPCOMING"}</Badge>
                      </div>

                      <div className="space-y-2 border-t border-border/40 pt-3">
                        <div className="flex items-center gap-4 text-[10.5px] font-bold text-muted-foreground">
                          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-primary/70" />{w.enrolledCount} {isAr ? "مسجل" : "enrolled"}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-primary/70" />{w.duration} {isAr ? "دقيقة" : "min"}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10.5px] font-bold text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5 text-primary/70" />
                          <span>{new Date(w.date).toLocaleString(isAr ? "ar-EG" : "en-US")}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleStartStream(w.id, w.title)}
                          disabled={actionLoading !== null}
                          className="w-full rounded-xl h-9.5 text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>{actionLoading === w.id ? (isAr ? "جاري الإطلاق..." : "Launching...") : (isAr ? "بدء البث وإرسال التنبيهات" : "Start Stream & Notify")}</span>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 3. HISTORY */}
            {completed.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-extrabold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  {isAr ? "الورش المنتهية (الأرشيف)" : "Completed Sessions (Archive)"}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {completed.slice(0, 6).map(w => (
                    <div key={w.id} className="p-4 rounded-xl border border-border/50 bg-muted/20 opacity-75 flex flex-col justify-between gap-3 text-start">
                      <div>
                        <h4 className="font-bold text-xs text-foreground line-clamp-1">{w.title}</h4>
                        <span className="text-[9px] text-muted-foreground block mt-1">
                          {isAr ? `تاريخ: ${new Date(w.date).toLocaleDateString()}` : `Date: ${new Date(w.date).toLocaleDateString()}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground">
                        <span>{w.enrolledCount} {isAr ? "حاضر" : "attended"}</span>
                        <Badge variant="secondary" className="text-[8px] py-0.5 font-bold">{isAr ? "منتهية" : "ARCHIVED"}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </AppLayout>
  );
}
