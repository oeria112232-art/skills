import { useState, useRef, useEffect } from "react";
import {
  useListMockInterviewSessions, useCreateMockInterviewSession, useSendMockInterviewMessage,
  getListMockInterviewSessionsQueryKey,
} from "@workspace/api-client-react";
import { MessageSquare, Send, Plus, Bot, User, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/components/layout/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

const tracks = [
  { value: "tot", label: "Training of Trainers (TOT)" },
  { value: "cybersecurity", label: "Cyber Security" },
  { value: "fullstack", label: "Full-Stack Development" },
  { value: "networking", label: "CCNA Networking" },
  { value: "general", label: "General Interview" },
];

const INITIAL_QUESTION = "Welcome to your mock interview! I'll be your AI interviewer today. Let's start — tell me a bit about yourself and what drew you to this field.";

type Message = { role: "user" | "assistant"; content: string; feedback?: string };

export default function MockInterviewPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: sessions, isLoading } = useListMockInterviewSessions();
  const createSession = useCreateMockInterviewSession();
  const sendMessage = useSendMockInterviewMessage();

  const [selectedTrack, setSelectedTrack] = useState("general");
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showFeedback, setShowFeedback] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStartSession = async () => {
    if (!user) return;
    const session = await createSession.mutateAsync({
      data: { userId: user.id, track: selectedTrack, title: `${tracks.find(t => t.value === selectedTrack)?.label} Interview` },
    });
    setActiveSessionId(session.id);
    setMessages([{ role: "assistant", content: INITIAL_QUESTION }]);
    queryClient.invalidateQueries({ queryKey: getListMockInterviewSessionsQueryKey() });
  };

  const handleSend = async () => {
    if (!input.trim() || !activeSessionId) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);

    const res = await sendMessage.mutateAsync({
      data: { sessionId: activeSessionId, message: userMsg, role: "user" },
    });
    setMessages(prev => [...prev, { role: "assistant", content: res.reply, feedback: res.feedback }]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" data-testid="heading-mock-interview">AI Mock Interview</h1>
        <p className="text-muted-foreground">Practice interviews with AI-powered feedback to improve your performance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sessions list */}
        <div className="lg:col-span-1">
          <div className="p-4 rounded-xl border border-border bg-card mb-4">
            <h2 className="font-semibold mb-3 text-sm">New Session</h2>
            <Select value={selectedTrack} onValueChange={setSelectedTrack}>
              <SelectTrigger className="mb-3" data-testid="select-interview-track">
                <SelectValue placeholder="Select track" />
              </SelectTrigger>
              <SelectContent>
                {tracks.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleStartSession} disabled={createSession.isPending} className="w-full gap-2" data-testid="button-start-session">
              <Plus className="w-4 h-4" /> Start Interview
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-card">
            <div className="p-3 border-b border-border">
              <h2 className="font-semibold text-sm">Past Sessions</h2>
            </div>
            {isLoading ? (
              <div className="p-3 space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
            ) : !sessions || sessions.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No sessions yet
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {sessions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setActiveSessionId(s.id); setMessages([{ role: "assistant", content: INITIAL_QUESTION }]); }}
                    data-testid={`session-item-${s.id}`}
                    className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${activeSessionId === s.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
                  >
                    <p className="font-medium truncate">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="lg:col-span-2">
          {!activeSessionId ? (
            <div className="h-full min-h-[400px] rounded-xl border border-border bg-card flex items-center justify-center text-center p-8">
              <div>
                <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="font-semibold text-lg mb-2">Ready to practice?</h3>
                <p className="text-sm text-muted-foreground">Select a track and start a new interview session to get AI-powered feedback on your answers.</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card flex flex-col" style={{ height: "calc(100vh - 220px)", minHeight: "400px" }}>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`} data-testid={`message-${idx}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "assistant" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {msg.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    <div className={`flex flex-col gap-2 max-w-[75%] ${msg.role === "user" ? "items-end" : ""}`}>
                      <div className={`p-3 rounded-2xl text-sm ${msg.role === "assistant" ? "bg-muted text-foreground rounded-tl-none" : "bg-primary text-primary-foreground rounded-tr-none"}`}>
                        {msg.content}
                      </div>
                      {msg.feedback && msg.role === "assistant" && (
                        <button
                          onClick={() => setShowFeedback(showFeedback === idx ? null : idx)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          data-testid={`button-show-feedback-${idx}`}
                        >
                          <Lightbulb className="w-3 h-3" />
                          {showFeedback === idx ? "Hide feedback" : "Show feedback"}
                        </button>
                      )}
                      {showFeedback === idx && msg.feedback && (
                        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300" data-testid={`feedback-${idx}`}>
                          <strong>Feedback:</strong> {msg.feedback}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {sendMessage.isPending && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center"><Bot className="w-4 h-4 text-primary-foreground" /></div>
                    <div className="p-3 rounded-2xl bg-muted rounded-tl-none">
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border flex gap-2">
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your answer..."
                  className="flex-1"
                  data-testid="input-interview-message"
                />
                <Button onClick={handleSend} disabled={!input.trim() || sendMessage.isPending} size="icon" data-testid="button-send-message">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
