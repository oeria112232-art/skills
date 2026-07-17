import { useState, useEffect } from "react";
import { useAuth } from "@/components/layout/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLanguage } from "@/components/layout/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateUser, useListTracks, useGetTrackProgress, useListCertificates, useListApplications, useListJobs, useUploadUserAvatar } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { User, Mail, Phone, MapPin, Globe, Linkedin, Github, FileText, GraduationCap, Award, Briefcase, Plus, Clock, ExternalLink, Trash2, Eye, Loader2, Lock, Coins, LogOut } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// Sub-component to fetch and display track progress dynamically
function TrackProgressCard({ track, userId, isAr }: { track: any; userId: number; isAr: boolean }) {
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tracks/${track.slug}/progress?userId=${userId}`, {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("mharat-token")}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setProgress(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching progress:", err);
        setLoading(false);
      });
  }, [track.slug, userId]);

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (progress && !progress.isEnrolled) {
    return null;
  }

  const percent = progress?.percentComplete ?? 0;

  return (
    <Card className="hover:border-primary/50 transition-all duration-300 bg-card/50 backdrop-blur-sm group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
              {track.title}
            </CardTitle>
            <CardDescription className="mt-1">{track.category}</CardDescription>
          </div>
          <Badge variant="secondary" className="capitalize text-[10px]">{track.level}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{isAr ? "نسبة الإنجاز:" : "Accomplished:"}</span>
          <span className="font-bold text-primary">{percent}%</span>
        </div>
        <Progress value={percent} className="h-2" />
        <div className="flex items-center justify-between pt-2 text-[10px] text-muted-foreground border-t border-border/40">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {track.estimatedHours} {isAr ? "ساعة" : "hours"}</span>
          <span>{progress?.completedModules?.length || 0} / {track.moduleCount} {isAr ? "وحدة" : "modules"}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function UserSettingsPage() {
  const { user, login, logout } = useAuth();
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { toast } = useToast();
  const updateUser = useUpdateUser();
  const uploadAvatarMutation = useUploadUserAvatar();
  const [cvDialogOpen, setCvDialogOpen] = useState(false);

  // Avatar upload states
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);

  const handleClearCV = () => {
    if (!user) return;
    const confirmDelete = window.confirm(isAr ? "هل أنت متأكد من رغبتك في حذف السيرة الذاتية نهائياً؟" : "Are you sure you want to delete your CV permanently?");
    if (!confirmDelete) return;

    updateUser.mutate({
      id: user.id,
      data: {
        cv: null
      } as any
    }, {
      onSuccess: (data) => {
        login(data as any);
        toast({ title: isAr ? "تم حذف السيرة الذاتية بنجاح" : "CV deleted successfully" });
      },
      onError: () => {
        toast({ title: isAr ? "خطأ أثناء حذف السيرة الذاتية" : "Error deleting CV", variant: "destructive" });
      }
    });
  };

  const { data: tracks } = useListTracks();
  const { data: certs } = useListCertificates();
  const { data: applications } = useListApplications({ userId: user?.id });
  const { data: jobs } = useListJobs();
  const appsList = Array.isArray(applications) ? applications : (applications && Array.isArray((applications as any).data) ? (applications as any).data : []);
  const jobsList = Array.isArray(jobs) ? jobs : (jobs && Array.isArray((jobs as any).data) ? (jobs as any).data : []);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    linkedin: "",
    github: "",
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        email: user.email || "",
        phone: (user.contactInfo as any)?.phone || "",
        address: (user.contactInfo as any)?.address || "",
        website: (user.contactInfo as any)?.website || "",
        linkedin: (user.contactInfo as any)?.linkedin || "",
        github: (user.contactInfo as any)?.github || "",
      });
    }
  }, [user]);

  const [avatarUploading, setAvatarUploading] = useState(false);

  // Upload avatar immediately on file select
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Show local preview immediately
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreviewUrl(previewUrl);
    setAvatarUploading(true);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        try {
          const updated = await uploadAvatarMutation.mutateAsync({
            id: user.id,
            data: {
              fileName: file.name,
              fileType: file.type,
              base64Data: dataUrl,
            }
          });
          // Update localStorage and context immediately
          login(updated as any);
          toast({ title: isAr ? "✅ تم حفظ الصورة الشخصية" : "✅ Profile picture saved" });
        } catch (err: any) {
          console.error("Failed to upload avatar", err);
          toast({ title: isAr ? "خطأ في رفع الصورة" : "Failed to upload picture", variant: "destructive" });
          setAvatarPreviewUrl(null);
        } finally {
          setAvatarUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setAvatarUploading(false);
      setAvatarPreviewUrl(null);
    }
  };

  const handleSave = () => {
    if (!user) return;
    
    updateUser.mutate({
      id: user.id,
      data: {
        name: form.name,
        contactInfo: {
          phone: form.phone,
          address: form.address,
          website: form.website,
          linkedin: form.linkedin,
          github: form.github,
        }
      } as any
    }, {
      onSuccess: async (data) => {
        login(data as any); // Refresh user context state
        toast({ title: isAr ? "تم تحديث البيانات بنجاح" : "Information updated successfully" });
      },
      onError: () => {
        toast({ title: isAr ? "حدث خطأ أثناء التحديث" : "Error updating information", variant: "destructive" });
      }
    });
  };

  if (!user) return null;

  const certsList = Array.isArray(certs) ? certs : (certs && Array.isArray((certs as any).data) ? (certs as any).data : []);
  const myCerts = certsList.filter((c: any) => c.userId === user.id);

  return (
    <AppLayout>
      <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {isAr ? "بوابة المستخدم" : "User Portal"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isAr ? "إدارة معلوماتك، استعراض تقدمك التعليمي، سيرتك الذاتية، وطلبات التوظيف" : "Manage information, view tracks, CV and job applications"}
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="flex flex-wrap md:grid md:grid-cols-5 w-full max-w-2xl bg-muted rounded-xl p-1 h-auto md:h-11 gap-1.5 md:gap-0">
            <TabsTrigger value="profile" className="rounded-lg text-xs font-bold flex-1 md:flex-initial whitespace-nowrap py-2 md:py-0">{isAr ? "المعلومات" : "Profile"}</TabsTrigger>
            <TabsTrigger value="cv" className="rounded-lg text-xs font-bold flex-1 md:flex-initial whitespace-nowrap py-2 md:py-0">{isAr ? "السيرة الذاتية" : "CV"}</TabsTrigger>
            <TabsTrigger value="tracks" className="rounded-lg text-xs font-bold flex-1 md:flex-initial whitespace-nowrap py-2 md:py-0">{isAr ? "المسارات" : "Tracks"}</TabsTrigger>
            <TabsTrigger value="certs" className="rounded-lg text-xs font-bold flex-1 md:flex-initial whitespace-nowrap py-2 md:py-0">{isAr ? "الشهادات" : "Certificates"}</TabsTrigger>
            <TabsTrigger value="apps" className="rounded-lg text-xs font-bold flex-1 md:flex-initial whitespace-nowrap py-2 md:py-0">{isAr ? "طلباتي" : "Applied Jobs"}</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    {isAr ? "البيانات الأساسية" : "Basic Information"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Profile Picture Upload Section */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border border-dashed border-border rounded-2xl bg-card/20 mb-2">
                    {avatarPreviewUrl || user.avatarUrl ? (
                      <div className="relative group flex-shrink-0">
                        <img 
                          src={avatarPreviewUrl || user.avatarUrl || ""} 
                          alt="Avatar" 
                          className="w-16 h-16 rounded-full object-cover border border-primary/20 shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setAvatarPreviewUrl(null);
                          }}
                          className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-1 hover:bg-destructive/90 transition-colors shadow-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm shadow-inner select-none flex-shrink-0">
                        {user.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 space-y-1.5 text-center sm:text-start">
                      <Label className="text-xs font-bold block">{isAr ? "صورة الملف الشخصي" : "Profile Picture"}</Label>
                      {avatarUploading ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          <span>{isAr ? "جاري رفع الصورة..." : "Uploading..."}</span>
                        </div>
                      ) : (
                        <Input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleAvatarChange}
                          className="rounded-xl h-8 text-[11px] cursor-pointer max-w-[200px] mx-auto sm:mx-0"
                        />
                      )}
                      <p className="text-[10px] text-muted-foreground">{isAr ? "تُحفظ الصورة فوراً عند الاختيار" : "Saved instantly on selection"}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{isAr ? "الاسم الكامل" : "Full Name"}</Label>
                    <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>{isAr ? "البريد الإلكتروني" : "Email"}</Label>
                    <Input value={form.email} disabled className="bg-muted rounded-xl" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    {isAr ? "معلومات التواصل" : "Contact Information"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {isAr ? "رقم الهاتف" : "Phone"}</Label>
                    <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+964..." className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> {isAr ? "العنوان" : "Address"}</Label>
                    <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Baghdad, Iraq" className="rounded-xl" />
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    {isAr ? "الروابط الشخصية والمهنية" : "Professional Links"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground" /> {isAr ? "الموقع الشخصي" : "Website"}</Label>
                    <Input value={form.website} onChange={e => setForm({...form, website: e.target.value})} placeholder="https://..." className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Linkedin className="h-4 w-4 text-muted-foreground" /> LinkedIn</Label>
                    <Input value={form.linkedin} onChange={e => setForm({...form, linkedin: e.target.value})} placeholder="https://linkedin.com/in/..." className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Github className="h-4 w-4 text-muted-foreground" /> GitHub</Label>
                    <Input value={form.github} onChange={e => setForm({...form, github: e.target.value})} placeholder="https://github.com/..." className="rounded-xl" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between items-center pt-4 flex-wrap gap-3">
              <Button 
                variant="destructive" 
                onClick={() => logout()} 
                className="rounded-xl px-6 gap-2 text-xs font-bold shadow-md shadow-destructive/10"
              >
                <LogOut className="w-4 h-4" />
                {isAr ? "تسجيل الخروج" : "Log out"}
              </Button>
              <Button size="lg" onClick={handleSave} disabled={updateUser.isPending} className="rounded-xl px-8 shadow-md shadow-primary/10">
                {updateUser.isPending ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ التغييرات" : "Save Changes")}
              </Button>
            </div>
          </TabsContent>

          {/* CV Tab */}
          <TabsContent value="cv" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <FileText className="h-5 w-5" />
                    {isAr ? "تفاصيل السيرة الذاتية" : "Detailed CV Details"}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {isAr ? "هذا هو الملف التعريفي والسيرة الذاتية الحالية التي ترفق مع طلبات التوظيف." : "This is your current resume snapshot attached to jobs."}
                  </CardDescription>
                </div>
                <div className="flex gap-2.5 flex-wrap">
                  <Link href="/user/cv-builder">
                    <Button className="rounded-xl gap-2 font-bold shadow-md shadow-primary/20">
                      <FileText className="h-4 w-4" />
                      {isAr ? "تعديل وبناء السيرة الذاتية" : "Edit / Build CV"}
                    </Button>
                  </Link>
                  <Button 
                    onClick={handleClearCV}
                    variant="outline" 
                    className="rounded-xl gap-2 font-bold border-destructive/20 text-destructive hover:bg-destructive/10 shadow-none"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isAr ? "حذف السيرة الذاتية" : "Delete CV"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {!user.cv || !(user.cv as any).summary ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-2xl">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="font-semibold text-muted-foreground mb-4">{isAr ? "لم تقم بإنشاء سيرتك الذاتية بعد!" : "You haven't built your CV yet!"}</p>
                    <Link href="/user/cv-builder">
                      <Button variant="outline">{isAr ? "ابدأ البناء الآن" : "Start Building Now"}</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Miniature CV Preview Card */}
                    <div 
                      onClick={() => setCvDialogOpen(true)}
                      className="max-w-2xl mx-auto border rounded-2xl shadow-lg bg-white overflow-hidden cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all duration-300 relative group text-start font-sans"
                      dir={(user.cv as any).language === "ar" ? "rtl" : "ltr"}
                    >
                      {/* Hover overlay indicator */}
                      <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
                        <span className="bg-primary/95 text-primary-foreground text-xs font-bold px-4 py-2 rounded-xl shadow-lg flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          {isAr ? "اضغط لعرض السيرة الذاتية بالكامل" : "Click to view full CV"}
                        </span>
                      </div>

                      <div className="grid grid-cols-12 min-h-[420px]">
                        {/* Main body (8 cols) */}
                        <div className="col-span-8 p-6 space-y-4 bg-white text-slate-800">
                          {(user.cv as any).summary && (
                            <div className="space-y-1">
                              <h3 className="text-xs font-bold text-slate-800 border-b pb-1" style={{ borderBottomColor: "#3b82f640" }}>
                                {(user.cv as any).language === "ar" ? "النبذة المهنية" : "Professional Summary"}
                              </h3>
                              <p className="text-[10px] text-slate-600 leading-relaxed line-clamp-3">{(user.cv as any).summary}</p>
                            </div>
                          )}

                          {/* Work Experience */}
                          {(user.cv as any).experience && (user.cv as any).experience.length > 0 && (
                            <div className="space-y-2">
                              <h3 className="text-xs font-bold text-slate-800 border-b pb-1" style={{ borderBottomColor: "#3b82f640" }}>
                                {(user.cv as any).language === "ar" ? "الخبرات المهنية" : "Work Experience"}
                              </h3>
                              <div className="space-y-2">
                                {((user.cv as any).experience || []).slice(0, 2).map((exp: any, i: number) => (
                                  <div key={i} className="space-y-0.5">
                                    <div className="flex justify-between items-start text-[10px]">
                                      <h4 className="font-extrabold text-slate-800 truncate max-w-[150px]">{exp.title}</h4>
                                      <span className="text-[8px] text-muted-foreground shrink-0">{exp.startDate} - {exp.endDate || ((user.cv as any).language === "ar" ? "الحاضر" : "Present")}</span>
                                    </div>
                                    <p className="text-[9px] text-slate-500 font-semibold">{exp.company}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Education */}
                          {(user.cv as any).education && (user.cv as any).education.length > 0 && (
                            <div className="space-y-2">
                              <h3 className="text-xs font-bold text-slate-800 border-b pb-1" style={{ borderBottomColor: "#3b82f640" }}>
                                {(user.cv as any).language === "ar" ? "التعليم والدراسة" : "Education"}
                              </h3>
                              <div className="space-y-2">
                                {((user.cv as any).education || []).slice(0, 2).map((edu: any, i: number) => (
                                  <div key={i} className="space-y-0.5">
                                    <div className="flex justify-between items-start text-[10px]">
                                      <h4 className="font-extrabold text-slate-800 truncate max-w-[150px]">{edu.degree}</h4>
                                      <span className="text-[8px] text-muted-foreground shrink-0">{edu.startDate} - {edu.endDate}</span>
                                    </div>
                                    <p className="text-[9px] text-slate-500 font-semibold">{edu.institution}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Dark column (4 cols) */}
                        <div className="col-span-4 p-4 text-white flex flex-col items-center text-center space-y-4" style={{ backgroundColor: "#22252A" }}>
                          {(user.cv as any).avatarUrl ? (
                            <img src={(user.cv as any).avatarUrl} alt="Avatar" className="w-16 h-16 rounded-xl object-cover border border-slate-700 shadow-md" />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700 text-slate-400">
                              <User className="w-6 h-6" />
                            </div>
                          )}
                          <div>
                            <h2 className="text-xs font-bold text-white leading-tight truncate max-w-[110px]">{(user.cv as any).fullName}</h2>
                            <p className="text-[8px] text-slate-400 font-bold truncate max-w-[110px] mt-1">{(user.cv as any).targetTitle}</p>
                          </div>

                          {/* Contacts info */}
                          <div className="w-full text-slate-300 text-[8px] space-y-1.5 pt-2 border-t border-slate-800/80">
                            {(user.cv as any).email && (
                              <div className="flex items-center gap-1 truncate justify-center">
                                <Mail className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                <span className="truncate max-w-[90px]">{(user.cv as any).email}</span>
                              </div>
                            )}
                            {(user.cv as any).phone && (
                              <div className="flex items-center gap-1 justify-center">
                                <Phone className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                <span>{(user.cv as any).phone}</span>
                              </div>
                            )}
                            {(user.cv as any).address && (
                              <div className="flex items-center gap-1 justify-center">
                                <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                <span className="truncate max-w-[90px]">{(user.cv as any).address}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Full-Screen CV View Dialog */}
                    <Dialog open={cvDialogOpen} onOpenChange={setCvDialogOpen}>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
                        <div 
                          className="grid grid-cols-12 min-h-[600px] font-sans bg-white"
                          dir={(user.cv as any).language === "ar" ? "rtl" : "ltr"}
                        >
                          {/* Main Content (8 cols) */}
                          <div className="col-span-8 p-8 space-y-6 text-slate-800 text-start">
                            {(user.cv as any).summary && (
                              <div className="space-y-2">
                                <h2 className="text-lg font-bold border-b pb-1.5" style={{ borderBottomColor: "#3b82f640" }}>
                                  {(user.cv as any).language === "ar" ? "النبذة المهنية" : "Professional Summary"}
                                </h2>
                                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{(user.cv as any).summary}</p>
                              </div>
                            )}

                            {/* Work Experience */}
                            {(user.cv as any).experience && (user.cv as any).experience.length > 0 && (
                              <div className="space-y-4">
                                <h2 className="text-lg font-bold border-b pb-1.5" style={{ borderBottomColor: "#3b82f640" }}>
                                  {(user.cv as any).language === "ar" ? "الخبرات المهنية" : "Work Experience"}
                                </h2>
                                <div className="space-y-4">
                                  {((user.cv as any).experience || []).map((exp: any, i: number) => (
                                    <div key={i} className="space-y-1">
                                      <div className="flex justify-between items-start flex-wrap gap-1">
                                        <h3 className="font-extrabold text-sm text-slate-800">{exp.title}</h3>
                                        <span className="text-xs text-muted-foreground font-semibold">{exp.startDate} - {exp.endDate || ((user.cv as any).language === "ar" ? "الحاضر" : "Present")}</span>
                                      </div>
                                      <p className="text-xs text-primary font-bold">{exp.company}</p>
                                      {exp.description && <p className="text-xs text-slate-500 leading-relaxed mt-1">{exp.description}</p>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Education */}
                            {(user.cv as any).education && (user.cv as any).education.length > 0 && (
                              <div className="space-y-4">
                                <h2 className="text-lg font-bold border-b pb-1.5" style={{ borderBottomColor: "#3b82f640" }}>
                                  {(user.cv as any).language === "ar" ? "التعليم والدراسة" : "Education"}
                                </h2>
                                <div className="space-y-3">
                                  {((user.cv as any).education || []).map((edu: any, i: number) => (
                                    <div key={i} className="space-y-1">
                                      <div className="flex justify-between items-start flex-wrap gap-1">
                                        <h3 className="font-extrabold text-sm text-slate-800">{edu.degree}</h3>
                                        <span className="text-xs text-muted-foreground font-semibold">{edu.startDate} - {edu.endDate}</span>
                                      </div>
                                      <p className="text-xs text-slate-500 font-bold">{edu.institution}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Dark Column (4 cols) */}
                          <div className="col-span-4 p-6 text-white flex flex-col items-center text-center space-y-6" style={{ backgroundColor: "#22252A" }}>
                            {(user.cv as any).avatarUrl ? (
                              <img src={(user.cv as any).avatarUrl} alt="Avatar" className="w-24 h-24 rounded-2xl object-cover border border-slate-700 shadow-md" />
                            ) : (
                              <div className="w-24 h-24 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700 text-slate-400">
                                <User className="w-10 h-10" />
                              </div>
                            )}
                            <div>
                              <h1 className="text-base font-extrabold text-white leading-none">{(user.cv as any).fullName}</h1>
                              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold font-sans mt-2">{(user.cv as any).targetTitle}</p>
                            </div>

                            {/* Contact details */}
                            <div className="w-full text-slate-300 text-xs space-y-3 pt-4 border-t border-slate-800/80">
                              <h4 className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest text-center">
                                {(user.cv as any).language === "ar" ? "التواصل" : "Contact"}
                              </h4>
                              <div className="space-y-2 text-[10.5px] font-semibold flex flex-col items-center">
                                {(user.cv as any).email && (
                                  <div className="flex items-center gap-1.5 truncate max-w-full">
                                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="truncate">{(user.cv as any).email}</span>
                                  </div>
                                )}
                                {(user.cv as any).phone && (
                                  <div className="flex items-center gap-1.5">
                                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>{(user.cv as any).phone}</span>
                                  </div>
                                )}
                                {(user.cv as any).address && (
                                  <div className="flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>{(user.cv as any).address}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Skills */}
                            {(user.cv as any).skills && (user.cv as any).skills.length > 0 && (
                              <div className="w-full space-y-3 pt-4 border-t border-slate-800/80">
                                <h4 className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest text-center">
                                  {(user.cv as any).language === "ar" ? "المهارات" : "Skills"}
                                </h4>
                                <div className="flex flex-wrap gap-1.5 justify-center">
                                  {((user.cv as any).skills || []).map((skill: string, idx: number) => (
                                    <Badge key={idx} variant="secondary" className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700">{skill}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tracks Tab */}
          <TabsContent value="tracks" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {!tracks?.length ? (
                <div className="col-span-full text-center py-12 bg-card border rounded-2xl">
                  <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/35 mb-2" />
                  <p className="text-muted-foreground">{isAr ? "لا توجد مسارات تعليمية متاحة حالياً." : "No tracks available."}</p>
                </div>
              ) : (
                tracks.map((track) => (
                  <TrackProgressCard key={track.id} track={track} userId={user.id} isAr={isAr} />
                ))
              )}
            </div>
          </TabsContent>

          {/* Certificates Tab */}
          <TabsContent value="certs" className="space-y-6 text-start">
            {myCerts.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed rounded-2xl bg-card/30">
                <Award className="h-12 w-12 mx-auto text-muted-foreground/35 mb-3" />
                <p className="font-semibold text-muted-foreground mb-4">{isAr ? "لم تحصل على أي شهادات بعد" : "You haven't earned any certificates yet"}</p>
                <Link href="/learn">
                  <Button variant="outline">{isAr ? "تصفح المسارات وابدأ التعلم" : "Browse tracks and start learning"}</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-8">
                {(() => {
                  const level4 = myCerts.filter((c: any) => c.level === 4);
                  const level3 = myCerts.filter((c: any) => c.level === 3);
                  const level2 = myCerts.filter((c: any) => c.level === 2);
                  const level1 = myCerts.filter((c: any) => c.level === 1 || !c.level);

                  const renderLevelSection = (titleAr: string, titleEn: string, levelCerts: any[], badge: string, themeClass: string, borderClass: string) => {
                    if (levelCerts.length === 0) return null;
                    return (
                      <div className="space-y-4 pt-4 border-t border-border/20 first:border-0 first:pt-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{badge}</span>
                          <h3 className={`text-sm font-extrabold tracking-tight ${themeClass}`}>
                            {isAr ? titleAr : titleEn} ({levelCerts.length})
                          </h3>
                        </div>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                          {levelCerts.map((c: any) => {
                            const isLocked = c.status === "locked";
                            return (
                              <Card key={c.id} className={`hover:shadow-md transition-all duration-300 relative overflow-hidden bg-gradient-to-b from-card to-background/50 ${
                                isLocked ? "border-amber-500/20 opacity-80" : borderClass
                              }`}>
                                <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <CardTitle className="text-xs font-black line-clamp-1">{c.workshopTitle || c.trackTitle}</CardTitle>
                                    <CardDescription className="mt-1 text-[9px] font-mono tracking-tight truncate">{c.certificateNumber}</CardDescription>
                                  </div>
                                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
                                    isLocked 
                                      ? "bg-amber-500/10 border-amber-500/20 text-amber-500" 
                                      : c.level === 1
                                        ? "bg-amber-500/15 border-amber-500/25 text-amber-600"
                                        : c.level === 2
                                          ? "bg-purple-500/15 border-purple-500/25 text-purple-600"
                                          : c.level === 3
                                            ? "bg-blue-500/15 border-blue-500/25 text-blue-600"
                                            : "bg-slate-500/10 border-slate-500/20 text-slate-500"
                                  }`}>
                                    {isLocked ? <Lock className="h-4 w-4" /> : <Award className="h-4.5 w-4.5" />}
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-3 pb-4">
                                  <div className="flex items-center justify-between text-[11px] border-t border-border/30 pt-2.5">
                                    <span className="text-muted-foreground">{isAr ? "تاريخ الإصدار:" : "Issued At:"}</span>
                                    <span className="font-semibold">{new Date(c.issuedAt).toLocaleDateString(isAr ? "ar-EG" : "en-US")}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-muted-foreground">{isAr ? "النتيجة:" : "Score:"}</span>
                                    <span className="font-bold text-emerald-600">{c.score}%</span>
                                  </div>
                                  
                                  {isLocked ? (
                                    <Link href="/certificates">
                                      <Button variant="outline" size="sm" className="w-full gap-1.5 rounded-xl text-[10px] mt-2 border-amber-500/30 text-amber-600 bg-amber-500/5 hover:bg-amber-500 hover:text-white transition-all font-bold">
                                        <Coins className="h-3 w-3" />
                                        {isAr ? `يتطلب تفعيل بالنقاط` : `Requires Unlock`}
                                      </Button>
                                    </Link>
                                  ) : (
                                    <Link href={`/certificate/${c.id}`}>
                                      <Button variant="outline" size="sm" className="w-full gap-1.5 rounded-xl text-[10px] mt-2 font-bold">
                                        <ExternalLink className="h-3 w-3" />
                                        {isAr ? "عرض وثيقة الشهادة" : "View Certificate Document"}
                                      </Button>
                                    </Link>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div className="space-y-6">
                      {renderLevelSection("شهادات خبير متقدم — المستوى 1 (Master)", "Level 1 — Master Expert Certificates", level1, "💎", "text-amber-600 dark:text-amber-400", "border-amber-500/35 hover:border-amber-500/60")}
                      {renderLevelSection("شهادات خبير متخصص — المستوى 2 (Expert)", "Level 2 — Expert Specialist Certificates", level2, "🥇", "text-purple-600 dark:text-purple-400", "border-purple-500/35 hover:border-purple-500/60")}
                      {renderLevelSection("شهادات أخصائي محترف — المستوى 3 (Professional)", "Level 3 — Professional Specialist Certificates", level3, "🥈", "text-blue-600 dark:text-blue-400", "border-blue-500/35 hover:border-blue-500/60")}
                      {renderLevelSection("شهادات حضور ومشاركة — المستوى 4 (Participation)", "Level 4 — Participation Certificates", level4, "🎫", "text-slate-500 dark:text-slate-400", "border-slate-500/25 hover:border-slate-500/50")}
                    </div>
                  );
                })()}
              </div>
            )}
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="apps" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {appsList.length === 0 ? (
                <div className="col-span-full text-center py-12 border-2 border-dashed rounded-2xl bg-card/30">
                  <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/35 mb-3" />
                  <p className="font-semibold text-muted-foreground mb-4">{isAr ? "لم تقدم على أي وظائف بعد" : "You haven't applied to any jobs yet"}</p>
                  <Link href="/jobs">
                    <Button>{isAr ? "تصفح الوظائف المتاحة" : "Browse Available Jobs"}</Button>
                  </Link>
                </div>
              ) : (
                appsList.map((app: any) => {
                  const job = jobsList?.find((j: any) => j.id === app.jobId);
                  const statusColors: Record<string, string> = {
                    pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
                    approved: "bg-green-500/10 text-green-600 border-green-500/20",
                    rejected: "bg-red-500/10 text-red-600 border-red-500/20"
                  };
                  const statusAr: Record<string, string> = {
                    pending: "قيد الانتظار",
                    approved: "مقبول",
                    rejected: "مرفوض"
                  };
                  return (
                    <Card key={app.id} className="hover:border-primary/50 transition-all duration-300">
                      <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base font-bold line-clamp-1">{job?.title || app.jobTitle}</CardTitle>
                          <CardDescription className="mt-1 font-semibold text-primary">{job?.company || (isAr ? "شركة غير معروفة" : "Unknown Company")}</CardDescription>
                        </div>
                        <Briefcase className="h-7 w-7 text-muted-foreground/40 shrink-0" />
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between text-xs border-t pt-3">
                          <span className="text-muted-foreground">{isAr ? "تاريخ التقديم:" : "Applied on:"}</span>
                          <span className="font-semibold">{new Date(app.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{isAr ? "الحالة:" : "Status:"}</span>
                          <Badge variant="outline" className={statusColors[app.status] || ""}>
                            {isAr ? statusAr[app.status] || app.status : app.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
