import { useState, useEffect } from "react";
import { useListMockInterviewSessions, useCreateMockInterviewSession, useSendMockInterviewMessage, getListMockInterviewSessionsQueryKey } from "@workspace/api-client-react";
import { MessageSquare, Plus, Send, Play, Square, Award, Sparkles, Volume2, Calendar, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLanguage } from "@/components/layout/LanguageContext";
import { useAuth } from "@/components/layout/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

const INITIAL_QUESTION = "مرحباً بك! أنا مساعد المقابلات الذكي لمنصة مهارات. هل يمكنك تعريفي بنفسك باختصار وما هي أبرز خبراتك المهنية؟";
const INITIAL_QUESTION_EN = "Welcome! I am your Skills AI Interview Coach. Could you briefly introduce yourself and summarize your key professional experiences?";

const tracks = [
  { value: "tot", label: "إعداد المدربين TOT", labelEn: "Training of Trainers" },
  { value: "networking", label: "شبكات CCNA", labelEn: "CCNA Networking" },
  { value: "cybersecurity", label: "الأمن السيبراني", labelEn: "Cyber Security" },
  { value: "fullstack", label: "تطوير الويب الشامل", labelEn: "Full-Stack Dev" },
  { value: "computer-basics", label: "أساسيات الحاسوب", labelEn: "Computer Basics" },
  { value: "mobile", label: "تطوير تطبيقات الموبايل", labelEn: "Mobile Development" },
];

export default function MockInterviewPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: sessions, isLoading } = useListMockInterviewSessions();
  const createSession = useCreateMockInterviewSession();
  const sendMessage = useSendMockInterviewMessage();
  const { language } = useLanguage();
  const isAr = language === "ar";

  const [selectedTrack, setSelectedTrack] = useState("");
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [inputAnswer, setInputAnswer] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  
  // Realtime feedback states from the send message response
  const [feedback, setFeedback] = useState<string>("");
  const [score, setScore] = useState<number | null>(null);

  const handleStartSession = async () => {
    if (!selectedTrack) return;
    const s = await createSession.mutateAsync({ data: { track: selectedTrack, userId: user?.id || 0 } });
    setActiveSessionId(s.id);
    setMessages([{ role: "assistant", content: isAr ? INITIAL_QUESTION : INITIAL_QUESTION_EN }]);
    setInputAnswer("");
    setFeedback("");
    setScore(null);
    queryClient.invalidateQueries({ queryKey: getListMockInterviewSessionsQueryKey() });
  };

  const handleSendAnswer = async () => {
    if (!inputAnswer.trim() || !activeSessionId || sendMessage.isPending) return;
    const userMsg = inputAnswer;
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setInputAnswer("");

    try {
      const res = await sendMessage.mutateAsync({ 
        data: { sessionId: activeSessionId, message: userMsg, role: "user" } 
      });
      
      setMessages(prev => [...prev, { role: "assistant", content: res.reply }]);
      if (res.feedback) {
        setFeedback(res.feedback);
      }
      if (res.score !== undefined && res.score !== null) {
        setScore(res.score);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AppLayout>
      <div className="mb-8 text-start">
        <div className="flex items-center gap-2 mb-1.5">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold px-3 py-0.5 rounded-full text-[10px]">
            {isAr ? "معمل المقابلات الافتراضي" : "AI Assessment Lab"}
          </Badge>
        </div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight" data-testid="heading-mock-interview">
          {isAr ? "مختبر المقابلات الذكي | AI Interview Lab" : "AI Interview Lab"}
        </h1>
        <p className="text-sm text-muted-foreground font-medium mt-1">
          {isAr
            ? "تدرب على المقابلات الوظيفية واحصل على تقييم تفصيلي لمهاراتك وإجاباتك بالذكاء الاصطناعي."
            : "Practice job interviews and receive instant detailed coaching feedback from our AI advisor."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-start">
        
        {/* Sidebar Controls */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm">
            <h2 className="font-extrabold text-sm text-foreground mb-3 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" /> {isAr ? "بدء مقابلة جديدة" : "Start New Interview"}
            </h2>
            <div className="space-y-4">
              <Select value={selectedTrack} onValueChange={setSelectedTrack}>
                <SelectTrigger className="rounded-xl border-border/60 bg-background/50 h-10 text-xs font-semibold" data-testid="select-interview-track">
                  <SelectValue placeholder={isAr ? "اختر المسار المهني" : "Select Career Track"} />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/50 shadow-lg">
                  {tracks.map(t => (
                    <SelectItem key={t.value} value={t.value} className="text-xs font-medium">
                      {isAr ? t.label : t.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleStartSession} 
                disabled={createSession.isPending || !selectedTrack} 
                className="w-full gap-2 rounded-xl font-bold h-10 shadow-md shadow-primary/10 text-xs" 
                data-testid="button-start-session"
              >
                <Plus className="w-4 h-4" /> {isAr ? "ابدأ التدريب الآن" : "Start Practice Now"}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border/50 bg-muted/40">
              <h2 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-primary" /> {isAr ? "جلساتك السابقة" : "Previous Sessions"}
              </h2>
            </div>
            {isLoading ? (
              <div className="p-4 space-y-2">
                {[1, 2].map(i => <Skeleton key={i} className="h-14 rounded-xl bg-muted/70" />)}
              </div>
            ) : !Array.isArray(sessions) || sessions.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground font-semibold">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-35" />
                {isAr ? "لا توجد جلسات مقابلة بعد." : "No interview sessions yet."}
              </div>
            ) : (
              <div className="p-2.5 max-h-[300px] overflow-y-auto space-y-1.5">
                {sessions.map(s => {
                  const trackObj = tracks.find(t => t.value === s.track);
                  return (
                    <button
                      key={s.id}
                      onClick={() => { 
                        setActiveSessionId(s.id); 
                        setMessages([{ role: "assistant", content: isAr ? INITIAL_QUESTION : INITIAL_QUESTION_EN }]);
                        setFeedback("");
                        setScore(null);
                      }}
                      data-testid={`session-item-${s.id}`}
                      className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex flex-col gap-1 border ${
                        activeSessionId === s.id 
                          ? "border-primary bg-primary/5 shadow-sm" 
                          : "border-border/40 hover:border-primary/40 bg-background/45"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-foreground">
                          {isAr ? (trackObj?.label || s.track) : (trackObj?.labelEn || s.track)}
                        </span>
                        <span className="text-[9px] text-muted-foreground font-medium uppercase">#{s.id}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[9.5px] text-muted-foreground font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-primary/70" />
                        <span>{new Date(s.createdAt).toLocaleDateString(isAr ? "ar-EG" : "en-US")}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Chat Panel / Workspace */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {activeSessionId ? (
            <>
              {/* Chat Dialog box */}
              <div className="rounded-2xl border border-border/50 bg-card/65 backdrop-blur-sm shadow-lg p-5 flex-1 flex flex-col h-[480px]">
                <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-foreground">{isAr ? "مساعد المقابلات الذكي" : "AI Coach"}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">session_id: {activeSessionId}</span>
                </div>

                {/* Messages container */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                  {messages.map((m, idx) => (
                    <div 
                      key={idx} 
                      className={`flex ${m.role === "user" ? (isAr ? "justify-start" : "justify-end") : (isAr ? "justify-end" : "justify-start")}`}
                    >
                      <div className={`p-3.5 rounded-2xl max-w-md text-xs leading-relaxed font-semibold shadow-sm ${
                        m.role === "user" 
                          ? "bg-primary text-primary-foreground rounded-tr-none" 
                          : "bg-background/80 border border-border/60 text-foreground rounded-tl-none"
                      }`}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input waveform simulator and buttons */}
                <div className="space-y-3.5 pt-4 border-t border-border/40">
                  {isRecording && (
                    <div className="flex items-center justify-center gap-1.5 py-2.5 bg-primary/5 rounded-xl border border-primary/25">
                      <div className="w-1.5 h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-1.5 h-6 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-1.5 h-8 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      <div className="w-1.5 h-5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "450ms" }} />
                      <div className="w-1.5 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: "600ms" }} />
                      <span className="text-[10.5px] font-bold text-primary ml-2 animate-pulse">{isAr ? "مستمع نشط..." : "Listening..."}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <Input 
                      value={inputAnswer} 
                      onChange={e => setInputAnswer(e.target.value)}
                      placeholder={isAr ? "اكتب إجابتك بالتفصيل هنا..." : "Type your detailed answer here..."}
                      className="rounded-xl border-border/60 bg-background/50 text-xs font-semibold h-11"
                      onKeyDown={e => e.key === "Enter" && handleSendAnswer()}
                    />
                    
                    <Button 
                      onClick={() => setIsRecording(!isRecording)} 
                      variant="outline" 
                      className={`w-11 h-11 p-0 rounded-xl flex items-center justify-center border-border/60 hover:bg-accent/40 ${isRecording ? "text-destructive border-destructive/30" : ""}`}
                    >
                      {isRecording ? <Square className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-muted-foreground" />}
                    </Button>
                    
                    <Button 
                      onClick={handleSendAnswer} 
                      disabled={!inputAnswer.trim() || sendMessage.isPending} 
                      className="h-11 px-5 rounded-xl font-bold shadow-md shadow-primary/10 text-xs gap-1.5"
                    >
                      <Send className="w-4 h-4" /> <span>{isAr ? "إرسال الإجابة" : "Send"}</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Coaching Feedback Card */}
              {(feedback || score !== null) && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 rounded-2xl border border-secondary/25 bg-gradient-to-br from-card to-background shadow-lg text-start"
                >
                  <h3 className="font-extrabold text-sm text-foreground mb-4 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-primary" /> {isAr ? "التقييم الفوري للذكاء الاصطناعي" : "Real-time AI Feedback"}
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                    {score !== null && (
                      <div className="p-4 rounded-xl bg-background/50 border border-border/50 text-center flex flex-col justify-center">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">{isAr ? "التقييم العام" : "Overall Score"}</p>
                        <p className="text-3xl font-black text-primary mt-1 text-glow-primary">{score}%</p>
                      </div>
                    )}
                    
                    <div className={`${score !== null ? "sm:col-span-3" : "sm:col-span-4"} space-y-2`}>
                      <h4 className="text-xs font-bold text-primary mb-1">💡 {isAr ? "ملاحظات التقييم والتوجيه:" : "Coaching & Advice:"}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed font-semibold bg-muted/20 p-4 rounded-xl border border-border/30 whitespace-pre-wrap">
                        {feedback || (isAr ? "بانتظار تقييم إجابتك..." : "Awaiting your first response...")}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/60 bg-card/35 p-16 flex-1 flex flex-col items-center justify-center text-center">
              <MessageSquare className="w-16 h-16 opacity-25 text-primary mb-4" />
              <h3 className="font-extrabold text-lg">{isAr ? "مستعد لبدء المقابلة؟" : "Ready to Start?"}</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 leading-relaxed font-semibold">
                {isAr 
                  ? "اختر المسار المهني واضغط على زر البدء لتبدأ المحاكاة وتلقي الأسئلة والتقييم فوراً."
                  : "Choose your career path and click start to begin the simulation and receive feedback."}
              </p>
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  );
}
