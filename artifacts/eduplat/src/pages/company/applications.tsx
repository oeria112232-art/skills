import { useState } from "react";
import { useListApplications, useUpdateApplicationStatus, useListJobs, getListApplicationsQueryKey } from "@workspace/api-client-react";
import { 
  Users, FileText, CheckCircle, XCircle, Mail, Phone, ExternalLink, 
  Award, BookOpen, Calendar, MapPin, Globe, Github, Linkedin, 
  Briefcase, GraduationCap, Eye, User, Home, ArrowLeft, ArrowRight, Sparkles, Code 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/components/layout/LanguageContext";
import { useAuth } from "@/components/layout/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CompanyApplicationsPage() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { user } = useAuth();
  const { data: applications, isLoading } = useListApplications({ companyId: user?.id });
  const { data: jobs } = useListJobs({ companyId: user?.id });
  const appsList = Array.isArray(applications) ? applications : (applications && Array.isArray((applications as any).data) ? (applications as any).data : []);
  
  const updateStatus = useUpdateApplicationStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [activeProfileTab, setActiveProfileTab] = useState("resume");

  const handleStatusChange = (id: number, status: string) => {
    updateStatus.mutate({ id, data: { status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListApplicationsQueryKey({ companyId: user?.id }) });
        toast({ title: isAr ? "تم تحديث الحالة بنجاح" : "Status updated successfully" });
        // Update local selected application state to show updated badge
        if (selectedApp && selectedApp.id === id) {
          setSelectedApp((prev: any) => ({ ...prev, status }));
        }
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending': return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">{isAr ? "قيد الانتظار" : "Pending"}</Badge>;
      case 'approved': return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">{isAr ? "مقبول" : "Approved"}</Badge>;
      case 'rejected': return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">{isAr ? "مرفوض" : "Rejected"}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "C";
  };

  // If a candidate is selected, render the rich full-page profile details workspace
  const [cvPreviewOpen, setCvPreviewOpen] = useState(false);
  const [certModalData, setCertModalData] = useState<any>(null);

  if (selectedApp) {
    const certsCount = selectedApp.cvSnapshot?.certificates?.length || 0;
    const tracksCount = selectedApp.cvSnapshot?.tracks?.length || 0;
    const workshopsCount = selectedApp.cvSnapshot?.workshops?.length || 0;
    const cv = selectedApp.cvSnapshot || {};
    const colorHex = cv.themeColor || "#1e3a8a";

    // --- MINI VISUAL CV RENDERER ---
    const MiniCVPreview = ({ zoom = 0.6 }: { zoom?: number }) => (
      <div
        className="relative overflow-hidden shrink-0 transition-all duration-300 mx-auto"
        style={{ width: `${794 * zoom}px`, height: `${1123 * zoom}px` }}
      >
        <div
          id="cv-snapshot-sheet"
          dir={cv.language === "ar" ? "rtl" : "ltr"}
          className="w-[794px] h-[1123px] bg-white text-slate-800 border border-slate-200 shadow-md select-none absolute left-0 top-0 origin-top-left p-6 space-y-6"
          style={{ transform: `scale(${zoom})`, fontFamily: "sans-serif" }}
        >
          {cv.template === "creative" ? (
            <div className="h-full flex flex-col justify-between">
              <div className="grid grid-cols-12 gap-6 h-full items-stretch">
                {/* Main left content */}
                <div className="col-span-8 space-y-5 text-slate-700">
                  {cv.summary && (
                    <div className="relative border-l-4 pl-4" style={{ borderColor: colorHex }}>
                      <p className="leading-relaxed text-xs">{cv.summary}</p>
                    </div>
                  )}
                  {cv.experience?.length > 0 && (
                    <div className="space-y-3">
                      <h2 className="font-bold text-sm text-slate-800 border-b pb-1" style={{ borderBottomColor: `${colorHex}40` }}>
                        {cv.language === "ar" ? "الخبرات المهنية" : "Work Experience"}
                      </h2>
                      {cv.experience.map((exp: any, i: number) => (
                        <div key={i} className="space-y-0.5">
                          <div className="flex justify-between items-start">
                            <h3 className="font-extrabold text-xs text-slate-800">{exp.title}</h3>
                            <span className="text-[9px] text-slate-400 font-bold">{exp.startDate} - {exp.endDate || "الحاضر"}</span>
                          </div>
                          <p className="text-[10px] font-bold text-slate-500">{exp.company}</p>
                          <p className="text-[9px] text-slate-600 leading-relaxed">{exp.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {cv.education?.length > 0 && (
                    <div className="space-y-3">
                      <h2 className="font-bold text-sm text-slate-800 border-b pb-1" style={{ borderBottomColor: `${colorHex}40` }}>
                        {cv.language === "ar" ? "التعليم" : "Education"}
                      </h2>
                      {cv.education.map((edu: any, i: number) => (
                        <div key={i} className="space-y-0.5">
                          <div className="flex justify-between items-start">
                            <h3 className="font-extrabold text-xs text-slate-800">{edu.degree}</h3>
                            <span className="text-[9px] text-slate-400 font-bold">{edu.startDate} - {edu.endDate}</span>
                          </div>
                          <p className="text-[10px] font-semibold text-slate-500">{edu.institution}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Dark right sidebar */}
                <div className="col-span-4 rounded-xl p-4 text-white flex flex-col items-center text-center space-y-5" style={{ backgroundColor: "#22252A" }}>
                  {cv.avatarUrl ? (
                    <img src={cv.avatarUrl} alt="Avatar" className="w-20 h-20 rounded-2xl object-cover border border-slate-700" />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 text-2xl font-black">
                      {cv.fullName?.[0] || "؟"}
                    </div>
                  )}
                  <div>
                    <h1 className="font-extrabold text-base text-white leading-tight">{cv.fullName}</h1>
                    <p className="text-[8px] uppercase tracking-wider text-slate-400 font-extrabold mt-1">{cv.targetTitle}</p>
                  </div>
                  <div className="w-full space-y-2 pt-3 border-t border-slate-800/80 text-[9px] text-slate-300">
                    {cv.email && <div>{cv.email}</div>}
                    {cv.phone && <div>{cv.phone}</div>}
                    {cv.address && <div>{cv.address}</div>}
                  </div>
                  {cv.skills?.length > 0 && (
                    <div className="w-full space-y-2 pt-3 border-t border-slate-800/80">
                      <h4 className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{cv.language === "ar" ? "المهارات" : "Skills"}</h4>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {cv.skills.slice(0, 6).map((skill: string, idx: number) => (
                          <span key={idx} className="bg-slate-800 text-slate-200 border border-slate-700 px-1.5 py-0.5 rounded text-[8px] font-bold">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Standard templates */
            <div className="h-full flex flex-col space-y-5">
              <div className="flex justify-between items-start border-b pb-4" style={{ borderColor: `${colorHex}30` }}>
                <div>
                  <h1 className="text-2xl font-black" style={{ color: colorHex }}>{cv.fullName}</h1>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{cv.targetTitle}</p>
                </div>
                <div className="text-[10px] font-semibold text-slate-500 space-y-0.5 text-right">
                  <p>{cv.phone}</p><p>{cv.email}</p><p>{cv.address}</p>
                </div>
              </div>
              {cv.summary && (
                <div>
                  <h2 className="font-extrabold text-sm border-b pb-1 mb-2" style={{ color: colorHex, borderColor: `${colorHex}25` }}>
                    {cv.language === "ar" ? "النبذة الشخصية" : "Summary"}
                  </h2>
                  <p className="text-xs leading-relaxed text-slate-600">{cv.summary}</p>
                </div>
              )}
              {cv.experience?.length > 0 && (
                <div>
                  <h2 className="font-extrabold text-sm border-b pb-1 mb-2" style={{ color: colorHex, borderColor: `${colorHex}25` }}>
                    {cv.language === "ar" ? "الخبرات المهنية" : "Experience"}
                  </h2>
                  {cv.experience.map((exp: any, i: number) => (
                    <div key={i} className="mb-3">
                      <div className="flex justify-between"><span className="font-bold text-xs">{exp.title}</span><span className="text-[9px] text-slate-400">{exp.startDate} - {exp.endDate || "الحاضر"}</span></div>
                      <p className="text-[10px] font-bold text-slate-500">{exp.company}</p>
                      <p className="text-[9px] text-slate-600 leading-relaxed mt-0.5">{exp.description}</p>
                    </div>
                  ))}
                </div>
              )}
              {cv.skills?.length > 0 && (
                <div>
                  <h2 className="font-extrabold text-sm border-b pb-1 mb-2" style={{ color: colorHex, borderColor: `${colorHex}25` }}>
                    {cv.language === "ar" ? "المهارات" : "Skills"}
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {cv.skills.map((skill: string, idx: number) => (
                      <span key={idx} className="px-2 py-0.5 rounded text-[9px] font-bold border" style={{ borderColor: `${colorHex}40`, color: colorHex }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );

    return (
      <AppLayout>
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 text-start">
          
          {/* Header Actions bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-6">
            <div className="flex items-center gap-4">
              <Button 
                onClick={() => setSelectedApp(null)}
                variant="ghost" 
                size="icon" 
                className="rounded-full hover:bg-muted/80 shrink-0"
              >
                {isAr ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
              </Button>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-black text-foreground">{selectedApp.applicantName}</h1>
                  {getStatusBadge(selectedApp.status)}
                </div>
                <p className="text-sm text-muted-foreground mt-1 font-semibold">{selectedApp.jobTitle}</p>
              </div>
            </div>

            {/* Quick action buttons directly on the page */}
            {selectedApp.status === 'pending' && (
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleStatusChange(selectedApp.id, 'approved')}
                  className="rounded-xl font-bold bg-green-600 hover:bg-green-700 text-white gap-1.5 h-10 text-xs shadow-md"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>{isAr ? "قبول طلب التوظيف" : "Approve Application"}</span>
                </Button>
                <Button 
                  onClick={() => handleStatusChange(selectedApp.id, 'rejected')}
                  variant="destructive"
                  className="rounded-xl font-bold gap-1.5 h-10 text-xs shadow-md"
                >
                  <XCircle className="h-4 w-4" />
                  <span>{isAr ? "رفض الطلب" : "Reject Application"}</span>
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* SIDEBAR PANEL */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Profile Avatar Card */}
              <div className="p-6 bg-card border rounded-2xl text-center space-y-4 shadow-sm flex flex-col items-center">
                {selectedApp.cvSnapshot?.avatarUrl ? (
                  <img 
                    src={selectedApp.cvSnapshot.avatarUrl} 
                    alt="Applicant Avatar" 
                    className="w-24 h-24 rounded-full object-cover border shadow-sm"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center font-black text-primary text-xl select-none shadow-sm">
                    {getInitials(selectedApp.applicantName)}
                  </div>
                )}
                <div>
                  <h3 className="font-extrabold text-base text-foreground">{selectedApp.applicantName}</h3>
                  <p className="text-xs text-muted-foreground mt-1 font-semibold">{selectedApp.applicantEmail}</p>
                  {cv.targetTitle && <p className="text-xs text-primary font-bold mt-1">{cv.targetTitle}</p>}
                </div>
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 w-full pt-3 border-t border-dashed">
                  <div className="text-center">
                    <div className="text-lg font-black text-amber-500">{certsCount}</div>
                    <div className="text-[9px] text-muted-foreground font-bold">{isAr ? "شهادات" : "Certs"}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-black text-blue-500">{tracksCount}</div>
                    <div className="text-[9px] text-muted-foreground font-bold">{isAr ? "مسارات" : "Tracks"}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-black text-emerald-500">{workshopsCount}</div>
                    <div className="text-[9px] text-muted-foreground font-bold">{isAr ? "ورش" : "Workshops"}</div>
                  </div>
                </div>
              </div>

              {/* Contact Info Card */}
              <div className="p-5 bg-card border rounded-2xl space-y-4 shadow-sm">
                <h3 className="font-extrabold text-sm flex items-center gap-2 text-foreground border-b pb-2">
                  <User className="h-4 w-4 text-primary" />
                  <span>{isAr ? "المعلومات الشخصية" : "Personal Details"}</span>
                </h3>
                <div className="space-y-3 text-xs font-semibold text-slate-700">
                  <div className="flex items-start gap-2.5">
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-bold">{isAr ? "البريد الإلكتروني" : "Email"}</span>
                      <span className="break-all">{selectedApp.applicantEmail}</span>
                    </div>
                  </div>
                  {(selectedApp.contactInfoSnapshot?.phone || cv.phone) && (
                    <div className="flex items-start gap-2.5">
                      <Phone className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-muted-foreground block font-bold">{isAr ? "رقم الهاتف" : "Phone"}</span>
                        <span>{selectedApp.contactInfoSnapshot?.phone || cv.phone}</span>
                      </div>
                    </div>
                  )}
                  {(selectedApp.contactInfoSnapshot?.address || cv.address) && (
                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-muted-foreground block font-bold">{isAr ? "العنوان الحالي" : "Address"}</span>
                        <span>{selectedApp.contactInfoSnapshot?.address || cv.address}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Social links */}
              <div className="p-5 bg-card border rounded-2xl space-y-4 shadow-sm">
                <h3 className="font-extrabold text-sm flex items-center gap-2 text-foreground border-b pb-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <span>{isAr ? "حسابات التواصل والمرفقات" : "Social Links & Files"}</span>
                </h3>
                <div className="space-y-3 text-xs">
                  {selectedApp.contactInfoSnapshot?.linkedin ? (
                    <a href={selectedApp.contactInfoSnapshot.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline font-bold">
                      <Linkedin className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                      <span>LinkedIn Profile</span>
                    </a>
                  ) : (
                    <div className="text-[10px] text-muted-foreground italic">{isAr ? "لم يدرج حساب لينكد إن" : "No LinkedIn profile"}</div>
                  )}
                  {selectedApp.contactInfoSnapshot?.github && (
                    <a href={selectedApp.contactInfoSnapshot.github} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline font-bold">
                      <Github className="h-4.5 w-4.5 text-foreground shrink-0" />
                      <span>GitHub Profile</span>
                    </a>
                  )}
                  {selectedApp.contactInfoSnapshot?.website && (
                    <a href={selectedApp.contactInfoSnapshot.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline font-bold">
                      <Globe className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                      <span>{isAr ? "الموقع الشخصي" : "Personal Website"}</span>
                    </a>
                  )}
                  {selectedApp.resumeUrl && (
                    <a href={selectedApp.resumeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline font-bold pt-3 border-t border-dashed">
                      <ExternalLink className="h-4.5 w-4.5 shrink-0" />
                      <span>{isAr ? "عرض ملف السيرة الذاتية الأصلي" : "View original CV file"}</span>
                    </a>
                  )}
                </div>
              </div>

            </div>

            {/* MAIN CONTENT AREA: Tabbed Browsing panels */}
            <div className="lg:col-span-8 bg-card border rounded-2xl shadow-sm p-6">
              
              <Tabs value={activeProfileTab} onValueChange={setActiveProfileTab} className="w-full">
                
                <TabsList className="flex flex-wrap md:grid md:grid-cols-5 w-full bg-muted/65 rounded-xl p-1 h-auto md:h-11 gap-1.5 md:gap-0 mb-6">
                  <TabsTrigger value="resume" className="rounded-lg text-[10.5px] font-bold py-2 md:py-0 flex-1 md:flex-initial whitespace-nowrap">
                    {isAr ? "السيرة الذاتية" : "Resume"}
                  </TabsTrigger>
                  <TabsTrigger value="tracks" className="rounded-lg text-[10.5px] font-bold py-2 md:py-0 flex-1 md:flex-initial whitespace-nowrap">
                    {isAr ? "المسارات" : "Tracks"}
                  </TabsTrigger>
                  <TabsTrigger value="certs" className="rounded-lg text-[10.5px] font-bold py-2 md:py-0 flex-1 md:flex-initial whitespace-nowrap">
                    {isAr ? "الشهادات" : "Certificates"}
                  </TabsTrigger>
                  <TabsTrigger value="workshops" className="rounded-lg text-[10.5px] font-bold py-2 md:py-0 flex-1 md:flex-initial whitespace-nowrap">
                    {isAr ? "الورش" : "Workshops"}
                  </TabsTrigger>
                  <TabsTrigger value="cover" className="rounded-lg text-[10.5px] font-bold py-2 md:py-0 flex-1 md:flex-initial whitespace-nowrap">
                    {isAr ? "رسالة التغطية" : "Cover Letter"}
                  </TabsTrigger>
                </TabsList>

                {/* Tab 1: VISUAL CV PREVIEW */}
                <TabsContent value="resume" className="space-y-4">
                  {selectedApp.cvSnapshot ? (
                    <>
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-sm flex items-center gap-2 text-foreground">
                          <FileText className="h-4 w-4 text-primary" />
                          <span>{isAr ? "السيرة الذاتية المرئية" : "Visual Resume Preview"}</span>
                        </h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCvPreviewOpen(true)}
                          className="rounded-xl gap-1.5 text-xs font-bold border-primary/30 text-primary hover:bg-primary/5"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          {isAr ? "عرض بالحجم الكامل" : "Full Screen View"}
                        </Button>
                      </div>

                      {/* Scrollable CV Preview Container */}
                      <div className="w-full overflow-auto rounded-2xl border bg-slate-100 p-4 flex justify-center">
                        <MiniCVPreview zoom={0.58} />
                      </div>

                      {/* CV Detail Fields below preview */}
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        {cv.sector && (
                          <div className="p-3 bg-muted/30 rounded-xl text-xs">
                            <span className="font-bold text-muted-foreground block mb-1">{isAr ? "القطاع المهني" : "Professional Sector"}</span>
                            <span className="font-extrabold text-foreground">{cv.sector}</span>
                          </div>
                        )}
                        {cv.skills?.length > 0 && (
                          <div className="p-3 bg-muted/30 rounded-xl text-xs col-span-2">
                            <span className="font-bold text-muted-foreground block mb-2">{isAr ? "المهارات الأساسية" : "Key Skills"}</span>
                            <div className="flex flex-wrap gap-1.5">
                              {cv.skills.map((s: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-xs font-bold px-2 py-0.5 rounded-lg">{s}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground text-xs">{isAr ? "لم يقم المتقدم بإدخال تفاصيل السيرة الذاتية بعد." : "No CV details provided."}</p>
                  )}
                </TabsContent>

                {/* Tab 2: Learning Tracks */}
                <TabsContent value="tracks" className="space-y-4">
                  <h4 className="font-extrabold text-sm flex items-center gap-2 text-foreground mb-4">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <span>{isAr ? "المسارات التعليمية الحالية ونسبة إنجازها" : "Current Learning Tracks Progress"}</span>
                  </h4>
                  {selectedApp.cvSnapshot?.tracks && selectedApp.cvSnapshot.tracks.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {selectedApp.cvSnapshot.tracks.map((t: any, idx: number) => (
                        <div key={idx} className="p-4 bg-gradient-to-br from-blue-500/5 to-primary/5 rounded-xl border text-xs shadow-sm space-y-3">
                          <div className="flex items-start gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                              <GraduationCap className="h-4 w-4 text-blue-500" />
                            </div>
                            <div>
                              <div className="font-bold text-foreground text-sm">{t.title}</div>
                              <div className="text-[10px] text-muted-foreground font-semibold mt-0.5">{isAr ? "مسجل وقيد الدراسة" : "Enrolled & Active"}</div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                            <span>{isAr ? "نسبة الإنجاز:" : "Progress:"}</span>
                            <span className="text-primary text-sm font-black">{t.percentComplete}%</span>
                          </div>
                          <Progress value={t.percentComplete} className="h-2.5 rounded-full" />
                          {t.points > 0 && (
                            <div className="flex items-center gap-1.5 text-[10px] text-amber-600 font-bold">
                              <Sparkles className="h-3 w-3" />
                              <span>{t.points} {isAr ? "نقطة تعليمية مكتسبة" : "learning points earned"}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs">{isAr ? "المتقدم غير مسجل في أي مسارات تعليمية حالياً." : "No learning tracks registered."}</p>
                  )}
                </TabsContent>

                {/* Tab 3: RICH CERTIFICATE VIEW */}
                <TabsContent value="certs" className="space-y-4">
                  <h4 className="font-extrabold text-sm flex items-center gap-2 text-foreground mb-4">
                    <Award className="h-4 w-4 text-amber-500" />
                    <span>{isAr ? "الشهادات المحصل عليها" : "Earned Certificates"}</span>
                  </h4>
                  {selectedApp.cvSnapshot?.certificates && selectedApp.cvSnapshot.certificates.length > 0 ? (
                    <div className="grid gap-5">
                      {selectedApp.cvSnapshot.certificates.map((c: any, idx: number) => (
                        <div 
                          key={idx} 
                          className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-amber-500/5 via-yellow-400/5 to-orange-500/5 border-amber-500/20 p-5 shadow-sm hover:shadow-md transition-all duration-300"
                        >
                          {/* Background watermark */}
                          <div className="absolute top-2 right-4 opacity-[0.04] pointer-events-none">
                            <Award className="w-28 h-28 text-amber-600" />
                          </div>

                          <div className="flex items-start gap-4">
                            {/* Certificate seal icon */}
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shrink-0">
                              <Award className="w-7 h-7 text-white" />
                            </div>

                            <div className="flex-1 min-w-0 space-y-2">
                              {/* Title + badge */}
                              <div className="flex items-start justify-between gap-2 flex-wrap">
                                <h5 className="font-extrabold text-base text-foreground leading-tight">
                                  {c.workshopTitle || c.trackTitle || (isAr ? "شهادة إتمام" : "Certificate of Completion")}
                                </h5>
                                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 py-1 font-bold text-xs shrink-0">
                                  ✓ {isAr ? "معتمدة رسمياً" : "Officially Certified"}
                                </Badge>
                              </div>

                              {/* Detail grid */}
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                                {c.type && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-muted-foreground font-bold">{isAr ? "نوع الشهادة:" : "Type:"}</span>
                                    <span className="font-bold text-foreground capitalize">
                                      {c.type === "workshop" ? (isAr ? "ورشة عمل" : "Workshop") 
                                       : c.type === "track" ? (isAr ? "مسار تعليمي" : "Learning Track") 
                                       : c.type === "participation" ? (isAr ? "شهادة حضور" : "Participation")
                                       : c.type}
                                    </span>
                                  </div>
                                )}
                                {c.score !== undefined && c.score !== null && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-muted-foreground font-bold">{isAr ? "الدرجة:" : "Score:"}</span>
                                    <span className={`font-black ${c.score >= 80 ? "text-emerald-600" : c.score >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                                      {c.score}%
                                    </span>
                                  </div>
                                )}
                                {c.issuedAt && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-muted-foreground font-bold">{isAr ? "تاريخ الإصدار:" : "Issued:"}</span>
                                    <span className="font-bold text-foreground">
                                      {new Date(c.issuedAt).toLocaleDateString(isAr ? "ar-EG" : "en-US")}
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5 col-span-2">
                                  <span className="text-muted-foreground font-bold">{isAr ? "رقم الشهادة:" : "Cert #:"}</span>
                                  <span className="font-mono font-bold text-foreground text-[10px] truncate">{c.certificateNumber}</span>
                                </div>
                              </div>

                              {/* Verification code */}
                              {c.verificationCode && (
                                <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/15 rounded-lg px-3 py-1.5">
                                  <Eye className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                  <span className="text-[10px] font-bold text-emerald-700">{isAr ? "كود التحقق:" : "Verification:"}</span>
                                  <code className="text-[10px] font-mono font-black text-emerald-700">{c.verificationCode}</code>
                                </div>
                              )}

                              {/* Action button: View certificate as visual */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setCertModalData(c)}
                                className="rounded-xl gap-1.5 text-xs font-bold border-amber-500/30 text-amber-700 hover:bg-amber-500/10 mt-1"
                              >
                                <Award className="h-3.5 w-3.5" />
                                {isAr ? "عرض الشهادة بالتصميم الكامل" : "View Full Certificate Design"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs">{isAr ? "لا توجد شهادات معتمدة صادرة للمتقدم بعد." : "No certified credentials earned yet."}</p>
                  )}
                </TabsContent>

                {/* Tab 4: Workshops */}
                <TabsContent value="workshops" className="space-y-4">
                  <h4 className="font-extrabold text-sm flex items-center gap-2 text-foreground mb-4">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>{isAr ? "الورش والدورات التدريبية" : "Workshops & Courses"}</span>
                  </h4>
                  {selectedApp.cvSnapshot?.workshops && selectedApp.cvSnapshot.workshops.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {selectedApp.cvSnapshot.workshops.map((w: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 p-4 bg-muted/30 border rounded-xl hover:bg-muted/50 transition-colors">
                          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                            <Calendar className="h-4.5 w-4.5 text-emerald-600" />
                          </div>
                          <span className="font-bold text-sm text-foreground">{w.title}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs">{isAr ? "لا توجد ورش عمل مسجلة للمتقدم." : "No workshops registered."}</p>
                  )}
                </TabsContent>

                {/* Tab 5: Cover Letter */}
                <TabsContent value="cover" className="space-y-4">
                  <h4 className="font-extrabold text-sm flex items-center gap-2 text-foreground mb-3">
                    {isAr ? "رسالة التغطية للمرشح" : "Candidate's Cover Letter"}
                  </h4>
                  {selectedApp.coverLetter ? (
                    <div className="p-5 rounded-2xl bg-card border text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {selectedApp.coverLetter}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs">{isAr ? "لم يقم المتقدم بإرسال رسالة تغطية." : "No cover letter submitted."}</p>
                  )}
                </TabsContent>

              </Tabs>
            </div>

          </div>

        </div>

        {/* Full Screen CV Preview Dialog */}
        {cvPreviewOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setCvPreviewOpen(false)}>
            <div className="bg-white rounded-2xl shadow-2xl overflow-auto max-h-[95vh] max-w-[95vw]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b bg-slate-50">
                <h3 className="font-extrabold text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  {isAr ? "السيرة الذاتية — عرض كامل" : "Full Resume Preview"}
                </h3>
                <Button size="sm" variant="ghost" onClick={() => setCvPreviewOpen(false)} className="rounded-xl font-bold text-xs">
                  ✕ {isAr ? "إغلاق" : "Close"}
                </Button>
              </div>
              <div className="p-6 flex justify-center bg-slate-100">
                <MiniCVPreview zoom={0.85} />
              </div>
            </div>
          </div>
        )}

        {/* Certificate Full Design Modal */}
        {certModalData && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-auto" onClick={() => setCertModalData(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-auto max-h-[95vh]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-extrabold text-sm flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" />
                  {isAr ? "الشهادة الرسمية المعتمدة" : "Official Certificate"}
                </h3>
                <Button size="sm" variant="ghost" onClick={() => setCertModalData(null)} className="rounded-xl font-bold text-xs">
                  ✕ {isAr ? "إغلاق" : "Close"}
                </Button>
              </div>

              {/* Certificate Design (same as CertificatePreviewModal) */}
              <div className="p-6">
                <div className="relative w-full overflow-hidden bg-white text-slate-800 p-8 sm:p-10 rounded-xl border-[12px] border-double border-amber-600/35 shadow-inner font-serif select-none">
                  {/* Watermark */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                    <Award className="w-[280px] h-[280px] text-amber-700" />
                  </div>

                  {/* Header */}
                  <div className="flex items-start justify-between border-b-2 border-amber-600/20 pb-4 mb-6 text-xs">
                    <div className="text-left leading-relaxed">
                      <p className="font-bold text-amber-800 uppercase tracking-wider">مشروع مهارات</p>
                      <p className="text-[9px] text-slate-500">وزارة العمل والشؤون الاجتماعية</p>
                      <p className="font-mono text-[8px] text-slate-400">{certModalData.certificateNumber}</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                        <Award className="w-6 h-6 text-amber-600" />
                      </div>
                      <span className="text-[9px] font-bold text-amber-700 uppercase tracking-widest mt-1">مهارات</span>
                    </div>
                    <div className="text-right leading-relaxed">
                      <p className="font-bold text-amber-800">Skills Project</p>
                      <p className="text-[9px] text-slate-500">Ministry of Labor & Social Affairs</p>
                      <p className="text-[8px] text-slate-400">{new Date().toLocaleDateString(isAr ? "ar-EG" : "en-US")}</p>
                    </div>
                  </div>

                  {/* Main certificate text */}
                  <div className="text-center space-y-5 my-6">
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-widest uppercase">
                      {isAr ? "شهادة تخرج واجتياز" : "Certificate of Completion"}
                    </h1>
                    <p className="text-xs text-slate-500 italic max-w-lg mx-auto font-sans leading-relaxed">
                      {isAr ? "تشهد إدارة مشروع مهارات الوطنية للتدريب والتأهيل المهني بأن المتدرب:" : "The administration of the Skills Project certifies that:"}
                    </p>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-amber-700 underline decoration-double decoration-1 underline-offset-8">
                        {selectedApp.applicantName}
                      </h2>
                      {certModalData.score !== undefined && certModalData.score !== null && (
                        <p className="text-sm font-black text-emerald-600 mt-2">
                          {isAr ? "بدرجة:" : "Score:"} {certModalData.score}%
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 max-w-xl mx-auto leading-relaxed font-sans">
                      {isAr ? "قد أكمل بنجاح جميع متطلبات ورشة العمل وفق المعايير التدريبية المعتمدة لـ:" : "has successfully completed all training requirements for:"}
                    </p>
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 tracking-wide font-sans bg-amber-50/50 py-1.5 px-4 rounded-lg border border-amber-500/10 inline-block">
                      {certModalData.workshopTitle || certModalData.trackTitle || (isAr ? "[عنوان الورشة التدريبية]" : "[Training Title]")}
                    </h3>
                  </div>

                  {/* Footer: signatures & verification */}
                  <div className="mt-8 pt-6 border-t border-amber-600/10 grid grid-cols-3 gap-6 items-end text-xs">
                    <div className="text-center space-y-2">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{isAr ? "جهة التوقيع" : "Authorized By"}</p>
                      <div className="h-10 flex items-center justify-center">
                        <span className="font-serif italic text-amber-700/80 text-sm font-semibold">مشروع مهارات</span>
                      </div>
                      <div className="border-t border-slate-300 pt-1.5">
                        <p className="font-bold text-slate-700 text-[10px]">مشروع مهارات الوطني</p>
                        <p className="text-[9px] text-slate-400">إدارة التدريب والتأهيل</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-16 h-16 rounded-full border-2 border-double border-amber-600/30 flex items-center justify-center bg-amber-50/20">
                        <Eye className="w-8 h-8 text-amber-600" />
                      </div>
                      <span className="text-[9px] font-extrabold text-amber-700 uppercase tracking-widest">{isAr ? "معتمد رسمياً" : "Verified Official"}</span>
                    </div>
                    <div className="text-center space-y-1">
                      <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200/50 rounded px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider">
                        <Eye className="w-3 h-3 text-emerald-600" />
                        <span>{isAr ? "توقيع إلكتروني موثق" : "Verified E-Signature"}</span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">{isAr ? "بصمة التحقق" : "Verification Hash"}</p>
                      <p className="text-[8px] font-mono text-slate-500 break-all leading-tight">
                        {certModalData.verificationCode || "MHARAT-SECURE-ESIGN-VERIFIED"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 text-start">
        <div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {isAr ? "طلبات التوظيف" : "Job Applications"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isAr ? "إدارة طلبات التوظيف ومراجعة سير المتقدمين" : "Manage job applications and review candidates"}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))
          ) : appsList.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-2xl">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">{isAr ? "لا توجد طلبات توظيف بعد" : "No applications yet"}</p>
            </div>
          ) : (
            appsList.map((app: any) => {
              const certsCount = app.cvSnapshot?.certificates?.length || 0;
              const tracksCount = app.cvSnapshot?.tracks?.length || 0;
              const workshopsCount = app.cvSnapshot?.workshops?.length || 0;
              
              return (
                <div key={app.id} className="group p-6 rounded-2xl border bg-card hover:shadow-2xl hover:border-primary/50 transition-all duration-300 flex flex-col h-full relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="flex items-start gap-4 mb-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center font-bold text-primary shrink-0 select-none">
                      {getInitials(app.applicantName)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-lg leading-tight mb-1 truncate">{app.applicantName}</h3>
                      <p className="text-sm text-muted-foreground truncate mb-1.5">{app.jobTitle}</p>
                      {getStatusBadge(app.status)}
                    </div>
                  </div>
                  
                  {/* Quick Applicant Stats badging */}
                  <div className="grid grid-cols-3 gap-2 my-4 pt-3 border-t border-dashed">
                    <div className="p-2 bg-muted/40 rounded-lg text-center">
                      <Award className="h-4 w-4 mx-auto text-yellow-500 mb-1" />
                      <span className="text-[10px] text-muted-foreground block">{isAr ? "الشهادات" : "Certs"}</span>
                      <span className="font-bold text-xs">{certsCount}</span>
                    </div>
                    <div className="p-2 bg-muted/40 rounded-lg text-center">
                      <GraduationCap className="h-4 w-4 mx-auto text-blue-500 mb-1" />
                      <span className="text-[10px] text-muted-foreground block">{isAr ? "المسارات" : "Tracks"}</span>
                      <span className="font-bold text-xs">{tracksCount}</span>
                    </div>
                    <div className="p-2 bg-muted/40 rounded-lg text-center">
                      <Calendar className="h-4 w-4 mx-auto text-emerald-500 mb-1" />
                      <span className="text-[10px] text-muted-foreground block">{isAr ? "الورش" : "Workshops"}</span>
                      <span className="font-bold text-xs">{workshopsCount}</span>
                    </div>
                  </div>

                  {app.contactInfoSnapshot && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                      {app.contactInfoSnapshot.linkedin && (
                        <a href={app.contactInfoSnapshot.linkedin} target="_blank" rel="noreferrer" className="p-1 hover:text-primary transition-colors">
                          <Linkedin className="h-4 w-4" />
                        </a>
                      )}
                      {app.contactInfoSnapshot.github && (
                        <a href={app.contactInfoSnapshot.github} target="_blank" rel="noreferrer" className="p-1 hover:text-primary transition-colors">
                          <Github className="h-4 w-4" />
                        </a>
                      )}
                      {app.contactInfoSnapshot.website && (
                        <a href={app.contactInfoSnapshot.website} target="_blank" rel="noreferrer" className="p-1 hover:text-primary transition-colors">
                          <Globe className="h-4 w-4" />
                        </a>
                      )}
                      <span className="text-[10px] text-muted-foreground/60 ml-auto truncate">
                        {app.applicantEmail}
                      </span>
                    </div>
                  )}
                  
                  <div className="mt-auto space-y-2.5 pt-3 border-t">
                    <Button onClick={() => setSelectedApp(app)} className="w-full gap-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20" variant="outline">
                      <Eye className="h-4 w-4" />
                      {isAr ? "الاطلاع على الملف والسيرة الذاتية" : "View Profile & CV"}
                    </Button>

                    {app.status === 'pending' && (
                      <div className="flex gap-2 w-full">
                        <Button size="sm" variant="outline" className="flex-1 rounded-xl bg-green-500/10 text-green-600 hover:bg-green-500/20 hover:text-green-700 border-green-500/20" onClick={() => handleStatusChange(app.id, 'approved')}>
                          <CheckCircle className="h-4 w-4 mr-1.5" />
                          {isAr ? "قبول" : "Approve"}
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 rounded-xl bg-red-500/10 text-red-600 hover:bg-red-500/20 hover:text-red-700 border-red-500/20" onClick={() => handleStatusChange(app.id, 'rejected')}>
                          <XCircle className="h-4 w-4 mr-1.5" />
                          {isAr ? "رفض" : "Reject"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}
