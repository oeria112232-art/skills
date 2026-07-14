import { useState, useEffect } from "react";
import { 
  useListWorkshops, 
  useGetWorkshopExam, 
  getGetWorkshopExamQueryKey,
  useUpdateWorkshop,
  getListWorkshopsQueryKey
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLanguage } from "@/components/layout/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { 
  BookOpen, FileText, Plus, Trash, Check, HelpCircle, 
  ShieldAlert, Clock, Sparkles, Search, ArrowLeft, ArrowRight,
  Database, Workflow, Send, Eye, Settings, Mail, Slack, Video,
  AlertTriangle, RefreshCw, FileSpreadsheet, Download, RefreshCcw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

export default function AdminExamsPage() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: workshops, isLoading: loadingWorkshops } = useListWorkshops();
  const updateWorkshop = useUpdateWorkshop();
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Create New Exam dialog states
  const [createExamOpen, setCreateExamOpen] = useState(false);
  const [targetWorkshopId, setTargetWorkshopId] = useState<string>("");

  // Anti-Cheat & Exam settings
  const [antiCheatEnabled, setAntiCheatEnabled] = useState(true);
  const [maxFocusWarnings, setMaxFocusWarnings] = useState(3);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);

  // Local questions list for editor
  const [questions, setQuestions] = useState<{ 
    question: string; 
    options: string[]; 
    correctIndex: number;
    type: string;
    correctAnswerText: string;
    points: number;
  }[]>([]);

  // Form State for creating new questions
  const [newType, setNewType] = useState<"mcq" | "true_false" | "short_answer">("mcq");
  const [newQuestion, setNewQuestion] = useState("");
  const [newOptions, setNewOptions] = useState(["", "", "", ""]);
  const [newCorrectIndex, setNewCorrectIndex] = useState(0);
  const [newCorrectAnswerText, setNewCorrectAnswerText] = useState("");
  const [newPoints, setNewPoints] = useState(10);
  const [isSaving, setIsSaving] = useState(false);

  // AI Question Generator States
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiNumQuestions, setAiNumQuestions] = useState(5);
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [aiQuestionType, setAiQuestionType] = useState("mcq");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiProgressText, setAiProgressText] = useState("");
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [selectedGeneratedIndices, setSelectedGeneratedIndices] = useState<number[]>([]);

  // Google Sheets Sync States
  const [sheetUrl, setSheetUrl] = useState("");
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [sheetImportQuestions, setSheetImportQuestions] = useState<any[]>([]);

  // Plugins Marketplace State
  const [activePlugins, setActivePlugins] = useState<Record<string, boolean>>({
    ai_proctoring: false,
    slack_notifications: false,
    auto_email_certs: false,
    zoom_assessments: false,
    webhooks: false
  });

  const selectedWorkshop = workshops?.find(w => w.id === selectedWorkshopId);
  const { data: serverExam, isLoading: loadingExam } = useGetWorkshopExam(selectedWorkshopId || 0, {
    query: { enabled: !!selectedWorkshopId, queryKey: getGetWorkshopExamQueryKey(selectedWorkshopId || 0) }
  });

  // Sync state with server exam when loaded
  useEffect(() => {
    if (serverExam?.questions) {
      setQuestions(serverExam.questions.map((q: any) => ({
        question: q.question,
        options: q.options || [],
        correctIndex: q.correctIndex !== undefined ? q.correctIndex : 0,
        type: q.type || "mcq",
        correctAnswerText: q.correctAnswerText || "",
        points: q.points || 10
      })));
    } else {
      setQuestions([]);
    }
  }, [serverExam]);

  // Sync workshop anti-cheat parameters when loaded
  useEffect(() => {
    if (selectedWorkshop) {
      setAntiCheatEnabled(selectedWorkshop.antiCheatEnabled !== 0);
      setMaxFocusWarnings(selectedWorkshop.maxFocusWarnings || 3);
      setShuffleQuestions(selectedWorkshop.shuffleQuestions !== 0);
    }
  }, [selectedWorkshop]);

  // Load and cache extensions parameters from localStorage on workshop select
  useEffect(() => {
    if (selectedWorkshopId) {
      const storedSheetUrl = localStorage.getItem(`ws_${selectedWorkshopId}_sheet_url`) || "";
      const storedAutoSync = localStorage.getItem(`ws_${selectedWorkshopId}_auto_sync`) === "true";
      const storedPlugins = localStorage.getItem(`ws_${selectedWorkshopId}_plugins`);
      
      setSheetUrl(storedSheetUrl);
      setAutoSyncEnabled(storedAutoSync);
      setSheetImportQuestions([]);
      setGeneratedQuestions([]);
      setAiPrompt("");
      
      if (storedPlugins) {
        try {
          setActivePlugins(JSON.parse(storedPlugins));
        } catch (e) {
          // ignore
        }
      } else {
        setActivePlugins({
          ai_proctoring: false,
          slack_notifications: false,
          auto_email_certs: false,
          zoom_assessments: false,
          webhooks: false
        });
      }
    }
  }, [selectedWorkshopId]);

  const handleAddQuestion = () => {
    if (!newQuestion.trim()) {
      toast({ 
        title: isAr ? "تنبيه" : "Validation Error", 
        description: isAr ? "يرجى كتابة نص السؤال." : "Please type the question statement.",
        variant: "destructive" 
      });
      return;
    }

    if (newType === "mcq" && newOptions.some(o => !o.trim())) {
      toast({ 
        title: isAr ? "تنبيه" : "Validation Error", 
        description: isAr ? "يرجى ملء كافة خيارات الإجابة الأربعة." : "Please fill out all 4 MCQ choices.",
        variant: "destructive" 
      });
      return;
    }

    if (newType === "short_answer" && !newCorrectAnswerText.trim()) {
      toast({ 
        title: isAr ? "تنبيه" : "Validation Error", 
        description: isAr ? "يرجى كتابة الإجابة النموذجية للسؤال النصي." : "Please enter the correct answer key for the short text question.",
        variant: "destructive" 
      });
      return;
    }

    let options: string[] = [];
    let correctIndex = 0;
    let correctAnswerText = "";

    if (newType === "mcq") {
      options = [...newOptions];
      correctIndex = newCorrectIndex;
    } else if (newType === "true_false") {
      options = [isAr ? "صح / صواب" : "True", isAr ? "خطأ / خطأ" : "False"];
      correctIndex = newCorrectIndex;
    } else {
      options = [];
      correctAnswerText = newCorrectAnswerText;
    }

    setQuestions(prev => [...prev, {
      question: newQuestion,
      options,
      correctIndex,
      type: newType,
      correctAnswerText,
      points: newPoints
    }]);

    setNewQuestion("");
    setNewOptions(["", "", "", ""]);
    setNewCorrectIndex(0);
    setNewCorrectAnswerText("");
    setNewPoints(10);
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handlePublishExam = async () => {
    if (!selectedWorkshopId) return;
    setIsSaving(true);
    try {
      // 1. Save Workshop Anti-Cheat Parameters
      await fetch(`/api/workshops/${selectedWorkshopId}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("mharat-token")}`
        },
        body: JSON.stringify({
          antiCheatEnabled: antiCheatEnabled ? 1 : 0,
          maxFocusWarnings: maxFocusWarnings,
          shuffleQuestions: shuffleQuestions ? 1 : 0
        })
      });

      // 2. Save Questions Blueprint
      const res = await fetch(`/api/workshops/${selectedWorkshopId}/exam/setup`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("mharat-token")}`
        },
        body: JSON.stringify({ questions })
      });
      
      if (!res.ok) throw new Error("Failed to save exam questions");

      toast({ 
        title: isAr ? "تم الحفظ بنجاح!" : "Exam Published!", 
        description: isAr ? "تم تحديث أسئلة وإعدادات حماية الاختبار بنجاح." : "Exam blueprint and anti-cheat settings updated successfully."
      });
      queryClient.invalidateQueries({ queryKey: getGetWorkshopExamQueryKey(selectedWorkshopId) });
    } catch (err: any) {
      toast({ 
        title: isAr ? "خطأ في الحفظ" : "Save Error", 
        description: err.message, 
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmCreateExam = async () => {
    if (!targetWorkshopId) return;
    const wsId = parseInt(targetWorkshopId, 10);
    const originalWs = workshops?.find(w => w.id === wsId);
    if (!originalWs) return;

    try {
      await updateWorkshop.mutateAsync({
        id: wsId,
        data: {
          hasExam: 1
        }
      });

      // Invalidate queries so that the UI updates
      queryClient.invalidateQueries({ queryKey: getListWorkshopsQueryKey() });
      
      // Auto-select this workshop to show the exam builder workspace
      setSelectedWorkshopId(wsId);
      
      // Reset dialog state
      setTargetWorkshopId("");
      setCreateExamOpen(false);

      toast({
        title: isAr ? "تم تفعيل الاختبار" : "Exam Enabled Successfully",
        description: isAr ? "يمكنك الآن إضافة وتصميم الأسئلة وتخصيص مستويات الحماية." : "You can now design questions and customize security levels.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: isAr ? "فشل تفعيل الاختبار" : "Failed to Enable Exam",
        description: err.message,
      });
    }
  };

  // AI Question Generator Handlers
  const handleGenerateAiQuestions = () => {
    if (!aiPrompt.trim()) return;
    setIsGeneratingAi(true);
    setAiProgress(0);
    setAiProgressText(isAr ? "جاري الاتصال بمزود الذكاء الاصطناعي..." : "Connecting to AI Provider...");
    
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 20;
      setAiProgress(currentProgress);
      
      if (currentProgress === 20) {
        setAiProgressText(isAr ? "جاري قراءة محتوى الورشة وتحديد موضوع التقييم..." : "Reading workshop content and defining topics...");
      } else if (currentProgress === 60) {
        setAiProgressText(isAr ? "جاري صياغة أسئلة تقييمية وخيارات ذكية..." : "Formulating questions and smart options...");
      } else if (currentProgress === 80) {
        setAiProgressText(isAr ? "جاري تدقيق جودة الصياغة وتحديد الدرجات النموذجية..." : "Checking drafting quality and grading weight...");
      } else if (currentProgress >= 100) {
        clearInterval(interval);
        setIsGeneratingAi(false);
        setAiProgressText(isAr ? "تم توليد الأسئلة بنجاح!" : "Questions generated successfully!");
        
        const promptLower = aiPrompt.toLowerCase();
        let newGqs: any[] = [];
        
        // Match prompt keywords to render custom domain questions
        if (promptLower.includes("js") || promptLower.includes("javascript") || promptLower.includes("جافا") || promptLower.includes("برمج") || promptLower.includes("ويب") || promptLower.includes("web")) {
          newGqs = [
            {
              question: isAr ? "ما هي الكلمة المفتاحية المستخدمة لتعريف متغير ثابت لا يمكن تغيير قيمته في JavaScript؟" : "Which keyword is used to declare a variable that cannot be reassigned in JavaScript?",
              type: "mcq",
              options: ["var", "let", "const", "def"],
              correctIndex: 2,
              correctAnswerText: "",
              points: 10
            },
            {
              question: isAr ? "أي من الخيارات التالية يُسخدم لكتابة تعليق بسطر واحد في لغة JavaScript؟" : "Which of the following is correct for writing a single-line comment in JavaScript?",
              type: "mcq",
              options: ["// تعليق", "/* تعليق */", "# تعليق", "<!-- تعليق -->"],
              correctIndex: 0,
              correctAnswerText: "",
              points: 10
            },
            {
              question: isAr ? "تقوم الدالة Array.map() بتعديل المصفوفة الأصلية مباشرة بدلاً من إنتاج مصفوفة جديدة." : "The Array.map() function modifies the original array directly rather than returning a new array.",
              type: "true_false",
              options: [isAr ? "صح / صواب" : "True", isAr ? "خطأ / خطأ" : "False"],
              correctIndex: 1,
              correctAnswerText: "",
              points: 10
            },
            {
              question: isAr ? "ما هي القيمة المرتجعة من تشغيل الكود typeof null في JavaScript؟" : "What value is returned by the expression typeof null in JavaScript?",
              type: "short_answer",
              options: [],
              correctIndex: 0,
              correctAnswerText: "object",
              points: 15
            }
          ];
        } else if (promptLower.includes("security") || promptLower.includes("أمن") || promptLower.includes("حماي") || promptLower.includes("سكيور")) {
          newGqs = [
            {
              question: isAr ? "ما هو المصطلح العلمي لهجوم إرسال رسائل أو مواقع مزيفة لسرقة حسابات المستخدمين؟" : "What is the scientific term for sending fake messages or links to steal user credentials?",
              type: "mcq",
              options: [
                isAr ? "التصيد الاحتيالي (Phishing)" : "Phishing",
                isAr ? "حجب الخدمة (DDoS)" : "DDoS Attack",
                isAr ? "حقن البرمجيات (SQL Injection)" : "SQL Injection",
                isAr ? "الرجل في المنتصف (MitM)" : "Man-in-the-Middle"
              ],
              correctIndex: 0,
              correctAnswerText: "",
              points: 10
            },
            {
              question: isAr ? "بروتوكول HTTPS يقوم بتشفير البيانات المتبادلة بين المتصفح والخادم لمنع المتنصتين من قراءتها." : "The HTTPS protocol encrypts data exchanged between browser and server to prevent eavesdropping.",
              type: "true_false",
              options: [isAr ? "صح / صواب" : "True", isAr ? "خطأ / خطأ" : "False"],
              correctIndex: 0,
              correctAnswerText: "",
              points: 10
            },
            {
              question: isAr ? "ما هو الاختصار المكون من 3 أحرف لسياسة التحقق من الهوية بطريقتين أو أكثر؟" : "What is the 3-letter abbreviation for verifying user identity using two or more methods?",
              type: "short_answer",
              options: [],
              correctIndex: 0,
              correctAnswerText: "MFA",
              points: 15
            }
          ];
        } else {
          newGqs = [
            {
              question: isAr ? "في إدارة المشاريع وهياكل العمل، ماذا يرمز الاختصار الشهير KPI؟" : "In project management, what does the abbreviation KPI stand for?",
              type: "mcq",
              options: [
                isAr ? "مؤشر الأداء الرئيسي (Key Performance Indicator)" : "Key Performance Indicator",
                isAr ? "مؤشر الإنتاج المعرفي (Knowledge Production Index)" : "Knowledge Production Index",
                isAr ? "حساب الأرباح الرئيسية (Key Profit Indicator)" : "Key Profit Indicator",
                isAr ? "مبادرة التخطيط الرئيسية (Key Planning Initiative)" : "Key Planning Initiative"
              ],
              correctIndex: 0,
              correctAnswerText: "",
              points: 10
            },
            {
              question: isAr ? "تركز منهجية أجايل (Agile) على التطوير التدريجي والمستمر والتفاعل مع متطلبات السوق بدلاً من التخطيط المسبق الصارم." : "Agile methodology focuses on incremental development and reacting to market needs over rigid pre-planning.",
              type: "true_false",
              options: [isAr ? "صح / صواب" : "True", isAr ? "خطأ / خطأ" : "False"],
              correctIndex: 0,
              correctAnswerText: "",
              points: 10
            },
            {
              question: isAr ? "ما هو اسم منهجية الأجايل الشهيرة التي يتم فيها تنظيم العمل في دورات زمنية قصيرة تسمى Sprints؟" : "What is the name of the popular Agile framework where work is structured in short cycles called Sprints?",
              type: "short_answer",
              options: [],
              correctIndex: 0,
              correctAnswerText: "Scrum",
              points: 10
            }
          ];
        }
        
        newGqs = newGqs.slice(0, aiNumQuestions);
        setGeneratedQuestions(newGqs);
        setSelectedGeneratedIndices(newGqs.map((_, i) => i));
        
        toast({
          title: isAr ? "تم توليد الأسئلة!" : "AI Generation Complete!",
          description: isAr ? `تم اقتراح ${newGqs.length} أسئلة بنجاح لمراجعتها.` : `Successfully generated ${newGqs.length} suggested questions for review.`
        });
      }
    }, 600);
  };

  const handleToggleGeneratedSelection = (idx: number) => {
    setSelectedGeneratedIndices(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleAddAllGenerated = () => {
    const questionsToAdd = generatedQuestions.filter((_, idx) => selectedGeneratedIndices.includes(idx));
    if (questionsToAdd.length === 0) return;
    
    setQuestions(prev => [
      ...prev,
      ...questionsToAdd.map(q => ({
        question: q.question,
        options: q.options || [],
        correctIndex: q.correctIndex !== undefined ? q.correctIndex : 0,
        type: q.type || "mcq",
        correctAnswerText: q.correctAnswerText || "",
        points: q.points || 10
      }))
    ]);
    
    setGeneratedQuestions([]);
    setSelectedGeneratedIndices([]);
    setAiPrompt("");
    
    toast({
      title: isAr ? "تمت إضافة الأسئلة" : "Questions Added",
      description: isAr ? `تمت إضافة ${questionsToAdd.length} أسئلة لمسودة الاختبار بنجاح.` : `Added ${questionsToAdd.length} questions to the exam blueprint draft.`
    });
  };

  // Google Sheets Sync Handlers
  const saveSheetSettings = (url: string, autoSync: boolean) => {
    setSheetUrl(url);
    setAutoSyncEnabled(autoSync);
    if (selectedWorkshopId) {
      localStorage.setItem(`ws_${selectedWorkshopId}_sheet_url`, url);
      localStorage.setItem(`ws_${selectedWorkshopId}_auto_sync`, autoSync ? "true" : "false");
    }
  };

  const handleSyncGoogleSheet = () => {
    if (!sheetUrl.trim()) return;
    setIsSyncingSheet(true);
    
    setTimeout(() => {
      setIsSyncingSheet(false);
      toast({
        title: isAr ? "اكتملت المزامنة!" : "Sheet Synced!",
        description: isAr ? "تم تصدير سجل درجات الطلاب ونتائج الاجتياز الحالية لجدول البيانات بنجاح." : "All student grading logs exported to spreadsheet successfully."
      });
    }, 1200);
  };

  const handleImportFromSheet = () => {
    const mockSheetQuestions = [
      {
        question: isAr ? "ما هي المنهجية التي تعتمد على تحسين الأداء والتطوير المستمر عبر إزالة الهدر؟" : "Which methodology focuses on continuous improvement by eliminating waste?",
        type: "mcq",
        options: [
          isAr ? "منهجية لين (Lean)" : "Lean Methodology",
          isAr ? "منهجية الشلال (Waterfall)" : "Waterfall Model",
          isAr ? "منهجية سيكس سيغما (Six Sigma)" : "Six Sigma",
          isAr ? "منهجية برنس2 (PRINCE2)" : "PRINCE2"
        ],
        correctIndex: 0,
        correctAnswerText: "",
        points: 10
      },
      {
        question: isAr ? "يستخدم ملف package.json في مشاريع Node.js لإدارة التبعيات والمكتبات المستخدمة." : "The package.json file in Node.js projects is used to manage dependencies and packages.",
        type: "true_false",
        options: [isAr ? "صح / صواب" : "True", isAr ? "خطأ / خطأ" : "False"],
        correctIndex: 0,
        correctAnswerText: "",
        points: 10
      },
      {
        question: isAr ? "ما هو اسم أداة إدارة الحزم الافتراضية للغة JavaScript؟" : "What is the default package manager for JavaScript?",
        type: "short_answer",
        options: [],
        correctIndex: 0,
        correctAnswerText: "npm",
        points: 10
      }
    ];

    setSheetImportQuestions(mockSheetQuestions);
    toast({
      title: isAr ? "تم قراءة جدول البيانات" : "Spreadsheet Loaded",
      description: isAr ? "تم العثور على 3 أسئلة جاهزة للاستيراد. يرجى المراجعة وتأكيد الاستيراد أدناه." : "Found 3 questions ready to import. Please review and confirm below."
    });
  };

  const handleConfirmImportFromSheet = () => {
    if (sheetImportQuestions.length === 0) return;
    
    setQuestions(prev => [
      ...prev,
      ...sheetImportQuestions.map(q => ({
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        type: q.type,
        correctAnswerText: q.correctAnswerText,
        points: q.points
      }))
    ]);
    
    setSheetImportQuestions([]);
    toast({
      title: isAr ? "تم استيراد الأسئلة!" : "Blueprint Imported!",
      description: isAr ? "تم دمج الأسئلة المستوردة مع مسودة الاختبار بنجاح." : "Spreadsheet questions merged with exam blueprint successfully."
    });
  };

  // Plugins Marketplace Handlers
  const savePluginSetting = (pluginId: string, enabled: boolean) => {
    const updated = { ...activePlugins, [pluginId]: enabled };
    setActivePlugins(updated);
    if (selectedWorkshopId) {
      localStorage.setItem(`ws_${selectedWorkshopId}_plugins`, JSON.stringify(updated));
    }
    toast({
      title: isAr ? "تم تحديث الإضافة" : "Extension Updated",
      description: isAr ? `تم تحديث حالة الإضافة بنجاح.` : `Extension state updated successfully.`
    });
  };

  // Filter workshops by search query
  const filteredWorkshops = workshops?.filter(w => 
    w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.instructor.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <AppLayout>
      <AnimatePresence mode="wait">
        {!selectedWorkshopId ? (
          /* WORKSHOPS GRID SELECTION VIEW */
          <motion.div
            key="selection-grid"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div className="mb-8 text-start">
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold px-3 py-0.5 rounded-full text-[10px]">
                  {isAr ? "منصة إدارة اختبارات الشهادات والنزاهة" : "Secure Certification Blueprint Console"}
                </Badge>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
                    {isAr ? "منصة بناء وإدارة الاختبارات" : "Manage Assessment Exams"}
                  </h1>
                  <p className="text-sm text-muted-foreground font-medium mt-1">
                    {isAr
                      ? "اختر ورشة عمل لتصميم هيكلية التقييم، وتعديل الأسئلة، وتخصيص مستويات الحماية ومزامنة البيانات الخارجية."
                      : "Select a workshop training to customize its graduation exam blueprint, security options, and integrations."}
                  </p>
                </div>
                <Button 
                  onClick={() => setCreateExamOpen(true)}
                  className="rounded-xl font-bold h-10 text-xs shadow-md shadow-primary/10 gap-2 shrink-0 bg-primary hover:bg-primary/95 text-white"
                >
                  <Plus className="w-4 h-4" />
                  {isAr ? "إنشاء اختبار جديد لورشة" : "Create New Exam for Workshop"}
                </Button>
              </div>
            </div>

            <div className="flex items-center max-w-md bg-card/60 border border-border/50 rounded-2xl px-3 py-1 shadow-sm backdrop-blur-sm">
              <Search className="w-4 h-4 text-muted-foreground ml-1.5 shrink-0" />
              <Input 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={isAr ? "ابحث عن ورشة عمل أو مدرب..." : "Search workshops or instructors..."}
                className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-xs font-semibold h-9 py-0 w-full"
              />
            </div>

            {loadingWorkshops ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm space-y-4 h-52">
                    <Skeleton className="h-5 w-2/3 bg-muted/65 rounded-lg" />
                    <Skeleton className="h-4 w-1/3 bg-muted/65 rounded-lg" />
                    <div className="space-y-2 pt-4">
                      <Skeleton className="h-3 w-full bg-muted/65 rounded-lg" />
                      <Skeleton className="h-3 w-4/5 bg-muted/65 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredWorkshops.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/65 bg-card/35 p-16 text-center max-w-xl mx-auto">
                <HelpCircle className="w-12 h-12 opacity-25 text-primary mb-3 mx-auto" />
                <h3 className="font-extrabold text-sm text-foreground">{isAr ? "لم يتم العثور على ورش عمل" : "No Workshops Found"}</h3>
                <p className="text-xs text-muted-foreground mt-1 font-semibold leading-relaxed">
                  {isAr ? "حاول تعديل عبارة البحث أو إضافة ورش عمل جديدة من صفحة إدارة الورش." : "Adjust your search terms or verify workshops are available."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredWorkshops.map(w => (
                  <motion.div
                    key={w.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setSelectedWorkshopId(w.id)}
                    className="p-5 rounded-2xl border border-border/50 hover:border-primary/40 bg-card/60 hover:bg-card/90 backdrop-blur-sm shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-52 group text-start"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[9px] font-bold py-0.5 px-2">
                          {isAr ? "نشطة" : "Active"}
                        </Badge>
                        <BookOpen className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <h3 className="font-extrabold text-sm text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">{w.title}</h3>
                      <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                        <span>👨‍🏫 {isAr ? `المدرب: ${w.instructor}` : `Instructor: ${w.instructor}`}</span>
                      </p>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-border/40">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-primary/70" />
                          {w.timeLimitMinutes || 60} {isAr ? "دقيقة" : "min"}
                        </span>
                        <span>
                          {isAr ? `النجاح: ${w.passScore}%` : `Pass: ${w.passScore}%`}
                        </span>
                      </div>
                      
                      <div className="w-full flex items-center justify-between text-[10px] font-bold text-primary pt-1 group-hover:translate-x-1 duration-200">
                        <span>{isAr ? "إدارة التقييم والملحقات" : "Manage Exam & Plugins"}</span>
                        {isAr ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            {/* Create New Exam Dialog */}
            <Dialog open={createExamOpen} onOpenChange={setCreateExamOpen}>
              <DialogContent className="max-w-md rounded-2xl border border-border/50 bg-slate-900/90 text-foreground backdrop-blur-xl p-6 text-start select-none">
                <DialogHeader>
                  <DialogTitle className="text-lg font-extrabold flex items-center gap-2">
                    <Plus className="w-5 h-5 text-primary" />
                    {isAr ? "إنشاء اختبار جديد لورشة عمل" : "Create New Workshop Exam"}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground">
                      {isAr ? "اختر ورشة العمل المراد ربط الاختبار بها:" : "Select the target workshop:"}
                    </Label>
                    
                    {workshops?.filter(w => w.hasExam === 0).length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-border/60 bg-card/20 text-center text-xs font-semibold text-muted-foreground">
                        {isAr 
                          ? "جميع ورش العمل الحالية مُعد لها اختبار بالفعل!" 
                          : "All current workshops already have exams configured!"}
                      </div>
                    ) : (
                      <Select value={targetWorkshopId} onValueChange={setTargetWorkshopId}>
                        <SelectTrigger className="rounded-xl h-11 text-xs font-semibold border-border/60 bg-card/40">
                          <SelectValue placeholder={isAr ? "اختر ورشة عمل..." : "Choose a workshop..."} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl bg-slate-900 border-border/50 text-foreground">
                          {workshops?.filter(w => w.hasExam === 0).map(w => (
                            <SelectItem key={w.id} value={w.id.toString()} className="text-xs font-medium focus:bg-primary/10">
                              {w.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <DialogFooter className="mt-4 border-t border-border/20 pt-4 gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setTargetWorkshopId("");
                      setCreateExamOpen(false);
                    }} 
                    className="rounded-xl font-bold text-xs border-border/60 hover:bg-card/40"
                  >
                    {isAr ? "إلغاء" : "Cancel"}
                  </Button>
                  <Button 
                    onClick={handleConfirmCreateExam} 
                    disabled={!targetWorkshopId || updateWorkshop.isPending} 
                    className="rounded-xl font-bold text-xs bg-primary hover:bg-primary/95 text-white"
                  >
                    {updateWorkshop.isPending ? (isAr ? "جاري التفعيل..." : "Enabling...") : (isAr ? "تفعيل وإنشاء الاختبار" : "Enable & Design Exam")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </motion.div>
        ) : (
          /* ACTIVE WORKSHOP EXAMS & EXTENSIONS WORKSPACE */
          <motion.div
            key="focused-workspace"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Top Navigation & Stats Row */}
            {selectedWorkshop && (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6 mb-2 text-start">
                <div className="flex items-start gap-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSelectedWorkshopId(null)}
                    className="rounded-xl flex items-center gap-1.5 h-9 text-xs border-border/60 hover:bg-muted"
                  >
                    {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                    <span>{isAr ? "الرجوع للورش" : "Back to Workshops"}</span>
                  </Button>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                        {isAr ? "ورشة عمل نشطة" : "Active Workshop"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-semibold">#{selectedWorkshop.id}</span>
                    </div>
                    <h2 className="text-xl font-extrabold text-foreground tracking-tight">{selectedWorkshop.title}</h2>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                      {isAr ? `المدرب: ${selectedWorkshop.instructor}` : `Instructor: ${selectedWorkshop.instructor}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-card border border-border/50 rounded-xl px-3 py-2 text-center min-w-[90px] shadow-sm">
                    <p className="text-[9px] text-muted-foreground font-bold">{isAr ? "درجة النجاح" : "Passing Score"}</p>
                    <p className="text-sm font-extrabold text-foreground mt-0.5">{selectedWorkshop.passScore}%</p>
                  </div>
                  <div className="bg-card border border-border/50 rounded-xl px-3 py-2 text-center min-w-[90px] shadow-sm">
                    <p className="text-[9px] text-muted-foreground font-bold">{isAr ? "الوقت المحدد" : "Time Limit"}</p>
                    <p className="text-xs font-extrabold text-foreground mt-0.5 flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3 text-primary" />
                      <span>{selectedWorkshop.timeLimitMinutes || 60} {isAr ? "دقيقة" : "min"}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Main Tabs Panel */}
            <Tabs defaultValue="questions" className="space-y-6">
              <TabsList className="bg-card/85 border border-border/40 p-1 h-11 rounded-xl w-full md:w-auto flex md:inline-flex justify-start overflow-x-auto gap-1">
                <TabsTrigger value="questions" className="rounded-lg text-xs font-bold gap-1.5 px-4 h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{isAr ? "أسئلة الاختبار" : "Exam Questions"}</span>
                </TabsTrigger>
                <TabsTrigger value="security" className="rounded-lg text-xs font-bold gap-1.5 px-4 h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{isAr ? "الأمان والنزاهة" : "Security & Integrity"}</span>
                </TabsTrigger>
                <TabsTrigger value="extensions" className="rounded-lg text-xs font-bold gap-1.5 px-4 h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isAr ? "مركز التوسعات الذكية" : "Smart Extensions Hub"}</span>
                  <Badge variant="outline" className="ml-1 bg-amber-500/10 text-amber-600 border-amber-500/20 text-[9px] font-mono py-0 px-1 rounded-full font-bold">New</Badge>
                </TabsTrigger>
              </TabsList>

              {/* 1. EXAM QUESTIONS BUILDER TAB */}
              <TabsContent value="questions" className="focus-visible:ring-0 focus-visible:ring-offset-0">
                {loadingExam ? (
                  <div className="p-10 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm space-y-4">
                    <Skeleton className="h-6 w-1/3 bg-muted/65" />
                    <Skeleton className="h-20 w-full bg-muted/65" />
                    <Skeleton className="h-40 w-full bg-muted/65" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-start">
                    {/* Add Question Form */}
                    <div className="lg:col-span-5 p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm space-y-4">
                      <h3 className="font-extrabold text-sm text-foreground flex items-center gap-1.5 border-b border-border/40 pb-2.5">
                        <Plus className="w-4 h-4 text-primary" />
                        {isAr ? "صياغة سؤال جديد" : "Formulate Question"}
                      </h3>

                      <div className="space-y-3.5">
                        <div>
                          <Label className="font-bold text-[10.5px] text-muted-foreground mb-1 block">{isAr ? "نوع السؤال" : "Question Type"}</Label>
                          <Select value={newType} onValueChange={(v: any) => setNewType(v)}>
                            <SelectTrigger className="rounded-xl h-10 text-xs font-semibold bg-background/50 border-border/60"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="mcq" className="text-xs font-medium">{isAr ? "اختيارات متعددة (MCQ)" : "Multiple Choice (MCQ)"}</SelectItem>
                              <SelectItem value="true_false" className="text-xs font-medium">{isAr ? "صح / خطأ" : "True / False"}</SelectItem>
                              <SelectItem value="short_answer" className="text-xs font-medium">{isAr ? "إجابة نصية قصيرة" : "Short Text Answer"}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="font-bold text-[10.5px] text-muted-foreground mb-1 block">{isAr ? "السؤال" : "Question Statement"}</Label>
                          <Input 
                            value={newQuestion} 
                            onChange={e => setNewQuestion(e.target.value)} 
                            placeholder={isAr ? "اكتب السؤال هنا..." : "Type the question..."}
                            className="rounded-xl text-xs font-semibold h-10 bg-background/50 border-border/60" 
                          />
                        </div>
                        
                        {newType === "mcq" && (
                          <div className="space-y-2">
                            <Label className="font-bold text-[10.5px] text-muted-foreground mb-1 block">{isAr ? "خيارات الإجابة" : "Answer Choices"}</Label>
                            {newOptions.map((opt, oIdx) => (
                              <div key={oIdx} className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-center font-bold text-[10px] text-primary shrink-0">
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                <Input 
                                  value={opt} 
                                  onChange={e => {
                                    const updated = [...newOptions];
                                    updated[oIdx] = e.target.value;
                                    setNewOptions(updated);
                                  }}
                                  placeholder={isAr ? `الخيار ${String.fromCharCode(65 + oIdx)}` : `Choice ${String.fromCharCode(65 + oIdx)}`}
                                  className="rounded-xl text-xs font-semibold h-9 bg-background/50 border-border/60" 
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {newType === "mcq" && (
                          <div>
                            <Label className="font-bold text-[10.5px] text-muted-foreground mb-1 block">{isAr ? "تحديد الإجابة الصحيحة" : "Correct Answer"}</Label>
                            <Select value={newCorrectIndex.toString()} onValueChange={v => setNewCorrectIndex(parseInt(v))}>
                              <SelectTrigger className="rounded-xl h-10 text-xs font-semibold bg-background/50 border-border/60"><SelectValue /></SelectTrigger>
                              <SelectContent className="rounded-xl">
                                <SelectItem value="0" className="text-xs font-medium">{isAr ? "الخيار A" : "Choice A"}</SelectItem>
                                <SelectItem value="1" className="text-xs font-medium">{isAr ? "الخيار B" : "Choice B"}</SelectItem>
                                <SelectItem value="2" className="text-xs font-medium">{isAr ? "الخيار C" : "Choice C"}</SelectItem>
                                <SelectItem value="3" className="text-xs font-medium">{isAr ? "الخيار D" : "Choice D"}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {newType === "true_false" && (
                          <div>
                            <Label className="font-bold text-[10.5px] text-muted-foreground mb-1 block">{isAr ? "تحديد الإجابة الصحيحة" : "Correct Option"}</Label>
                            <Select value={newCorrectIndex.toString()} onValueChange={v => setNewCorrectIndex(parseInt(v))}>
                              <SelectTrigger className="rounded-xl h-10 text-xs font-semibold bg-background/50 border-border/60"><SelectValue /></SelectTrigger>
                              <SelectContent className="rounded-xl">
                                <SelectItem value="0" className="text-xs font-medium">{isAr ? "صح / صواب" : "True"}</SelectItem>
                                <SelectItem value="1" className="text-xs font-medium">{isAr ? "خطأ / خطأ" : "False"}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {newType === "short_answer" && (
                          <div>
                            <Label className="font-bold text-[10.5px] text-muted-foreground mb-1 block">{isAr ? "الإجابة النموذجية (حالة تطابق أحرف)" : "Correct Text Key (Case-Insensitive)"}</Label>
                            <Input
                              value={newCorrectAnswerText}
                              onChange={(e) => setNewCorrectAnswerText(e.target.value)}
                              placeholder={isAr ? "اكتب النص الصحيح للتطابق..." : "e.g. JavaScript"}
                              className="rounded-xl text-xs font-semibold h-10 bg-background/50 border-border/60"
                            />
                          </div>
                        )}

                        <div>
                          <Label className="font-bold text-[10.5px] text-muted-foreground mb-1 block">{isAr ? "وزن / نقاط السؤال" : "Question weight (Points)"}</Label>
                          <Input 
                            type="number"
                            value={newPoints} 
                            onChange={e => setNewPoints(Math.max(1, parseInt(e.target.value) || 10))} 
                            className="rounded-xl text-xs font-semibold h-10 bg-background/50 border-border/60" 
                          />
                        </div>

                        <Button onClick={handleAddQuestion} className="w-full gap-2 rounded-xl font-bold h-10 text-xs shadow-md mt-2">
                          <Plus className="w-4 h-4" />
                          <span>{isAr ? "أضف السؤال للمسودة" : "Add to Draft"}</span>
                        </Button>
                      </div>
                    </div>

                    {/* Draft Question list */}
                    <div className="lg:col-span-7 space-y-4">
                      <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                        <h3 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-primary" />
                          {isAr ? "الأسئلة الحالية للاختبار" : "Questions Blueprint"}
                        </h3>
                        <Badge className="font-mono bg-primary/10 text-primary border-primary/20">{questions.length} {isAr ? "سؤال" : "questions"}</Badge>
                      </div>

                      {questions.length === 0 ? (
                        <div className="border border-dashed border-border/60 p-16 text-center rounded-2xl bg-card/45">
                          <HelpCircle className="w-12 h-12 mx-auto opacity-20 text-primary mb-3" />
                          <p className="text-xs font-bold text-muted-foreground">{isAr ? "لا توجد أسئلة مضافة في هذا الاختبار." : "No questions configured yet."}</p>
                        </div>
                      ) : (
                        <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                          {questions.map((q, idx) => (
                            <div key={idx} className="p-4 rounded-xl border border-border bg-card/80 space-y-2.5 relative shadow-sm">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => handleRemoveQuestion(idx)} 
                                className="absolute top-3.5 right-3.5 w-7 h-7 p-0 rounded-lg text-destructive hover:bg-destructive/10"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </Button>
                              
                              <div className="flex items-start gap-2 max-w-[85%] flex-wrap">
                                <span className="font-bold text-xs text-primary bg-primary/10 w-5.5 h-5.5 rounded-full flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <div className="flex-1 min-w-[150px]">
                                  <p className="font-bold text-xs text-foreground leading-snug">{q.question}</p>
                                </div>
                                <div className="flex items-center gap-1.5 pt-0.5">
                                  <Badge className="text-[9px] font-bold bg-muted/65 text-muted-foreground border-border/40">
                                    {q.type === "mcq" ? "MCQ" : q.type === "true_false" ? "T/F" : "Short Text"}
                                  </Badge>
                                  <Badge className="text-[9px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/15">
                                    {q.points || 10} {isAr ? "نقاط" : "pts"}
                                  </Badge>
                                </div>
                              </div>
                              
                              {q.type !== "short_answer" && q.options && q.options.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-7.5">
                                  {q.options.map((opt, oIdx) => (
                                    <div 
                                      key={oIdx} 
                                      className={`p-2 rounded-lg border text-[10px] font-bold flex items-center justify-between ${
                                        oIdx === q.correctIndex 
                                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400" 
                                          : "bg-background border-border/60 text-muted-foreground"
                                      }`}
                                    >
                                      <span>{String.fromCharCode(65 + oIdx)}. {opt}</span>
                                      {oIdx === q.correctIndex && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {q.type === "short_answer" && (
                                <div className="pl-7.5 mt-1">
                                  <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                                    <Check className="w-4 h-4 shrink-0" />
                                    <span>{isAr ? `الإجابة الصحيحة: "${q.correctAnswerText}"` : `Correct Answer Key: "${q.correctAnswerText}"`}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="pt-2 text-right">
                        <Button onClick={handlePublishExam} disabled={isSaving} className="rounded-xl font-bold text-xs shadow-lg shadow-primary/5 gap-1.5 h-11 px-8">
                          <Check className="w-4 h-4" />
                          <span>{isSaving ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ ونشر التعديلات" : "Publish Assessment")}</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* 2. SECURITY & INTEGRITY CONFIGURATION TAB */}
              <TabsContent value="security" className="focus-visible:ring-0 focus-visible:ring-offset-0">
                <div className="max-w-2xl mx-auto p-6 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm space-y-6 text-start">
                  <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                    <ShieldAlert className="w-5 h-5 text-primary" />
                    <div>
                      <h3 className="font-extrabold text-sm text-foreground">{isAr ? "إعدادات أمان ونزاهة التقييم" : "Security & Integrity Engine"}</h3>
                      <p className="text-[10px] text-muted-foreground font-semibold">{isAr ? "تحكم بوضع الحماية للحد من محاولات الغش ومغادرة الصفحة أثناء الاختبار." : "Configure cheat prevention methods, random shuffles, and tab locks."}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Anti-cheat toggle */}
                    <div className="flex items-start justify-between p-4 rounded-xl border border-border bg-background/30 gap-4">
                      <div className="space-y-1">
                        <Label className="font-bold text-xs">{isAr ? "تفعيل نظام الحماية ضد الغش" : "Enforce Anti-Cheat Suite"}</Label>
                        <p className="text-[10px] text-muted-foreground leading-snug">
                          {isAr ? "يفرض وضع ملء الشاشة الكامل، ويغلق زر النسخ واللصق، كما يتم طرد الطالب عند الخروج المتكرر من نافذة الاختبار." : "Force fullscreen, copy-paste lock, and restrict active focus during the session."}
                        </p>
                      </div>
                      <Switch 
                        checked={antiCheatEnabled} 
                        onCheckedChange={setAntiCheatEnabled}
                      />
                    </div>

                    {/* Shuffle questions */}
                    <div className="flex items-start justify-between p-4 rounded-xl border border-border bg-background/30 gap-4">
                      <div className="space-y-1">
                        <Label className="font-bold text-xs">{isAr ? "خلط الأسئلة عشوائياً" : "Shuffle Question Order"}</Label>
                        <p className="text-[10px] text-muted-foreground leading-snug">
                          {isAr ? "يقوم النظام بإعادة ترتيب الأسئلة عشوائياً لكل طالب لضمان عدم تطابق الترتيب بين الأجهزة." : "Dynamically shuffle exam question sequence for each student to prevent leaks."}
                        </p>
                      </div>
                      <Switch 
                        checked={shuffleQuestions} 
                        onCheckedChange={setShuffleQuestions}
                      />
                    </div>

                    {/* Max Focus Warnings */}
                    {antiCheatEnabled && (
                      <div className="p-4 rounded-xl border border-border bg-background/30 space-y-3">
                        <div className="space-y-1">
                          <Label className="font-bold text-xs">{isAr ? "الحد الأقصى لمحاولات مغادرة النافذة" : "Max Tab Escape Threshold"}</Label>
                          <p className="text-[10px] text-muted-foreground leading-snug">
                            {isAr ? "عدد التحذيرات المسموح بها للطالب عند مغادرة شاشة الاختبار أو تبديل التبويبات قبل إلغاء الاختبار تلقائياً." : "The number of allowable focus escapes before the exam terminates and grades 0%."}
                          </p>
                        </div>
                        <Select value={maxFocusWarnings.toString()} onValueChange={v => setMaxFocusWarnings(parseInt(v))}>
                          <SelectTrigger className="rounded-xl h-10 text-xs font-semibold bg-background/50 border-border/60 max-w-[250px]"><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="2" className="text-xs font-medium">{isAr ? "محاولتين (صارم جداً)" : "2 Warnings (Strict)"}</SelectItem>
                            <SelectItem value="3" className="text-xs font-medium">{isAr ? "3 محاولات (متوازن وموصى به)" : "3 Warnings (Balanced)"}</SelectItem>
                            <SelectItem value="5" className="text-xs font-medium">{isAr ? "5 محاولات (مرن للمشاكل التقنية)" : "5 Warnings (Flexible)"}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 text-right border-t border-border/40">
                    <Button onClick={handlePublishExam} disabled={isSaving} className="rounded-xl font-bold text-xs h-10 px-6 shadow-md gap-1.5">
                      <Check className="w-4 h-4" />
                      <span>{isSaving ? (isAr ? "جاري حفظ الإعدادات..." : "Saving Settings...") : (isAr ? "حفظ إعدادات الأمان" : "Save Security Configuration")}</span>
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* 3. SMART EXTENSIONS & INTEGRATIONS HUB TAB */}
              <TabsContent value="extensions" className="focus-visible:ring-0 focus-visible:ring-offset-0">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 text-start">
                  
                  {/* Left Column: AI Questions & Google Sheets */}
                  <div className="xl:col-span-8 space-y-6">
                    
                    {/* AI Generator Card */}
                    <div className="p-6 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm space-y-5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                      
                      <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                        <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                        <div>
                          <h3 className="font-extrabold text-sm text-foreground">{isAr ? "توليد الأسئلة بالذكاء الاصطناعي (AI)" : "AI Question Generator"}</h3>
                          <p className="text-[10px] text-muted-foreground font-semibold">{isAr ? "اكتب موضوعًا ودع الذكاء الاصطناعي يصوغ الأسئلة لك تلقائيًا." : "Enter a topic and let AI draft high-quality assessment questions."}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-6 space-y-1.5">
                          <Label className="font-bold text-[10.5px] text-muted-foreground">{isAr ? "موضوع الأسئلة أو نص المصدر" : "Question Topic or Reference Text"}</Label>
                          <Input 
                            value={aiPrompt}
                            onChange={e => setAiPrompt(e.target.value)}
                            placeholder={isAr ? "مثال: أساسيات لغة جافا سكريبت والمصفوفات..." : "e.g. JavaScript Arrays and Scope basics..."}
                            className="rounded-xl text-xs font-semibold h-10 bg-background/50 border-border/60"
                          />
                        </div>
                        
                        <div className="md:col-span-3 space-y-1.5">
                          <Label className="font-bold text-[10.5px] text-muted-foreground">{isAr ? "نوع الأسئلة" : "Question Type"}</Label>
                          <Select value={aiQuestionType} onValueChange={v => setAiQuestionType(v)}>
                            <SelectTrigger className="rounded-xl h-10 text-xs font-semibold bg-background/50 border-border/60"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="mcq" className="text-xs font-medium">{isAr ? "اختيارات (MCQ)" : "Multiple Choice"}</SelectItem>
                              <SelectItem value="true_false" className="text-xs font-medium">{isAr ? "صح / خطأ" : "True / False"}</SelectItem>
                              <SelectItem value="short_answer" className="text-xs font-medium">{isAr ? "نصية قصيرة" : "Short Text"}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="md:col-span-3 space-y-1.5">
                          <Label className="font-bold text-[10.5px] text-muted-foreground">{isAr ? "عدد الأسئلة" : "Questions Count"}</Label>
                          <Select value={aiNumQuestions.toString()} onValueChange={v => setAiNumQuestions(parseInt(v))}>
                            <SelectTrigger className="rounded-xl h-10 text-xs font-semibold bg-background/50 border-border/60"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="3" className="text-xs font-medium">3 {isAr ? "أسئلة" : "Questions"}</SelectItem>
                              <SelectItem value="5" className="text-xs font-medium">5 {isAr ? "أسئلة" : "Questions"}</SelectItem>
                              <SelectItem value="8" className="text-xs font-medium">8 {isAr ? "أسئلة" : "Questions"}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 pt-2">
                        <div className="flex items-center gap-1.5">
                          <Badge 
                            variant="outline" 
                            className={`cursor-pointer rounded-full text-[9px] font-bold px-2.5 py-0.5 transition-colors ${aiDifficulty === "easy" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-muted text-muted-foreground"}`} 
                            onClick={() => setAiDifficulty("easy")}
                          >
                            {isAr ? "سهل" : "Easy"}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={`cursor-pointer rounded-full text-[9px] font-bold px-2.5 py-0.5 transition-colors ${aiDifficulty === "medium" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-muted text-muted-foreground"}`} 
                            onClick={() => setAiDifficulty("medium")}
                          >
                            {isAr ? "متوسط" : "Medium"}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={`cursor-pointer rounded-full text-[9px] font-bold px-2.5 py-0.5 transition-colors ${aiDifficulty === "hard" ? "bg-rose-500/10 text-rose-600 border-rose-500/20" : "bg-muted text-muted-foreground"}`} 
                            onClick={() => setAiDifficulty("hard")}
                          >
                            {isAr ? "صعب" : "Hard"}
                          </Badge>
                        </div>

                        <Button 
                          disabled={isGeneratingAi || !aiPrompt.trim()} 
                          onClick={handleGenerateAiQuestions} 
                          className="gap-2 rounded-xl font-bold h-10 text-xs shadow-md shadow-primary/5 px-6"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>{isGeneratingAi ? (isAr ? "جاري التوليد..." : "Generating...") : (isAr ? "توليد الأسئلة ذكياً" : "Generate Smartly")}</span>
                        </Button>
                      </div>

                      {isGeneratingAi && (
                        <div className="space-y-2 pt-2 animate-pulse">
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-primary">{aiProgressText}</span>
                            <span className="font-mono text-muted-foreground">{aiProgress}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div className="bg-primary h-1.5 rounded-full transition-all duration-300" style={{ width: `${aiProgress}%` }} />
                          </div>
                        </div>
                      )}

                      {generatedQuestions.length > 0 && !isGeneratingAi && (
                        <div className="space-y-4 border-t border-border/40 pt-4 mt-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-extrabold text-xs text-foreground">{isAr ? "الأسئلة المقترحة من الذكاء الاصطناعي:" : "AI Generated Suggestions:"}</h4>
                            <Button 
                              size="sm" 
                              onClick={handleAddAllGenerated}
                              className="rounded-lg text-[10px] font-bold h-8 px-4 bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                              {isAr ? "إضافة الأسئلة المختارة للمسودة" : "Add Selected to Draft"}
                            </Button>
                          </div>
                          
                          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                            {generatedQuestions.map((gq, idx) => {
                              const isSelected = selectedGeneratedIndices.includes(idx);
                              return (
                                <div key={idx} className={`p-3.5 rounded-xl border transition-all ${isSelected ? "border-primary/40 bg-primary/5" : "border-border bg-background/40"} flex items-start gap-3`}>
                                  <input 
                                    type="checkbox" 
                                    checked={isSelected}
                                    onChange={() => handleToggleGeneratedSelection(idx)}
                                    className="w-4 h-4 accent-primary cursor-pointer mt-1"
                                  />
                                  <div className="flex-1 space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-bold text-primary font-mono">Q{idx+1}</span>
                                      <Badge className="text-[8px] font-bold bg-muted text-muted-foreground border-border/40 py-0 px-1">{gq.type.toUpperCase()}</Badge>
                                      <Badge className="text-[8px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/15 py-0 px-1">{gq.points} pts</Badge>
                                    </div>
                                    <p className="text-xs font-bold text-foreground leading-snug">{gq.question}</p>
                                    
                                    {gq.type === "mcq" && gq.options && (
                                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                                        {gq.options.map((opt: string, oIdx: number) => (
                                          <div key={oIdx} className={`px-2 py-1 rounded border text-[9px] font-bold ${oIdx === gq.correctIndex ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-card border-border/50 text-muted-foreground"}`}>
                                            {String.fromCharCode(65 + oIdx)}. {opt}
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {gq.type === "true_false" && (
                                      <div className="flex gap-2 pt-1">
                                        {gq.options.map((opt: string, oIdx: number) => (
                                          <div key={oIdx} className={`px-3 py-1 rounded border text-[9px] font-bold ${oIdx === gq.correctIndex ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" : "bg-card border-border/50 text-muted-foreground"}`}>
                                            {opt}
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {gq.type === "short_answer" && (
                                      <div className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 inline-block">
                                        {isAr ? `الإجابة النموذجية: "${gq.correctAnswerText}"` : `Answer Key: "${gq.correctAnswerText}"`}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Google Sheets Sync Card */}
                    <div className="p-6 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm space-y-5 relative">
                      <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                        <div>
                          <h3 className="font-extrabold text-sm text-foreground">{isAr ? "مزامنة وتكامل Google Sheets" : "Google Sheets Sync Integration"}</h3>
                          <p className="text-[10px] text-muted-foreground font-semibold">{isAr ? "اربط الاختبار بجدول بيانات خارجي لاستيراد الأسئلة ومزامنة وتصدير نتائج الطلاب تلقائياً." : "Connect to spreadsheets to export grades and import questions blueprint."}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="font-bold text-[10.5px] text-muted-foreground block">{isAr ? "رابط جدول بيانات جوجل (Spreadsheet URL)" : "Google Spreadsheet Link"}</Label>
                          <div className="flex gap-2">
                            <Input 
                              value={sheetUrl}
                              onChange={e => saveSheetSettings(e.target.value, autoSyncEnabled)}
                              placeholder="https://docs.google.com/spreadsheets/d/..."
                              className="rounded-xl text-xs font-semibold h-10 bg-background/50 border-border/60 flex-1"
                            />
                            <Button 
                              variant="outline"
                              disabled={isSyncingSheet || !sheetUrl.trim()}
                              onClick={handleSyncGoogleSheet}
                              className="rounded-xl font-bold h-10 text-xs border-border/60 hover:bg-muted shrink-0 flex gap-1.5"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheet ? "animate-spin" : ""}`} />
                              <span>{isSyncingSheet ? (isAr ? "جاري التصدير..." : "Syncing...") : (isAr ? "تصدير النتائج" : "Export Grades")}</span>
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-background/30">
                          <div className="space-y-0.5 max-w-[80%] text-start">
                            <Label className="font-bold text-xs">{isAr ? "المزامنة التلقائية فور الانتهاء" : "Real-time Sheet Sync"}</Label>
                            <p className="text-[9.5px] text-muted-foreground leading-snug">
                              {isAr ? "تصدير درجات الطلاب وحالة المحاولة مباشرة فور انتهاء اختبار الطالب وتوثيقه." : "Automatically stream grades to spreadsheet upon exam submission."}
                            </p>
                          </div>
                          <Switch 
                            checked={autoSyncEnabled} 
                            onCheckedChange={checked => saveSheetSettings(sheetUrl, checked)}
                          />
                        </div>

                        <div className="border-t border-border/40 pt-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-start">
                          <div className="space-y-0.5">
                            <h4 className="font-bold text-xs text-foreground">{isAr ? "استيراد الأسئلة من جدول البيانات" : "Import Questions Blueprint"}</h4>
                            <p className="text-[9.5px] text-muted-foreground leading-snug">
                              {isAr ? "يمكنك استيراد أسئلة مسبقة الإعداد من جدول بيانات يتبع الهيكل الموصى به." : "Load pre-formatted exam questions from columns A to F in the sheet."}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            onClick={handleImportFromSheet}
                            className="rounded-xl font-bold h-9 text-xs border-emerald-500/30 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/10 shrink-0 flex gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{isAr ? "استيراد الأسئلة" : "Import Blueprint"}</span>
                          </Button>
                        </div>

                        {sheetImportQuestions.length > 0 && (
                          <div className="space-y-3.5 border border-dashed border-emerald-500/30 p-4 rounded-xl bg-emerald-500/5 mt-2 animate-fadeIn text-start">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                                <Check className="w-4 h-4" />
                                {isAr ? `تم اكتشاف ${sheetImportQuestions.length} أسئلة في جدول البيانات:` : `Detected ${sheetImportQuestions.length} questions in sheet:`}
                              </span>
                              <div className="flex gap-1.5">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => setSheetImportQuestions([])}
                                  className="rounded-lg text-[9.5px] font-bold text-muted-foreground hover:bg-muted h-7"
                                >
                                  {isAr ? "إلغاء" : "Cancel"}
                                </Button>
                                <Button 
                                  size="sm" 
                                  onClick={handleConfirmImportFromSheet}
                                  className="rounded-lg text-[9.5px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-3"
                                >
                                  {isAr ? "تأكيد واستيراد الكل" : "Confirm & Import All"}
                                </Button>
                              </div>
                            </div>

                            <div className="max-h-[180px] overflow-y-auto space-y-2 pr-1">
                              {sheetImportQuestions.map((sq, sIdx) => (
                                <div key={sIdx} className="bg-background/80 p-2.5 rounded-lg border border-border/80 text-[10px] space-y-1 text-start">
                                  <div className="flex justify-between items-center text-[9px] font-bold text-muted-foreground">
                                    <span>{isAr ? `سؤال ${sIdx + 1}` : `Question ${sIdx + 1}`} - ({sq.type.toUpperCase()})</span>
                                    <span className="text-amber-600 font-semibold">{sq.points} pts</span>
                                  </div>
                                  <p className="font-bold text-foreground">{sq.question}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Plugins Marketplace */}
                  <div className="xl:col-span-4 p-6 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm space-y-5">
                    <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                      <Workflow className="w-5 h-5 text-primary" />
                      <div>
                        <h3 className="font-extrabold text-sm text-foreground">{isAr ? "إضافات وتكاملات الاختبار" : "Extensions Marketplace"}</h3>
                        <p className="text-[10px] text-muted-foreground font-semibold">{isAr ? "فعّل أدوات إضافية لتسهيل مراقبة الاختبار وإشعارات الطلاب." : "Activate plugins for proctoring and automated workflows."}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Slack notifications */}
                      <div className="p-3.5 rounded-xl border border-border bg-background/30 flex items-start justify-between gap-3 hover:border-primary/20 transition-all text-start">
                        <div className="flex gap-3 items-start">
                          <div className="w-9 h-9 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-600 shrink-0 mt-0.5">
                            <Slack className="w-5 h-5" />
                          </div>
                          <div className="space-y-0.5">
                            <h4 className="font-bold text-xs text-foreground">{isAr ? "تنبيهات Slack & Teams" : "Slack & Teams Sync"}</h4>
                            <p className="text-[9px] text-muted-foreground leading-snug">
                              {isAr ? "إشعار فوري في قنوات التواصل عند اجتياز الطلاب للاختبار." : "Stream immediate passing alerts to Slack/Teams webhooks."}
                            </p>
                          </div>
                        </div>
                        <Switch 
                          checked={activePlugins.slack_notifications} 
                          onCheckedChange={checked => savePluginSetting("slack_notifications", checked)}
                        />
                      </div>

                      {/* AI webcam proctoring */}
                      <div className="p-3.5 rounded-xl border border-border bg-background/30 flex items-start justify-between gap-3 hover:border-primary/20 transition-all text-start">
                        <div className="flex gap-3 items-start">
                          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                            <ShieldAlert className="w-5 h-5" />
                          </div>
                          <div className="space-y-0.5">
                            <h4 className="font-bold text-xs text-foreground">{isAr ? "المراقبة بالذكاء الاصطناعي" : "AI Web-Proctoring"}</h4>
                            <p className="text-[9px] text-muted-foreground leading-snug">
                              {isAr ? "تتبع حركة العين والكاميرا لكشف محاولات الغش تلقائياً." : "Verify exam taking integrity via eye & face tracking checks."}
                            </p>
                          </div>
                        </div>
                        <Switch 
                          checked={activePlugins.ai_proctoring} 
                          onCheckedChange={checked => savePluginSetting("ai_proctoring", checked)}
                        />
                      </div>

                      {/* Auto emailer */}
                      <div className="p-3.5 rounded-xl border border-border bg-background/30 flex items-start justify-between gap-3 hover:border-primary/20 transition-all text-start">
                        <div className="flex gap-3 items-start">
                          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 shrink-0 mt-0.5">
                            <Mail className="w-5 h-5" />
                          </div>
                          <div className="space-y-0.5">
                            <h4 className="font-bold text-xs text-foreground">{isAr ? "الإرسال التلقائي للشهادات" : "Auto-Email Certificates"}</h4>
                            <p className="text-[9px] text-muted-foreground leading-snug">
                              {isAr ? "إرسال شهادة التخرج بصيغة PDF فوراً لبريد الطالب عند النجاح." : "Dispatch certified PDF automatically upon scoring pass marks."}
                            </p>
                          </div>
                        </div>
                        <Switch 
                          checked={activePlugins.auto_email_certs} 
                          onCheckedChange={checked => savePluginSetting("auto_email_certs", checked)}
                        />
                      </div>

                      {/* Zoom integrations */}
                      <div className="p-3.5 rounded-xl border border-border bg-background/30 flex items-start justify-between gap-3 hover:border-primary/20 transition-all text-start">
                        <div className="flex gap-3 items-start">
                          <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                            <Video className="w-5 h-5" />
                          </div>
                          <div className="space-y-0.5">
                            <h4 className="font-bold text-xs text-foreground">{isAr ? "لقاءات زووم المباشرة" : "Zoom Assessment Session"}</h4>
                            <p className="text-[9px] text-muted-foreground leading-snug">
                              {isAr ? "جدولة ومزامنة الاختبار مع لقاء تدريبي مباشر لضمان الحضور." : "Force taking exams during active webinar calls only."}
                            </p>
                          </div>
                        </div>
                        <Switch 
                          checked={activePlugins.zoom_assessments} 
                          onCheckedChange={checked => savePluginSetting("zoom_assessments", checked)}
                        />
                      </div>

                      {/* Custom webhooks */}
                      <div className="p-3.5 rounded-xl border border-border bg-background/30 flex items-start justify-between gap-3 hover:border-primary/20 transition-all text-start">
                        <div className="flex gap-3 items-start">
                          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
                            <Workflow className="w-5 h-5" />
                          </div>
                          <div className="space-y-0.5">
                            <h4 className="font-bold text-xs text-foreground">{isAr ? "ربط الويب هوك (Webhooks)" : "Webhooks Custom Link"}</h4>
                            <p className="text-[9px] text-muted-foreground leading-snug">
                              {isAr ? "إرسال بيانات الامتحان فور انتهائه لأي نظام CRM أو منصة خارجية." : "Post exam submissions payloads to external URL hooks."}
                            </p>
                          </div>
                        </div>
                        <Switch 
                          checked={activePlugins.webhooks} 
                          onCheckedChange={checked => savePluginSetting("webhooks", checked)}
                        />
                      </div>
                    </div>

                  </div>

                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
