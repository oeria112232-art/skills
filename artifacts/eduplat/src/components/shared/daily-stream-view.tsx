import { useEffect, useRef, useState } from "react";
import DailyIframe, { type DailyCall } from "@daily-co/daily-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/layout/LanguageContext";
import { useAuth } from "@/components/layout/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  X, Video, Maximize, ShieldAlert, Sparkles, MessageSquare, 
  BarChart3, FileEdit, ThumbsUp, 
  Send, Plus, Trash2, CheckCircle, Vote, Download, RefreshCw,
  Mic, MicOff, VideoOff, Monitor, Hand, Users, MoreVertical, UserMinus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface DailyStreamViewProps {
  roomUrl: string;
  token: string;
  workshopTitle: string;
  workshopId: number;
  initialMicEnabled: boolean;
  initialCamEnabled?: boolean;
  onLeave: (durationMinutes: number) => void;
}

interface QAItem {
  id: number;
  userName: string;
  question: string;
  votes: number;
  isAnswered: number;
  createdAt: string;
}

interface PollItem {
  id: number;
  question: string;
  options: string[];
  isClosed: number;
  voteCounts: number[];
  totalVotes: number;
  userVotedOption: number | null;
}

const playChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12);
    
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    console.error("Audio chime playback failed:", e);
  }
};

export function DailyStreamView({ roomUrl, token, workshopTitle, workshopId, initialMicEnabled, initialCamEnabled = false, onLeave }: DailyStreamViewProps) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { user } = useAuth();
  const { toast } = useToast();
  const wId = workshopId;
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [callFrame, setCallFrame] = useState<DailyCall | null>(null);
  const [joinTime] = useState<number>(Date.now());
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Moderator Check
  const isModerator = user?.role === "admin" || user?.role === "instructor";

  // Interaction Panel States
  const [activeTab, setActiveTab] = useState<"qa" | "polls" | "notes">("qa");
  const [qaList, setQaList] = useState<QAItem[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [loadingQA, setLoadingQA] = useState(false);

  // Polls States
  const [polls, setPolls] = useState<PollItem[]>([]);
  const [newPollQuestion, setNewPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [loadingPolls, setLoadingPolls] = useState(false);

  // Notes States
  const [notesContent, setNotesContent] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Participant, Media, & Hand Raising States
  const [participants, setParticipants] = useState<any[]>([]);
  const [localAudioEnabled, setLocalAudioEnabled] = useState(initialMicEnabled);
  const [localVideoEnabled, setLocalVideoEnabled] = useState(initialCamEnabled); // Set based on user setup selection
  const [localCanSendVideo, setLocalCanSendVideo] = useState(isModerator); // moderators always can
  const [localCanSendAudio, setLocalCanSendAudio] = useState(true); // trainees start allowed
  const [localCanSendScreen, setLocalCanSendScreen] = useState(isModerator); // moderators always can
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [raisedHands, setRaisedHands] = useState<Record<string, boolean>>({});
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [endingStream, setEndingStream] = useState(false);
  const [activeMenuParticipantId, setActiveMenuParticipantId] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [handRaiseAlert, setHandRaiseAlert] = useState<{ userName: string } | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const qaAbortControllerRef = useRef<AbortController | null>(null);
  const pollsAbortControllerRef = useRef<AbortController | null>(null);

  // Permission Checklist & Device Setup States
  const [showSetup, setShowSetup] = useState(true);
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [camPermission, setCamPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [screenPermission, setScreenPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  useEffect(() => {
    // Initial check of browser permissions if supported
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' as any }).then(res => {
        setMicPermission(res.state as any);
        res.onchange = () => setMicPermission(res.state as any);
      }).catch(() => {});

      navigator.permissions.query({ name: 'camera' as any }).then(res => {
        setCamPermission(res.state as any);
        res.onchange = () => setCamPermission(res.state as any);
      }).catch(() => {});
    }
  }, []);

  const requestMicAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicPermission('granted');
      toast({
        title: isAr ? "تم منح صلاحية الميكروفون" : "Microphone Access Granted",
        description: isAr ? "الميكروفون جاهز للاستخدام الآن." : "Your microphone is now ready."
      });
    } catch (err) {
      setMicPermission('denied');
      toast({
        variant: "destructive",
        title: isAr ? "تم رفض صلاحية الميكروفون" : "Microphone Access Denied",
        description: isAr 
          ? "يرجى السماح بالوصول للمايك من إعدادات المتصفح في شريط العنوان." 
          : "Please enable microphone access in your browser address bar settings."
      });
    }
  };

  const requestCamAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setCamPermission('granted');
      toast({
        title: isAr ? "تم منح صلاحية الكاميرا" : "Camera Access Granted",
        description: isAr ? "الكاميرا جاهزة للاستخدام الآن." : "Your camera is now ready."
      });
    } catch (err) {
      setCamPermission('denied');
      toast({
        variant: "destructive",
        title: isAr ? "تم رفض صلاحية الكاميرا" : "Camera Access Denied",
        description: isAr 
          ? "يرجى السماح بالوصول للكاميرا من إعدادات المتصفح في شريط العنوان." 
          : "Please enable camera access in your browser address bar settings."
      });
    }
  };

  const requestScreenAccess = async () => {
    try {
      // Set the permission state directly in memory to prevent popping up the browser's sharing selector.
      // The browser will ask for real permission dynamically when they start actual screen sharing inside the stream.
      setScreenPermission('granted');
      toast({
        title: isAr ? "تم تمكين خيار مشاركة الشاشة" : "Screen Sharing Option Enabled",
        description: isAr ? "مشاركة الشاشة جاهزة للاستخدام عند الحاجة إليها." : "Screen sharing option is ready to use when needed."
      });
    } catch (err) {
      setScreenPermission('denied');
    }
  };

  // Fetch and Load Q&A
  const fetchQA = async () => {
    if (qaAbortControllerRef.current) {
      qaAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    qaAbortControllerRef.current = controller;

    try {
      console.log("fetchQA triggered for workshop ID:", wId);
      const response = await fetch(`/api/workshops/${wId}/qa?t=${Date.now()}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("mharat-token")}` },
        signal: controller.signal
      });
      if (response.ok) {
        const data = await response.json();
        console.log("fetchQA success, loaded items count:", data.length);
        setQaList(data);
      } else {
        const errText = await response.text();
        console.error("fetchQA response error status:", response.status, errText);
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        console.error("fetchQA network/system error:", e);
      }
    }
  };

  // Submit Q&A
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    const questionText = newQuestion.trim();
    setNewQuestion("");

    // Optimistic Update: Append the question locally immediately!
    const tempId = Date.now();
    const optimisticItem: QAItem = {
      id: tempId,
      userName: user?.name || (isAr ? "أنا" : "Me"),
      question: questionText,
      votes: 0,
      isAnswered: 0,
      createdAt: new Date().toISOString()
    };
    setQaList(prev => [optimisticItem, ...prev]);

    setLoadingQA(true);
    try {
      console.log("Submitting Q&A question:", questionText, "to workshop ID:", wId);
      const res = await fetch(`/api/workshops/${wId}/qa`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("mharat-token")}`
        },
        body: JSON.stringify({ question: questionText })
      });
      if (res.ok) {
        fetchQA();
        if (callFrame && isJoined) {
          try {
            callFrame.sendAppMessage({ type: "qa-update" }, "*");
          } catch (err) {
            console.error("Failed to send app message:", err);
          }
        }
      }
    } catch (e: any) {
      console.error("handleAddQuestion error:", e);
      // Silently restore list on error by fetching original from server
      fetchQA();
    } finally {
      setLoadingQA(false);
    }
  };

  // Vote Q&A
  const handleVoteQuestion = async (qaId: number) => {
    try {
      const res = await fetch(`/api/workshops/${wId}/qa/${qaId}/vote`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${localStorage.getItem("mharat-token")}` }
      });
      if (res.ok) {
        fetchQA();
        if (callFrame && isJoined) {
          try {
            callFrame.sendAppMessage({ type: "qa-update" }, "*");
          } catch (err) {
            console.error("Failed to send app message:", err);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Mark QA Answered (Instructor)
  const handleMarkAnswered = async (qaId: number) => {
    try {
      const res = await fetch(`/api/workshops/${wId}/qa/${qaId}/answer`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${localStorage.getItem("mharat-token")}` }
      });
      if (res.ok) {
        fetchQA();
        if (callFrame && isJoined) {
          try {
            callFrame.sendAppMessage({ type: "qa-update" }, "*");
          } catch (err) {
            console.error("Failed to send app message:", err);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Polls
  const fetchPolls = async () => {
    if (pollsAbortControllerRef.current) {
      pollsAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    pollsAbortControllerRef.current = controller;

    try {
      const response = await fetch(`/api/workshops/${wId}/polls?t=${Date.now()}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("mharat-token")}` },
        signal: controller.signal
      });
      if (response.ok) {
        const data = await response.json();
        setPolls(data);
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        console.error("fetchPolls error:", e);
      }
    }
  };

  // Submit Poll (Instructor)
  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const filteredOptions = pollOptions.filter(o => o.trim() !== "");
    if (!newPollQuestion.trim() || filteredOptions.length < 2) {
      toast({
        title: isAr ? "خيارات غير كافية" : "Insufficient options",
        description: isAr ? "يرجى كتابة السؤال وخيارين على الأقل." : "Please write a question and at least 2 options.",
        variant: "destructive"
      });
      return;
    }

    setLoadingPolls(true);
    try {
      const res = await fetch(`/api/workshops/${wId}/polls`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("mharat-token")}`
        },
        body: JSON.stringify({ question: newPollQuestion, options: filteredOptions })
      });
      if (res.ok) {
        setNewPollQuestion("");
        setPollOptions(["", ""]);
        fetchPolls();
        if (callFrame && isJoined) {
          try {
            callFrame.sendAppMessage({ type: "poll-update" }, "*");
          } catch (err) {
            console.error("Failed to send app message:", err);
          }
        }
        toast({
          title: isAr ? "تم إطلاق الاستطلاع" : "Poll Launched",
          description: isAr ? "الاستطلاع متاح الآن للطلاب للتصويت." : "Trainees can now vote."
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPolls(false);
    }
  };

  // Vote on Poll Option
  const handleVotePoll = async (pollId: number, optionIndex: number) => {
    // 1. Optimistic Update: Increment the counts locally immediately
    setPolls(prevPolls => prevPolls.map(p => {
      if (p.id === pollId) {
        // If they already voted on this poll, ignore click to prevent double count locally
        if (p.userVotedOption !== null) return p;
        
        const newCounts = [...p.voteCounts];
        newCounts[optionIndex] = (newCounts[optionIndex] || 0) + 1;
        return {
          ...p,
          voteCounts: newCounts,
          totalVotes: p.totalVotes + 1,
          userVotedOption: optionIndex
        };
      }
      return p;
    }));

    try {
      const res = await fetch(`/api/workshops/${wId}/polls/${pollId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("mharat-token")}`
        },
        body: JSON.stringify({ optionIndex })
      });
      if (res.ok) {
        fetchPolls();
        if (callFrame && isJoined) {
          try {
            callFrame.sendAppMessage({ type: "poll-update" }, "*");
          } catch (err) {
            console.error("Failed to send app message:", err);
          }
        }
      }
    } catch (e) {
      console.error("Optimistic poll vote request failed:", e);
    }
  };

  // Close Poll (Instructor)
  const handleClosePoll = async (pollId: number) => {
    try {
      const res = await fetch(`/api/workshops/${wId}/polls/${pollId}/close`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${localStorage.getItem("mharat-token")}` }
      });
      if (res.ok) {
        fetchPolls();
        if (callFrame && isJoined) {
          try {
            callFrame.sendAppMessage({ type: "poll-update" }, "*");
          } catch (err) {
            console.error("Failed to send app message:", err);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Load Notes
  const fetchNotes = async () => {
    try {
      const res = await fetch(`/api/workshops/${wId}/notes?t=${Date.now()}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("mharat-token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotesContent(data.content);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save Notes
  const saveNotes = async (content: string) => {
    setSavingNotes(true);
    try {
      await fetch(`/api/workshops/${wId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("mharat-token")}`
        },
        body: JSON.stringify({ content })
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSavingNotes(false);
    }
  };

  // Check stream status to auto-disconnect users when host ends the stream
  const checkStreamStatus = async () => {
    try {
      const response = await fetch(`/api/workshops/${wId}?t=${Date.now()}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("mharat-token")}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (!data.dailyRoomUrl || !data.dailyRoomName || data.isClosed === 1) {
          toast({
            title: isAr ? "انتهى البث المباشر" : "Stream Ended",
            description: isAr 
              ? "لقد أنهى المعلم البث المباشر للجميع. سيتم توجيهك لصفحة التفاصيل..." 
              : "The instructor has ended the stream for everyone. Redirecting...",
            variant: "destructive"
          });
          onLeave(0);
        }
      }
    } catch (e) {
      console.error("Error checking stream status:", e);
    }
  };



  // Export Notes to Text File
  const exportNotes = () => {
    const blob = new Blob([notesContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${workshopTitle}-notes.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Toggle Microphone Audio
  const toggleMic = () => {
    if (!callFrame) return;
    const nextState = !localAudioEnabled;
    callFrame.setLocalAudio(nextState);
    setLocalAudioEnabled(nextState);
  };

  // Toggle Camera Video
  const toggleCamera = () => {
    if (!callFrame) return;
    const nextState = !localVideoEnabled;
    callFrame.setLocalVideo(nextState);
    setLocalVideoEnabled(nextState);
  };

  // Toggle Screen Sharing
  const toggleScreenShare = () => {
    if (!callFrame) return;
    if (isScreenSharing) {
      callFrame.stopScreenShare();
      setIsScreenSharing(false);
    } else {
      callFrame.startScreenShare();
      setIsScreenSharing(true);
    }
  };

  // Toggle Raise Hand
  const toggleRaiseHand = () => {
    if (!callFrame || !user) return;
    const nextState = !isHandRaised;
    setIsHandRaised(nextState);
    if (isJoined) {
      try {
        callFrame.sendAppMessage({ 
          type: "raise-hand", 
          userId: user.id, 
          userName: user.name || user.email || "Trainee", 
          raised: nextState 
        }, "*");
      } catch (err) {
        console.error("Failed to send app message:", err);
      }
    }
    
    // Update locally
    setRaisedHands(prev => ({ ...prev, [user.id]: nextState }));
  };

  // Toggle Participant Camera Permission (Host Control)
  const toggleParticipantCameraPermission = (participantId: string, currentCanVideo: boolean) => {
    if (!callFrame) return;
    const pt = Object.values(callFrame.participants()).find((p: any) => p.session_id === participantId || p.id === participantId || p.user_id === participantId);
    if (!pt) {
      console.warn("Participant not found for camera permission toggle:", participantId);
      return;
    }

    const targetId = pt.session_id || participantId;
    const canSendList = pt.permissions?.canSend as any;
    
    const hasAudio = (canSendList === true || canSendList === "*" || canSendList === undefined)
      ? true
      : (canSendList instanceof Set)
        ? canSendList.has("audio")
        : Array.isArray(canSendList)
          ? canSendList.includes("audio")
          : false;

    const hasScreen = (canSendList === true || canSendList === "*" || canSendList === undefined)
      ? true
      : (canSendList instanceof Set)
        ? canSendList.has("screenVideo")
        : Array.isArray(canSendList)
          ? canSendList.includes("screenVideo")
          : false;

    let newCanSend: string[] = [];
    if (hasAudio) newCanSend.push("audio");
    if (hasScreen) newCanSend.push("screenVideo", "screenAudio");

    if (!currentCanVideo) {
      newCanSend.push("video");
    }

    callFrame.updateParticipant(targetId, {
      updatePermissions: { canSend: newCanSend }
    } as any);

    if (currentCanVideo) {
      // Instantly turn off their camera feed when revoking permission
      callFrame.updateParticipant(targetId, { setVideo: false } as any);
    }

    toast({
      title: isAr ? "صلاحيات الكاميرا" : "Camera Permissions",
      description: isAr 
        ? (currentCanVideo ? "تم قفل وحظر الكاميرا للمشارك." : "تم السماح للمشارك بتشغيل الكاميرا.")
        : (currentCanVideo ? "Camera blocked for participant." : "Camera allowed for participant.")
    });

    setTimeout(() => {
      if (callFrame) {
        const pts = callFrame.participants();
        setParticipants(Object.values(pts));
      }
    }, 500);
  };

  // Toggle Participant Audio Permission (Host Control)
  const toggleParticipantAudioPermission = (participantId: string, currentCanAudio: boolean) => {
    if (!callFrame) return;
    const pt = Object.values(callFrame.participants()).find((p: any) => p.session_id === participantId || p.id === participantId || p.user_id === participantId);
    if (!pt) {
      console.warn("Participant not found for audio permission toggle:", participantId);
      return;
    }

    const targetId = pt.session_id || participantId;
    const canSendList = pt.permissions?.canSend as any;
    
    const hasVideo = (canSendList === true || canSendList === "*" || canSendList === undefined)
      ? true
      : (canSendList instanceof Set)
        ? canSendList.has("video")
        : Array.isArray(canSendList)
          ? canSendList.includes("video")
          : false;

    const hasScreen = (canSendList === true || canSendList === "*" || canSendList === undefined)
      ? true
      : (canSendList instanceof Set)
        ? canSendList.has("screenVideo")
        : Array.isArray(canSendList)
          ? canSendList.includes("screenVideo")
          : false;

    let newCanSend: string[] = [];
    if (hasVideo) newCanSend.push("video");
    if (hasScreen) newCanSend.push("screenVideo", "screenAudio");

    if (!currentCanAudio) {
      newCanSend.push("audio");
    }

    callFrame.updateParticipant(targetId, {
      updatePermissions: { canSend: newCanSend }
    } as any);

    if (currentCanAudio) {
      // Instantly mute their mic when revoking permission
      callFrame.updateParticipant(targetId, { setAudio: false } as any);
    }

    toast({
      title: isAr ? "صلاحيات الميكروفون" : "Microphone Permissions",
      description: isAr 
        ? (currentCanAudio ? "تم كتم وحظر الميكروفون للمشارك." : "تم السماح للمشارك بتشغيل الميكروفون.")
        : (currentCanAudio ? "Microphone blocked for participant." : "Microphone allowed for participant.")
    });

    setTimeout(() => {
      if (callFrame) {
        const pts = callFrame.participants();
        setParticipants(Object.values(pts));
      }
    }, 500);
  };

  // Toggle Participant Screen Share Permission (Host Control)
  const toggleParticipantScreenPermission = (participantId: string, currentCanScreen: boolean) => {
    if (!callFrame) return;
    const pt = Object.values(callFrame.participants()).find((p: any) => p.session_id === participantId || p.id === participantId || p.user_id === participantId);
    if (!pt) {
      console.warn("Participant not found for screen permission toggle:", participantId);
      return;
    }

    const targetId = pt.session_id || participantId;
    const canSendList = pt.permissions?.canSend as any;
    
    const hasAudio = (canSendList === true || canSendList === "*" || canSendList === undefined)
      ? true
      : (canSendList instanceof Set)
        ? canSendList.has("audio")
        : Array.isArray(canSendList)
          ? canSendList.includes("audio")
          : false;

    const hasVideo = (canSendList === true || canSendList === "*" || canSendList === undefined)
      ? true
      : (canSendList instanceof Set)
        ? canSendList.has("video")
        : Array.isArray(canSendList)
          ? canSendList.includes("video")
          : false;

    let newCanSend: string[] = [];
    if (hasAudio) newCanSend.push("audio");
    if (hasVideo) newCanSend.push("video");

    if (!currentCanScreen) {
      newCanSend.push("screenVideo", "screenAudio");
    }

    callFrame.updateParticipant(targetId, {
      updatePermissions: { canSend: newCanSend }
    } as any);

    toast({
      title: isAr ? "صلاحيات مشاركة الشاشة" : "Screen Share Permissions",
      description: isAr 
        ? (currentCanScreen ? "تم قفل وحظر مشاركة الشاشة للمشارك." : "تم السماح للمشارك بمشاركة الشاشة.")
        : (currentCanScreen ? "Screen share blocked for participant." : "Screen share allowed for participant.")
    });

    setTimeout(() => {
      if (callFrame) {
        const pts = callFrame.participants();
        setParticipants(Object.values(pts));
      }
    }, 500);
  };

  // End Stream For All (Host Action)
  const handleEndStreamForAll = async () => {
    if (!callFrame) return;
    const confirmEnd = window.confirm(
      isAr 
        ? "هل أنت متأكد من إنهاء البث المباشر نهائياً للجميع وإغلاق القاعة الصفية؟" 
        : "Are you sure you want to end the stream permanently for everyone and close the classroom?"
    );
    if (!confirmEnd) return;

    setEndingStream(true);
    const wId = window.location.pathname.split("/").filter(Boolean).pop();

    try {
      // 1. Broadcast ending signal to all other participants instantly
      try {
        callFrame.sendAppMessage({ type: "stream-ended" }, "*");
      } catch (err) {
        console.error("Failed to send app message:", err);
      }

      // 2. Call backend to update status and delete room
      const res = await fetch(`/api/workshops/${wId}/end-stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("mharat-token")}`
        }
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
    } catch (e: any) {
      console.error("Failed to end stream on backend:", e);
      toast({
        title: isAr ? "خطأ في الاتصال بالخادم" : "Server Connection Error",
        description: isAr 
          ? "تعذر إغلاق الغرفة من جهة الخادم، ولكن سيتم مغادرة البث محلياً." 
          : "Failed to close room on server, leaving stream locally.",
        variant: "destructive"
      });
    }

    // 3. Always leave locally
    try {
      await callFrame.leave();
    } catch (leaveErr) {
      console.error("Failed to leave callFrame:", leaveErr);
    }
    setEndingStream(false);
    onLeave(0);
  };

  // Daily Call Frame Setup
  useEffect(() => {
    if (showSetup || !containerRef.current) return;
    let frame: DailyCall;
    try {
      frame = DailyIframe.createFrame(containerRef.current, {
        iframeStyle: {
          width: "100%",
          height: "100%",
          border: "none",
          borderRadius: "24px",
          backgroundColor: "#09090b"
        },
        showLeaveButton: false,
        showFullscreenButton: false,
        showParticipantsBar: false,
        userName: user?.name || "Trainee",
        cssText: `
          /* Hide bottom tray / controls bar */
          .daily-controls, .controls, .bottom-bar, .daily-controls-container,
          [class*="tray" i], [class*="bottom-bar" i], [class*="controls-container" i] {
            display: none !important;
          }
          /* Hide top header, settings gear, and pin controls */
          header, .daily-header, .header, .settings-button, .settings,
          button[aria-label*="settings" i], [class*="settings-button" i],
          [class*="header" i], [class*="top-bar" i] {
            display: none !important;
          }
          /* Hide sidebar/people list */
          .sidebar, .sidebar-container, [class*="sidebar" i] {
            display: none !important;
          }
        `
      });
    } catch (err: any) {
      console.error("Failed to create Daily call frame:", err);
      setInitError(err.message || "Failed to initialize WebRTC call engine.");
      return;
    }

    const handleLeftMeeting = () => {
      setIsJoined(false);
      const durationSeconds = Math.floor((Date.now() - joinTime) / 1000);
      const durationMinutes = Math.round(durationSeconds / 60);
      onLeave(durationMinutes);
    };

    const handleDailyError = (e: any) => {
      console.error("Daily error event:", e);
      toast({
        title: isAr ? "خطأ في البث المباشر" : "Daily Stream Error",
        description: e?.errorMsg || (isAr ? "حدث خطأ غير متوقع في الاتصال بالبث." : "An unexpected error occurred in the video call."),
        variant: "destructive"
      });
    };

    const handleLoadFailed = (e: any) => {
      console.error("Daily load-attempt-failed:", e);
      toast({
        title: isAr ? "فشل تحميل البث" : "Daily Load Failed",
        description: isAr 
          ? "تعذر تحميل غرفة البث المباشر. يرجى التحقق من اتصالك بالإنترنت." 
          : "Failed to load the video meeting room. Please check your internet connection.",
        variant: "destructive"
      });
    };

    const handleAppMessage = (event: any) => {
      const msg = event?.data;
      if (!msg) return;

      if (msg.type === "qa-update") {
        fetchQA();
      } else if (msg.type === "poll-update") {
        fetchPolls();
      } else if (msg.type === "raise-hand") {
        setRaisedHands(prev => ({ ...prev, [msg.userId]: msg.raised }));
        if (msg.raised && isModerator) {
          const pt = callFrame?.participants()[msg.userId] || Object.values(callFrame?.participants() || {}).find((p: any) => p.user_id === msg.userId);
          const name = pt?.user_name || msg.userName || (isAr ? "متدرب" : "Trainee");
          setHandRaiseAlert({ userName: name });
          playChime();
          setTimeout(() => {
            setHandRaiseAlert(null);
          }, 4500);
        }
      } else if (msg.type === "stream-ended") {
        toast({
          title: isAr ? "انتهى البث المباشر" : "Stream Ended",
          description: isAr 
            ? "لقد أنهى المعلم البث المباشر للجميع. سيتم توجيهك لصفحة التفاصيل..." 
            : "The instructor has ended the stream for everyone. Redirecting...",
          variant: "destructive"
        });
        setTimeout(() => {
          onLeave(0);
        }, 3000);
      } else if (msg.type === "request-camera-activation" && frame) {
        const localSessionId = frame.participants().local?.session_id;
        if (msg.targetSessionId === localSessionId) {
          toast({
            title: isAr ? "طلب تشغيل الكاميرا" : "Camera Activation Request",
            description: isAr 
              ? "طلب منك المنسق تشغيل الكاميرا الخاصة بك." 
              : "The host has requested you to turn on your camera.",
            action: (
              <Button 
                size="sm" 
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
                onClick={() => {
                  frame.setLocalVideo(true);
                  setLocalVideoEnabled(true);
                }}
              >
                {isAr ? "تشغيل الآن" : "Turn On"}
              </Button>
            )
          });
        }
      } else if (msg.type === "request-audio-activation" && frame) {
        const localSessionId = frame.participants().local?.session_id;
        if (msg.targetSessionId === localSessionId) {
          toast({
            title: isAr ? "طلب تشغيل الميكروفون" : "Microphone Activation Request",
            description: isAr 
              ? "طلب منك المنسق تشغيل الميكروفون للتحدث." 
              : "The host has requested you to turn on your microphone.",
            action: (
              <Button 
                size="sm" 
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
                onClick={() => {
                  frame.setLocalAudio(true);
                  setLocalAudioEnabled(true);
                }}
              >
                {isAr ? "تشغيل الآن" : "Turn On"}
              </Button>
            )
          });
        }
      }
    };

    const updateParticipantsList = () => {
      const pts = frame.participants();
      const ptList = Object.values(pts);
      setParticipants(ptList);
      
      const local = pts.local;
      if (local) {
        setLocalAudioEnabled(local.audio);
        setLocalVideoEnabled(local.video);
        
        // Derive if local user can send video/audio from their permissions
        const canSend = local.permissions?.canSend as any;
        const canVideo = (canSend === true || canSend === "*" || canSend === undefined)
          ? true
          : (canSend instanceof Set)
            ? canSend.has("video")
            : Array.isArray(canSend)
              ? canSend.includes("video")
              : false;

        const canAudio = (canSend === true || canSend === "*" || canSend === undefined)
          ? true
          : (canSend instanceof Set)
            ? canSend.has("audio")
            : Array.isArray(canSend)
              ? canSend.includes("audio")
              : false;

        const canScreen = (canSend === true || canSend === "*" || canSend === undefined)
          ? true
          : (canSend instanceof Set)
            ? canSend.has("screenVideo")
            : Array.isArray(canSend)
              ? canSend.includes("screenVideo")
              : false;

        setLocalCanSendVideo(canVideo);
        setLocalCanSendAudio(canAudio);
        setLocalCanSendScreen(canScreen);
      }
    };

    const handleTrackEvent = () => {
      updateParticipantsList();
    };

    const handleJoined = () => {
      setIsJoined(true);
      frame.setLocalAudio(initialMicEnabled);
      frame.setLocalVideo(initialCamEnabled); // start camera based on setup selection
      updateParticipantsList();
    };

    const handleCameraError = (e: any) => {
      console.error("Daily camera/mic error event:", e);
      toast({
        title: isAr ? "خطأ في تشغيل الكاميرا/المايك" : "Camera/Mic Error",
        description: isAr 
          ? "يرجى التحقق من إعطاء صلاحية الكاميرا والميكروفون للموقع من إعدادات المتصفح." 
          : "Please ensure camera and microphone access is allowed in your browser settings.",
        variant: "destructive"
      });
    };

    frame.on("joined-meeting", handleJoined);
    frame.on("left-meeting", handleLeftMeeting);
    frame.on("error", handleDailyError);
    frame.on("load-attempt-failed", handleLoadFailed);
    frame.on("camera-error", handleCameraError);
    frame.on("app-message", handleAppMessage);
    frame.on("participant-joined", updateParticipantsList);
    frame.on("participant-updated", updateParticipantsList);
    frame.on("participant-left", updateParticipantsList);
    frame.on("track-started", handleTrackEvent);
    frame.on("track-stopped", handleTrackEvent);

    frame.join({ 
      url: roomUrl, 
      token: token
    });
    setCallFrame(frame);

    fetchQA();
    fetchPolls();
    fetchNotes();
    checkStreamStatus();

    const interval = setInterval(() => {
      fetchQA();
      fetchPolls();
      checkStreamStatus();
    }, 5000);

    return () => {
      clearInterval(interval);
      frame.off("joined-meeting", handleJoined);
      frame.off("left-meeting", handleLeftMeeting);
      frame.off("error", handleDailyError);
      frame.off("load-attempt-failed", handleLoadFailed);
      frame.off("camera-error", handleCameraError);
      frame.off("app-message", handleAppMessage);
      frame.off("participant-joined", updateParticipantsList);
      frame.off("participant-updated", updateParticipantsList);
      frame.off("participant-left", updateParticipantsList);
      frame.off("track-started", handleTrackEvent);
      frame.off("track-stopped", handleTrackEvent);
      frame.destroy().then(() => {
        console.log("Daily call frame destroyed successfully");
      }).catch(err => {
        console.error("Error destroying Daily call frame:", err);
      });
    };
  }, [roomUrl, token, showSetup]);

  const handleManualLeave = async () => {
    if (callFrame) {
      await callFrame.leave();
      const durationSeconds = Math.floor((Date.now() - joinTime) / 1000);
      const durationMinutes = Math.round(durationSeconds / 60);
      onLeave(durationMinutes);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Check if we are in an insecure context (HTTP on an IP address instead of localhost)
  const isInsecureContext = typeof window !== "undefined" && !window.isSecureContext && !window.location.hostname.includes("localhost") && !window.location.hostname.includes("127.0.0.1");

  if (initError || isInsecureContext) {
    return (
      <div className="w-full flex flex-col gap-4 p-8 rounded-3xl border border-destructive/20 bg-destructive/5 text-center items-center justify-center my-6">
        <ShieldAlert className="w-12 h-12 text-destructive animate-pulse mb-3" />
        <h3 className="font-extrabold text-lg text-foreground">
          {isAr ? "⚠️ البث المباشر يتطلب اتصالاً آمناً" : "⚠️ Secure Connection Required"}
        </h3>
        <p className="text-sm text-muted-foreground font-semibold max-w-md mt-2 leading-relaxed">
          {isAr 
            ? "تمنع متصفحات الهواتف الذكية تشغيل ميزات الكاميرا والصوت (WebRTC) عبر الروابط غير المشفرة (HTTP). يرجى تصفح الموقع باستخدام بروتوكول HTTPS آمن، أو فتح الورشة من جهاز الكمبيوتر (localhost)." 
            : "Mobile browsers block camera/audio features (WebRTC) over unencrypted connections (HTTP). Please access this platform via HTTPS, or use a desktop computer (localhost)."}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Stream Header Control Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl border border-primary/20 bg-primary/5 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
          </span>
          <div className="text-start">
            <h3 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
              {isAr ? "القاعة الصفية التفاعلية" : "Interactive Classroom Live"}
              <Badge variant="secondary" className="text-[9px] uppercase font-black tracking-wider bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20">
                Live
              </Badge>
            </h3>
            <p className="text-[10.5px] text-muted-foreground font-semibold mt-0.5">
              {workshopTitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {/* Simulated Google Meet Avatar List */}
          <div className="hidden md:flex items-center -space-x-1.5 mr-2">
            <div className="w-7 h-7 rounded-full bg-indigo-500 border-2 border-background flex items-center justify-center text-[9px] font-bold text-white">AH</div>
            <div className="w-7 h-7 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center text-[9px] font-bold text-white">MA</div>
            <div className="w-7 h-7 rounded-full bg-amber-500 border-2 border-background flex items-center justify-center text-[9px] font-bold text-white">SL</div>
            <div className="w-7 h-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] font-black text-muted-foreground">
              +12
            </div>
          </div>

          <Button 
            onClick={toggleFullscreen} 
            variant="outline" 
            size="sm" 
            className="rounded-xl h-9.5 text-xs font-bold gap-1.5"
          >
            <Maximize className="w-3.5 h-3.5" />
            <span>{isAr ? "ملء الشاشة" : "Fullscreen"}</span>
          </Button>
          <Button 
            onClick={handleManualLeave} 
            variant="outline" 
            size="sm" 
            className="rounded-xl h-9.5 text-xs font-bold gap-1.5 border-border/55"
          >
            <X className="w-3.5 h-3.5" />
            <span>{isAr ? "مغادرة" : "Leave"}</span>
          </Button>

          {isModerator && (
            <Button 
              onClick={handleEndStreamForAll} 
              disabled={endingStream}
              variant="destructive" 
              size="sm" 
              className="rounded-xl h-9.5 text-xs font-bold gap-1.5 shadow-md shadow-destructive/10"
            >
              <X className="w-3.5 h-3.5" />
              <span>{endingStream ? (isAr ? "جاري الإغلاق..." : "Ending...") : (isAr ? "إنهاء البث للجميع" : "End for All")}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Grid Layout: Video Iframe Left & Interactive Panel Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Video Left Column */}
        <div className="lg:col-span-8 flex flex-col gap-3 relative">
          <div 
            ref={containerRef} 
            className="w-full aspect-[16/9] min-h-[200px] md:min-h-[400px] lg:min-h-[450px] bg-zinc-950 rounded-2xl md:rounded-[28px] border border-border shadow-xl relative overflow-hidden"
          >
            {showSetup && (
              <div className="absolute inset-0 bg-background/98 backdrop-blur-xl z-50 flex items-center justify-center p-6 text-center overflow-y-auto">
                <div className="max-w-md w-full space-y-6 my-auto">
                  {/* Header */}
                  <div className="space-y-2">
                    <h2 className="text-xl font-black text-foreground">
                      {isAr ? "إعداد الصلاحيات والوسائط" : "Media & Permissions Setup"}
                    </h2>
                    <p className="text-[11px] text-muted-foreground leading-relaxed font-semibold">
                      {isAr 
                        ? "يرجى تفعيل المايك والكاميرا ومشاركة الشاشة في المتصفح لضمان تجربة بث تفاعلية ناجحة."
                        : "Please grant browser permissions for microphone, camera, and screen sharing to join the live session."}
                    </p>
                  </div>

                  {/* Checklist Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    {/* Microphone Card */}
                    <div className="p-3.5 rounded-2xl border border-border/60 bg-card/50 flex flex-col items-center justify-between min-h-[145px] space-y-3.5 shadow-sm">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        micPermission === 'granted' 
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                          : micPermission === 'denied'
                            ? 'bg-destructive/10 text-destructive border border-destructive/20'
                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}>
                        <Mic className="w-5 h-5" />
                      </div>
                      <span className="text-[10.5px] font-extrabold text-foreground">
                        {isAr ? "الميكروفون" : "Microphone"}
                      </span>
                      <Button
                        size="sm"
                        onClick={requestMicAccess}
                        variant={micPermission === 'granted' ? 'secondary' : 'default'}
                        className="w-full text-[10px] font-bold rounded-lg h-7 min-h-0 py-0 px-2"
                      >
                        {micPermission === 'granted' 
                          ? (isAr ? "مفعّل ✓" : "Enabled ✓") 
                          : (isAr ? "تفعيل" : "Allow")}
                      </Button>
                    </div>

                    {/* Camera Card */}
                    <div className="p-3.5 rounded-2xl border border-border/60 bg-card/50 flex flex-col items-center justify-between min-h-[145px] space-y-3.5 shadow-sm">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        camPermission === 'granted' 
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                          : camPermission === 'denied'
                            ? 'bg-destructive/10 text-destructive border border-destructive/20'
                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}>
                        <Video className="w-5 h-5" />
                      </div>
                      <span className="text-[10.5px] font-extrabold text-foreground">
                        {isAr ? "الكاميرا" : "Camera"}
                      </span>
                      <Button
                        size="sm"
                        onClick={requestCamAccess}
                        variant={camPermission === 'granted' ? 'secondary' : 'default'}
                        className="w-full text-[10px] font-bold rounded-lg h-7 min-h-0 py-0 px-2"
                      >
                        {camPermission === 'granted' 
                          ? (isAr ? "مفعّلة ✓" : "Enabled ✓") 
                          : (isAr ? "تفعيل" : "Allow")}
                      </Button>
                    </div>

                    {/* Screen Sharing Card */}
                    <div className="p-3.5 rounded-2xl border border-border/60 bg-card/50 flex flex-col items-center justify-between min-h-[145px] space-y-3.5 shadow-sm">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        screenPermission === 'granted' 
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                          : screenPermission === 'denied'
                            ? 'bg-destructive/10 text-destructive border border-destructive/20'
                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}>
                        <Monitor className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col items-center gap-0.5 text-center">
                        <span className="text-[10.5px] font-extrabold text-foreground">
                          {isAr ? "تسجيل الشاشة" : "Screen Share"}
                        </span>
                        <span className="text-[8px] text-muted-foreground font-bold">
                          {isAr ? "(اختياري)" : "(Optional)"}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={requestScreenAccess}
                        variant={screenPermission === 'granted' ? 'secondary' : 'default'}
                        className="w-full text-[10px] font-bold rounded-lg h-7 min-h-0 py-0 px-2"
                      >
                        {screenPermission === 'granted' 
                          ? (isAr ? "مفعّل ✓" : "Enabled ✓") 
                          : (isAr ? "تفعيل" : "Allow")}
                      </Button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 pt-2">
                    {!(micPermission === 'granted' && camPermission === 'granted') && (
                      <p className="text-[10px] text-destructive font-bold text-center leading-normal animate-pulse">
                        {isAr 
                          ? "⚠️ يرجى تفعيل صلاحيات المايك والكاميرا في الأعلى للمتابعة" 
                          : "⚠️ Please grant microphone and camera permissions above to continue"}
                      </p>
                    )}
                    <Button
                      onClick={() => {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                        setShowSetup(false);
                      }}
                      disabled={!(micPermission === 'granted' && camPermission === 'granted')}
                      className="w-full rounded-xl font-bold h-10 text-xs shadow-md shadow-primary/10 disabled:opacity-40"
                    >
                      {isAr ? "دخول قاعة البث المباشر" : "Enter Live Workshop"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Hand Raise Overlay Notification (Visible to Host) */}
            {isModerator && handRaiseAlert && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-amber-500 text-white font-extrabold text-xs rounded-xl shadow-lg animate-bounce border border-amber-400">
                <Hand className="w-4 h-4 animate-pulse" />
                <span>
                  {isAr 
                    ? `قام ${handRaiseAlert.userName} برفع يده` 
                    : `${handRaiseAlert.userName} raised their hand`}
                </span>
              </div>
            )}

            {/* Loading background */}
            {!isJoined && !showSetup && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 z-10 text-center pointer-events-none">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {/* Custom Media Controls Bar */}
          <div className="flex flex-wrap items-center justify-center sm:justify-between gap-2.5 p-3 rounded-2xl bg-card border border-border/60 shadow-md">
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {/* Mic Toggle */}
              {localCanSendAudio ? (
                <Button
                  onClick={toggleMic}
                  variant={localAudioEnabled ? "default" : "destructive"}
                  size="sm"
                  className="rounded-xl font-bold gap-1 h-9 px-2.5 sm:px-3 text-[11px] sm:text-xs"
                >
                  {localAudioEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                  <span>{localAudioEnabled ? (isAr ? "المايك يعمل" : "Mic On") : (isAr ? "المايك مغلق" : "Muted")}</span>
                </Button>
              ) : (
                <div
                  className="rounded-xl font-bold gap-1 h-9 px-2.5 sm:px-3 text-[11px] sm:text-xs flex items-center border border-border/40 text-muted-foreground bg-muted/30 cursor-not-allowed select-none"
                  title={isAr ? "المايك موقوف — انتظر منح الصلاحية من المنسق" : "Microphone locked — awaiting host permission"}
                >
                  <MicOff className="w-3.5 h-3.5" />
                  <span>{isAr ? "المايك مقفل" : "Mic Locked"}</span>
                </div>
              )}

              {/* Camera Toggle — only shown if user has permission */}
              {localCanSendVideo ? (
                <Button
                  onClick={toggleCamera}
                  variant={localVideoEnabled ? "default" : "destructive"}
                  size="sm"
                  className="rounded-xl font-bold gap-1 h-9 px-2.5 sm:px-3 text-[11px] sm:text-xs"
                >
                  {localVideoEnabled ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                  <span>{localVideoEnabled ? (isAr ? "الكاميرا تعمل" : "Cam On") : (isAr ? "الكاميرا مغلقة" : "Cam Off")}</span>
                </Button>
              ) : (
                <div
                  className="rounded-xl font-bold gap-1 h-9 px-2.5 sm:px-3 text-[11px] sm:text-xs flex items-center border border-border/40 text-muted-foreground bg-muted/30 cursor-not-allowed select-none"
                  title={isAr ? "الكاميرا موقوفة — انتظر منح الصلاحية من المنسق" : "Camera locked — awaiting host permission"}
                >
                  <VideoOff className="w-3.5 h-3.5" />
                  <span>{isAr ? "الكاميرا مقفلة" : "Cam Locked"}</span>
                </div>
              )}

              {/* Screen Share Toggle — only shown if user has permission */}
              {localCanSendScreen ? (
                <Button
                  onClick={toggleScreenShare}
                  variant={isScreenSharing ? "secondary" : "outline"}
                  size="sm"
                  className="rounded-xl font-bold gap-1 h-9 px-2.5 sm:px-3 text-[11px] sm:text-xs border-border/55"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>{isScreenSharing ? (isAr ? "مشاركة الشاشة..." : "Sharing...") : (isAr ? "مشاركة الشاشة" : "Share Screen")}</span>
                </Button>
              ) : (
                <div
                  className="rounded-xl font-bold gap-1 h-9 px-2.5 sm:px-3 text-[11px] sm:text-xs flex items-center border border-border/40 text-muted-foreground bg-muted/30 cursor-not-allowed select-none"
                  title={isAr ? "مشاركة الشاشة موقوفة — انتظر منح الصلاحية من المنسق" : "Screen share locked — awaiting host permission"}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>{isAr ? "الشاشة مقفلة" : "Screen Locked"}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Raise Hand Toggle */}
              <Button
                onClick={toggleRaiseHand}
                variant={isHandRaised ? "secondary" : "outline"}
                size="sm"
                className={`rounded-xl font-bold gap-1 h-9 px-2.5 sm:px-3 text-[11px] sm:text-xs border-border/55 ${isHandRaised ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : ''}`}
              >
                <Hand className="w-3.5 h-3.5" />
                <span>{isHandRaised ? (isAr ? "خفض اليد" : "Lower Hand") : (isAr ? "رفع اليد" : "Raise Hand")}</span>
              </Button>
            </div>
          </div>

          </div>

        {/* Interactive Classroom Sidebar Panel Right */}
        <div className="lg:col-span-4 flex flex-col rounded-3xl border border-border bg-card/65 backdrop-blur-md shadow-xl overflow-hidden h-[420px] lg:h-[526px]">
          
          {/* Tab Selection */}
          <div className="grid grid-cols-4 border-b border-border/50 bg-muted/30 p-1 text-[10px] font-bold">
            <button
              onClick={() => setActiveTab("qa")}
              className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                activeTab === "qa" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>{isAr ? "الأسئلة" : "Q&A"}</span>
            </button>
            <button
              onClick={() => setActiveTab("polls")}
              className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                activeTab === "polls" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>{isAr ? "الاستطلاعات" : "Polls"}</span>
            </button>
            <button
              onClick={() => setActiveTab("notes")}
              className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                activeTab === "notes" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileEdit className="w-4 h-4" />
              <span>{isAr ? "المفكرة" : "Notes"}</span>
            </button>
            <button
              onClick={() => setActiveTab("users" as any)}
              className={`py-3 rounded-xl flex flex-col items-col justify-center gap-1 transition-all ${
                activeTab === ("users" as any) ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{isAr ? `الحضور` : `Users`}</span>
            </button>
          </div>

          {/* Panel Content Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* 1. Q&A View */}
            {activeTab === "qa" && (
              <div className="space-y-4 flex flex-col h-full">
                
                {/* Submit Question Form */}
                <form onSubmit={handleAddQuestion} className="flex gap-2">
                  <Input
                    placeholder={isAr ? "اسأل المدرب سؤالاً..." : "Ask a question..."}
                    value={newQuestion}
                    onChange={e => setNewQuestion(e.target.value)}
                    className="rounded-xl text-xs bg-background/50 h-9.5"
                  />
                  <Button type="submit" disabled={loadingQA} size="sm" className="rounded-xl h-9.5 shrink-0 px-3">
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </form>

                <div className="flex items-center justify-between text-[10px] font-extrabold text-muted-foreground border-b border-border/40 pb-2 mt-1">
                  <span>{isAr ? "الأسئلة الحالية" : "Questions list"}</span>
                  <button onClick={fetchQA} className="flex items-center gap-1 hover:text-primary">
                    <RefreshCw className="w-3 h-3" /> {isAr ? "تحديث" : "Sync"}
                  </button>
                </div>

                {/* Questions List */}
                <div className="space-y-2.5 flex-1 max-h-[300px] overflow-y-auto pr-1">
                  {qaList.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground font-semibold text-xs italic">
                      {isAr ? "لا توجد أسئلة مطروحة بعد." : "No questions asked yet."}
                    </div>
                  ) : (
                    qaList.map(item => (
                      <div key={item.id} className="p-3 rounded-xl border border-border/40 bg-background/40 flex flex-col gap-2 text-start relative group">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-[9.5px] font-black text-primary block">{item.userName}</span>
                            <p className="text-xs font-semibold text-foreground mt-0.5 leading-relaxed">{item.question}</p>
                          </div>
                          
                          {/* Vote count button */}
                          <button
                            onClick={() => handleVoteQuestion(item.id)}
                            className="flex flex-col items-center justify-center p-1 rounded-lg border border-border/40 hover:bg-primary/5 hover:border-primary/20 text-muted-foreground hover:text-primary transition-all shrink-0 min-w-8"
                          >
                            <ThumbsUp className="w-3 h-3" />
                            <span className="text-[9px] font-black mt-0.5">{item.votes}</span>
                          </button>
                        </div>

                        <div className="flex items-center justify-between border-t border-border/30 pt-1.5 mt-0.5">
                          <span className="text-[8.5px] text-muted-foreground font-semibold">
                            {new Date(item.createdAt).toLocaleTimeString(isAr ? "ar-EG" : "en-US", { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          
                          {item.isAnswered === 1 ? (
                            <Badge variant="outline" className="text-[8px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 py-0 px-1.5 rounded-md font-bold">
                              {isAr ? "تمت الإجابة" : "Answered"}
                            </Badge>
                          ) : (
                            isModerator && (
                              <button
                                onClick={() => handleMarkAnswered(item.id)}
                                className="text-[8.5px] font-black text-indigo-500 hover:text-indigo-600 flex items-center gap-0.5"
                              >
                                <CheckCircle className="w-3 h-3" />
                                <span>{isAr ? "إجابة لايف" : "Answer live"}</span>
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 2. Live Polls View */}
            {activeTab === "polls" && (
              <div className="space-y-4 text-start">
                
                {/* Moderator create poll form */}
                {isModerator && (
                  <form onSubmit={handleCreatePoll} className="p-3 rounded-2xl border border-primary/20 bg-primary/5 space-y-3">
                    <Label className="text-[10px] font-black text-primary block uppercase tracking-wider">{isAr ? "إنشاء استطلاع رأي جديد" : "Create Live Poll"}</Label>
                    
                    <Input
                      placeholder={isAr ? "السؤال المطروح..." : "Poll question..."}
                      value={newPollQuestion}
                      onChange={e => setNewPollQuestion(e.target.value)}
                      className="rounded-xl text-xs bg-background h-9"
                      required
                    />

                    <div className="space-y-1.5">
                      {pollOptions.map((opt, idx) => (
                        <div key={idx} className="flex gap-1.5 items-center">
                          <Input
                            placeholder={isAr ? `الخيار ${idx + 1}` : `Option ${idx + 1}`}
                            value={opt}
                            onChange={e => {
                              const copy = [...pollOptions];
                              copy[idx] = e.target.value;
                              setPollOptions(copy);
                            }}
                            className="rounded-xl text-xs bg-background h-8"
                            required={idx < 2}
                          />
                          {idx >= 2 && (
                            <button
                              type="button"
                              onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                              className="text-destructive hover:text-destructive/80"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPollOptions([...pollOptions, ""])}
                        className="rounded-xl text-[10px] h-8 flex-1 font-bold"
                        disabled={pollOptions.length >= 6}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        {isAr ? "إضافة خيار" : "Add Option"}
                      </Button>
                      
                      <Button
                        type="submit"
                        size="sm"
                        disabled={loadingPolls}
                        className="rounded-xl text-[10px] h-8 flex-1 font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        {loadingPolls ? "..." : (isAr ? "إطلاق الاستطلاع" : "Launch Poll")}
                      </Button>
                    </div>
                  </form>
                )}

                <div className="flex items-center justify-between text-[10px] font-extrabold text-muted-foreground border-b border-border/40 pb-2">
                  <span>{isAr ? "الاستطلاعات الحالية" : "Active Polls"}</span>
                  <button onClick={fetchPolls} className="flex items-center gap-1 hover:text-primary">
                    <RefreshCw className="w-3 h-3" /> {isAr ? "تحديث" : "Sync"}
                  </button>
                </div>

                {/* Polls List */}
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {polls.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground font-semibold text-xs italic">
                      {isAr ? "لا توجد استطلاعات نشطة." : "No active polls."}
                    </div>
                  ) : (
                    polls.map(p => {
                      const isClosed = p.isClosed === 1;
                      const hasVoted = p.userVotedOption !== null;

                      return (
                        <div key={p.id} className="p-3.5 rounded-xl border border-border/40 bg-background/40 space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-extrabold text-xs text-foreground leading-snug">{p.question}</h4>
                            <Badge 
                              variant="outline" 
                              className={`text-[8.5px] font-black rounded-md px-1.5 py-0 ${
                                isClosed 
                                  ? "border-slate-500/20 bg-slate-500/5 text-slate-500" 
                                  : "border-indigo-500/20 bg-indigo-500/5 text-indigo-500"
                              }`}
                            >
                              {isClosed ? (isAr ? "مغلق" : "Closed") : (isAr ? "نشط" : "Live")}
                            </Badge>
                          </div>

                          {/* Options display */}
                          <div className="space-y-2">
                            {p.options.map((opt, optIdx) => {
                              const voteCount = p.voteCounts?.[optIdx] || 0;
                              const percentage = p.totalVotes > 0 ? Math.round((voteCount / p.totalVotes) * 100) : 0;
                              const isThisUserVote = p.userVotedOption === optIdx;

                              return (
                                <div key={optIdx} className="space-y-1">
                                  {isClosed || hasVoted ? (
                                    /* Results view */
                                    <div className="space-y-1">
                                      <div className="flex justify-between items-center text-[10px] font-bold text-foreground">
                                        <span className="flex items-center gap-1">
                                          {opt}
                                          {isThisUserVote && <span className="text-[9px] text-emerald-600 bg-emerald-500/10 px-1 py-0 rounded font-black">{isAr ? "صوتك" : "My vote"}</span>}
                                        </span>
                                        <span className="text-muted-foreground">{voteCount} ({percentage}%)</span>
                                      </div>
                                      <Progress value={percentage} className="h-1.5 rounded-full" />
                                    </div>
                                  ) : (
                                    /* Vote interactive button */
                                    <button
                                      onClick={() => handleVotePoll(p.id, optIdx)}
                                      className="w-full text-left p-2.5 rounded-xl border border-border/60 hover:border-primary/40 bg-background/50 hover:bg-primary/5 text-xs font-semibold text-foreground flex items-center justify-between transition-all"
                                    >
                                      <span>{opt}</span>
                                      <Vote className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex items-center justify-between text-[9px] text-muted-foreground font-semibold pt-1 border-t border-border/30">
                            <span>{p.totalVotes} {isAr ? "صوت إجمالي" : "votes"}</span>
                            
                            {!isClosed && isModerator && (
                              <button
                                onClick={() => handleClosePoll(p.id)}
                                className="text-destructive hover:underline font-bold"
                              >
                                {isAr ? "إغلاق الاستطلاع" : "Close Poll"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* 3. Shared Notes View */}
            {activeTab === "notes" && (
              <div className="space-y-3 text-start flex flex-col h-full">
                <div className="flex justify-between items-center text-[10px] font-extrabold text-muted-foreground border-b border-border/40 pb-2">
                  <span>{isAr ? "المفكرة والملخصات المشتركة" : "Classroom Shared Notes"}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={fetchNotes} className="flex items-center gap-1 hover:text-primary">
                      <RefreshCw className="w-3 h-3" />
                    </button>
                    <button onClick={exportNotes} className="flex items-center gap-1 hover:text-primary">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <textarea
                  value={notesContent}
                  onChange={e => {
                    setNotesContent(e.target.value);
                    saveNotes(e.target.value);
                  }}
                  placeholder={isAr ? "اكتب هنا ملخصات المحاضرة والملاحظات الهامة لمشاركتها وحفظها..." : "Take down collaborative notes here..."}
                  className="w-full flex-1 min-h-[220px] bg-background/50 border border-border/60 rounded-xl p-3 text-xs text-foreground font-medium focus:outline-none focus:border-primary leading-relaxed resize-none"
                />

                <div className="flex items-center justify-between text-[9.5px] text-muted-foreground font-semibold">
                  <span>{savingNotes ? (isAr ? "جاري الحفظ..." : "Auto-saving...") : (isAr ? "تم الحفظ تلقائياً" : "All changes saved")}</span>
                  <button
                    onClick={exportNotes}
                    className="flex items-center gap-1 text-primary hover:underline font-bold"
                  >
                    <Download className="w-3 h-3" />
                    <span>{isAr ? "تنزيل الملاحظات (.txt)" : "Export notes"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* 4. Participants List View */}
            {activeTab === ("users" as any) && (
              <div className="space-y-3 text-start flex flex-col h-full">
                <div className="flex justify-between items-center text-[10px] font-extrabold text-muted-foreground border-b border-border/40 pb-2">
                  <span>{isAr ? "الحضور والمشاركون في البث" : "Live Participants"}</span>
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[9px] font-bold">
                    {participants.length} {isAr ? "نشط" : "active"}
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                  {participants.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground font-semibold text-xs italic">
                      {isAr ? "جاري جلب قائمة المشاركين..." : "Fetching participants..."}
                    </div>
                  ) : (
                    participants.map((p: any) => {
                      const isHandRaised = raisedHands[p.user_id] || raisedHands[p.session_id];
                      const isMicOn = p.audio;
                      const isCamOn = p.video;
                      const isLocal = p.local;
                      
                      const canSendList = p.permissions?.canSend as any;
                      const hasAudioPermission = (canSendList === true || canSendList === "*" || canSendList === undefined)
                        ? true
                        : (canSendList instanceof Set)
                          ? canSendList.has("audio")
                          : Array.isArray(canSendList)
                            ? canSendList.includes("audio")
                            : false;

                      const hasVideoPermission = (canSendList === true || canSendList === "*" || canSendList === undefined)
                        ? true
                        : (canSendList instanceof Set)
                          ? canSendList.has("video")
                          : Array.isArray(canSendList)
                            ? canSendList.includes("video")
                            : false;

                      const hasScreenPermission = (canSendList === true || canSendList === "*" || canSendList === undefined)
                        ? true
                        : (canSendList instanceof Set)
                          ? canSendList.has("screenVideo")
                          : Array.isArray(canSendList)
                            ? canSendList.includes("screenVideo")
                            : false;

                      return (
                        <div key={p.session_id} className="flex items-center justify-between p-2.5 rounded-xl border border-border/45 bg-background/40 hover:bg-background/85 transition-all">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-[10px] font-bold shrink-0">
                              {p.user_name ? p.user_name.slice(0, 2).toUpperCase() : "TR"}
                            </div>
                            <div className="text-start">
                              <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                                <span className="line-clamp-1">{p.user_name || (isAr ? "متدرب" : "Trainee")}</span>
                                {isLocal && <span className="text-[8px] bg-indigo-500/10 text-indigo-500 font-black rounded px-1">{isAr ? "أنت" : "You"}</span>}
                                {p.owner && <span className="text-[8px] bg-amber-500/10 text-amber-500 font-black rounded px-1">{isAr ? "المنسق" : "Host"}</span>}
                              </h4>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Hand Raise indicator */}
                            {isHandRaised && (
                              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center animate-bounce" title={isAr ? "يد مرفوعة" : "Hand Raised"}>
                                <Hand className="w-3.5 h-3.5" />
                              </div>
                            )}

                            {/* Mic Status / Toggle Button */}
                            {isModerator && !isLocal ? (
                              <button
                                onClick={() => toggleParticipantAudioPermission(p.session_id, hasAudioPermission)}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all hover:scale-105 active:scale-95 ${
                                  hasAudioPermission 
                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/25' 
                                    : 'bg-destructive/15 border-destructive/30 text-destructive hover:bg-destructive/25'
                                }`}
                                title={hasAudioPermission ? (isAr ? "كتم وحظر المايك" : "Mute and lock mic") : (isAr ? "السماح بالمايك" : "Allow mic")}
                              >
                                {hasAudioPermission ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                              </button>
                            ) : (
                              <div 
                                className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
                                  isMicOn 
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' 
                                    : 'bg-destructive/10 border-destructive/20 text-destructive'
                                }`} 
                                title={isMicOn ? (isAr ? "المايك يعمل" : "Mic On") : (isAr ? "المايك مغلق" : "Mic Muted")}
                              >
                                {isMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                              </div>
                            )}

                            {/* Camera Status / Toggle Button */}
                            {isModerator && !isLocal ? (
                              <button
                                onClick={() => toggleParticipantCameraPermission(p.session_id, hasVideoPermission)}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all hover:scale-105 active:scale-95 ${
                                  hasVideoPermission 
                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/25' 
                                    : 'bg-destructive/15 border-destructive/30 text-destructive hover:bg-destructive/25'
                                }`}
                                title={hasVideoPermission ? (isAr ? "إغلاق وحظر الكاميرا" : "Close and lock camera") : (isAr ? "السماح بالكاميرا" : "Allow camera")}
                              >
                                {hasVideoPermission ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                              </button>
                            ) : (
                              <div 
                                className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
                                  isCamOn 
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' 
                                    : 'bg-destructive/10 border-destructive/20 text-destructive'
                                }`} 
                                title={isCamOn ? (isAr ? "الكاميرا تعمل" : "Cam On") : (isAr ? "الكاميرا مغلقة" : "Cam Off")}
                              >
                                {isCamOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                              </div>
                            )}

                            {/* Screen Share Status / Toggle Button */}
                            {isModerator && !isLocal ? (
                              <button
                                onClick={() => toggleParticipantScreenPermission(p.session_id, hasScreenPermission)}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all hover:scale-105 active:scale-95 ${
                                  hasScreenPermission 
                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/25' 
                                    : 'bg-destructive/15 border-destructive/30 text-destructive hover:bg-destructive/25'
                                }`}
                                title={hasScreenPermission ? (isAr ? "إغلاق وحظر مشاركة الشاشة" : "Lock screen share") : (isAr ? "السماح بمشاركة الشاشة" : "Allow screen share")}
                              >
                                <Monitor className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <div 
                                className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
                                  p.screen 
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' 
                                    : 'bg-destructive/10 border-destructive/20 text-destructive'
                                }`} 
                                title={p.screen ? (isAr ? "مشاركة الشاشة مفعلة" : "Screen Sharing On") : (isAr ? "مشاركة الشاشة مغلقة" : "Screen Sharing Off")}
                              >
                                <Monitor className="w-3.5 h-3.5" />
                              </div>
                            )}

                            {/* Kick Button (Only Moderator, not self) */}
                            {isModerator && !isLocal && (
                              <button
                                onClick={() => {
                                  const confirmKick = window.confirm(
                                    isAr 
                                      ? `هل أنت متأكد من طرد ${p.user_name || "المتدرب"} من البث المباشر؟` 
                                      : `Are you sure you want to kick ${p.user_name || "Trainee"} from the stream?`
                                  );
                                  if (!confirmKick) return;
                                  callFrame?.updateParticipant(p.session_id, { eject: true });
                                  toast({
                                    title: isAr ? "طرد مشارك" : "Kick Participant",
                                    description: isAr ? `تم طرد ${p.user_name || "المتدرب"} من القاعة.` : `Kicked ${p.user_name || "Trainee"} from the classroom.`,
                                    variant: "destructive"
                                  });
                                }}
                                className="w-7 h-7 rounded-lg flex items-center justify-center border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/25 transition-all hover:scale-105 active:scale-95"
                                title={isAr ? "طرد من البث" : "Kick from stream"}
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Guidelines footer */}
      <div className="p-4 rounded-2xl border border-border/55 bg-card/45 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-start">
          <h4 className="font-bold text-xs text-foreground">{isAr ? "معايير تتبع الحضور والتفاعل الصفّي" : "Classroom Engagement & Attendance"}</h4>
          <p className="text-[10.5px] text-muted-foreground font-medium mt-1 leading-relaxed">
            {isAr 
              ? "يتم تتبع تواجدك وتفاعلك مع الأنشطة (الاستطلاعات والأسئلة) تلقائياً. تأكد من المشاركة الفعالة لرفع تقييم الحضور المؤهل للشهادة."
              : "Your presence and activity (polls/QA) are tracked dynamically. High engagement ensures seamless certificate endorsement."}
          </p>
        </div>
      </div>
    </div>
  );
}
