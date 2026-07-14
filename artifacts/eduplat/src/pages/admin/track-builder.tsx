import { useState, useEffect, useRef } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useGetTrack, getGetTrackQueryKey } from "@workspace/api-client-react";
import {
  ArrowLeft, BookOpen, Video, Code, FileText, PlusCircle, Save,
  Clock, Trash2, ArrowUp, ArrowDown, ChevronRight, Play, UploadCloud,
  FileVideo, Settings, Sparkles, Terminal, CheckCircle2, AlertTriangle,
  HelpCircle, Eye, Edit3, Plus, Check, RefreshCw, Layers, BookMarked, Code2, Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/components/layout/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

/* ─── Interfaces ─────────────────────────────────────────────────────────────── */
type Level = "beginner" | "intermediate" | "advanced";
type ModuleType = "lesson" | "video" | "exercise" | "quiz";

interface TrackModule {
  id: number;
  trackId: number;
  title: string;
  description: string;
  type: ModuleType;
  content?: string | null;
  order: number;
  estimatedMinutes: number;
}

interface Track {
  id: number;
  slug: string;
  title: string;
  description: string;
  category: string;
  level: string;
  iconUrl?: string | null;
  moduleCount: number;
  estimatedHours: number;
}

/* Zod schemas for activity details stored in modules content JSON */
interface QuizQuestion {
  id: string;
  question: string;
  type: "mcq" | "tf" | "short";
  options: string[];
  correctIndex: number;
  correctText?: string;
  points: number;
}

interface QuizContent {
  questions: QuizQuestion[];
  passingPercentage: number;
  timeLimitSeconds: number;
}

interface VideoContent {
  sourceType: "upload" | "url";
  videoUrl: string;
  fileName?: string;
  fileSize?: string;
}

interface ExerciseContent {
  language: "javascript" | "python" | "html" | "css";
  starterTemplate: string;
  solution: string;
  testCases: { input: string; expected: string }[];
}

/* ─── API Helper ─────────────────────────────────────────────────────────────── */
const api = async (path: string, method = "GET", body?: unknown) => {
  const token = localStorage.getItem("mharat-token");
  const headers: Record<string, string> = {};
  if (body) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  if (res.status === 204) return null;
  return res.json();
};

export default function AdminTrackBuilderPage() {
  const [, params] = useRoute("/admin/tracks/:id");
  const trackId = params?.id ? parseInt(params.id, 10) : NaN;
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [track, setTrack] = useState<Track | null>(null);
  const [modules, setModules] = useState<TrackModule[]>([]);
  const [trackLoading, setTrackLoading] = useState(true);

  // Selected module state
  const [selectedModId, setSelectedModId] = useState<number | null>(null);
  const [selectedMod, setSelectedMod] = useState<TrackModule | null>(null);
  const [activeTab, setActiveTab] = useState<"content" | "settings">("content");

  // Track settings form
  const [trackForm, setTrackForm] = useState({
    title: "", slug: "", description: "", category: "", level: "beginner", estimatedHours: "10", iconUrl: "", instructorId: "none", price: "0",
    certType: "track", certLevel: "3", certCost: "250",
  });
  const [instructors, setInstructors] = useState<any[]>([]);
  const [trackSaving, setTrackSaving] = useState(false);

  // Module details form state
  const [modTitle, setModTitle] = useState("");
  const [modDesc, setModDesc] = useState("");
  const [modType, setModType] = useState<ModuleType>("lesson");
  const [modMinutes, setModMinutes] = useState(15);
  const [modSaving, setModSaving] = useState(false);

  // Markdown Editor text (for lessons)
  const [lessonContent, setLessonContent] = useState("");

  // Video uploader state
  const [videoConfig, setVideoConfig] = useState<VideoContent>({ sourceType: "url", videoUrl: "" });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadQuality, setUploadQuality] = useState<"low" | "medium" | "high">("medium");

  // Quiz Builder state
  const [quizConfig, setQuizConfig] = useState<QuizContent>({ questions: [], passingPercentage: 70, timeLimitSeconds: 600 });
  const [selectedQuizQuestionIdx, setSelectedQuizQuestionIdx] = useState<number | null>(null);

  // Code Exercise state
  const [exerciseConfig, setExerciseConfig] = useState<ExerciseContent>({ language: "javascript", starterTemplate: "", solution: "", testCases: [] });
  const [runLogs, setRunLogs] = useState<string[]>([]);
  const [runningTests, setRunningTests] = useState(false);

  /* ── Fetch Track Data ── */
  const fetchData = async () => {
    if (isNaN(trackId)) return;
    setTrackLoading(true);
    try {
      const trackData = await api(`/tracks`);
      const target = trackData.find((t: Track) => t.id === trackId);
      if (!target) {
        toast({ variant: "destructive", title: isAr ? "غير موجود" : "Not Found" });
        setLocation("/admin/tracks");
        return;
      }
      setTrack(target);
      try {
        const usersData = await api("/users");
        setInstructors((usersData ?? []).filter((u: any) => u.role === "instructor"));
      } catch (err) {
        console.error("Failed to load instructors", err);
      }
      setTrackForm({
        title: target.title,
        slug: target.slug,
        description: target.description,
        category: target.category,
        level: target.level,
        estimatedHours: String(target.estimatedHours),
        iconUrl: target.iconUrl ?? "",
        instructorId: target.instructorId ? String(target.instructorId) : "none",
        price: String(target.price ?? 0),
        certType: target.certType ?? "track",
        certLevel: String(target.certLevel ?? 3),
        certCost: String(target.certCost ?? 250),
      });

      const modulesData = await api(`/tracks/${trackId}/modules`);
      const sorted = (modulesData ?? []).sort((a: TrackModule, b: TrackModule) => a.order - b.order);
      setModules(sorted);
      
      // Select first module automatically
      if (sorted.length > 0) {
        selectModule(sorted[0]);
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error fetching data", description: e.message });
    } finally {
      setTrackLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [trackId]);

  /* ── Select Module Handler ── */
  const selectModule = (m: TrackModule) => {
    setSelectedModId(m.id);
    setSelectedMod(m);
    setModTitle(m.title);
    setModDesc(m.description);
    setModType(m.type);
    setModMinutes(m.estimatedMinutes);

    // Parse structured content JSON
    const rawContent = m.content || "";
    if (m.type === "lesson") {
      setLessonContent(rawContent);
    } else if (m.type === "video") {
      try {
        const parsed = JSON.parse(rawContent);
        setVideoConfig(parsed || { sourceType: "url", videoUrl: "" });
      } catch {
        setVideoConfig({ sourceType: "url", videoUrl: rawContent });
      }
    } else if (m.type === "quiz") {
      try {
        const parsed = JSON.parse(rawContent);
        setQuizConfig(parsed || { questions: [], passingPercentage: 70, timeLimitSeconds: 600 });
        setSelectedQuizQuestionIdx((parsed?.questions?.length ?? 0) > 0 ? 0 : null);
      } catch {
        setQuizConfig({ questions: [], passingPercentage: 70, timeLimitSeconds: 600 });
        setSelectedQuizQuestionIdx(null);
      }
    } else if (m.type === "exercise") {
      try {
        const parsed = JSON.parse(rawContent);
        setExerciseConfig(parsed || { language: "javascript", starterTemplate: "", solution: "", testCases: [] });
      } catch {
        setExerciseConfig({ language: "javascript", starterTemplate: rawContent, solution: "", testCases: [] });
      }
      setRunLogs([]);
    }

    setTimeout(() => {
      const el = document.getElementById("module-workspace");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  /* ── Track Settings Update ── */
  const handleSaveTrack = async () => {
    if (!track) return;
    setTrackSaving(true);
    try {
      const payload = {
        title: trackForm.title.trim(),
        slug: trackForm.slug.trim(),
        description: trackForm.description.trim(),
        category: trackForm.category.trim(),
        level: trackForm.level,
        estimatedHours: parseInt(trackForm.estimatedHours, 10) || 0,
        iconUrl: trackForm.iconUrl.trim() || null,
        instructorId: trackForm.instructorId === "none" ? null : parseInt(trackForm.instructorId, 10),
        price: parseInt(trackForm.price, 10) || 0,
        certType: trackForm.certType,
        certLevel: parseInt(trackForm.certLevel, 10) || 3,
        certCost: parseInt(trackForm.certCost, 10) || 0,
      };
      const updated = await api(`/tracks/${track.id}`, "PUT", payload);
      setTrack(updated);
      queryClient.invalidateQueries({ queryKey: getGetTrackQueryKey(track.slug) });
      toast({ title: isAr ? "✅ تم الحفظ" : "✅ Track settings saved" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error saving track", description: e.message });
    } finally {
      setTrackSaving(false);
    }
  };

  /* ── Module General Updates ── */
  const handleSaveModule = async () => {
    if (!selectedMod || !track) return;
    setModSaving(true);
    try {
      let finalContent = "";
      if (modType === "lesson") {
        finalContent = lessonContent;
      } else if (modType === "video") {
        finalContent = JSON.stringify(videoConfig);
      } else if (modType === "quiz") {
        finalContent = JSON.stringify(quizConfig);
      } else if (modType === "exercise") {
        finalContent = JSON.stringify(exerciseConfig);
      }

      const payload = {
        title: modTitle.trim(),
        description: modDesc.trim(),
        type: modType,
        estimatedMinutes: modMinutes,
        content: finalContent,
      };

      const updated = await api(`/modules/${selectedMod.id}`, "PUT", payload);
      
      setModules(prev => prev.map(m => m.id === selectedMod.id ? { ...m, ...updated } : m));
      setSelectedMod(prev => prev ? { ...prev, ...updated } : null);
      
      toast({ title: isAr ? "✅ تم حفظ التغييرات بنجاح" : "✅ Module workspace saved" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error saving workspace", description: e.message });
    } finally {
      setModSaving(false);
    }
  };

  /* ── Add New Module ── */
  const handleCreateModule = async (type: ModuleType) => {
    if (!track) return;
    try {
      const payload = {
        title: isAr ? `وحدة جديدة (${type})` : `New ${type} module`,
        description: isAr ? "أضف وصفاً لهذه الوحدة هنا" : "Enter description here",
        type,
        estimatedMinutes: 15,
        order: modules.length + 1,
        content: type === "quiz" ? JSON.stringify({ questions: [], passingPercentage: 70, timeLimitSeconds: 600 }) : ""
      };
      const created = await api(`/tracks/${track.id}/modules`, "POST", payload);
      setModules(prev => [...prev, created]);
      selectModule(created);
      toast({ title: isAr ? "🎉 تم إنشاء الوحدة بنجاح" : "🎉 Module created" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error creating module", description: e.message });
    }
  };

  /* ── Delete Module ── */
  const handleDeleteModule = async (id: number) => {
    if (!confirm(isAr ? "هل أنت متأكد من حذف هذه الوحدة؟" : "Are you sure you want to delete this module?")) return;
    try {
      await api(`/modules/${id}`, "DELETE");
      setModules(prev => prev.filter(m => m.id !== id));
      if (selectedModId === id) {
        setSelectedModId(null);
        setSelectedMod(null);
      }
      toast({ title: isAr ? "🗑️ تم الحذف" : "🗑️ Module deleted" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error deleting", description: e.message });
    }
  };

  /* ── Reordering Modules ── */
  const handleMoveModule = async (mod: TrackModule, direction: "up" | "down") => {
    const sorted = [...modules].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(m => m.id === mod.id);
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    
    if (targetIdx < 0 || targetIdx >= sorted.length) return;
    const targetMod = sorted[targetIdx];

    // Swap orders
    const oldOrder = mod.order;
    const newOrder = targetMod.order;

    try {
      await Promise.all([
        api(`/modules/${mod.id}`, "PUT", { order: newOrder }),
        api(`/modules/${targetMod.id}`, "PUT", { order: oldOrder }),
      ]);
      
      setModules(prev => prev.map(m => {
        if (m.id === mod.id) return { ...m, order: newOrder };
        if (m.id === targetMod.id) return { ...m, order: oldOrder };
        return m;
      }).sort((a, b) => a.order - b.order));
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to reorder", description: e.message });
    }
  };

  /* ── Video Upload to R2 ── */
  const simulateVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setUploadProgress(30);

      const token = localStorage.getItem("mharat-token");
      const res = await fetch("/api/upload/video", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          file: base64,
          fileName: file.name,
          folder: `eduplat/tracks/${track?.slug || "general"}`,
          quality: uploadQuality,
        }),
      });

      setUploadProgress(90);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || err.details || "Upload failed");
      }

      const data = await res.json();
      setUploadProgress(100);

      setVideoConfig({
        sourceType: "upload",
        videoUrl: data.url,
        fileName: file.name,
        fileSize: (file.size / (1024 * 1024)).toFixed(2) + " MB",
      });
      toast({ title: isAr ? "تم رفع الفيديو بنجاح" : "Video uploaded successfully", description: data.compressed ? `${data.compressed.originalSize > 1024*1024 ? (data.compressed.originalSize/(1024*1024)).toFixed(1) : (data.compressed.originalSize/1024).toFixed(0)}MB → ${(data.compressed.compressedSize/(1024*1024)).toFixed(1)}MB (${data.compressed.ratio} saved)` : undefined });
    } catch (err: any) {
      toast({ variant: "destructive", title: isAr ? "فشل رفع الفيديو" : "Video upload failed", description: err.message });
    } finally {
      setUploading(false);
    }
  };

  /* ── Quiz Builder Actions ── */
  const handleAddQuizQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: "q-" + Date.now(),
      question: isAr ? "عنوان السؤال الجديد؟" : "New Question Title?",
      type: "mcq",
      options: [
        isAr ? "الخيار الأول" : "Option 1",
        isAr ? "الخيار الثاني" : "Option 2"
      ],
      correctIndex: 0,
      points: 10
    };
    const updatedQs = [...quizConfig.questions, newQuestion];
    setQuizConfig(prev => ({ ...prev, questions: updatedQs }));
    setSelectedQuizQuestionIdx(updatedQs.length - 1);
  };

  const handleUpdateQuizQuestion = (idx: number, updated: Partial<QuizQuestion>) => {
    const questions = [...quizConfig.questions];
    questions[idx] = { ...questions[idx], ...updated } as QuizQuestion;
    setQuizConfig(prev => ({ ...prev, questions }));
  };

  const handleDeleteQuizQuestion = (idx: number) => {
    const questions = quizConfig.questions.filter((_, i) => i !== idx);
    setQuizConfig(prev => ({ ...prev, questions }));
    setSelectedQuizQuestionIdx(questions.length > 0 ? 0 : null);
  };

  /* ── Exercise Builder - Mock Runner ── */
  const handleRunTestsSimulation = () => {
    setRunningTests(true);
    setRunLogs([
      "🚀 Starting compiler test runner...",
      `📦 Setting up environment for: ${exerciseConfig.language.toUpperCase()}`,
      "🔍 Validating starter template compatibility...",
      "🛠️ Merging test code with correct solution...",
    ]);

    setTimeout(() => {
      setRunLogs(prev => [...prev, "🧬 Running 3 automated validation tests..."]);
    }, 800);

    setTimeout(() => {
      setRunLogs(prev => [
        ...prev,
        "🧪 Test 1: starter configuration check: PASSED ✅",
        "🧪 Test 2: boundary parameters evaluation: PASSED ✅",
        "🧪 Test 3: output alignment verification: PASSED ✅",
        "🎉 SUCCESS: All tests passed successfully!"
      ]);
      setRunningTests(false);
    }, 1800);
  };

  if (trackLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Skeleton className="lg:col-span-4 h-96 rounded-2xl" />
            <Skeleton className="lg:col-span-8 h-96 rounded-2xl" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!track) return null;

  return (
    <AppLayout>
      {/* ── Top Nav Header ── */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/admin/tracks" className="p-2.5 rounded-xl border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground transition-all">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight">{track.title}</h1>
              <Badge variant="outline" className="text-xs text-muted-foreground">{track.category}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{isAr ? "بيئة العمل لبناء وإدارة المسار التعليمي" : "Workspace for designing & building the path"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedMod && (
            <Button onClick={handleSaveModule} disabled={modSaving} className="rounded-xl gap-1.5 shadow-md shadow-primary/20" data-testid="button-workspace-save">
              {modSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isAr ? "حفظ العمل الحالي" : "Save Current Work"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ════════════════════════════════════════════════════════
            Left Panel: Module List & Path Settings Navigation
        ════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-4 space-y-4">
          {/* Tabs for modules list vs track configuration */}
          <div className="p-1 bg-muted rounded-xl grid grid-cols-2">
            <button
              onClick={() => setActiveTab("content")}
              className={`py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "content" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              {isAr ? "منهج الوحدات" : "Path Curriculum"}
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "settings" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              {isAr ? "إعدادات المسار" : "Track Settings"}
            </button>
          </div>

          {activeTab === "content" ? (
            <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase">{isAr ? "الوحدات والأنشطة" : "Modules & Activities"}</span>
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-bold">{modules.length}</span>
              </div>

              {/* Module cards list */}
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {modules.map((mod, idx) => {
                  const isActive = selectedModId === mod.id;
                  const cfg = MODULE_TYPE_CONFIG[mod.type];
                  const Icon = cfg?.icon || BookOpen;
                  return (
                    <div
                      key={mod.id}
                      onClick={() => selectModule(mod)}
                      className={`group p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                        isActive ? "border-primary/50 bg-primary/5" : "border-border/50 hover:border-primary/20 hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-5 h-5 rounded-lg bg-muted text-[10px] font-bold flex items-center justify-center text-muted-foreground flex-shrink-0">
                          {idx + 1}
                        </span>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg?.bg || "bg-muted"}`}>
                          <Icon className={`w-4 h-4 ${cfg?.color || "text-muted-foreground"}`} />
                        </div>
                        <div className="min-w-0">
                          <p className={`font-semibold text-xs truncate ${isActive ? "text-primary" : "text-foreground"}`}>{mod.title}</p>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="w-2.5 h-2.5" /> {mod.estimatedMinutes} {isAr ? "دقيقة" : "min"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMoveModule(mod, "up"); }}
                          disabled={idx === 0}
                          className="p-1 rounded hover:bg-muted disabled:opacity-30"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMoveModule(mod, "down"); }}
                          disabled={idx === modules.length - 1}
                          className="p-1 rounded hover:bg-muted disabled:opacity-30"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteModule(mod.id); }}
                          className="p-1 rounded hover:bg-destructive/10 text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Add Module buttons */}
              <div className="pt-3 border-t border-border/50">
                <span className="text-[10px] font-bold text-muted-foreground block mb-2">{isAr ? "إضافة وحدة تعليمية سريعة:" : "Quick add module:"}</span>
                <div className="grid grid-cols-2 gap-2">
                  {(["lesson", "video", "exercise", "quiz"] as ModuleType[]).map(type => {
                    const cfg = MODULE_TYPE_CONFIG[type];
                    const Icon = cfg.icon;
                    return (
                      <Button
                        key={type}
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreateModule(type)}
                        className="rounded-xl justify-start gap-2 text-xs border-border/60 hover:bg-accent/40"
                      >
                        <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                        <span>{isAr ? cfg.labelAr : cfg.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
              <h3 className="font-bold text-sm border-b border-border/50 pb-2">{isAr ? "تحديث إعدادات المسار" : "Update Track Info"}</h3>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">{isAr ? "العنوان" : "Title"}</Label>
                  <Input value={trackForm.title} onChange={e => setTrackForm(prev => ({ ...prev, title: e.target.value }))} className="rounded-xl text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">{isAr ? "المعرف الفريد (Slug)" : "Slug"}</Label>
                  <Input value={trackForm.slug} onChange={e => setTrackForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^\p{L}\p{N}-]/gu, "") }))} className="rounded-xl text-xs font-mono" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">{isAr ? "وصف المسار" : "Description"}</Label>
                  <Textarea value={trackForm.description} onChange={e => setTrackForm(prev => ({ ...prev, description: e.target.value }))} className="rounded-xl text-xs min-h-[70px] resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">{isAr ? "المستوى" : "Level"}</Label>
                    <Select value={trackForm.level} onValueChange={v => setTrackForm(prev => ({ ...prev, level: v }))}>
                      <SelectTrigger className="rounded-xl text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">{isAr ? "مبتدئ" : "Beginner"}</SelectItem>
                        <SelectItem value="intermediate">{isAr ? "متوسط" : "Intermediate"}</SelectItem>
                        <SelectItem value="advanced">{isAr ? "متقدم" : "Advanced"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">{isAr ? "الساعات التقديرية" : "Estimated Hours"}</Label>
                    <Input type="number" value={trackForm.estimatedHours} onChange={e => setTrackForm(prev => ({ ...prev, estimatedHours: e.target.value }))} className="rounded-xl text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">{isAr ? "السعر (نقاط)" : "Price (points)"}</Label>
                    <Input type="number" min="0" value={trackForm.price} onChange={e => setTrackForm(prev => ({ ...prev, price: e.target.value }))} className="rounded-xl text-xs" placeholder="0 = مجاني" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">{isAr ? "معلم المسار / المدرب" : "Track Instructor"}</Label>
                  <Select value={trackForm.instructorId} onValueChange={v => setTrackForm(prev => ({ ...prev, instructorId: v }))}>
                    <SelectTrigger className="rounded-xl text-xs">
                      <SelectValue placeholder={isAr ? "اختر المعلم" : "Select instructor"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{isAr ? "بلا معلم" : "No Instructor"}</SelectItem>
                      {instructors.map(ins => (
                        <SelectItem key={ins.id} value={String(ins.id)}>{ins.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Certificate Configuration */}
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3 mt-2">
                  <div className="flex items-center gap-2 border-b border-primary/10 pb-2">
                    <Award className="w-4 h-4 text-primary" />
                    <Label className="text-xs font-extrabold text-foreground">{isAr ? "إعدادات شهادة إتمام المسار" : "Track Completion Certificate"}</Label>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    {isAr ? "تُمنح الشهادة تلقائياً للطلاب عند إكمال جميع وحدات المسار." : "Certificate is auto-issued when students complete all track modules."}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">{isAr ? "نوع الشهادة" : "Certificate Type"}</Label>
                      <Select value={trackForm.certType} onValueChange={v => setTrackForm(prev => ({ ...prev, certType: v }))}>
                        <SelectTrigger className="rounded-xl text-xs h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="track">{isAr ? "شهادة مسار تعليمي" : "Learning Track Certificate"}</SelectItem>
                          <SelectItem value="participation">{isAr ? "شهادة حضور ومشاركة" : "Participation Certificate"}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">{isAr ? "مستوى الشهادة" : "Certificate Level"}</Label>
                      <Select value={trackForm.certLevel} onValueChange={v => setTrackForm(prev => ({ ...prev, certLevel: v }))}>
                        <SelectTrigger className="rounded-xl text-xs h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">{isAr ? "المستوى 1 — حضور ومشاركة" : "Level 1 — Participation"}</SelectItem>
                          <SelectItem value="2">{isAr ? "المستوى 2 — أخصائي محترف" : "Level 2 — Professional"}</SelectItem>
                          <SelectItem value="3">{isAr ? "المستوى 3 — خبير متخصص" : "Level 3 — Expert"}</SelectItem>
                          <SelectItem value="4">{isAr ? "المستوى 4 — خبير متقدم" : "Level 4 — Master"}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">{isAr ? "تكلفة الاحتفاظ (نقاط)" : "Claim Cost (points)"}</Label>
                      <Input
                        type="number" min="0"
                        value={trackForm.certCost}
                        onChange={e => setTrackForm(prev => ({ ...prev, certCost: e.target.value }))}
                        className="rounded-xl text-xs h-9"
                        placeholder="0 = مجاني"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveTrack} disabled={trackSaving} className="w-full rounded-xl gap-2 mt-2">
                {trackSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isAr ? "حفظ التغييرات" : "Save Track Details"}
              </Button>
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════
            Right Panel: High-Fidelity Module Workspace IDE
        ════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-8" id="module-workspace">
          {selectedMod ? (
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              {/* Module Builder Header Panel */}
              <div className="p-5 border-b border-border/50 bg-muted/20 space-y-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge className={`${MODULE_TYPE_CONFIG[modType]?.bg} ${MODULE_TYPE_CONFIG[modType]?.color} border-0 text-[10px] uppercase font-bold`}>
                        {isAr ? MODULE_TYPE_CONFIG[modType]?.labelAr : MODULE_TYPE_CONFIG[modType]?.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">ID: #{selectedMod.id}</span>
                    </div>
                    <Input
                      value={modTitle}
                      onChange={e => setModTitle(e.target.value)}
                      className="font-bold text-lg border-transparent hover:border-border/60 focus:border-primary/50 bg-transparent px-0 focus:px-3 rounded-xl transition-all h-9"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-card border px-3 py-1.5 rounded-xl">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        type="number"
                        min="1"
                        value={modMinutes}
                        onChange={e => setModMinutes(parseInt(e.target.value, 10) || 15)}
                        className="w-12 h-6 border-0 p-0 text-center font-bold text-xs bg-transparent"
                      />
                      <span className="text-xs text-muted-foreground">{isAr ? "دقيقة" : "min"}</span>
                    </div>
                    <Button variant="ghost" onClick={() => handleDeleteModule(selectedMod.id)} className="rounded-xl text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Textarea
                  value={modDesc}
                  onChange={e => setModDesc(e.target.value)}
                  placeholder={isAr ? "أضف ملخصًا أو وصفًا سريعًا لهذه الوحدة..." : "Write a brief description or summary of this module..."}
                  className="rounded-xl text-xs bg-transparent border-transparent hover:border-border/40 focus:border-primary/40 focus:bg-card p-0 focus:p-3 min-h-[40px] resize-none transition-all leading-normal"
                />
              </div>

              {/* ── Workspace Area by Type ── */}
              <div className="p-6">
                
                {/* 📘 1. Lesson Workspace (Markdown Editor + Live Preview) */}
                {modType === "lesson" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                        <Edit3 className="w-4 h-4 text-blue-500" />
                        {isAr ? "محرر محتوى الدرس (Markdown)" : "Markdown Content Editor"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Editor */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground">{isAr ? "المحرر" : "Editor"}</Label>
                        <Textarea
                          value={lessonContent}
                          onChange={e => setLessonContent(e.target.value)}
                          placeholder={isAr ? "اكتب هنا بصيغة Markdown..." : "Write content here in Markdown format..."}
                          className="font-mono text-sm min-h-[350px] rounded-xl border-border/60 focus:border-primary/50"
                        />
                      </div>
                      {/* Live Preview */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" /> {isAr ? "معاينة حية للمحتوى" : "Live Rendered Preview"}
                        </Label>
                        <div className="min-h-[350px] max-h-[450px] overflow-y-auto rounded-xl border border-border/60 bg-muted/10 p-4 text-start prose prose-sm dark:prose-invert">
                          {lessonContent ? (
                            <div className="space-y-3 leading-relaxed">
                              {lessonContent.split("\n").map((line, idx) => {
                                if (line.startsWith("# ")) return <h1 key={idx} className="text-xl font-bold border-b pb-1 mt-2 text-foreground">{line.replace("# ", "")}</h1>;
                                if (line.startsWith("## ")) return <h2 key={idx} className="text-lg font-bold mt-2 text-foreground">{line.replace("## ", "")}</h2>;
                                if (line.startsWith("### ")) return <h3 key={idx} className="text-md font-bold mt-2 text-foreground">{line.replace("### ", "")}</h3>;
                                if (line.startsWith("- ")) return <li key={idx} className="text-sm list-disc pl-2 ml-4 text-muted-foreground">{line.replace("- ", "")}</li>;
                                if (line.startsWith("> ")) return <div key={idx} className="border-l-4 border-primary bg-primary/5 p-2 rounded text-xs italic my-2">{line.replace("> ", "")}</div>;
                                return <p key={idx} className="text-sm text-muted-foreground">{line}</p>;
                              })}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">{isAr ? "المعاينة ستظهر هنا..." : "Live preview shows here..."}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 🎥 2. Video Workspace (Simulated Drag-and-Drop Uploader & Embedder) */}
                {modType === "video" && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 bg-muted/40 p-1.5 rounded-xl max-w-sm">
                      <button
                        onClick={() => setVideoConfig(prev => ({ ...prev, sourceType: "url" }))}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${videoConfig.sourceType === "url" ? "bg-card shadow text-foreground" : "text-muted-foreground"}`}
                      >
                        {isAr ? "رابط فيديو خارجي" : "External URL"}
                      </button>
                      <button
                        onClick={() => setVideoConfig(prev => ({ ...prev, sourceType: "upload" }))}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${videoConfig.sourceType === "upload" ? "bg-card shadow text-foreground" : "text-muted-foreground"}`}
                      >
                        {isAr ? "رفع ملف فيديو" : "Upload File"}
                      </button>
                    </div>

                    {videoConfig.sourceType === "url" ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold">{isAr ? "رابط الفيديو (Direct Link, YouTube, Vimeo)" : "Video URL"}</Label>
                          <Input
                            value={videoConfig.videoUrl}
                            onChange={e => setVideoConfig(prev => ({ ...prev, videoUrl: e.target.value }))}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="rounded-xl border-border/60"
                          />
                        </div>
                        {videoConfig.videoUrl && (
                          <div className="rounded-xl overflow-hidden border border-border/60 bg-muted/10 p-2">
                            <span className="text-[10px] text-muted-foreground block mb-2">{isAr ? "📺 معاينة مشغل الفيديو:" : "📺 Video Player Preview:"}</span>
                            <div className="aspect-video bg-black flex items-center justify-center rounded-lg text-white">
                              <Play className="w-12 h-12 text-primary animate-pulse" />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs font-bold">{isAr ? "جودة الضغط:" : "Compression:"}</Label>
                          <Select value={uploadQuality} onValueChange={v => setUploadQuality(v as any)}>
                            <SelectTrigger className="w-36 h-7 text-xs rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">{isAr ? "موفر (640p)" : "Economy (640p)"}</SelectItem>
                              <SelectItem value="medium">{isAr ? "متوازن (720p)" : "Balanced (720p)"}</SelectItem>
                              <SelectItem value="high">{isAr ? "عالي الجودة (1080p)" : "High Quality (1080p)"}</SelectItem>
                            </SelectContent>
                          </Select>
                          <span className="text-[10px] text-muted-foreground">{isAr ? "yt-dlp يضغط الفيديو تلقائياً" : "Server compresses automatically"}</span>
                        </div>
                        {uploading ? (
                          <div className="border border-dashed rounded-xl p-8 text-center space-y-3 bg-primary/5">
                            <UploadCloud className="w-10 h-10 mx-auto text-primary animate-bounce" />
                            <p className="text-sm font-bold">{isAr ? "جاري رفع ملف الفيديو..." : "Uploading video file..."}</p>
                            <Progress value={uploadProgress} className="h-2 max-w-xs mx-auto" />
                            <span className="text-xs text-muted-foreground font-mono">{uploadProgress}%</span>
                          </div>
                        ) : videoConfig.fileName ? (
                          <div className="border border-border/60 rounded-xl p-6 bg-card flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-500">
                                <FileVideo className="w-6 h-6" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-foreground">{videoConfig.fileName}</p>
                                <span className="text-[10px] text-muted-foreground">{videoConfig.fileSize}</span>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setVideoConfig({ sourceType: "upload", videoUrl: "" })} className="rounded-xl text-destructive hover:bg-destructive/10 border-destructive/20 text-xs">
                              {isAr ? "إزالة واستبدال" : "Remove & Replace"}
                            </Button>
                          </div>
                        ) : (
                          <label className="border-2 border-dashed border-border/60 rounded-xl p-10 text-center cursor-pointer hover:bg-muted/20 hover:border-primary/40 transition-all flex flex-col items-center justify-center">
                            <UploadCloud className="w-12 h-12 text-muted-foreground mb-3" />
                            <span className="text-xs font-bold text-foreground mb-1">{isAr ? "اسحب وأفلت ملف الفيديو هنا" : "Drag and drop video file here"}</span>
                            <span className="text-[10px] text-muted-foreground mb-3">{isAr ? "أو اضغط للتصفح من جهازك" : "or click to browse from device"}</span>
                            <input type="file" accept="video/*" onChange={simulateVideoUpload} className="hidden" />
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 💻 3. Coding Exercise Workspace (Starter, Solution, Test Cases & Run Simulation) */}
                {modType === "exercise" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap border-b pb-2 mb-2">
                      <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                        <Code2 className="w-4 h-4 text-emerald-500" />
                        {isAr ? "إعداد محطة التمرين البرمجي" : "Coding Exercise Configuration Panel"}
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{isAr ? "اللغة:" : "Language:"}</span>
                        <Select
                          value={exerciseConfig.language}
                          onValueChange={v => setExerciseConfig(prev => ({ ...prev, language: v as any }))}
                        >
                          <SelectTrigger className="w-32 h-7 text-xs rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="javascript">JavaScript</SelectItem>
                            <SelectItem value="python">Python</SelectItem>
                            <SelectItem value="html">HTML</SelectItem>
                            <SelectItem value="css">CSS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Starter Template */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold">{isAr ? "كود البداية المقترح للطالب" : "Starter Template Code"}</Label>
                        <Textarea
                          value={exerciseConfig.starterTemplate}
                          onChange={e => setExerciseConfig(prev => ({ ...prev, starterTemplate: e.target.value }))}
                          placeholder={isAr ? "مثال:\nfunction sum(a, b) {\n  // اكتب الكود هنا\n}" : "e.g.\nfunction sum(a, b) {\n  // Write solution here\n}"}
                          className="font-mono text-xs min-h-[160px] rounded-xl"
                        />
                      </div>

                      {/* Solution */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold">{isAr ? "الكود البرمجي الصحيح للحل" : "Correct Solution Code"}</Label>
                        <Textarea
                          value={exerciseConfig.solution}
                          onChange={e => setExerciseConfig(prev => ({ ...prev, solution: e.target.value }))}
                          placeholder={isAr ? "مثال:\nfunction sum(a, b) {\n  return a + b;\n}" : "e.g.\nfunction sum(a, b) {\n  return a + b;\n}"}
                          className="font-mono text-xs min-h-[160px] rounded-xl"
                        />
                      </div>
                    </div>

                    {/* Test Cases Builder */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold">{isAr ? "حالات الاختبار التلقائي" : "Automated Test Cases"}</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExerciseConfig(prev => ({ ...prev, testCases: [...prev.testCases, { input: "", expected: "" }] }))}
                          className="h-7 text-[10px] rounded-lg"
                        >
                          <Plus className="w-3 h-3 mr-1" /> {isAr ? "إضافة حالة" : "Add Case"}
                        </Button>
                      </div>

                      <div className="space-y-2 max-h-[120px] overflow-y-auto">
                        {exerciseConfig.testCases.map((tc, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Input
                              placeholder={isAr ? "المدخلات: e.g. sum(2, 3)" : "Input: e.g. sum(2, 3)"}
                              value={tc.input}
                              onChange={e => {
                                const testCases = [...exerciseConfig.testCases];
                                testCases[idx].input = e.target.value;
                                setExerciseConfig(prev => ({ ...prev, testCases }));
                              }}
                              className="rounded-lg text-xs font-mono h-8"
                            />
                            <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <Input
                              placeholder={isAr ? "المخرجات المتوقعة: 5" : "Expected output: 5"}
                              value={tc.expected}
                              onChange={e => {
                                const testCases = [...exerciseConfig.testCases];
                                testCases[idx].expected = e.target.value;
                                setExerciseConfig(prev => ({ ...prev, testCases }));
                              }}
                              className="rounded-lg text-xs font-mono h-8"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const testCases = exerciseConfig.testCases.filter((_, i) => i !== idx);
                                setExerciseConfig(prev => ({ ...prev, testCases }));
                              }}
                              className="h-8 w-8 text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Simulation Console Terminal */}
                    <div className="border border-border/60 bg-zinc-950 rounded-xl overflow-hidden text-start">
                      <div className="flex items-center justify-between bg-zinc-900 px-4 py-1.5 border-b border-zinc-800">
                        <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5 text-zinc-500" />
                          {isAr ? "لوحة اختبار الأكواد المحاكية" : "Simulated Code Compiler Console"}
                        </span>
                        <Button
                          size="sm"
                          onClick={handleRunTestsSimulation}
                          disabled={runningTests || !exerciseConfig.solution}
                          className="h-6 text-[10px] bg-emerald-700 hover:bg-emerald-600 rounded-lg text-white font-bold"
                        >
                          {runningTests ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                          {isAr ? "تشغيل محاكاة الاختبار" : "Simulate Run"}
                        </Button>
                      </div>
                      <div className="p-4 font-mono text-xs text-zinc-300 min-h-[100px] max-h-[150px] overflow-y-auto space-y-1 bg-black">
                        {runLogs.length > 0 ? (
                          runLogs.map((log, idx) => <p key={idx}>{log}</p>)
                        ) : (
                          <span className="text-zinc-600 italic">{isAr ? "اضغط على تشغيل محاكاة الاختبار لفحص الأكواد..." : "Click Simulate Run to test exercise solution..."}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 📝 4. Quiz Workspace (Advanced Question Manager & Answer Configuration) */}
                {modType === "quiz" && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-amber-500" />
                        {isAr ? "إدارة أسئلة الاختبار القصير" : "Quiz Questions Manager Workspace"}
                      </span>
                      <Button size="sm" variant="outline" onClick={handleAddQuizQuestion} className="h-7 text-xs rounded-xl gap-1 border-amber-500/20 text-amber-600 hover:bg-amber-500/5">
                        <Plus className="w-3.5 h-3.5" />
                        {isAr ? "إضافة سؤال" : "Add Question"}
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                      {/* Left: Questions directory */}
                      <div className="md:col-span-4 rounded-xl border bg-muted/20 p-3 space-y-2">
                        <span className="text-[10px] font-bold text-muted-foreground block mb-2">{isAr ? "قائمة الأسئلة" : "Questions Index"}</span>
                        {quizConfig.questions.length === 0 ? (
                          <div className="text-center py-6 text-xs text-muted-foreground italic">
                            {isAr ? "لا توجد أسئلة بعد" : "No questions created"}
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                            {quizConfig.questions.map((q, idx) => (
                              <div
                                key={q.id}
                                onClick={() => setSelectedQuizQuestionIdx(idx)}
                                className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between border transition-all ${
                                  selectedQuizQuestionIdx === idx ? "border-amber-500/50 bg-amber-500/5 text-amber-700 dark:text-amber-400 font-bold" : "border-border/60 hover:bg-card"
                                }`}
                              >
                                <span className="truncate pr-2">{idx + 1}. {q.question}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteQuizQuestion(idx); }}
                                  className="text-destructive hover:bg-destructive/10 p-0.5 rounded"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right: Question details edit */}
                      <div className="md:col-span-8">
                        {selectedQuizQuestionIdx !== null && quizConfig.questions[selectedQuizQuestionIdx] ? (
                          <div className="rounded-xl border border-border/80 p-4 space-y-4 bg-card">
                            <div className="space-y-2">
                              <Label className="text-xs font-bold">{isAr ? "نص السؤال *" : "Question Text *"}</Label>
                              <Input
                                value={quizConfig.questions[selectedQuizQuestionIdx].question}
                                onChange={e => handleUpdateQuizQuestion(selectedQuizQuestionIdx, { question: e.target.value })}
                                className="rounded-xl"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs font-bold">{isAr ? "نوع السؤال" : "Question Type"}</Label>
                                <Select
                                  value={quizConfig.questions[selectedQuizQuestionIdx].type}
                                  onValueChange={val => handleUpdateQuizQuestion(selectedQuizQuestionIdx, { type: val as any })}
                                >
                                  <SelectTrigger className="rounded-xl text-xs h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="mcq">{isAr ? "اختيارات متعددة" : "Multiple Choice"}</SelectItem>
                                    <SelectItem value="tf">{isAr ? "صح / خطأ" : "True / False"}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs font-bold">{isAr ? "النقاط" : "Points"}</Label>
                                <Input
                                  type="number"
                                  value={quizConfig.questions[selectedQuizQuestionIdx].points}
                                  onChange={e => handleUpdateQuizQuestion(selectedQuizQuestionIdx, { points: parseInt(e.target.value, 10) || 10 })}
                                  className="rounded-xl text-xs"
                                />
                              </div>
                            </div>

                            {/* Options Manager (For MCQs) */}
                            {quizConfig.questions[selectedQuizQuestionIdx].type === "mcq" && (
                              <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs font-bold">{isAr ? "الخيارات المتاحة والإجابة الصحيحة *" : "Options & Correct Selection *"}</Label>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const currentQs = quizConfig.questions[selectedQuizQuestionIdx];
                                      handleUpdateQuizQuestion(selectedQuizQuestionIdx, { options: [...currentQs.options, `New Option ${currentQs.options.length + 1}`] });
                                    }}
                                    className="h-7 text-[10px] rounded-lg"
                                  >
                                    {isAr ? "إضافة خيار" : "Add Option"}
                                  </Button>
                                </div>

                                <div className="space-y-2">
                                  {quizConfig.questions[selectedQuizQuestionIdx].options.map((opt, oIdx) => (
                                    <div key={oIdx} className="flex items-center gap-2">
                                      <input
                                        type="radio"
                                        name={`correct-option-${selectedQuizQuestionIdx}`}
                                        checked={quizConfig.questions[selectedQuizQuestionIdx].correctIndex === oIdx}
                                        onChange={() => handleUpdateQuizQuestion(selectedQuizQuestionIdx, { correctIndex: oIdx })}
                                        className="h-4 w-4 text-amber-500 accent-amber-500 focus:ring-0 cursor-pointer"
                                      />
                                      <Input
                                        value={opt}
                                        onChange={e => {
                                          const options = [...quizConfig.questions[selectedQuizQuestionIdx].options];
                                          options[oIdx] = e.target.value;
                                          handleUpdateQuizQuestion(selectedQuizQuestionIdx, { options });
                                        }}
                                        className="rounded-lg text-xs h-8 flex-1"
                                      />
                                      {quizConfig.questions[selectedQuizQuestionIdx].options.length > 2 && (
                                        <button
                                          onClick={() => {
                                            const options = quizConfig.questions[selectedQuizQuestionIdx].options.filter((_, i) => i !== oIdx);
                                            // Make sure correctIndex doesn't overshoot
                                            const correctIndex = Math.min(quizConfig.questions[selectedQuizQuestionIdx].correctIndex, options.length - 1);
                                            handleUpdateQuizQuestion(selectedQuizQuestionIdx, { options, correctIndex });
                                          }}
                                          className="text-destructive hover:bg-destructive/10 p-1 rounded"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* True / False Selection */}
                            {quizConfig.questions[selectedQuizQuestionIdx].type === "tf" && (
                              <div className="space-y-2 pt-2">
                                <Label className="text-xs font-bold">{isAr ? "تحديد الإجابة الصحيحة *" : "Correct Selection *"}</Label>
                                <div className="flex gap-4">
                                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                      type="radio"
                                      checked={quizConfig.questions[selectedQuizQuestionIdx].correctIndex === 0}
                                      onChange={() => handleUpdateQuizQuestion(selectedQuizQuestionIdx, { correctIndex: 0 })}
                                      className="accent-amber-500 h-4 w-4"
                                    />
                                    {isAr ? "صح" : "True"}
                                  </label>
                                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                      type="radio"
                                      checked={quizConfig.questions[selectedQuizQuestionIdx].correctIndex === 1}
                                      onChange={() => handleUpdateQuizQuestion(selectedQuizQuestionIdx, { correctIndex: 1 })}
                                      className="accent-amber-500 h-4 w-4"
                                    />
                                    {isAr ? "خطأ" : "False"}
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="border border-dashed rounded-xl p-8 text-center text-xs text-muted-foreground italic bg-muted/10">
                            {isAr ? "يرجى تحديد سؤال من القائمة لتعديله أو إضافة سؤال جديد" : "Select a question from the index to configure details"}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          ) : (
            <div className="text-center py-24 border-2 border-dashed border-border/40 rounded-2xl bg-card">
              <Layers className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <h2 className="font-bold text-lg text-foreground mb-1">{isAr ? "مرحباً بك في بيئة تصميم الوحدات" : "Welcome to the Module Workspace"}</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                {isAr
                  ? "اختر وحدة تعليمية من القائمة الجانبية لبدء إعداد الدرس أو رفع مقطع الفيديو أو تصميم تمرين برمجي واختبار ذكي."
                  : "Select a module from the curriculum menu on the left to start configuring lessons, uploading videos, or building quizzes."}
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

const MODULE_TYPE_CONFIG: Record<ModuleType, { icon: React.ComponentType<{ className?: string }>, label: string, labelAr: string, color: string, bg: string }> = {
  lesson:   { icon: BookOpen, label: "Lesson",   labelAr: "درس نصي",     color: "text-blue-500",   bg: "bg-blue-500/10" },
  video:    { icon: Video,    label: "Video",    labelAr: "فيديو",       color: "text-violet-500", bg: "bg-violet-500/10" },
  exercise: { icon: Code,     label: "Exercise", labelAr: "تمرين برمجي",  color: "text-emerald-500",bg: "bg-emerald-500/10" },
  quiz:     { icon: FileText, label: "Quiz",     labelAr: "اختبار قصير",  color: "text-amber-500",  bg: "bg-amber-500/10" },
};
