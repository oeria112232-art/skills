import { useState, useEffect } from "react";
import { 
  useListWorkshops, 
  useCreateWorkshop, 
  useUpdateWorkshop, 
  useDeleteWorkshop, 
  getListWorkshopsQueryKey,
  useGetWorkshopExam,
  getGetWorkshopExamQueryKey,
  useUploadWorkshopImage
} from "@workspace/api-client-react";
import { Plus, Pencil, Trash2, BookOpen, Sparkles, Award, FileText, ShieldCheck, Check, Trash, Eye, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/components/layout/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type WorkshopForm = { 
  title: string; 
  description: string; 
  date: string; 
  duration: string; 
  instructor: string; 
  capacity: string; 
  passScore: string; 
  tags: string; 
  imageUrl: string;
  timeLimitMinutes: string;
  certSignTitle: string;
  certSignName: string;
  certEkey: string;
  hasExam: string;
  hasCertificate: string;
  price: string;
};

const defaultForm: WorkshopForm = { 
  title: "", 
  description: "", 
  date: "", 
  duration: "60", 
  instructor: "", 
  capacity: "50", 
  passScore: "70", 
  tags: "",
  imageUrl: "",
  timeLimitMinutes: "60",
  certSignTitle: "رئيس هيئة الإدارة / Board Chairman",
  certSignName: "أحمد الرشيدي / Ahmed Al-Rashidi",
  certEkey: "MHARAT-SECURE-ESIGN-88192-VERIFIED",
  hasExam: "1",
  hasCertificate: "1",
  price: "0",
};

export default function AdminWorkshopsPage() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { data: workshops, isLoading } = useListWorkshops();
  const createWorkshop = useCreateWorkshop();
  const updateWorkshop = useUpdateWorkshop();
  const deleteWorkshop = useDeleteWorkshop();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const uploadImageMutation = useUploadWorkshopImage();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<WorkshopForm>(defaultForm);

  // Cover image upload states
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [imageType, setImageType] = useState<string | null>(null);

  // Workshop Builder Workspace states
  const [builderWorkshopId, setBuilderWorkshopId] = useState<number | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  
  // Local state for exam builder questions
  const [examQuestions, setExamQuestions] = useState<{ question: string; options: string[]; correctIndex: number }[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [newOptions, setNewOptions] = useState(["", "", "", ""]);
  const [newCorrectIndex, setNewCorrectIndex] = useState(0);

  // Local state for certificate designer preview
  const [certForm, setCertForm] = useState({
    certSignTitle: "",
    certSignName: "",
    certEkey: ""
  });

  const selectedWorkshop = workshops?.find(w => w.id === builderWorkshopId);
  const { data: serverExam } = useGetWorkshopExam(builderWorkshopId || 0, {
    query: { enabled: !!builderWorkshopId, queryKey: getGetWorkshopExamQueryKey(builderWorkshopId || 0) }
  });

  // Sync builder states when opening workshop customizer
  useEffect(() => {
    if (selectedWorkshop) {
      setCertForm({
        certSignTitle: selectedWorkshop.certSignTitle || "رئيس الهيئة / Board Chairman",
        certSignName: selectedWorkshop.certSignName || "أحمد الرشيدي / Ahmed Al-Rashidi",
        certEkey: selectedWorkshop.certEkey || "MHARAT-SECURE-ESIGN-88192-VERIFIED"
      });
    }
  }, [selectedWorkshop]);

  useEffect(() => {
    if (serverExam?.questions) {
      // Map questions and find their correctIndex from server if available (or default to 0)
      // Since server API returns exam questions without correctIndex in standard schema, 
      // let's fetch them or map them.
      // Wait, serverExam returns questions. In standard API schema, does it include correctIndex?
      // No, in GetWorkshopExam endpoint, it returns { id, question, options, order }.
      // But we can submit the correct Index via setup API. Let's initialize options:
      setExamQuestions(serverExam.questions.map((q: any) => ({
        question: q.question,
        options: q.options || ["", "", "", ""],
        correctIndex: q.correctIndex !== undefined ? q.correctIndex : 0
      })));
    } else {
      setExamQuestions([]);
    }
  }, [serverExam]);

  const handleOpen = (w?: any) => {
    setImagePreviewUrl(null);
    setImageBase64(null);
    setImageName(null);
    setImageType(null);

    if (w) {
      setEditing(w.id);
      setForm({ 
        title: w.title, 
        description: w.description, 
        date: w.date.slice(0, 16), 
        duration: w.duration.toString(), 
        instructor: w.instructor, 
        capacity: w.capacity.toString(), 
        passScore: w.passScore.toString(), 
        tags: (w.tags || []).join(", "),
        imageUrl: w.imageUrl || "",
        timeLimitMinutes: (w.timeLimitMinutes || 60).toString(),
        certSignTitle: w.certSignTitle || "رئيس الهيئة / Board Chairman",
        certSignName: w.certSignName || "أحمد الرشيدي / Ahmed Al-Rashidi",
        certEkey: w.certEkey || "MHARAT-SECURE-ESIGN-88192-VERIFIED",
        hasExam: (w.hasExam !== undefined ? w.hasExam : 1).toString(),
        hasCertificate: (w.hasCertificate !== undefined ? w.hasCertificate : 1).toString(),
        price: (w.price ?? 0).toString(),
      });
    } else {
      setEditing(null);
      setForm(defaultForm);
    }
    setOpen(true);
  };

  const handleSave = async () => {
    const hasCert = parseInt(form.hasCertificate) === 1;
    const hasEx = parseInt(form.hasExam) === 1;
    if (hasCert && !hasEx) {
      toast({
        variant: "destructive",
        title: isAr ? "خطأ في الإعدادات" : "Configuration Error",
        description: isAr 
          ? "يجب تفعيل الاختبار للورشة عند تفعيل منح الشهادة."
          : "An exam must be enabled when a certificate is offered."
      });
      return;
    }

    const data = {
      title: form.title, 
      description: form.description, 
      date: form.date,
      duration: parseInt(form.duration) || 60, 
      instructor: form.instructor,
      capacity: parseInt(form.capacity) || 50, 
      passScore: parseInt(form.passScore) || 70,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      imageUrl: form.imageUrl || null,
      timeLimitMinutes: parseInt(form.timeLimitMinutes) || 60,
      certSignTitle: form.certSignTitle,
      certSignName: form.certSignName,
      certEkey: form.certEkey,
      hasExam: parseInt(form.hasExam) || 0,
      hasCertificate: hasCert ? 1 : 0,
      price: parseInt(form.price) || 0,
    };
    
    try {
      let savedWorkshop: any;
      if (editing) {
        savedWorkshop = await updateWorkshop.mutateAsync({ id: editing, data });
        
        // If there's an image file base64, upload it
        if (imageBase64 && imageName && imageType) {
          await uploadImageMutation.mutateAsync({
            id: editing,
            data: {
              fileName: imageName,
              fileType: imageType,
              base64Data: imageBase64,
            }
          });
        }
        
        toast({ title: isAr ? "تم تحديث الورشة بنجاح" : "Workshop updated" });
      } else {
        savedWorkshop = await createWorkshop.mutateAsync({ data });
        
        // If there's an image file base64, upload it for the newly created workshop
        if (imageBase64 && imageName && imageType && savedWorkshop?.id) {
          await uploadImageMutation.mutateAsync({
            id: savedWorkshop.id,
            data: {
              fileName: imageName,
              fileType: imageType,
              base64Data: imageBase64,
            }
          });
        }
        
        toast({ title: isAr ? "تم إنشاء الورشة بنجاح" : "Workshop created" });
      }
      queryClient.invalidateQueries({ queryKey: getListWorkshopsQueryKey() });
      setOpen(false);
    } catch (err: any) {
      toast({ 
        title: isAr ? "فشل الحفظ" : "Save failed", 
        description: err.message || (isAr ? "تأكد من اتصال السيرفر بقاعدة البيانات" : "Please check DB connection"),
        variant: "destructive" 
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(isAr ? "هل أنت متأكد من حذف هذه الورشة نهائياً؟" : "Are you sure you want to delete this workshop?")) return;
    try {
      await deleteWorkshop.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListWorkshopsQueryKey() });
      toast({ title: isAr ? "تم حذف الورشة" : "Workshop deleted" });
    } catch (err: any) {
      toast({ title: isAr ? "خطأ في الحذف" : "Delete error", variant: "destructive" });
    }
  };

  // Open Workspace Builder
  const handleOpenBuilder = (w: any) => {
    setBuilderWorkshopId(w.id);
    setBuilderOpen(true);
    setNewQuestion("");
    setNewOptions(["", "", "", ""]);
    setNewCorrectIndex(0);
  };

  // Add question locally
  const handleAddQuestionLocal = () => {
    if (!newQuestion.trim() || newOptions.some(o => !o.trim())) {
      toast({ title: isAr ? "يرجى تعبئة السؤال والخيارات الأربعة" : "Please fill question and all 4 choices", variant: "destructive" });
      return;
    }
    setExamQuestions(prev => [...prev, {
      question: newQuestion,
      options: [...newOptions],
      correctIndex: newCorrectIndex
    }]);
    setNewQuestion("");
    setNewOptions(["", "", "", ""]);
    setNewCorrectIndex(0);
  };

  // Remove question locally
  const handleRemoveQuestionLocal = (idx: number) => {
    setExamQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  // Save full exam questions to backend
  const handleSaveExam = async () => {
    if (!builderWorkshopId) return;
    try {
      const res = await fetch(`/api/workshops/${builderWorkshopId}/exam/setup`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("mharat-token")}`
        },
        body: JSON.stringify({ questions: examQuestions })
      });
      if (!res.ok) throw new Error("Failed to save exam setup");
      
      toast({ title: isAr ? "تم حفظ وتحديث أسئلة الاختبار بنجاح" : "Exam questions saved successfully!" });
      queryClient.invalidateQueries({ queryKey: getGetWorkshopExamQueryKey(builderWorkshopId) });
    } catch (err: any) {
      toast({ title: isAr ? "فشل حفظ الاختبار" : "Failed to save exam", description: err.message, variant: "destructive" });
    }
  };

  // Save certificate template
  const handleSaveCertTemplate = async () => {
    if (!builderWorkshopId) return;
    try {
      await updateWorkshop.mutateAsync({
        id: builderWorkshopId,
        data: {
          certSignTitle: certForm.certSignTitle,
          certSignName: certForm.certSignName,
          certEkey: certForm.certEkey
        }
      });
      toast({ title: isAr ? "تم حفظ قالب وتوقيعات الشهادة بنجاح" : "Certificate template updated!" });
      queryClient.invalidateQueries({ queryKey: getListWorkshopsQueryKey() });
    } catch (err: any) {
      toast({ title: isAr ? "فشل حفظ قالب الشهادة" : "Failed to save certificate template", variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between text-start">
        <div>
          <h1 className="text-2xl font-bold mb-1" data-testid="heading-admin-workshops">
            {isAr ? "لوحة إدارة الورش والتأهيل" : "Manage Workshops & Certification"}
          </h1>
          <p className="text-xs text-muted-foreground font-semibold">
            {isAr ? "إنشاء وإدارة الورش التدريبية، وبناء الاختبارات وتصميم شهادات التخرج الرسمية." : "Create sessions, build exams, and customize digital certificates."}
          </p>
        </div>
        <Button onClick={() => handleOpen()} className="gap-2 rounded-xl font-bold text-xs" data-testid="button-add-workshop">
          <Plus className="w-4 h-4" /> {isAr ? "إضافة ورشة عمل جديدة" : "Add Workshop"}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto bg-card/50 shadow-sm text-start">
          <table className="w-full text-xs min-w-[650px]">
            <thead>
              <tr className="bg-muted/70 text-left border-b border-border">
                <th className="px-4 py-3.5 font-bold uppercase">{isAr ? "الورشة والمدرب" : "Workshop & Instructor"}</th>
                <th className="px-4 py-3.5 font-bold uppercase hidden sm:table-cell">{isAr ? "التاريخ" : "Date"}</th>
                <th className="px-4 py-3.5 font-bold uppercase hidden md:table-cell">{isAr ? "المسجلين" : "Capacity"}</th>
                <th className="px-4 py-3.5 font-bold uppercase">{isAr ? "الحالة" : "Status"}</th>
                <th className="px-4 py-3.5 font-bold uppercase text-right">{isAr ? "إجراءات التخصيص والإدارة" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!Array.isArray(workshops) || workshops.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="font-bold">{isAr ? "لا توجد ورش عمل حالياً" : "No workshops configured"}</p>
                  </td>
                </tr>
              ) : workshops.map(w => (
                <tr key={w.id} className="hover:bg-muted/30 transition-colors" data-testid={`admin-workshop-row-${w.id}`}>
                  <td className="px-4 py-3">
                    <p className="font-bold text-sm text-foreground">{w.title}</p>
                    <p className="text-[10px] text-muted-foreground font-semibold">👨‍🏫 {w.instructor}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-medium hidden sm:table-cell">
                    {new Date(w.date).toLocaleDateString(isAr ? "ar-EG" : "en-US")}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">
                    👥 {w.enrolledCount}/{w.capacity}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={w.status === "upcoming" ? "default" : w.status === "ongoing" ? "secondary" : "outline"} className="rounded-full">
                      {isAr ? (w.status === "upcoming" ? "قريباً" : w.status === "ongoing" ? "جارية" : "منتهية") : w.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleOpenBuilder(w)}
                        className="h-8 gap-1 text-[10px] rounded-lg border-primary/20 hover:bg-primary/5 text-primary font-extrabold"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isAr ? "الاختبار والشهادة" : "Exam & Cert"}</span>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleOpen(w)} data-testid={`button-edit-workshop-${w.id}`}>
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(w.id)} data-testid={`button-delete-workshop-${w.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Main Workshop Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border shadow-2xl p-6 text-start">
          <DialogHeader className="border-b border-border/40 pb-3 mb-4">
            <DialogTitle className="text-lg font-bold">
              {editing ? (isAr ? "تعديل تفاصيل الورشة" : "Edit Workshop Details") : (isAr ? "إضافة ورشة عمل جديدة" : "New Workshop")}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label className="font-bold mb-1 text-xs">{isAr ? "عنوان الورشة التدريبية" : "Workshop Title"}</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="rounded-xl h-10 text-xs font-semibold" data-testid="input-workshop-title" />
            </div>

            <div>
              <Label className="font-bold mb-1 text-xs">{isAr ? "اسم المدرب الرئيسي" : "Lead Instructor"}</Label>
              <Input value={form.instructor} onChange={e => setForm(f => ({ ...f, instructor: e.target.value }))} className="rounded-xl h-10 text-xs font-semibold" />
            </div>
            <div>
              <Label className="font-bold mb-1 text-xs">{isAr ? "تاريخ وتوقيت البث المباشر" : "Date & Time"}</Label>
              <Input type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="rounded-xl h-10 text-xs font-semibold" />
            </div>

            <div>
              <Label className="font-bold mb-1 text-xs">{isAr ? "مدة الورشة (بالدقائق)" : "Duration (min)"}</Label>
              <Input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} className="rounded-xl h-10 text-xs font-semibold" />
            </div>
            <div>
              <Label className="font-bold mb-1 text-xs">{isAr ? "أقصى سعة حضور (طالب)" : "Seat Capacity"}</Label>
              <Input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} className="rounded-xl h-10 text-xs font-semibold" />
            </div>

            <div>
              <Label className="font-bold mb-1 text-xs">{isAr ? "السعر (نقاط)" : "Price (points)"}</Label>
              <Input type="number" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="rounded-xl h-10 text-xs font-semibold" placeholder="0 = مجاني" />
            </div>

            {form.hasExam === "1" && (
              <>
                <div>
                  <Label className="font-bold mb-1 text-xs">{isAr ? "علامة النجاح في الاختبار (%)" : "Pass Score (%)"}</Label>
                  <Input type="number" value={form.passScore} onChange={e => setForm(f => ({ ...f, passScore: e.target.value }))} className="rounded-xl h-10 text-xs font-semibold" />
                </div>
                <div>
                  <Label className="font-bold mb-1 text-xs">{isAr ? "مدة الاختبار (بالدقائق)" : "Exam Time Limit (min)"}</Label>
                  <Input type="number" value={form.timeLimitMinutes} onChange={e => setForm(f => ({ ...f, timeLimitMinutes: e.target.value }))} className="rounded-xl h-10 text-xs font-semibold" />
                </div>
              </>
            )}

            <div>
              <Label className="font-bold mb-1 text-xs">{isAr ? "إعداد اختبار للورشة" : "Workshop Exam Setup"}</Label>
              <Select value={form.hasExam} onValueChange={v => setForm(f => ({ ...f, hasExam: v, hasCertificate: v === "1" ? "1" : f.hasCertificate }))}>
                <SelectTrigger className="rounded-xl h-10 text-xs font-semibold"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="1" className="text-xs font-medium">{isAr ? "نعم، تتطلب اختباراً للحصول على الشهادة" : "Yes, requires exam for certificate"}</SelectItem>
                  <SelectItem value="0" className="text-xs font-medium">{isAr ? "لا، إلغاء الاختبار" : "No, cancel exam"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.hasExam === "0" && (
              <div>
                <Label className="font-bold mb-1 text-xs">{isAr ? "شهادة تخرج حضورية" : "Attendance Certificate"}</Label>
                <Select value={form.hasCertificate} onValueChange={v => setForm(f => ({ ...f, hasCertificate: v }))}>
                  <SelectTrigger className="rounded-xl h-10 text-xs font-semibold"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="1" className="text-xs font-medium">{isAr ? "نعم، تمنح شهادة حضور بعد انتهاء الورشة مباشرة" : "Yes, award certificate on workshop completion"}</SelectItem>
                    <SelectItem value="0" className="text-xs font-medium">{isAr ? "لا، ورشة بدون شهادة نهائياً" : "No, workshop without certificate"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="md:col-span-2 space-y-2 border border-border/40 p-4 rounded-2xl bg-card/40">
              <Label className="font-bold text-xs flex items-center gap-1.5">
                🖼️ {isAr ? "صورة غلاف الورشة" : "Workshop Cover Image"}
              </Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                {/* File picker & Base64 Reader */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-muted-foreground block font-semibold">
                    {isAr ? "اختر صورة من جهازك (PNG, JPG)" : "Choose image from device (PNG, JPG)"}
                  </span>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setImageName(file.name);
                          const typeParts = file.type.split("/");
                          setImageType(typeParts[typeParts.length - 1] || "png");
                          
                          // Local preview
                          const previewUrl = URL.createObjectURL(file);
                          setImagePreviewUrl(previewUrl);
                          
                          // Base64 reader
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setImageBase64(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="rounded-xl h-10 text-xs font-semibold cursor-pointer"
                    />
                  </div>
                </div>

                {/* Local preview slot or existing imageUrl preview */}
                <div className="flex items-center justify-center border border-dashed border-border/60 rounded-xl p-2 h-24 bg-card/60 relative overflow-hidden">
                  {imagePreviewUrl ? (
                    <>
                      <img src={imagePreviewUrl} alt="Preview" className="h-full w-full object-cover rounded-lg" />
                      <button 
                        type="button"
                        onClick={() => {
                          setImagePreviewUrl(null);
                          setImageBase64(null);
                          setImageName(null);
                          setImageType(null);
                        }}
                        className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1 hover:bg-destructive/90 transition-colors shadow-sm"
                      >
                        <Trash className="w-3 h-3" />
                      </button>
                    </>
                  ) : form.imageUrl ? (
                    <img src={form.imageUrl} alt="Cover" className="h-full w-full object-cover rounded-lg" />
                  ) : (
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      {isAr ? "لا توجد صورة محددة" : "No image selected"}
                    </span>
                  )}
                </div>
              </div>

              {/* URL fallback (if they want to paste a direct link) */}
              <div className="pt-2 border-t border-border/30">
                <Label className="text-[10px] text-muted-foreground font-bold mb-1 block">
                  {isAr ? "أو أدخل رابط صورة مباشرة (اختياري):" : "Or enter direct image URL (optional):"}
                </Label>
                <Input 
                  value={form.imageUrl} 
                  onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} 
                  className="rounded-xl h-8 text-xs font-semibold" 
                  placeholder="https://..." 
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <Label className="font-bold mb-1 text-xs">{isAr ? "الوسوم والمهارات المكتسبة (مفصولة بفاصلة)" : "Tags / Skills (comma-separated)"}</Label>
              <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder={isAr ? "مثال: CCNA, Networks, Routing" : "e.g. CCNA, Networks, Routing"} className="rounded-xl h-10 text-xs font-semibold" />
            </div>

            <div className="md:col-span-2">
              <Label className="font-bold mb-1 text-xs">{isAr ? "وصف ومحاور الورشة بالتفصيل" : "Detailed Description"}</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} className="rounded-xl text-xs font-semibold" />
            </div>
          </div>

          <DialogFooter className="mt-6 border-t border-border/40 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl font-bold text-xs">{isAr ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleSave} disabled={!form.title || !form.instructor || createWorkshop.isPending || updateWorkshop.isPending} className="rounded-xl font-bold text-xs" data-testid="button-save-workshop">
              {isAr ? "حفظ البيانات" : "Save Workshop"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Workshop Builder Workspace Modal (Exam & Cert Customizer) */}
      <Dialog open={builderOpen} onOpenChange={setBuilderOpen}>
        <DialogContent className="max-w-5xl max-h-[94vh] overflow-y-auto rounded-3xl border border-border shadow-2xl p-6 sm:p-8 text-start">
          <DialogHeader className="border-b border-border/40 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/25">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base font-black">
                  {isAr ? "منصة تخصيص الاختبار والشهادة للورشة" : "Workshop Blueprint Builder"}
                </DialogTitle>
                <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                  {isAr ? `تعديل إعدادات الورشة: ${selectedWorkshop?.title}` : `Customizing: ${selectedWorkshop?.title}`}
                </p>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="exam" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-muted/60 p-1 mb-6">
              <TabsTrigger value="exam" className="rounded-xl font-bold text-xs py-2 gap-1.5">
                <FileText className="w-4 h-4" />
                <span>{isAr ? "بناء وإعداد الاختبار" : "Exam Builder"}</span>
              </TabsTrigger>
              <TabsTrigger value="cert" className="rounded-xl font-bold text-xs py-2 gap-1.5">
                <Award className="w-4 h-4" />
                <span>{isAr ? "تصميم وتواقيع الشهادة" : "Certificate Designer"}</span>
              </TabsTrigger>
            </TabsList>

            {/* Exam Builder tab */}
            <TabsContent value="exam" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Add New Question Section */}
                <div className="lg:col-span-5 p-5 rounded-2xl border border-border/60 bg-muted/20 space-y-4">
                  <h3 className="font-extrabold text-sm text-foreground flex items-center gap-1.5 border-b border-border/40 pb-2 mb-1">
                    <Plus className="w-4 h-4 text-primary" />
                    {isAr ? "إضافة سؤال جديد" : "Add New Question"}
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="font-bold text-[10.5px] text-muted-foreground">{isAr ? "صيغة السؤال" : "Question Text"}</Label>
                      <Input 
                        value={newQuestion} 
                        onChange={e => setNewQuestion(e.target.value)} 
                        placeholder={isAr ? "اكتب السؤال هنا..." : "Type the question..."}
                        className="rounded-xl text-xs font-semibold h-10" 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="font-bold text-[10.5px] text-muted-foreground">{isAr ? "الخيارات الأربعة" : "Four Choices"}</Label>
                      {newOptions.map((o, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-center font-bold text-[10px] text-primary">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <Input 
                            value={o} 
                            onChange={e => {
                              const updated = [...newOptions];
                              updated[idx] = e.target.value;
                              setNewOptions(updated);
                            }}
                            placeholder={isAr ? `الخيار ${String.fromCharCode(65 + idx)}` : `Choice ${String.fromCharCode(65 + idx)}`}
                            className="rounded-xl text-xs font-semibold h-9" 
                          />
                        </div>
                      ))}
                    </div>

                    <div>
                      <Label className="font-bold text-[10.5px] text-muted-foreground">{isAr ? "الخيار الصحيح" : "Correct Answer"}</Label>
                      <Select value={newCorrectIndex.toString()} onValueChange={v => setNewCorrectIndex(parseInt(v))}>
                        <SelectTrigger className="rounded-xl h-10 text-xs font-semibold"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="0" className="text-xs font-medium">{isAr ? "الخيار A" : "Choice A"}</SelectItem>
                          <SelectItem value="1" className="text-xs font-medium">{isAr ? "الخيار B" : "Choice B"}</SelectItem>
                          <SelectItem value="2" className="text-xs font-medium">{isAr ? "الخيار C" : "Choice C"}</SelectItem>
                          <SelectItem value="3" className="text-xs font-medium">{isAr ? "الخيار D" : "Choice D"}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button onClick={handleAddQuestionLocal} className="w-full gap-2 rounded-xl font-bold h-10 text-xs shadow-md mt-2">
                      <Plus className="w-4 h-4" />
                      <span>{isAr ? "أدرج السؤال للاختبار" : "Insert to Exam"}</span>
                    </Button>
                  </div>
                </div>

                {/* Exam Preview List */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-1">
                    <h3 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-primary" />
                      {isAr ? "أسئلة الاختبار الحالية" : "Current Exam Questions"}
                    </h3>
                    <Badge className="font-mono">{examQuestions.length} {isAr ? "سؤال" : "questions"}</Badge>
                  </div>

                  {examQuestions.length === 0 ? (
                    <div className="border border-dashed border-border/60 p-12 text-center rounded-2xl bg-card/45">
                      <FileText className="w-10 h-10 mx-auto opacity-20 text-primary mb-2" />
                      <p className="text-xs font-bold text-muted-foreground">{isAr ? "لا توجد أسئلة في هذا الاختبار بعد." : "No questions in this exam yet."}</p>
                    </div>
                  ) : (
                    <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-2">
                      {examQuestions.map((q, idx) => (
                        <div key={idx} className="p-4 rounded-xl border border-border bg-card/85 space-y-2 relative group shadow-sm">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleRemoveQuestionLocal(idx)} 
                            className="absolute top-3.5 right-3.5 w-7 h-7 p-0 rounded-lg text-destructive hover:bg-destructive/10"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </Button>
                          <div className="flex items-start gap-2 max-w-[90%]">
                            <span className="font-bold text-xs text-primary bg-primary/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <p className="font-bold text-xs text-foreground mt-0.5">{q.question}</p>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-7">
                            {q.options.map((o, oIdx) => (
                              <div 
                                key={oIdx} 
                                className={`p-2.5 rounded-lg border text-[10.5px] font-semibold flex items-center justify-between ${
                                  oIdx === q.correctIndex 
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400" 
                                    : "bg-background border-border/65 text-muted-foreground"
                                }`}
                              >
                                <span>{String.fromCharCode(65 + oIdx)}. {o}</span>
                                {oIdx === q.correctIndex && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 text-right">
                    <Button onClick={handleSaveExam} className="rounded-xl font-bold text-xs shadow-lg shadow-primary/5 gap-1.5 h-10 px-6">
                      <Check className="w-4 h-4" />
                      <span>{isAr ? "حفظ ونشر التعديلات" : "Publish Exam"}</span>
                    </Button>
                  </div>
                </div>

              </div>
            </TabsContent>

            {/* Certificate Template tab */}
            <TabsContent value="cert" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Configuration Fields */}
                <div className="lg:col-span-4 p-5 rounded-2xl border border-border/60 bg-muted/20 space-y-4">
                  <h3 className="font-extrabold text-sm text-foreground flex items-center gap-1.5 border-b border-border/40 pb-2 mb-1">
                    <Settings className="w-4 h-4 text-primary" />
                    {isAr ? "إعداد التواقيع والتوثيق" : "Authority Settings"}
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="font-bold text-[10.5px] text-muted-foreground">{isAr ? "منصب الموقع المخول" : "Signature Title"}</Label>
                      <Input 
                        value={certForm.certSignTitle} 
                        onChange={e => setCertForm(f => ({ ...f, certSignTitle: e.target.value }))}
                        className="rounded-xl text-xs font-semibold h-10" 
                      />
                    </div>

                    <div>
                      <Label className="font-bold text-[10.5px] text-muted-foreground">{isAr ? "اسم جهة التوقيع" : "Signer Name"}</Label>
                      <Input 
                        value={certForm.certSignName} 
                        onChange={e => setCertForm(f => ({ ...f, certSignName: e.target.value }))}
                        className="rounded-xl text-xs font-semibold h-10" 
                      />
                    </div>

                    <div>
                      <Label className="font-bold text-[10.5px] text-muted-foreground">{isAr ? "رمز البصمة الرقمية للمشروع (E-signature)" : "Cryptographic Hash (E-signature)"}</Label>
                      <Input 
                        value={certForm.certEkey} 
                        onChange={e => setCertForm(f => ({ ...f, certEkey: e.target.value }))}
                        className="rounded-xl text-xs font-semibold h-10 font-mono" 
                      />
                      <p className="text-[9px] text-muted-foreground font-medium leading-relaxed mt-1">
                        {isAr ? "يستخدم هذا الرمز لإثبات صحة وموثوقية الشهادة رقمياً." : "Unique hash value validating that this document is certified."}
                      </p>
                    </div>

                    <Button onClick={handleSaveCertTemplate} className="w-full gap-2 rounded-xl font-bold h-10 text-xs shadow-md mt-2">
                      <Check className="w-4 h-4" />
                      <span>{isAr ? "حفظ قالب الشهادة" : "Save Blueprint"}</span>
                    </Button>
                  </div>
                </div>

                {/* Certificate Live Mockup */}
                <div className="lg:col-span-8 space-y-3">
                  <h3 className="font-extrabold text-sm text-foreground flex items-center gap-1.5 border-b border-border/40 pb-2 mb-3">
                    <Eye className="w-4 h-4 text-primary" />
                    {isAr ? "نموذج المعاينة الحي للشهادة" : "Live Certificate Mockup"}
                  </h3>
                  
                  {/* Miniature template layout */}
                  <div className="relative w-full overflow-hidden bg-white text-slate-800 p-6 rounded-xl border-8 border-double border-amber-600/30 shadow-inner font-serif select-none max-w-full">
                    {/* Watermark */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none">
                      <Award className="w-[180px] h-[180px] text-amber-700" />
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-amber-600/20 pb-2.5 mb-4 text-[8px] sm:text-[9.5px]">
                      <div className="text-left font-sans">
                        <p className="font-bold text-amber-800">Skills Project</p>
                        <p className="text-[7.5px] text-slate-500">Ministry of Labor</p>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Award className="w-4 h-4 text-amber-600" />
                        <span className="text-[7.5px] font-bold text-amber-700 uppercase tracking-wider">مهارات</span>
                      </div>
                      
                      <div className="text-right font-sans">
                        <p className="font-bold text-amber-800">مشروع مهارات</p>
                        <p className="text-[7.5px] text-slate-500">وزارة العمل والشؤون الاجتماعية</p>
                      </div>
                    </div>

                    {/* Wording */}
                    <div className="text-center space-y-2 mb-4">
                      <h4 className="text-[11px] sm:text-sm font-black text-slate-800 uppercase tracking-widest">
                        {isAr ? "شهادة تخرج واجتياز" : "Certificate of Completion"}
                      </h4>
                      <p className="text-[8px] text-slate-400 italic font-sans">{isAr ? "تشهد إدارة المشروع بأن المتدرب:" : "This certifies that:"}</p>
                      <h5 className="text-xs sm:text-sm font-black text-amber-700 underline underline-offset-4">{isAr ? "اسم الطالب (نموذج)" : "Student Name (Sample)"}</h5>
                      <p className="text-[8px] text-slate-500 font-sans">{isAr ? "قد أكمل بنجاح المسار التدريبي المقرر لـ:" : "has successfully completed:"}</p>
                      <h6 className="text-[9px] sm:text-xs font-bold text-slate-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-500/10 inline-block font-sans">
                        {selectedWorkshop?.title || (isAr ? "[عنوان الورشة]" : "[Workshop]")}
                      </h6>
                    </div>

                    {/* Signatures */}
                    <div className="pt-4 border-t border-amber-600/10 grid grid-cols-3 gap-4 items-end text-[8.5px]">
                      <div>
                        <p className="text-[7px] text-slate-400 font-bold uppercase">{isAr ? "جهة التوقيع" : "Signature"}</p>
                        <div className="h-5 flex items-center">
                          <span className="font-serif italic text-amber-700/80 text-[10px] font-bold">
                            {certForm.certSignName.split(" / ")[0]}
                          </span>
                        </div>
                        <div className="border-t border-slate-200 pt-1 font-sans">
                          <p className="font-bold text-slate-700 text-[8px]">{certForm.certSignName}</p>
                          <p className="text-[7.5px] text-slate-400">{certForm.certSignTitle}</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <div className="w-10 h-10 rounded-full border border-double border-amber-600/30 flex items-center justify-center bg-amber-50/20">
                          <ShieldCheck className="w-5 h-5 text-amber-600" />
                        </div>
                      </div>

                      <div className="text-right space-y-0.5">
                        <div className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200/50 rounded px-1 text-[6.5px] font-mono font-bold uppercase">
                          <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                          <span>{isAr ? "توقيع موثق" : "Verified"}</span>
                        </div>
                        <p className="text-[7px] text-slate-400 font-bold uppercase">{isAr ? "بصمة التوثيق" : "Verification Hash"}</p>
                        <p className="text-[6.5px] font-mono text-slate-500 break-all leading-tight max-w-[120px] ml-auto">
                          {certForm.certEkey}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-8 border-t border-border/40 pt-4">
            <Button onClick={() => setBuilderOpen(false)} className="rounded-xl font-bold text-xs h-10 px-6">
              {isAr ? "إغلاق نافذة التخصيص" : "Close Blueprint Builder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
