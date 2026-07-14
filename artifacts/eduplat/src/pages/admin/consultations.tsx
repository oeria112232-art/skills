import { useState } from "react";
import { useListConsultations, useReplyToConsultation, useCloseConsultation, getListConsultationsQueryKey } from "@workspace/api-client-react";
import { MessageSquare, Send, CheckCircle2, AlertCircle, HelpCircle, BadgeHelp, User, Calendar, BookOpen, Clock, X, ChevronRight, Sparkles, Filter, Mail, Search, MessageSquareCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLanguage } from "@/components/layout/LanguageContext";
import { useAuth } from "@/components/layout/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useLocation } from "wouter";

const categories = [
  { value: "tot", label: "إعداد المدربين TOT", labelEn: "Training of Trainers" },
  { value: "networking", label: "شبكات CCNA", labelEn: "CCNA Networking" },
  { value: "cybersecurity", label: "الأمن السيبراني", labelEn: "Cyber Security" },
  { value: "fullstack", label: "تطوير الويب الشامل", labelEn: "Full-Stack Dev" },
  { value: "computer-basics", label: "أساسيات الحاسوب", labelEn: "Computer Basics" },
  { value: "mobile", label: "تطوير تطبيقات الموبايل", labelEn: "Mobile Development" },
  { value: "other", label: "استشارة عامة", labelEn: "General Consultation" },
];

export default function AdminConsultationsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  const isAr = language === "ar";

  // Redirect non-staff users
  const isStaff = user?.role === "admin" || user?.role === "instructor";
  if (!isStaff) {
    setLocation("/");
    return null;
  }

  const { data: consultations, isLoading } = useListConsultations();
  const replyMutation = useReplyToConsultation();
  const closeMutation = useCloseConsultation();

  const [activeConsultationId, setActiveConsultationId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyText, setReplyText] = useState("");

  const activeConsultation = consultations?.find(c => c.id === activeConsultationId);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConsultationId || !replyText.trim()) return;

    try {
      await replyMutation.mutateAsync({
        id: activeConsultationId,
        data: { response: replyText }
      });
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: getListConsultationsQueryKey() });
    } catch (err) {
      console.error("Failed to reply:", err);
    }
  };

  const handleClose = async (id: number) => {
    try {
      await closeMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListConsultationsQueryKey() });
    } catch (err) {
      console.error("Failed to close:", err);
    }
  };

  const filteredConsultations = consultations?.filter(c => {
    const statusMatch = filterStatus === "all" || c.status === filterStatus;
    const categoryMatch = filterCategory === "all" || c.category === filterCategory;
    const searchMatch = !searchQuery.trim() || 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.userName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (c.userEmail?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    return statusMatch && categoryMatch && searchMatch;
  }) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-500/15 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">{isAr ? "معلقة" : "Pending"}</Badge>;
      case "replied":
        return <Badge className="bg-emerald-500/15 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">{isAr ? "تم الرد" : "Replied"}</Badge>;
      case "closed":
        return <Badge className="bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-full text-[10px] font-bold">{isAr ? "مغلقة" : "Closed"}</Badge>;
      default:
        return null;
    }
  };

  return (
    <AppLayout>
      <div className="mb-8 text-start">
        <div className="flex items-center gap-2 mb-1.5">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold px-3 py-0.5 rounded-full text-[10px]">
            {isAr ? "إدارة الاستشارات المهنية" : "Consultation Management Panel"}
          </Badge>
        </div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
          {isAr ? "لوحة الاستشارات الواردة | Incoming Inquiries" : "Incoming Inquiries"}
        </h1>
        <p className="text-sm text-muted-foreground font-medium mt-1">
          {isAr
            ? "عرض استشارات الطلاب والرد عليها وتقديم التوجيه الأكاديمي والمهني المناسب."
            : "Review, assign, and reply to student inquiries and technical consultation requests."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-start">
        
        {/* Left Side: Search, Filters and Consultation List */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-5 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm space-y-4">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? "ابحث بالاسم، البريد، أو نص السؤال..." : "Search by student, email, query..."}
                className="pl-10 rounded-xl border-border/60 bg-background/50 h-10 text-xs font-semibold"
              />
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">{isAr ? "الحالة" : "Status"}</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="rounded-xl border-border/60 bg-background/50 h-9 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50">
                    <SelectItem value="all" className="text-xs font-semibold">{isAr ? "الكل" : "All"}</SelectItem>
                    <SelectItem value="pending" className="text-xs font-semibold">{isAr ? "معلقة (بحاجة لرد)" : "Pending"}</SelectItem>
                    <SelectItem value="replied" className="text-xs font-semibold">{isAr ? "تم الرد عليها" : "Replied"}</SelectItem>
                    <SelectItem value="closed" className="text-xs font-semibold">{isAr ? "مغلقة" : "Closed"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">{isAr ? "القسم" : "Category"}</label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="rounded-xl border-border/60 bg-background/50 h-9 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50">
                    <SelectItem value="all" className="text-xs font-semibold">{isAr ? "الكل" : "All"}</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value} className="text-xs font-semibold">
                        {isAr ? cat.label : cat.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Incoming List Card */}
          <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden flex flex-col max-h-[500px]">
            <div className="p-4 border-b border-border/50 bg-muted/40">
              <h2 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-primary" />
                {isAr ? "الاستشارات الواردة" : "Consultation Requests"}
                <Badge variant="secondary" className="ml-auto text-[10px] font-extrabold">{filteredConsultations.length}</Badge>
              </h2>
            </div>

            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl bg-muted/70" />)}
              </div>
            ) : filteredConsultations.length === 0 ? (
              <div className="p-16 text-center text-xs text-muted-foreground font-semibold flex-1 flex flex-col justify-center items-center">
                <BadgeHelp className="w-10 h-10 mb-2 opacity-35 text-primary" />
                {isAr ? "لا توجد استشارات مطابقة حالياً." : "No inquiries matching filter."}
              </div>
            ) : (
              <div className="p-2.5 overflow-y-auto space-y-1.5 flex-1">
                {filteredConsultations.map(c => {
                  const catObj = categories.find(cat => cat.value === c.category);
                  const active = activeConsultationId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveConsultationId(c.id)}
                      className={`w-full text-left p-3.5 rounded-xl transition-all duration-200 flex flex-col gap-1.5 border text-start ${
                        active 
                          ? "border-primary bg-primary/5 shadow-sm" 
                          : "border-border/40 hover:border-primary/40 bg-background/45"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9.5px] font-extrabold text-primary uppercase">
                          {isAr ? catObj?.label : catObj?.labelEn}
                        </span>
                        {getStatusBadge(c.status)}
                      </div>
                      <h4 className="text-xs font-extrabold text-foreground truncate">{c.title}</h4>
                      
                      <div className="flex items-center gap-1.5 text-[10px] text-foreground/80 font-bold bg-muted/50 px-2 py-0.5 rounded-lg w-fit">
                        <User className="w-3.5 h-3.5 text-primary" />
                        <span>{c.userName}</span>
                      </div>

                      <div className="flex items-center justify-between text-[9px] text-muted-foreground font-semibold pt-1 border-t border-border/20">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-primary/70" />
                          {new Date(c.createdAt).toLocaleDateString(isAr ? "ar-EG" : "en-US")}
                        </span>
                        {c.assignedTo === user?.id && (
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[8px] font-bold py-0">{isAr ? "موجهة لك" : "For You"}</Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Consultation Workspace */}
        <div className="lg:col-span-7">
          {activeConsultation ? (
            <div className="space-y-6">
              
              {/* Main Consultation Card */}
              <div className="rounded-2xl border border-border/50 bg-card/65 backdrop-blur-sm shadow-lg p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/40 pb-4 gap-4">
                  <div className="text-start">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-extrabold text-[9px] px-2 py-0">
                        {isAr 
                          ? (categories.find(cat => cat.value === activeConsultation.category)?.label || activeConsultation.category)
                          : (categories.find(cat => cat.value === activeConsultation.category)?.labelEn || activeConsultation.category)}
                      </Badge>
                      {getStatusBadge(activeConsultation.status)}
                    </div>
                    <h2 className="text-lg font-extrabold text-foreground">{activeConsultation.title}</h2>
                  </div>
                  
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    {activeConsultation.status !== "closed" && (
                      <Button 
                        variant="outline" 
                        onClick={() => handleClose(activeConsultation.id)}
                        disabled={closeMutation.isPending}
                        className="rounded-xl font-bold h-9 text-xs border-border/60 hover:bg-muted"
                      >
                        {isAr ? "إغلاق كـ منتهية" : "Close Ingress"}
                      </Button>
                    )}
                    <span className="text-[10px] text-muted-foreground font-semibold">#{activeConsultation.id}</span>
                  </div>
                </div>

                {/* Student Profile Card */}
                <div className="flex items-center gap-3.5 bg-muted/40 p-3.5 rounded-xl border border-border/30 text-start">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary">
                    {activeConsultation.userName?.[0]?.toUpperCase() || "S"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-extrabold text-foreground">{activeConsultation.userName}</h4>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Mail className="w-3.5 h-3.5" />
                      {activeConsultation.userEmail}
                    </span>
                  </div>
                </div>

                {/* Consultation Message */}
                <div className="space-y-1.5 text-start bg-background/40 p-4 rounded-xl border border-border/30">
                  <span className="text-[9.5px] font-bold text-muted-foreground flex items-center gap-1">
                    <MessageSquareCode className="w-3.5 h-3.5 text-primary" />
                    {isAr ? "تفاصيل طلب الطالب:" : "Student Query:"}
                  </span>
                  <p className="text-xs text-foreground/90 whitespace-pre-line leading-relaxed font-medium pt-1">
                    {activeConsultation.message}
                  </p>
                </div>
              </div>

              {/* Response Workspace */}
              {activeConsultation.status === "closed" ? (
                <div className="rounded-2xl border border-border/50 bg-card/65 backdrop-blur-sm p-6 text-center">
                  <CheckCircle2 className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
                  <h4 className="text-xs font-bold text-muted-foreground">{isAr ? "الاستشارة مغلقة ولا يمكن الرد عليها" : "Inquiry is closed"}</h4>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {isAr ? "قام الطالب أو المشرف بإغلاق الاستشارة." : "This session is archived."}
                  </p>
                </div>
              ) : activeConsultation.status === "replied" && activeConsultation.response ? (
                <div className="rounded-2xl border border-border/50 bg-card/65 backdrop-blur-sm p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-border/40 pb-3">
                    <h4 className="text-xs font-extrabold text-primary flex items-center gap-1">
                      <Sparkles className="w-4 h-4" />
                      {isAr ? "الرد الحالي المكتوب:" : "Current Submitted Reply:"}
                    </h4>
                    <span className="text-[9.5px] text-muted-foreground font-semibold">
                      {activeConsultation.repliedName} @ {activeConsultation.repliedAt && new Date(activeConsultation.repliedAt).toLocaleString(isAr ? "ar-EG" : "en-US")}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/90 whitespace-pre-line leading-relaxed font-medium text-start">
                    {activeConsultation.response}
                  </p>
                  
                  <div className="border-t border-border/45 pt-4">
                    <h5 className="text-[11px] font-bold text-muted-foreground mb-3 text-start">{isAr ? "تحديث الرد الفني:" : "Update Reply:"}</h5>
                    <form onSubmit={handleSendReply} className="space-y-4">
                      <Textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={isAr ? "اكتب الرد المحدث هنا..." : "Type updated reply here..."}
                        rows={4}
                        required
                        className="rounded-xl border-border/60 bg-background/50 text-xs font-medium resize-none"
                      />
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={replyMutation.isPending || !replyText.trim()}
                          className="rounded-xl font-bold h-10 text-xs shadow-md shadow-primary/10 gap-2"
                        >
                          <Send className="w-3.5 h-3.5" />
                          {isAr ? "تحديث الرد" : "Update Response"}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border/50 bg-card/65 backdrop-blur-sm p-6 space-y-4">
                  <h4 className="text-xs font-extrabold text-foreground flex items-center gap-1 border-b border-border/40 pb-3">
                    <Send className="w-4 h-4 text-primary" />
                    {isAr ? "تقديم الرد والإرشاد الفني:" : "Write Response:"}
                  </h4>
                  
                  <form onSubmit={handleSendReply} className="space-y-4">
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={isAr 
                        ? "اكتب تفاصيل الحل، المراجعة البرمجية، أو التوجيه المهني للطالب هنا..." 
                        : "Type your guidance, code review or technical recommendations here..."}
                      rows={6}
                      required
                      className="rounded-xl border-border/60 bg-background/50 text-xs font-medium resize-none"
                    />
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={replyMutation.isPending || !replyText.trim()}
                        className="rounded-xl font-bold h-10 text-xs shadow-md shadow-primary/10 gap-2"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {isAr ? "إرسال الرد الفوري" : "Send Response"}
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full rounded-2xl border border-dashed border-border/80 bg-card/30 flex flex-col items-center justify-center p-16 text-center">
              <BadgeHelp className="w-16 h-16 text-primary opacity-20 mb-4" />
              <h3 className="text-sm font-extrabold text-foreground">{isAr ? "اختر استشارة للبدء بالعمل" : "Select a request"}</h3>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-xs">
                {isAr 
                  ? "اضغط على أي استشارة واردة من طلاب مهارات لعرض التفاصيل وتدوين الرد المناسب لهم."
                  : "Choose any inquiry from the student history to review detail and publish replies."}
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
