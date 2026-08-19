import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/layout/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLanguage } from "@/components/layout/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateUser } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { 
  FileText, Plus, Trash2, ArrowLeft, Briefcase, GraduationCap, 
  Code, Sparkles, Check, Download, Languages, Mail, Phone, 
  MapPin, Settings, User as UserIcon, Loader2, Eye, Layout, Palette
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface CVData {
  summary: string;
  skills: string[];
  experience: {
    title: string;
    company: string;
    startDate: string;
    endDate: string;
    description: string;
  }[];
  education: {
    degree: string;
    institution: string;
    startDate: string;
    endDate: string;
  }[];
  template: string;
  themeColor: string;
  fontSize: "small" | "medium" | "large";
  margin: "narrow" | "normal" | "wide";
  sector: string;
  language: "ar" | "en";
  fullName: string;
  avatarUrl: string;
  phone: string;
  email: string;
  address: string;
  targetTitle: string;
}

const defaultCV: CVData = {
  summary: "إداري متمرس بخبرة تزيد عن 5 سنوات في إدارة العمليات اليومية وتنسيق المشاريع للمؤسسات المتوسطة والكبرى. أمتلك مهارات قيادية قوية، وقدرة عالية على خفض التكاليف وتحسين كفاءة الإنتاجية.",
  skills: [
    "إدارة المشاريع",
    "تنظيم الميزانيات",
    "التخطيط الاستراتيجي",
    "Microsoft Excel",
    "حل المشكلات",
    "القيادة",
    "إدارة الوقت"
  ],
  experience: [
    {
      title: "مدير عمليات (Operations Manager)",
      company: "مجموعة الميزان التجارية",
      startDate: "2023-01",
      endDate: "",
      description: "تنسيق العمليات بين الأقسام المختلفة وزيادة الإنتاجية الكلية بنسبة 15%. إدارة ميزانيات التشغيل والمشتريات وتحقيق خفض في المصاريف غير الضرورية بمقدار 20%. توظيف وتدريب الكفاءات الإدارية الجديدة ومتابعة مؤشرات الأداء."
    },
    {
      title: "منسق مشاريع إداري (Project Coordinator)",
      company: "شركة أفق المستقبل للاستشارات",
      startDate: "2021-09",
      endDate: "2023-01",
      description: "إعداد التقارير الإدارية الدورية والتحليلات البيانية لرفعها للإدارة العليا. تنظيم وتسهيل الاجتماعات والاتصالات مع العملاء والموردين الخارجيين."
    }
  ],
  education: [
    {
      degree: "بكالوريوس إدارة أعمال",
      institution: "جامعة بغداد",
      startDate: "2017-09",
      endDate: "2021-07"
    }
  ],
  template: "creative",
  themeColor: "#1e3a8a",
  fontSize: "medium",
  margin: "normal",
  sector: "الإدارة والمحاسبة",
  language: "ar",
  fullName: "",
  avatarUrl: "",
  phone: "",
  email: "",
  address: "",
  targetTitle: ""
};

const templates = [
  { id: "creative", nameAr: "إبداعي عصري", nameEn: "Creative Modern", descAr: "شريط جانبي داكن وتصميم احترافي متناسق" },
  { id: "executive", nameAr: "تنفيذي فاخر", nameEn: "Executive Elite", descAr: "ترويسة ملونة وخطوط رسمية للإداريين" },
  { id: "modern", nameAr: "عصري ببطاقات", nameEn: "Modern Grid", descAr: "تنسيق متوازن ببطاقات ملونة مريحة للعين" },
  { id: "tech", nameAr: "تقني حداثي", nameEn: "Minimal Tech", descAr: "تصميم مخصص للمبرمجين والمهندسين" },
  { id: "colored_header", nameAr: "ترويسة ملونة", nameEn: "Banner Accent", descAr: "ترويسة علوية جذابة بألوانك المفضلة" },
  { id: "boxes", nameAr: "صناديق كانفا", nameEn: "Boxed Cards", descAr: "صناديق مقسمة ومحددة بلمسات عصرية" },
  { id: "compact", nameAr: "أنيق مدمج", nameEn: "Elegant Compact", descAr: "تصميم مدمج ومثالي لطباعة صفحة واحدة" },
  { id: "classic", nameAr: "شركي كلاسيكي", nameEn: "Corporate Classic", descAr: "تصميم كلاسيكي متوافق مع أنظمة الـ ATS" }
];

const colors = [
  { hex: "#1e3a8a", labelAr: "كحلي", labelEn: "Navy Blue" },
  { hex: "#064e3b", labelAr: "أخضر زمردي", labelEn: "Emerald Green" },
  { hex: "#7f1d1d", labelAr: "أحمر عنابي", labelEn: "Crimson Red" },
  { hex: "#4f46e5", labelAr: "نيلي الملكي", labelEn: "Royal Indigo" },
  { hex: "#8B5A2B", labelAr: "بني دافئ", labelEn: "Warm Brown" },
  { hex: "#0f172a", labelAr: "رمادي داكن", labelEn: "Slate Black" }
];

const fontSizeStyles = {
  small: {
    body: "text-[10px] sm:text-xs",
    h1: "text-lg sm:text-xl",
    h2: "text-xs sm:text-sm",
    h3: "text-[11px] sm:text-xs",
    badge: "text-[9px]"
  },
  medium: {
    body: "text-xs sm:text-sm",
    h1: "text-xl sm:text-2xl",
    h2: "text-sm sm:text-base",
    h3: "text-xs sm:text-sm",
    badge: "text-[10px]"
  },
  large: {
    body: "text-sm sm:text-base",
    h1: "text-2xl sm:text-3xl",
    h2: "text-base sm:text-lg",
    h3: "text-sm sm:text-base",
    badge: "text-xs"
  }
};

const marginStyles = {
  narrow: "p-4 sm:p-6 space-y-4",
  normal: "p-6 sm:p-8 space-y-6",
  wide: "p-8 sm:p-12 space-y-8"
};

const sectors = [
  "الإدارة والمحاسبة",
  "التكنولوجيا والبرمجة",
  "التسويق والمبيعات",
  "الهندسة والعلوم",
  "التعليم والتدريب"
];

const sectorData: Record<string, { summary: string; experience: typeof defaultCV.experience; skills: string[] }> = {
  "الإدارة والمحاسبة": {
    summary: "إداري متمرس بخبرة تزيد عن 5 سنوات في إدارة العمليات اليومية وتنسيق المشاريع للمؤسسات المتوسطة والكبرى. أمتلك مهارات قيادية قوية، وقدرة عالية على خفض التكاليف وتحسين كفاءة الإنتاجية.",
    experience: [
      {
        title: "مدير عمليات (Operations Manager)",
        company: "مجموعة الميزان التجارية",
        startDate: "2023-01",
        endDate: "",
        description: "تنسيق العمليات بين الأقسام المختلفة وزيادة الإنتاجية الكلية بنسبة 15%. إدارة ميزانيات التشغيل والمشتريات وتحقيق خفض في المصاريف غير الضرورية بمقدار 20%. توظيف وتدريب الكفاءات الإدارية الجديدة ومتابعة مؤشرات الأداء."
      },
      {
        title: "منسق مشاريع إداري (Project Coordinator)",
        company: "شركة أفق المستقبل للاستشارات",
        startDate: "2021-09",
        endDate: "2023-01",
        description: "إعداد التقارير الإدارية الدورية والتحليلات البيانية لرفعها للإدارة العليا. تنظيم وتسهيل الاجتماعات والاتصالات مع العملاء والموردين الخارجيين."
      }
    ],
    skills: ["إدارة المشاريع", "تنظيم الميزانيات", "التخطيط الاستراتيجي", "Microsoft Excel", "حل المشكلات", "القيادة", "إدارة الوقت"]
  },
  "التكنولوجيا والبرمجة": {
    summary: "مطور برمجيات ويب متكامل (Full-Stack Developer) ذو خبرة عملية في تصميم وتطوير الأنظمة والبرمجيات الحديثة. متمكن من أطر العمل الحديثة مثل React و Node.js وكتابة أكواد نظيفة وقابلة للتطوير.",
    experience: [
      {
        title: "مطور تطبيقات ويب أول (Senior Full-Stack Developer)",
        company: "حلول البرمجيات الذكية",
        startDate: "2022-05",
        endDate: "",
        description: "بناء وتطوير واجهات المستخدم باستخدام React و TypeScript مع تحسين سرعة تحميل التطبيق بنسبة 30%. تصميم وإعداد خوادم API سريعة وآمنة باستخدام Node.js وقواعد بيانات PostgreSQL."
      },
      {
        title: "مطور واجهات أمامية (Frontend Developer)",
        company: "شركة الابتكار التقني",
        startDate: "2020-09",
        endDate: "2022-05",
        description: "تحويل التصاميم الرسومية إلى واجهات ويب تفاعلية متجاوبة. العمل بالتعاون مع فريق التصميم لتحسين واجهة المستخدم وتجربة المستخدم للمنصات الرقمية."
      }
    ],
    skills: ["React", "TypeScript", "Node.js", "Next.js", "PostgreSQL", "Docker", "Git", "REST APIs"]
  },
  "التسويق والمبيعات": {
    summary: "أخصائي تسويق رقمي محترف ذو خلفية قوية في تخطيط وإدارة الحملات الإعلانية المدفوعة وتحسين محركات البحث. أركز على تحقيق أعلى عائد استثمار (ROI) للعلامات التجارية وزيادة نمو المبيعات.",
    experience: [
      {
        title: "مدير حملات تسويق رقمي (Digital Marketing Manager)",
        company: "الريادة للإعلان والتسويق",
        startDate: "2023-03",
        endDate: "",
        description: "إعداد وإدارة خطط التسويق عبر وسائل التواصل الاجتماعي ومحركات البحث بميزانية شهرية تجاوزت 20,000 دولار. تحليل مؤشرات أداء الحملات وزيادة معدل التحويل للمتجر الإلكتروني بنسبة 25%."
      },
      {
        title: "أخصائي مبيعات وتسويق (Sales & Marketing Specialist)",
        company: "شركة المنتجات الغذائية الوطنية",
        startDate: "2021-02",
        endDate: "2023-03",
        description: "التواصل مع الموزعين والعملاء الرئيسيين وفتح قنوات بيعية جديدة. تطوير مواد المحتوى التسويقي وإطلاق العروض الترويجية الموسمية."
      }
    ],
    skills: ["التسويق الرقمي", "إعلانات Google & Meta", "SEO", "إدارة علاقات العملاء CRM", "تحليل البيانات", "كتابة الإعلانات Copywriting"]
  },
  "الهندسة والعلوم": {
    summary: "مهندس مشروع متكامل ذو خلفية ممتازة في الإشراف الفني الميداني، وضبط جودة المواد والمواصفات، وتنسيق العمل بين الفرق الاستشارية والتنفيذية لضمان إنجاز المشاريع في المواعيد المحددة.",
    experience: [
      {
        title: "مهندس موقع أول (Site Engineer)",
        company: "الشركة الوطنية للمقاولات",
        startDate: "2022-01",
        endDate: "",
        description: "متابعة أعمال التنفيذ الميدانية وتطبيق أعلى معايير السلامة المهنية. مراجعة المخططات الهندسية وحساب كميات المواد وحل المعوقات الفنية في الموقع."
      }
    ],
    skills: ["AutoCAD", "إدارة الموقع", "حساب الكميات", "إدارة السلامة HSE", "التحليل الهندسي", "إعداد التقرير الفنية"]
  },
  "التعليم والتدريب": {
    summary: "مدرب ومدرس محترف يتمتع بقدرة متميزة على تبسيط المفاهيم المعقدة، وتطوير المناهج التفاعلية، واستخدام التقنيات الحديثة لرفع مستوى استيعاب الطلاب والمشاركين في الورش.",
    experience: [
      {
        title: "مدرب تنمية مهارات (Skills Trainer)",
        company: "أكاديمية التطوير المهني",
        startDate: "2021-06",
        endDate: "",
        description: "تقديم ورش تدريبية تفاعلية وحضور شخصي لأكثر من 500 متدرب. تصميم وتطوير الحقائب التدريبية وأساليب التقييم المباشر."
      }
    ],
    skills: ["تطوير المناهج", "التدريب التفاعلي", "الإلقاء والعرض", "إدارة القاعات", "التقييم المستمر", "التدريب الأونلاين"]
  }
};

const LOCAL_DRAFT_KEY = "mharat_cv_draft_v1";

export default function CVBuilderPage() {
  const { user, login } = useAuth();
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { toast } = useToast();
  const updateUser = useUpdateUser();

  const [cv, setCV] = useState<CVData>(() => {
    // 1. First priority: Check for saved draft in localStorage
    const savedDraft = localStorage.getItem(LOCAL_DRAFT_KEY);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        return { ...defaultCV, ...parsed };
      } catch (e) {
        console.error("Failed to parse local CV draft:", e);
      }
    }

    // 2. Second priority: Load from authenticated user profile
    if (user) {
      const userCv = (user as any).cv || {};
      const contactInfo = (user as any).contactInfo || {};
      return {
        ...defaultCV,
        fullName: user.name || "",
        avatarUrl: user.avatarUrl || "",
        phone: contactInfo.phone || "",
        email: user.email || "",
        address: contactInfo.address || "",
        ...userCv
      };
    }
    return defaultCV;
  });

  const [zoom, setZoom] = useState(0.85);
  const [activeTab, setActiveTab] = useState("personal");
  const [tempSkill, setTempSkill] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [autosaveStatus, setAutosaveStatus] = useState<"saved" | "saving" | "error">("saved");

  // Sync user profile values when user loads initially
  useEffect(() => {
    if (user && !localStorage.getItem(LOCAL_DRAFT_KEY)) {
      const userCv = (user as any).cv || {};
      const contactInfo = (user as any).contactInfo || {};
      setCV(prev => ({
        ...prev,
        fullName: prev.fullName || user.name || "",
        avatarUrl: prev.avatarUrl || user.avatarUrl || "",
        phone: prev.phone || contactInfo.phone || "",
        email: prev.email || user.email || "",
        address: prev.address || contactInfo.address || "",
        ...userCv
      }));
    }
  }, [user]);

  // Save changes to localStorage automatically
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(cv));
    } catch (e) {
      console.error("Failed to save draft to localStorage:", e);
    }
  }, [cv]);

  // Translate template layout headings
  const handleTranslateContent = () => {
    const nextLang: "ar" | "en" = cv.language === "ar" ? "en" : "ar";
    let updatedCV: CVData = { ...cv, language: nextLang };
    
    if (nextLang === "en" && cv.fullName !== "Fay W.") {
      updatedCV = {
        ...updatedCV,
        fullName: cv.fullName || "Ahmed Al-Rashidi",
        targetTitle: "Operations & Project Manager",
        summary: "Results-driven Operations Manager with 5+ years of experience directing daily workflows, coordinating multi-departmental projects, and optimizing operational costs for corporate entities.",
        skills: ["Project Management", "Budget Control", "Strategic Planning", "Microsoft Excel", "Problem Solving", "Leadership", "Time Management"],
        experience: [
          {
            title: "Operations Manager",
            company: "Al-Mizan Commercial Group",
            startDate: "2023-01",
            endDate: "",
            description: "Led cross-departmental operations, boosting productivity by 15%. Managed operational budgets and reduced redundant costs by 20%."
          },
          {
            title: "Project Coordinator",
            company: "Future Horizon Consulting",
            startDate: "2021-09",
            endDate: "2023-01",
            description: "Prepared executive analytics and facilitated key stakeholder communications."
          }
        ],
        education: [
          {
            degree: "B.Sc. in Business Administration",
            institution: "University of Baghdad",
            startDate: "2017-09",
            endDate: "2021-07"
          }
        ]
      };
    } else if (nextLang === "ar" && cv.fullName === "Ahmed Al-Rashidi") {
      updatedCV = { ...defaultCV, language: "ar" };
    }
    
    setCV(updatedCV);
    toast({
      title: nextLang === "ar" ? "تم تحويل لغة القالب للعربية" : "Translated template to English",
      description: nextLang === "ar" ? "تغير اتجاه الصفحة والعناوين" : "Switched preview layout and headings to LTR."
    });
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  const handleManualSave = () => {
    if (!user) return;
    setAutosaveStatus("saving");
    updateUser.mutate({
      id: user.id,
      data: {
        cv: cv
      } as any
    }, {
      onSuccess: (data) => {
        setAutosaveStatus("saved");
        login(data as any);
        toast({
          title: isAr ? "تم حفظ السيرة الذاتية بنجاح" : "CV Saved Successfully",
          description: isAr ? "تم حفظ التعديلات في ملفك الشخصي بالمنصة." : "Updates are saved to your profile."
        });
      },
      onError: () => {
        setAutosaveStatus("error");
        toast({
          title: isAr ? "خطأ أثناء الحفظ" : "Error saving CV",
          variant: "destructive"
        });
      }
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: isAr ? "حجم الملف كبير جداً" : "File too large",
        description: isAr ? "الحد الأقصى هو 2 ميجابايت" : "Max size is 2MB",
        variant: "destructive"
      });
      return;
    }
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setCV(prev => ({ ...prev, avatarUrl: reader.result as string }));
      toast({ title: isAr ? "تم تحديث الصورة الشخصية" : "Profile photo updated" });
    };
  };

  const handleAddExperience = () => {
    setCV(prev => ({
      ...prev,
      experience: [...prev.experience, { title: "", company: "", startDate: "", endDate: "", description: "" }]
    }));
  };

  const handleUpdateExperience = (index: number, field: string, value: string) => {
    const nextExp = [...cv.experience];
    nextExp[index] = { ...nextExp[index], [field]: value };
    setCV(prev => ({ ...prev, experience: nextExp }));
  };

  const handleRemoveExperience = (index: number) => {
    setCV(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index)
    }));
  };

  const handleAddEducation = () => {
    setCV(prev => ({
      ...prev,
      education: [...prev.education, { degree: "", institution: "", startDate: "", endDate: "" }]
    }));
  };

  const handleUpdateEducation = (index: number, field: string, value: string) => {
    const nextEdu = [...cv.education];
    nextEdu[index] = { ...nextEdu[index], [field]: value };
    setCV(prev => ({ ...prev, education: nextEdu }));
  };

  const handleRemoveEducation = (index: number) => {
    setCV(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
  };

  const handleAddSkill = () => {
    if (!tempSkill.trim()) return;
    if (cv.skills.includes(tempSkill.trim())) return;
    setCV(prev => ({
      ...prev,
      skills: [...prev.skills, tempSkill.trim()]
    }));
    setTempSkill("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setCV(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skillToRemove)
    }));
  };

  const handleAIAction = (type: "summary" | "experience" | "skills" | "grammar") => {
    setAiLoading(true);
    setTimeout(() => {
      const data = sectorData[cv.sector] || sectorData["الإدارة والمحاسبة"];
      setCV(prev => {
        const next = { ...prev };
        if (type === "summary") {
          next.summary = data.summary;
        } else if (type === "experience") {
          next.experience = data.experience;
        } else if (type === "skills") {
          next.skills = data.skills;
        } else if (type === "grammar") {
          next.summary = "إداري محترف يتمتع بخبرة تزيد عن 5 سنوات في قيادة العمليات اليومية وتنسيق المشاريع للمؤسسات الكبرى. أتميز بمهارات تنظيمية عالية وقدرة مثبتة على تحسين الكفاءة التشغيلية وخفض التكاليف المادية.";
        }
        return next;
      });
      setAiLoading(false);
      toast({
        title: isAr ? "تم تحسين المحتوى بالذكاء الاصطناعي" : "Content optimized with AI",
        description: isAr ? "تم إدراج بيانات ملائمة للقطاع المختار." : "Updated contents relative to selected sector."
      });
    }, 1500);
  };

  const handleAISubmitPrompt = () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setTimeout(() => {
      setCV(prev => ({
        ...prev,
        summary: `خبير مهني في قطاع ${cv.sector} يسعى لتقديم قيمة إضافية للمؤسسة مستنداً إلى خبرته في مجالات التطوير، والعمل الجماعي، وتوظيف الأنظمة التقنية لتسهيل سير العمل اليومي.`
      }));
      setAiLoading(false);
      setAiPrompt("");
      toast({
        title: isAr ? "تمت المعالجة بنجاح" : "Prompt processed",
        description: isAr ? "تم إنشاء صياغة مقترحة للنبذة الشخصية." : "Generated custom AI statement for summary."
      });
    }, 1500);
  };

  const selectedFontSize = fontSizeStyles[cv.fontSize];
  const selectedMargin = marginStyles[cv.margin];
  const colorHex = cv.themeColor;

  // 🎨 RENDER CANVA-GRADE RESUME TEMPLATE SHEET (Used for preview & print portal)
  const renderResumeSheet = (isPrint = false) => (
    <div 
      id={isPrint ? "resume-print-sheet" : "resume-preview-sheet"}
      dir={cv.language === "ar" ? "rtl" : "ltr"}
      className={`w-[794px] h-[1123px] bg-white text-slate-800 border border-slate-200 shadow-md select-none ${isPrint ? "relative border-none shadow-none" : "absolute left-0 top-0 origin-top-left"} ${selectedMargin}`}
      style={{ 
        fontFamily: cv.template === "classic" || cv.template === "elegant" || cv.template === "executive" ? "'Lora', Georgia, serif" : "sans-serif",
        backgroundColor: cv.template === "sand" ? "#FAF6F0" : "#ffffff",
        transform: isPrint ? "none" : `scale(${zoom})`
      }}
    >
      {/* TEMPLATE 1: CREATIVE (إبداعي عصري) */}
      {cv.template === "creative" && (
        <div className="h-full flex flex-col justify-between p-2">
          <div className="grid grid-cols-12 gap-6 h-full items-stretch">
            <div className="col-span-8 space-y-6 text-slate-700">
              {cv.summary && (
                <div className="relative border-l-4 pl-4 py-1 print-avoid-break" style={{ borderColor: colorHex }}>
                  <p className={`leading-relaxed font-serif text-slate-700 ${selectedFontSize.body}`}>
                    {cv.summary}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <h2 className={`font-bold font-serif border-b-2 pb-1 text-slate-800 ${selectedFontSize.h2}`} style={{ borderBottomColor: colorHex }}>
                  {cv.language === "ar" ? "الخبرات المهنية" : "Work Experience"}
                </h2>
                <div className="space-y-4 relative border-l-2 pl-3 ml-2" style={{ borderColor: `${colorHex}30` }}>
                  {cv.experience.map((exp, i) => (
                    <div key={i} className="space-y-1 relative print-avoid-break">
                      <div className="absolute -left-[17px] top-1.5 w-2.5 h-2.5 rounded-full border-2 bg-white" style={{ borderColor: colorHex }} />
                      <div className="flex justify-between items-start flex-wrap gap-1">
                        <h3 className={`font-extrabold text-slate-800 ${selectedFontSize.h3}`}>{exp.title}</h3>
                        <span className="text-[10px] text-muted-foreground font-bold font-sans px-2 py-0.5 bg-slate-100 rounded-md">
                          {exp.startDate} - {exp.endDate || (cv.language === "ar" ? "الحاضر" : "Present")}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold" style={{ color: colorHex }}>{exp.company}</p>
                      {exp.description && (
                        <p className={`text-slate-600 leading-relaxed mt-1 ${selectedFontSize.body}`}>{exp.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h2 className={`font-bold font-serif border-b-2 pb-1 text-slate-800 ${selectedFontSize.h2}`} style={{ borderBottomColor: colorHex }}>
                  {cv.language === "ar" ? "التعليم والدراسة" : "Education & Credentials"}
                </h2>
                <div className="space-y-3">
                  {cv.education.map((edu, i) => (
                    <div key={i} className="space-y-0.5 p-2 bg-slate-50/80 rounded-xl border border-slate-100 print-avoid-break">
                      <div className="flex justify-between items-start flex-wrap gap-1">
                        <h3 className={`font-extrabold text-slate-800 ${selectedFontSize.h3}`}>{edu.degree}</h3>
                        <span className="text-[10px] text-muted-foreground font-bold">{edu.startDate} - {edu.endDate}</span>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-500">{edu.institution}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-span-4 rounded-2xl p-5 text-white flex flex-col justify-between items-center text-center space-y-6 shadow-md" style={{ backgroundColor: "#1E2229" }}>
              <div className="space-y-4 w-full flex flex-col items-center">
                {cv.avatarUrl ? (
                  <img src={cv.avatarUrl} alt="Profile" className="w-24 h-24 rounded-2xl object-cover border-2 shadow-md" style={{ borderColor: colorHex }} />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700 text-slate-400">
                    <UserIcon className="w-10 h-10" />
                  </div>
                )}
                <div>
                  <h1 className={`font-extrabold text-white leading-none ${selectedFontSize.h1}`}>{cv.fullName}</h1>
                  <p className="text-[9.5px] uppercase tracking-wider font-extrabold font-sans mt-2 leading-tight" style={{ color: colorHex }}>{cv.targetTitle}</p>
                </div>
              </div>

              <div className="w-full text-slate-300 space-y-3 pt-4 border-t border-slate-800">
                <h4 className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest text-center">{cv.language === "ar" ? "التواصل" : "Contact"}</h4>
                <div className="space-y-2 text-[10.5px] font-semibold flex flex-col items-center">
                  {cv.email && <div className="flex items-center gap-1.5 truncate max-w-full"><Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /><span className="truncate">{cv.email}</span></div>}
                  {cv.phone && <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" /><span>{cv.phone}</span></div>}
                  {cv.address && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /><span>{cv.address}</span></div>}
                </div>
              </div>

              <div className="w-full space-y-3 pt-4 border-t border-slate-800">
                <h4 className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest text-center">{cv.language === "ar" ? "المهارات" : "Skills"}</h4>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {cv.skills.map((skill, idx) => (
                    <Badge key={idx} variant="outline" className={`bg-slate-800 text-slate-200 border-slate-700 px-2 py-0.5 rounded-lg font-bold font-sans ${selectedFontSize.badge}`}>{skill}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEMPLATE 2: EXECUTIVE (تنفيذي فاخر) */}
      {cv.template === "executive" && (
        <div className="h-full flex flex-col justify-between space-y-6 font-serif">
          <div className="text-center space-y-2 border-b-4 border-double pb-4" style={{ borderColor: colorHex }}>
            <h1 className={`font-black text-slate-900 tracking-wide uppercase ${selectedFontSize.h1}`}>{cv.fullName}</h1>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-600 font-sans">{cv.targetTitle}</p>
            <div className="flex justify-center gap-4 text-[11px] font-medium text-slate-500 font-sans pt-1">
              {cv.phone && <span>{cv.phone}</span>}
              {cv.email && <span>• {cv.email}</span>}
              {cv.address && <span>• {cv.address}</span>}
            </div>
          </div>

          <div className="space-y-6 flex-1">
            {cv.summary && (
              <div className="space-y-1.5 print-avoid-break">
                <h2 className="font-bold text-xs uppercase tracking-widest text-slate-800 border-b pb-1" style={{ color: colorHex, borderColor: `${colorHex}30` }}>
                  ❖ {cv.language === "ar" ? "الملخص التنفيذي" : "Executive Summary"}
                </h2>
                <p className={`leading-relaxed text-slate-700 italic ${selectedFontSize.body}`}>{cv.summary}</p>
              </div>
            )}

            <div className="space-y-3">
              <h2 className="font-bold text-xs uppercase tracking-widest text-slate-800 border-b pb-1" style={{ color: colorHex, borderColor: `${colorHex}30` }}>
                ❖ {cv.language === "ar" ? "الخبرات الإدارية والمهنية" : "Professional Experience"}
              </h2>
              <div className="space-y-4">
                {cv.experience.map((exp, i) => (
                  <div key={i} className="space-y-1 print-avoid-break">
                    <div className="flex justify-between items-baseline">
                      <h3 className={`font-bold text-slate-900 ${selectedFontSize.h3}`}>{exp.title}</h3>
                      <span className="text-[10px] font-bold text-slate-500 font-sans">{exp.startDate} – {exp.endDate || "Present"}</span>
                    </div>
                    <p className="text-[11px] font-bold italic text-slate-600">{exp.company}</p>
                    {exp.description && <p className={`text-slate-700 leading-relaxed font-sans mt-1 ${selectedFontSize.body}`}>{exp.description}</p>}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-7 space-y-3">
                <h2 className="font-bold text-xs uppercase tracking-widest text-slate-800 border-b pb-1" style={{ color: colorHex, borderColor: `${colorHex}30` }}>
                  ❖ {cv.language === "ar" ? "المؤهلات الأكاديمية" : "Academic Credentials"}
                </h2>
                <div className="space-y-2">
                  {cv.education.map((edu, i) => (
                    <div key={i} className="space-y-0.5 print-avoid-break">
                      <h3 className={`font-bold text-slate-900 ${selectedFontSize.h3}`}>{edu.degree}</h3>
                      <p className="text-[11px] text-slate-600">{edu.institution} ({edu.startDate} – {edu.endDate})</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="col-span-5 space-y-3">
                <h2 className="font-bold text-xs uppercase tracking-widest text-slate-800 border-b pb-1 font-serif" style={{ color: colorHex, borderColor: `${colorHex}30` }}>
                  ❖ {cv.language === "ar" ? "المهارات القيادية" : "Key Competencies"}
                </h2>
                <div className="flex flex-wrap gap-1.5 font-sans">
                  {cv.skills.map((skill, idx) => (
                    <Badge key={idx} variant="outline" className="border-slate-400 text-slate-800 font-semibold px-2 py-0.5">{skill}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEMPLATE 3: TECH & ENGINEERING (تقني حداثي) */}
      {cv.template === "tech" && (
        <div className="h-full flex flex-col justify-between p-1">
          <div className="grid grid-cols-12 gap-6 h-full items-stretch">
            <div className="col-span-4 bg-slate-900 rounded-2xl p-5 text-white flex flex-col justify-between items-center text-center space-y-6 shadow-md">
              <div className="space-y-4 w-full flex flex-col items-center">
                {cv.avatarUrl ? (
                  <img src={cv.avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-emerald-400 shadow-md" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-emerald-400">
                    <Code className="w-8 h-8" />
                  </div>
                )}
                <div>
                  <h1 className={`font-black text-white ${selectedFontSize.h1}`}>{cv.fullName}</h1>
                  <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest mt-1">{cv.targetTitle}</p>
                </div>
              </div>

              <div className="w-full text-slate-300 space-y-3 pt-4 border-t border-slate-800 text-[10.5px]">
                {cv.phone && <p>📱 {cv.phone}</p>}
                {cv.email && <p className="truncate">✉️ {cv.email}</p>}
                {cv.address && <p>📍 {cv.address}</p>}
              </div>

              <div className="w-full space-y-3 pt-4 border-t border-slate-800">
                <h4 className="text-[10.5px] font-bold text-emerald-400 uppercase tracking-widest">{cv.language === "ar" ? "المهارات والتقنيات" : "Tech Stack & Skills"}</h4>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {cv.skills.map((skill, idx) => (
                    <Badge key={idx} className="bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-mono text-[9.5px]">{skill}</Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-span-8 space-y-6 text-slate-700">
              {cv.summary && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 print-avoid-break">
                  <h2 className="font-mono text-xs font-bold text-slate-900 uppercase tracking-wider mb-1" style={{ color: colorHex }}>// {cv.language === "ar" ? "نبذة شخصية" : "About Me"}</h2>
                  <p className={`leading-relaxed text-slate-600 ${selectedFontSize.body}`}>{cv.summary}</p>
                </div>
              )}

              <div className="space-y-4">
                <h2 className="font-mono text-xs font-bold text-slate-900 uppercase tracking-wider border-b pb-1" style={{ color: colorHex }}>// {cv.language === "ar" ? "الخبرات والأنظمة" : "Experience & Systems"}</h2>
                <div className="space-y-4">
                  {cv.experience.map((exp, i) => (
                    <div key={i} className="space-y-1 print-avoid-break">
                      <div className="flex justify-between items-start flex-wrap gap-1">
                        <h3 className={`font-extrabold text-slate-800 ${selectedFontSize.h3}`}>{exp.title}</h3>
                        <span className="text-[10px] font-mono text-slate-500 font-bold">{exp.startDate} - {exp.endDate || "Present"}</span>
                      </div>
                      <p className="text-[11px] font-bold text-emerald-700">{exp.company}</p>
                      {exp.description && <p className={`text-slate-600 leading-relaxed mt-1 ${selectedFontSize.body}`}>{exp.description}</p>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="font-mono text-xs font-bold text-slate-900 uppercase tracking-wider border-b pb-1" style={{ color: colorHex }}>// {cv.language === "ar" ? "التعليم والشهادات" : "Education & Certs"}</h2>
                <div className="space-y-3">
                  {cv.education.map((edu, i) => (
                    <div key={i} className="space-y-0.5 print-avoid-break">
                      <h3 className={`font-extrabold text-slate-800 ${selectedFontSize.h3}`}>{edu.degree}</h3>
                      <p className="text-[11px] font-semibold text-slate-500">{edu.institution} ({edu.startDate} - {edu.endDate})</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEMPLATE 4: COLORED HEADER BANNER (ترويسة ملونة) */}
      {cv.template === "colored_header" && (
        <div className="h-full flex flex-col justify-between">
          <div className="-mx-8 -mt-8 p-8 text-white flex flex-col items-center text-center space-y-3 shadow-md" style={{ backgroundColor: colorHex }}>
            {cv.avatarUrl && (
              <img src={cv.avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-white/80 shadow-lg" />
            )}
            <div>
              <h1 className={`font-black uppercase tracking-wide ${selectedFontSize.h1}`}>{cv.fullName}</h1>
              <p className="text-xs font-bold tracking-widest opacity-90 uppercase mt-1">{cv.targetTitle}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4 text-xs font-medium pt-1 opacity-95">
              {cv.phone && <span>📞 {cv.phone}</span>}
              {cv.email && <span>✉️ {cv.email}</span>}
              {cv.address && <span>📍 {cv.address}</span>}
            </div>
          </div>

          <div className="space-y-6 pt-6 flex-1">
            {cv.summary && (
              <div className="space-y-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-100 print-avoid-break">
                <h2 className="font-extrabold text-xs uppercase tracking-wider" style={{ color: colorHex }}>
                  {cv.language === "ar" ? "النبذة الشخصية" : "Summary"}
                </h2>
                <p className={`leading-relaxed text-slate-600 ${selectedFontSize.body}`}>{cv.summary}</p>
              </div>
            )}

            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-8 space-y-6">
                <div className="space-y-3">
                  <h2 className="font-extrabold text-sm uppercase tracking-wider border-b pb-1" style={{ color: colorHex, borderColor: `${colorHex}40` }}>
                    {cv.language === "ar" ? "الخبرات المهنية" : "Experience"}
                  </h2>
                  <div className="space-y-4">
                    {cv.experience.map((exp, i) => (
                      <div key={i} className="space-y-1 print-avoid-break">
                        <div className="flex justify-between items-start flex-wrap gap-1">
                          <h3 className={`font-extrabold text-slate-800 ${selectedFontSize.h3}`}>{exp.title}</h3>
                          <span className="text-[10px] text-muted-foreground font-bold">{exp.startDate} - {exp.endDate || "Present"}</span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-500">{exp.company}</p>
                        {exp.description && <p className={`text-slate-600 leading-relaxed mt-1 ${selectedFontSize.body}`}>{exp.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="col-span-4 space-y-6">
                <div className="space-y-3">
                  <h2 className="font-extrabold text-sm uppercase tracking-wider border-b pb-1" style={{ color: colorHex, borderColor: `${colorHex}40` }}>
                    {cv.language === "ar" ? "التعليم" : "Education"}
                  </h2>
                  <div className="space-y-3">
                    {cv.education.map((edu, i) => (
                      <div key={i} className="space-y-0.5 print-avoid-break">
                        <h3 className={`font-extrabold text-slate-800 ${selectedFontSize.h3}`}>{edu.degree}</h3>
                        <p className="text-[11px] font-semibold text-slate-500">{edu.institution}</p>
                        <span className="text-[9.5px] text-slate-400 font-bold block">{edu.startDate} - {edu.endDate}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h2 className="font-extrabold text-sm uppercase tracking-wider border-b pb-1" style={{ color: colorHex, borderColor: `${colorHex}40` }}>
                    {cv.language === "ar" ? "المهارات" : "Skills"}
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {cv.skills.map((skill, idx) => (
                      <Badge key={idx} variant="secondary" className={`bg-slate-100 text-slate-700 border border-slate-200 ${selectedFontSize.badge}`}>
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEMPLATE 5: BOXES (صناديق كانفا) */}
      {cv.template === "boxes" && (
        <div className="h-full flex flex-col justify-between space-y-6">
          <div className="p-6 bg-slate-900 text-white rounded-3xl flex justify-between items-center shadow-md">
            <div>
              <h1 className={`font-black tracking-tight ${selectedFontSize.h1}`}>{cv.fullName}</h1>
              <p className="text-xs font-bold uppercase tracking-widest mt-1 text-slate-300">{cv.targetTitle}</p>
            </div>
            <div className="text-[11px] font-medium text-slate-300 text-right space-y-0.5">
              <p>{cv.phone}</p>
              <p>{cv.email}</p>
              <p>{cv.address}</p>
            </div>
          </div>

          <div className="space-y-5 flex-1">
            {cv.summary && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-sm border-t-4 print-avoid-break" style={{ borderTopColor: colorHex }}>
                <h2 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider mb-1">{cv.language === "ar" ? "النبذة الشخصية" : "Summary"}</h2>
                <p className={`leading-relaxed text-slate-600 ${selectedFontSize.body}`}>{cv.summary}</p>
              </div>
            )}

            <div className="grid grid-cols-12 gap-5">
              <div className="col-span-8 space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-sm border-t-4 space-y-3" style={{ borderTopColor: colorHex }}>
                  <h2 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">{cv.language === "ar" ? "الخبرات المهنية" : "Experience"}</h2>
                  <div className="space-y-4">
                    {cv.experience.map((exp, i) => (
                      <div key={i} className="p-3 bg-white rounded-xl border border-slate-100 space-y-1 print-avoid-break">
                        <div className="flex justify-between items-start flex-wrap gap-1">
                          <h3 className={`font-extrabold text-slate-800 ${selectedFontSize.h3}`}>{exp.title}</h3>
                          <span className="text-[10px] text-muted-foreground font-bold">{exp.startDate} - {exp.endDate || "Present"}</span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-500">{exp.company}</p>
                        {exp.description && <p className={`text-slate-600 leading-relaxed mt-1 ${selectedFontSize.body}`}>{exp.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="col-span-4 space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-sm border-t-4 space-y-3" style={{ borderTopColor: colorHex }}>
                  <h2 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">{cv.language === "ar" ? "التعليم" : "Education"}</h2>
                  {cv.education.map((edu, i) => (
                    <div key={i} className="p-2.5 bg-white rounded-xl border border-slate-100 space-y-0.5 print-avoid-break">
                      <h3 className={`font-extrabold text-slate-800 ${selectedFontSize.h3}`}>{edu.degree}</h3>
                      <p className="text-[10.5px] font-semibold text-slate-500">{edu.institution}</p>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-sm border-t-4 space-y-3" style={{ borderTopColor: colorHex }}>
                  <h2 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">{cv.language === "ar" ? "المهارات" : "Skills"}</h2>
                  <div className="flex flex-wrap gap-1.5">
                    {cv.skills.map((skill, idx) => (
                      <Badge key={idx} className="bg-white text-slate-800 border border-slate-200 shadow-2xs font-bold">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEMPLATE 6, 7, 8: MODERN GRID / COMPACT / CLASSIC */}
      {cv.template !== "creative" && cv.template !== "colored_header" && cv.template !== "boxes" && cv.template !== "executive" && cv.template !== "tech" && (
        <div className="h-full flex flex-col justify-between space-y-6">
          <div className={`space-y-3 ${cv.template === "classic" || cv.template === "compact" ? "text-center" : ""}`}>
            <div className="flex flex-col md:flex-row md:justify-between items-center gap-4 border-b-2 pb-4" style={{ borderColor: `${colorHex}40` }}>
              <div className="space-y-1">
                <h1 className={`font-black text-slate-800 tracking-tight ${selectedFontSize.h1}`} style={{ color: colorHex }}>
                  {cv.fullName}
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-widest">
                  {cv.targetTitle}
                </p>
              </div>
              <div className="text-[11px] font-semibold text-slate-500 space-y-1 text-right">
                {cv.phone && <p>📱 {cv.phone}</p>}
                {cv.email && <p>✉️ {cv.email}</p>}
                {cv.address && <p>📍 {cv.address}</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6 items-stretch flex-1">
            <div className={`${cv.template === "modern" ? "col-span-8" : "col-span-12"} space-y-6`}>
              {cv.summary && (
                <div className="space-y-2 print-avoid-break">
                  <h2 className="font-extrabold text-xs uppercase tracking-wider border-b pb-1" style={{ color: colorHex, borderColor: `${colorHex}30` }}>
                    {cv.language === "ar" ? "النبذة الشخصية" : "Summary"}
                  </h2>
                  <p className={`leading-relaxed text-slate-600 ${selectedFontSize.body}`}>{cv.summary}</p>
                </div>
              )}

              <div className="space-y-4">
                <h2 className="font-extrabold text-xs uppercase tracking-wider border-b pb-1" style={{ color: colorHex, borderColor: `${colorHex}30` }}>
                  {cv.language === "ar" ? "الخبرات المهنية" : "Experience"}
                </h2>
                <div className="space-y-4">
                  {cv.experience.map((exp, i) => (
                    <div key={i} className="space-y-1 print-avoid-break">
                      <div className="flex justify-between items-start flex-wrap gap-1">
                        <h3 className={`font-extrabold text-slate-800 ${selectedFontSize.h3}`}>{exp.title}</h3>
                        <span className="text-[10px] text-muted-foreground font-bold">{exp.startDate} - {exp.endDate || "Present"}</span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-500">{exp.company}</p>
                      {exp.description && (
                        <p className={`text-slate-600 leading-relaxed mt-1 ${selectedFontSize.body}`}>{exp.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="font-extrabold text-xs uppercase tracking-wider border-b pb-1" style={{ color: colorHex, borderColor: `${colorHex}30` }}>
                  {cv.language === "ar" ? "التعليم والدراسة" : "Education"}
                </h2>
                <div className="space-y-3">
                  {cv.education.map((edu, i) => (
                    <div key={i} className="space-y-0.5 print-avoid-break">
                      <div className="flex justify-between items-start flex-wrap gap-1">
                        <h3 className={`font-extrabold text-slate-800 ${selectedFontSize.h3}`}>{edu.degree}</h3>
                        <span className="text-[10px] text-muted-foreground font-bold">{edu.startDate} - {edu.endDate}</span>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-500">{edu.institution}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {cv.template === "modern" && (
              <div className="col-span-4 p-4 border-l bg-slate-50/70 rounded-2xl space-y-6">
                {cv.avatarUrl && (
                  <div className="flex justify-center mb-4">
                    <img src={cv.avatarUrl} alt="Avatar" className="w-24 h-24 rounded-2xl object-cover border-2 shadow-sm" style={{ borderColor: colorHex }} />
                  </div>
                )}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 border-b pb-1" style={{ color: colorHex }}>
                    {cv.language === "ar" ? "المهارات" : "Skills"}
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {cv.skills.map((skill, idx) => (
                      <Badge key={idx} variant="outline" className={`bg-primary/5 text-primary border-primary/20 ${selectedFontSize.badge}`}>
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );

  return (
    <AppLayout>
      <div className="min-h-screen bg-muted/40 pb-16 text-start">
        {/* High-Precision Isolated Print Portal & CSS Rules */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 0mm;
            }
            html, body {
              width: 210mm !important;
              height: 297mm !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              overflow: hidden !important;
            }
            body > *:not(#cv-print-portal) {
              display: none !important;
            }
            #cv-print-portal {
              display: block !important;
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 210mm !important;
              height: 297mm !important;
              margin: 0 !important;
              padding: 0 !important;
              box-sizing: border-box !important;
              z-index: 99999999 !important;
              background: #ffffff !important;
              overflow: hidden !important;
              transform: none !important;
            }
            #cv-print-portal #resume-print-sheet {
              transform: none !important;
              width: 210mm !important;
              height: 297mm !important;
              min-height: 297mm !important;
              max-height: 297mm !important;
              position: relative !important;
              top: 0 !important;
              left: 0 !important;
              margin: 0 !important;
              border: none !important;
              box-shadow: none !important;
            }
            .print-avoid-break {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
          }
        `}} />
        
        {/* ISOLATED PRINT PORTAL NODE */}
        <div id="cv-print-portal" className="hidden print:block">
          {renderResumeSheet(true)}
        </div>

        {/* Top Sticky Hub Header Bar */}
        <div className="bg-card border-b sticky top-0 z-40 px-6 py-4 shadow-sm backdrop-blur-md bg-card/90">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            
            <div className="flex items-center gap-4">
              <Link href="/user/settings">
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted/80">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span>{isAr ? "سيرة ذاتية - قطاع" : "Resume -"}</span>
                  <span className="text-primary font-black">{cv.sector}</span>
                </h1>
                <p className="text-[10px] text-muted-foreground font-semibold">
                  {isAr ? "أداة بناء السير الذاتية الاحترافية والذكية" : "Professional AI Resume Customizer"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <div>
                {autosaveStatus === "saving" && (
                  <Badge variant="outline" className="bg-blue-500/5 text-blue-600 border-blue-500/20 py-1.5 gap-1.5 rounded-full font-bold text-[10.5px]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{isAr ? "جاري الحفظ تلقائياً..." : "Saving..."}</span>
                  </Badge>
                )}
                {autosaveStatus === "saved" && (
                  <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 border-emerald-500/20 py-1.5 gap-1.5 rounded-full font-bold text-[10.5px]">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isAr ? "تم الحفظ تلقائياً" : "Autosaved"}</span>
                  </Badge>
                )}
                {autosaveStatus === "error" && (
                  <Badge variant="outline" className="bg-red-500/5 text-red-600 border-red-500/20 py-1.5 gap-1.5 rounded-full font-bold text-[10.5px]">
                    <span>{isAr ? "خطأ في الحفظ" : "Save Error"}</span>
                  </Badge>
                )}
              </div>

              <Button 
                onClick={handleManualSave}
                variant="outline" 
                size="sm"
                className="rounded-xl gap-2 font-bold h-9 text-xs border-primary/30 text-primary hover:bg-primary/5 shadow-sm"
              >
                <Check className="w-4 h-4 text-primary" />
                <span>{isAr ? "حفظ في الملف الشخصي" : "Save to Profile"}</span>
              </Button>

              <Button 
                onClick={handleTranslateContent}
                variant="outline" 
                size="sm"
                className="rounded-xl gap-2 font-bold h-9 text-xs"
              >
                <Languages className="w-4 h-4 text-primary" />
                <span>{isAr ? "تحويل لغة السيرة الذاتية" : "Translate Resume"}</span>
              </Button>

              <Button 
                onClick={handleDownloadPDF}
                size="sm"
                className="rounded-xl gap-2 font-bold h-9 text-xs shadow-md shadow-primary/10"
              >
                <Download className="w-4 h-4" />
                <span>{isAr ? "تحميل السيرة الذاتية PDF" : "Download PDF"}</span>
              </Button>
            </div>

          </div>
        </div>

        {/* Main Interface Layout Grid */}
        <div className="max-w-7xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: LIVE RESUME PREVIEW PANEL (60% width) */}
          <div className="lg:col-span-7 xl:col-span-8 bg-card border rounded-2xl p-4 sm:p-6 shadow-sm overflow-hidden relative flex flex-col order-2 lg:order-1">
            
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                <span>{isAr ? "معاينة السيرة الذاتية (A4)" : "A4 Resume Preview"}</span>
              </h3>
              <div className="flex items-center gap-1.5 bg-muted/65 p-1 rounded-xl border">
                <Button 
                  onClick={() => setZoom(z => Math.max(0.5, Number((z - 0.05).toFixed(2))))}
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 rounded-lg text-xs font-black hover:bg-background shadow-none"
                >
                  -
                </Button>
                <span className="text-[10px] font-extrabold px-1.5 min-w-[36px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button 
                  onClick={() => setZoom(z => Math.min(1.2, Number((z + 0.05).toFixed(2))))}
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 rounded-lg text-xs font-black hover:bg-background shadow-none"
                >
                  +
                </Button>
              </div>
            </div>

            {/* Scaled viewport container */}
            <div className="w-full flex justify-center overflow-auto bg-muted/10 p-4 border rounded-2xl">
              <div 
                className="relative overflow-hidden shrink-0 transition-all duration-300"
                style={{ 
                  width: `${794 * zoom}px`, 
                  height: `${1123 * zoom}px` 
                }}
              >
                {renderResumeSheet(false)}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: EDITOR CONTROL PANEL & CUSTOMIZER (40% width) */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6 order-1 lg:order-2">
            
            <div className="bg-card border rounded-2xl shadow-sm p-4 sm:p-5">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                
                <TabsList className="flex w-full gap-1 bg-muted/65 p-1 rounded-xl mb-6 overflow-x-auto scrollbar-none snap-x snap-mandatory shrink-0">
                  <TabsTrigger value="personal" className="rounded-lg text-[10.5px] font-bold py-1.5 flex-1 snap-start shrink-0 min-w-[70px]">
                    {isAr ? "البيانات" : "Personal"}
                  </TabsTrigger>
                  <TabsTrigger value="experience" className="rounded-lg text-[10.5px] font-bold py-1.5 flex-1 snap-start shrink-0 min-w-[70px]">
                    {isAr ? "الخبرات" : "Experience"}
                  </TabsTrigger>
                  <TabsTrigger value="education" className="rounded-lg text-[10.5px] font-bold py-1.5 flex-1 snap-start shrink-0 min-w-[70px]">
                    {isAr ? "التعليم" : "Education"}
                  </TabsTrigger>
                  <TabsTrigger value="skills" className="rounded-lg text-[10.5px] font-bold py-1.5 flex-1 snap-start shrink-0 min-w-[70px]">
                    {isAr ? "المهارات" : "Skills"}
                  </TabsTrigger>
                  <TabsTrigger value="ai" className="rounded-lg text-[10.5px] font-bold py-1.5 flex-1 snap-start shrink-0 min-w-[70px]">
                    {isAr ? "الذكاء" : "AI Optimizer"}
                  </TabsTrigger>
                  <TabsTrigger value="appearance" className="rounded-lg text-[10.5px] font-bold py-1.5 flex-1 snap-start shrink-0 min-w-[70px]">
                    {isAr ? "المظهر" : "Appearance"}
                  </TabsTrigger>
                </TabsList>

                {/* Tab 1: Personal Details */}
                <TabsContent value="personal" className="space-y-4">
                  <div className="space-y-3">
                    <div className="p-4 border rounded-xl bg-muted/20 flex items-center justify-between gap-4">
                      <div>
                        <Label className="font-extrabold text-xs block mb-1">
                          {isAr ? "الصورة الشخصية" : "Profile Picture"}
                        </Label>
                        <span className="text-[10px] text-muted-foreground block mb-2">
                          {isAr ? "صيغة PNG أو JPG (بحد أقصى 2MB)" : "PNG/JPG formats, max 2MB"}
                        </span>
                        <div className="relative">
                          <input 
                            type="file" 
                            accept=".png,.jpg,.jpeg" 
                            onChange={handlePhotoUpload}
                            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10" 
                          />
                          <Button size="sm" variant="secondary" className="rounded-lg font-bold text-xs h-8">
                            {isAr ? "اختر صورة الشخصية" : "Choose File"}
                          </Button>
                        </div>
                      </div>
                      
                      {cv.avatarUrl ? (
                        <img 
                          src={cv.avatarUrl} 
                          alt="Preview" 
                          className="w-16 h-16 rounded-xl object-cover border bg-background"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-muted border border-dashed flex items-center justify-center text-muted-foreground">
                          <UserIcon className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    <div>
                      <Label className="font-bold text-[10.5px] text-muted-foreground mb-1 block">
                        {isAr ? "الاسم الكامل" : "Full Name"}
                      </Label>
                      <Input 
                        value={cv.fullName} 
                        onChange={e => setCV(prev => ({ ...prev, fullName: e.target.value }))}
                        className="rounded-xl text-xs font-semibold h-10 bg-background/50" 
                      />
                    </div>

                    <div>
                      <Label className="font-bold text-[10.5px] text-muted-foreground mb-1 block">
                        {isAr ? "المسمى الوظيفي المستهدف" : "Target Job Title"}
                      </Label>
                      <Input 
                        value={cv.targetTitle} 
                        onChange={e => setCV(prev => ({ ...prev, targetTitle: e.target.value }))}
                        className="rounded-xl text-xs font-semibold h-10 bg-background/50" 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="font-bold text-[10.5px] text-muted-foreground mb-1 block">
                          {isAr ? "رقم الهاتف" : "Phone Number"}
                        </Label>
                        <Input 
                          value={cv.phone} 
                          onChange={e => setCV(prev => ({ ...prev, phone: e.target.value }))}
                          className="rounded-xl text-xs font-semibold h-10 bg-background/50" 
                        />
                      </div>
                      <div>
                        <Label className="font-bold text-[10.5px] text-muted-foreground mb-1 block">
                          {isAr ? "البريد الإلكتروني" : "Email Address"}
                        </Label>
                        <Input 
                          value={cv.email} 
                          onChange={e => setCV(prev => ({ ...prev, email: e.target.value }))}
                          className="rounded-xl text-xs font-semibold h-10 bg-background/50" 
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="font-bold text-[10.5px] text-muted-foreground mb-1 block">
                        {isAr ? "العنوان والمدينة" : "Address & City"}
                      </Label>
                      <Input 
                        value={cv.address} 
                        onChange={e => setCV(prev => ({ ...prev, address: e.target.value }))}
                        className="rounded-xl text-xs font-semibold h-10 bg-background/50" 
                      />
                    </div>

                    <div>
                      <Label className="font-bold text-[10.5px] text-muted-foreground mb-1 block">
                        {isAr ? "النبذة الشخصية" : "Professional Summary"}
                      </Label>
                      <Textarea 
                        value={cv.summary} 
                        onChange={e => setCV(prev => ({ ...prev, summary: e.target.value }))}
                        className="rounded-xl text-xs font-semibold min-h-[100px] bg-background/50" 
                      />
                    </div>

                  </div>
                </TabsContent>

                {/* Tab 2: Work Experience */}
                <TabsContent value="experience" className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2 mb-2">
                    <h3 className="text-xs font-bold text-foreground">
                      {isAr ? "الخبرات العملية" : "Work Experience"}
                    </h3>
                    <Button size="sm" variant="outline" onClick={handleAddExperience} className="gap-1.5 rounded-lg text-[10.5px] font-bold h-8">
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isAr ? "إضافة خبرة" : "Add Experience"}</span>
                    </Button>
                  </div>

                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                    {cv.experience.map((exp, idx) => (
                      <div key={idx} className="p-4 border rounded-xl relative bg-muted/15 space-y-3 group">
                        <Button 
                          onClick={() => handleRemoveExperience(idx)}
                          variant="ghost" 
                          size="icon" 
                          className="absolute top-2 right-2 text-destructive hover:bg-destructive/10 rounded-lg h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-[10px] font-bold text-muted-foreground mb-1 block">{isAr ? "المسمى الوظيفي" : "Job Title"}</Label>
                            <Input 
                              value={exp.title} 
                              onChange={e => handleUpdateExperience(idx, "title", e.target.value)} 
                              className="h-8 rounded-lg text-xs font-semibold bg-background"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] font-bold text-muted-foreground mb-1 block">{isAr ? "جهة العمل" : "Company"}</Label>
                            <Input 
                              value={exp.company} 
                              onChange={e => handleUpdateExperience(idx, "company", e.target.value)} 
                              className="h-8 rounded-lg text-xs font-semibold bg-background"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-[10px] font-bold text-muted-foreground mb-1 block">{isAr ? "تاريخ البدء" : "Start Date"}</Label>
                            <Input 
                              type="month"
                              value={exp.startDate} 
                              onChange={e => handleUpdateExperience(idx, "startDate", e.target.value)} 
                              className="h-8 rounded-lg text-xs font-semibold bg-background"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] font-bold text-muted-foreground mb-1 block">{isAr ? "تاريخ الانتهاء" : "End Date"}</Label>
                            <Input 
                              type="month"
                              value={exp.endDate} 
                              onChange={e => handleUpdateExperience(idx, "endDate", e.target.value)} 
                              placeholder={isAr ? "الحاضر" : "Present"}
                              className="h-8 rounded-lg text-xs font-semibold bg-background"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-[10px] font-bold text-muted-foreground mb-1 block">{isAr ? "الوصف الوظيفي" : "Job Description"}</Label>
                          <Textarea 
                            value={exp.description} 
                            onChange={e => handleUpdateExperience(idx, "description", e.target.value)} 
                            className="rounded-lg text-xs font-semibold bg-background min-h-[60px]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* Tab 3: Education */}
                <TabsContent value="education" className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2 mb-2">
                    <h3 className="text-xs font-bold text-foreground">
                      {isAr ? "المؤهلات التعليمية" : "Education & Credentials"}
                    </h3>
                    <Button size="sm" variant="outline" onClick={handleAddEducation} className="gap-1.5 rounded-lg text-[10.5px] font-bold h-8">
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isAr ? "إضافة تعليم" : "Add Education"}</span>
                    </Button>
                  </div>

                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                    {cv.education.map((edu, idx) => (
                      <div key={idx} className="p-4 border rounded-xl relative bg-muted/15 space-y-3 group">
                        <Button 
                          onClick={() => handleRemoveEducation(idx)}
                          variant="ghost" 
                          size="icon" 
                          className="absolute top-2 right-2 text-destructive hover:bg-destructive/10 rounded-lg h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-[10px] font-bold text-muted-foreground mb-1 block">{isAr ? "الدرجة / التخصص" : "Degree / Major"}</Label>
                            <Input 
                              value={edu.degree} 
                              onChange={e => handleUpdateEducation(idx, "degree", e.target.value)} 
                              className="h-8 rounded-lg text-xs font-semibold bg-background"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] font-bold text-muted-foreground mb-1 block">{isAr ? "المؤسسة التعليمية" : "Institution"}</Label>
                            <Input 
                              value={edu.institution} 
                              onChange={e => handleUpdateEducation(idx, "institution", e.target.value)} 
                              className="h-8 rounded-lg text-xs font-semibold bg-background"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-[10px] font-bold text-muted-foreground mb-1 block">{isAr ? "تاريخ البدء" : "Start Date"}</Label>
                            <Input 
                              type="month"
                              value={edu.startDate} 
                              onChange={e => handleUpdateEducation(idx, "startDate", e.target.value)} 
                              className="h-8 rounded-lg text-xs font-semibold bg-background"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] font-bold text-muted-foreground mb-1 block">{isAr ? "تاريخ التخرج" : "Graduation Date"}</Label>
                            <Input 
                              type="month"
                              value={edu.endDate} 
                              onChange={e => handleUpdateEducation(idx, "endDate", e.target.value)} 
                              className="h-8 rounded-lg text-xs font-semibold bg-background"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* Tab 4: Skills */}
                <TabsContent value="skills" className="space-y-4">
                  <div className="space-y-3">
                    <Label className="font-bold text-[10.5px] text-muted-foreground block mb-1">
                      {isAr ? "إضافة مهارة جديدة" : "Add a Skill"}
                    </Label>
                    <div className="flex gap-2">
                      <Input 
                        value={tempSkill} 
                        onChange={e => setTempSkill(e.target.value)}
                        placeholder="React, Excel, Marketing..."
                        className="rounded-xl text-xs font-semibold h-10 bg-background/50" 
                        onKeyDown={e => { if (e.key === "Enter") handleAddSkill(); }}
                      />
                      <Button onClick={handleAddSkill} className="rounded-xl font-bold h-10 text-xs px-4">
                        {isAr ? "إضافة" : "Add"}
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t mt-2">
                      {cv.skills.map((skill, idx) => (
                        <Badge 
                          key={idx} 
                          variant="secondary" 
                          className="font-bold font-sans flex items-center gap-1.5 px-3 py-1.5 rounded-xl border"
                        >
                          <span>{skill}</span>
                          <Trash2 
                            onClick={() => handleRemoveSkill(skill)}
                            className="w-3.5 h-3.5 text-destructive hover:scale-110 cursor-pointer transition-transform" 
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 5: AI Optimizer */}
                <TabsContent value="ai" className="space-y-4">
                  <div className="space-y-4 text-slate-700">
                    <div className="p-4 border border-dashed border-primary/20 bg-primary/5 rounded-2xl space-y-3">
                      <h4 className="font-extrabold text-xs text-primary flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-primary shrink-0" />
                        <span>{isAr ? "مساعد السيرة الذاتية الذكي" : "AI Resume Optimizer"}</span>
                      </h4>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        {isAr 
                          ? "استخدم الذكاء الاصطناعي لتوليد بيانات وخبرات ومهارات مقترحة واحترافية تلائم قطاع العمل المحدد للورشة." 
                          : "Generate custom tailored resumes, skills, summaries, and work experience optimized using artificial intelligence."}
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      <Label className="text-[10px] font-bold text-muted-foreground block">{isAr ? "اختيارات سريعة للذكاء الاصطناعي:" : "Quick Actions:"}</Label>
                      
                      <div className="grid grid-cols-1 gap-2">
                        <Button 
                          onClick={() => handleAIAction("summary")}
                          variant="outline" 
                          className="justify-start text-left h-10 text-xs rounded-xl font-bold border-muted-foreground/20"
                          disabled={aiLoading}
                        >
                          ✨ {isAr ? "تحسين وتوليد النبذة الشخصية بالذكاء الاصطناعي" : "Optimize & Generate summary"}
                        </Button>

                        <Button 
                          onClick={() => handleAIAction("experience")}
                          variant="outline" 
                          className="justify-start text-left h-10 text-xs rounded-xl font-bold border-muted-foreground/20"
                          disabled={aiLoading}
                        >
                          ⚡ {isAr ? "توليد خبرات مهنية مقترحة للقطاع المختار" : "Generate tailored experiences"}
                        </Button>

                        <Button 
                          onClick={() => handleAIAction("skills")}
                          variant="outline" 
                          className="justify-start text-left h-10 text-xs rounded-xl font-bold border-muted-foreground/20"
                          disabled={aiLoading}
                        >
                          💪 {isAr ? "تحديث المهارات المعتمدة للقطاع" : "Generate tailored skills list"}
                        </Button>

                        <Button 
                          onClick={() => handleAIAction("grammar")}
                          variant="outline" 
                          className="justify-start text-left h-10 text-xs rounded-xl font-bold border-muted-foreground/20"
                          disabled={aiLoading}
                        >
                          ✍️ {isAr ? "تصحيح الأخطاء اللغوية والإملائية" : "Fix grammar & spelling typos"}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 border-t pt-4">
                      <Label className="font-bold text-[10.5px] text-muted-foreground block mb-1">
                        {isAr ? "أكتب توجيه مخصص للذكاء الاصطناعي" : "Write custom AI instructions"}
                      </Label>
                      <Textarea 
                        value={aiPrompt}
                        onChange={e => setAiPrompt(e.target.value)}
                        placeholder={isAr ? "اكتب توجيهاً مثل: صغ لي خبرات متعلقة بإدارة المخاطر..." : "E.g. Write operations resume focused on startup scaling..."}
                        className="rounded-xl text-xs font-semibold bg-background/50 h-16"
                      />
                      <Button 
                        onClick={handleAISubmitPrompt}
                        className="w-full gap-2 rounded-xl font-bold h-10 text-xs shadow-md"
                        disabled={aiLoading}
                      >
                        {aiLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{isAr ? "جاري التوليد..." : "Generating..."}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>{isAr ? "تنفيذ الذكاء الاصطناعي" : "Generate AI Content"}</span>
                          </>
                        )}
                      </Button>
                    </div>

                  </div>
                </TabsContent>

                {/* Tab 6: Appearance Customizer */}
                <TabsContent value="appearance" className="space-y-6">
                  
                  {/* Canva Template Cards Grid */}
                  <div className="space-y-3">
                    <Label className="font-extrabold text-[11px] text-slate-500 uppercase tracking-widest block border-b pb-1 flex items-center justify-between">
                      <span>{isAr ? "قوالب كانفا الاحترافية (Canva Templates)" : "Canva Resume Templates"}</span>
                      <Badge variant="secondary" className="text-[9px] font-black">{templates.length} {isAr ? "قوالب" : "Templates"}</Badge>
                    </Label>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                      {templates.map(t => {
                        const isSelected = cv.template === t.id;
                        return (
                          <div
                            key={t.id}
                            onClick={() => setCV(prev => ({ ...prev, template: t.id }))}
                            className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 ${
                              isSelected
                                ? "bg-primary/10 border-primary shadow-sm ring-2 ring-primary/20"
                                : "border-border/80 hover:border-primary/40 bg-card hover:bg-accent/30"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-black text-xs text-foreground flex items-center gap-1.5">
                                <Layout className={`w-3.5 h-3.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                                {isAr ? t.nameAr : t.nameEn}
                              </span>
                              {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-tight font-medium">
                              {isAr ? t.descAr : t.nameEn}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sector Selection */}
                  <div className="space-y-2">
                    <Label className="font-extrabold text-[11px] text-slate-500 uppercase tracking-widest block border-b pb-1">
                      {isAr ? "تصنيف القطاع المهني" : "Professional Sector"}
                    </Label>
                    <Select 
                      value={cv.sector} 
                      onValueChange={val => setCV(prev => ({ ...prev, sector: val }))}
                    >
                      <SelectTrigger className="w-full rounded-xl text-xs font-semibold h-10 bg-background/50">
                        <SelectValue placeholder={isAr ? "اختر القطاع" : "Select Sector"} />
                      </SelectTrigger>
                      <SelectContent>
                        {sectors.map((s, idx) => (
                          <SelectItem key={idx} value={s} className="text-xs font-bold">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Theme Colors */}
                  <div className="space-y-3">
                    <Label className="font-extrabold text-[11px] text-slate-500 uppercase tracking-widest block border-b pb-1 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-primary" />
                      <span>{isAr ? "لون المظهر الأساسي" : "Primary Theme Color"}</span>
                    </Label>
                    <div className="flex items-center gap-3">
                      {colors.map((c, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCV(prev => ({ ...prev, themeColor: c.hex }))}
                          className="w-8 h-8 rounded-full border-2 border-background shadow-md flex items-center justify-center transition-transform hover:scale-110 shrink-0"
                          style={{ backgroundColor: c.hex }}
                        >
                          {cv.themeColor === c.hex && (
                            <Check className="w-4 h-4 text-white" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fonts */}
                  <div className="space-y-3">
                    <Label className="font-extrabold text-[11px] text-slate-500 uppercase tracking-widest block border-b pb-1">
                      {isAr ? "حجم الخط" : "Font Size"}
                    </Label>
                    <div className="grid grid-cols-3 gap-2 bg-muted/65 p-1 rounded-xl">
                      {(["small", "medium", "large"] as const).map(size => (
                        <button
                          key={size}
                          onClick={() => setCV(prev => ({ ...prev, fontSize: size }))}
                          className={`py-1.5 rounded-lg text-xs font-bold text-center transition-all ${
                            cv.fontSize === size
                              ? "bg-card shadow-sm text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {size === "small" && (isAr ? "صغير" : "Small")}
                          {size === "medium" && (isAr ? "متوسط" : "Medium")}
                          {size === "large" && (isAr ? "كبير" : "Large")}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Margins */}
                  <div className="space-y-3">
                    <Label className="font-extrabold text-[11px] text-slate-500 uppercase tracking-widest block border-b pb-1">
                      {isAr ? "الهوامش" : "Margins"}
                    </Label>
                    <div className="grid grid-cols-3 gap-2 bg-muted/65 p-1 rounded-xl">
                      {(["narrow", "normal", "wide"] as const).map(margin => (
                        <button
                          key={margin}
                          onClick={() => setCV(prev => ({ ...prev, margin }))}
                          className={`py-1.5 rounded-lg text-xs font-bold text-center transition-all ${
                            cv.margin === margin
                              ? "bg-card shadow-sm text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {margin === "narrow" && (isAr ? "ضيّق" : "Narrow")}
                          {margin === "normal" && (isAr ? "طبيعي" : "Normal")}
                          {margin === "wide" && (isAr ? "واسع" : "Wide")}
                        </button>
                      ))}
                    </div>
                  </div>

                </TabsContent>

              </Tabs>
            </div>

          </div>

        </div>

      </div>
    </AppLayout>
  );
}
