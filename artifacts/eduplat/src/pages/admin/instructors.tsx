import { useState } from "react";
import { useListUsers, useUpdateUser, useCreateUser, useDeleteUser, getListUsersQueryKey } from "@workspace/api-client-react";
import { GraduationCap, Shield, Settings2, Check, UserPlus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/components/layout/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const ADMIN_PAGES = [
  { id: "jobs", label: "Jobs", arLabel: "الوظائف" },
  { id: "applications", label: "Applications", arLabel: "التقديمات" },
  { id: "workshops", label: "Workshops", arLabel: "الورش" },
  { id: "tracks", label: "Learning Tracks", arLabel: "المسارات" },
  { id: "exams", label: "Manage Exams", arLabel: "الاختبارات" },
  { id: "certificates", label: "Manage Certificates", arLabel: "الشهادات" },
];

export default function AdminInstructorsPage() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { data: users, isLoading } = useListUsers();
  const updateUser = useUpdateUser();
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const instructors = Array.isArray(users) ? users.filter(u => u.role === "instructor") : [];

  const [selectedInstructorId, setSelectedInstructorId] = useState<number | null>(null);
  const [tempAllowedPages, setTempAllowedPages] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newInstructor, setNewInstructor] = useState({ name: "", email: "", password: "" });

  const openPermissions = (instructor: any) => {
    setSelectedInstructorId(instructor.id);
    setTempAllowedPages(instructor.allowedPages || []);
    setIsDialogOpen(true);
  };

  const togglePage = (pageId: string) => {
    setTempAllowedPages(prev => 
      prev.includes(pageId) ? prev.filter(p => p !== pageId) : [...prev, pageId]
    );
  };

  const savePermissions = async () => {
    if (!selectedInstructorId) return;
    
    try {
      await updateUser.mutateAsync({
        id: selectedInstructorId,
        data: { allowedPages: tempAllowedPages }
      });
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      toast({ title: isAr ? "تم حفظ الصلاحيات" : "Permissions saved" });
      setIsDialogOpen(false);
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: isAr ? "خطأ في الحفظ" : "Error saving", 
      });
    }
  };

  const handleAddInstructor = async () => {
    if (!newInstructor.name || !newInstructor.email || !newInstructor.password) {
      toast({ variant: "destructive", title: isAr ? "جميع الحقول مطلوبة" : "All fields required" });
      return;
    }
    try {
      await createUser.mutateAsync({
        data: { ...newInstructor, role: "instructor" }
      });
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      toast({ title: isAr ? "تم إضافة المعلم" : "Instructor added" });
      setIsAddDialogOpen(false);
      setNewInstructor({ name: "", email: "", password: "" });
    } catch (error) {
      toast({ variant: "destructive", title: isAr ? "خطأ في الإضافة" : "Error adding" });
    }
  };

  const handleDeleteInstructor = async (id: number) => {
    if (!confirm(isAr ? "هل أنت متأكد من حذف هذا المعلم نهائياً؟" : "Are you sure you want to delete this instructor?")) return;
    try {
      await deleteUser.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      toast({ title: isAr ? "تم حذف المعلم" : "Instructor deleted" });
    } catch (error) {
      toast({ variant: "destructive", title: isAr ? "خطأ في الحذف" : "Error deleting" });
    }
  };

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            {isAr ? "إدارة المعلمين" : "Instructors Management"}
          </h1>
          <p className="text-muted-foreground">
            {isAr ? "تحكم بصلاحيات المعلمين والصفحات المسموح لهم بإدارتها" : "Control instructor permissions and access"}
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" />
              {isAr ? "إضافة معلم جديد" : "Add Instructor"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isAr ? "إضافة معلم جديد" : "Add New Instructor"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{isAr ? "الاسم" : "Name"}</label>
                <input 
                  type="text" 
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={newInstructor.name}
                  onChange={e => setNewInstructor(prev => ({...prev, name: e.target.value}))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{isAr ? "البريد الإلكتروني" : "Email"}</label>
                <input 
                  type="email" 
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={newInstructor.email}
                  onChange={e => setNewInstructor(prev => ({...prev, email: e.target.value}))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{isAr ? "كلمة المرور" : "Password"}</label>
                <input 
                  type="password" 
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={newInstructor.password}
                  onChange={e => setNewInstructor(prev => ({...prev, password: e.target.value}))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
              <Button onClick={handleAddInstructor}>{isAr ? "إضافة" : "Add"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {instructors.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed rounded-xl">
              <Shield className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p>{isAr ? "لا يوجد معلمين حالياً. يمكنك تغيير رتبة مستخدم من صفحة المستخدمين." : "No instructors found. You can change a user's role from the Users page."}</p>
            </div>
          ) : instructors.map(instructor => (
            <div key={instructor.id} className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {instructor.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{instructor.name}</h3>
                    <p className="text-xs text-muted-foreground">{instructor.email}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteInstructor(instructor.id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="mb-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">{isAr ? "الصلاحيات الحالية:" : "Current Permissions:"}</p>
                <div className="flex flex-wrap gap-1.5">
                  {(instructor.allowedPages || []).length === 0 ? (
                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">
                      {isAr ? "لا يوجد صلاحيات" : "No permissions"}
                    </span>
                  ) : (
                    instructor.allowedPages?.map((p: string) => {
                      const page = ADMIN_PAGES.find(ap => ap.id === p);
                      return (
                        <Badge key={p} variant="secondary" className="text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20">
                          {page ? (isAr ? page.arLabel : page.label) : p}
                        </Badge>
                      );
                    })
                  )}
                </div>
              </div>

              <Dialog open={isDialogOpen && selectedInstructorId === instructor.id} onOpenChange={(open) => !open && setIsDialogOpen(false)}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full text-xs" onClick={() => openPermissions(instructor)}>
                    <Settings2 className="w-3.5 h-3.5 mr-1.5 ml-1.5" />
                    {isAr ? "تعديل الصلاحيات" : "Edit Permissions"}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{isAr ? `صلاحيات المعلم: ${instructor.name}` : `Permissions: ${instructor.name}`}</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <p className="text-sm text-muted-foreground">
                      {isAr ? "اختر الصفحات التي يمكن لهذا المعلم الوصول إليها:" : "Select the pages this instructor can access:"}
                    </p>
                    <div className="grid gap-2">
                      {ADMIN_PAGES.map(page => {
                        const isSelected = tempAllowedPages.includes(page.id);
                        return (
                          <div 
                            key={page.id}
                            onClick={() => togglePage(page.id)}
                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                              isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                            }`}
                          >
                            <span className="text-sm font-medium">{isAr ? page.arLabel : page.label}</span>
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                              isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"
                            }`}>
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      {isAr ? "إلغاء" : "Cancel"}
                    </Button>
                    <Button onClick={savePermissions}>
                      {isAr ? "حفظ التغييرات" : "Save Changes"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
