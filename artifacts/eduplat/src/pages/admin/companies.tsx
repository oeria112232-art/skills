import { useState } from "react";
import { useListUsers, useCreateUser, useDeleteUser, useUpdateUser, getListUsersQueryKey } from "@workspace/api-client-react";
import { Building2, UserPlus, Trash2, Edit3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/components/layout/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function AdminCompaniesPage() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { data: users, isLoading } = useListUsers();
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();
  const updateUser = useUpdateUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const usersList = Array.isArray(users) ? users : (users && Array.isArray((users as any).data) ? (users as any).data : []);
  const companies = usersList.filter((u: any) => u.role === "company");

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: "", email: "", password: "", companyCategory: "tech" });

  const [editingCompany, setEditingCompany] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ name: "", password: "", companyCategory: "tech" });

  const handleCreateCompany = () => {
    if (!newCompany.name || !newCompany.email || !newCompany.password) {
      toast({
        title: isAr ? "خطأ" : "Error",
        description: isAr ? "الرجاء تعبئة جميع الحقول" : "Please fill all fields",
        variant: "destructive"
      });
      return;
    }

    createUser.mutate({
      data: {
        name: newCompany.name,
        email: newCompany.email,
        password: newCompany.password,
        role: "company",
        companyCategory: newCompany.companyCategory
      } as any
    }, {
      onSuccess: () => {
        toast({
          title: isAr ? "نجاح" : "Success",
          description: isAr ? "تم إنشاء حساب الشركة بنجاح" : "Company account created successfully"
        });
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        setIsAddDialogOpen(false);
        setNewCompany({ name: "", email: "", password: "", companyCategory: "tech" });
      },
      onError: () => {
        toast({
          title: isAr ? "خطأ" : "Error",
          description: isAr ? "حدث خطأ أثناء إنشاء حساب الشركة" : "Error creating company account",
          variant: "destructive"
        });
      }
    });
  };

  const handleStartEdit = (company: any) => {
    setEditingCompany(company);
    setEditForm({ name: company.name, password: "", companyCategory: company.companyCategory || "tech" });
  };

  const handleUpdateCompany = () => {
    if (!editingCompany) return;
    if (!editForm.name) {
      toast({
        title: isAr ? "خطأ" : "Error",
        description: isAr ? "الاسم مطلوب" : "Name is required",
        variant: "destructive"
      });
      return;
    }

    updateUser.mutate({
      id: editingCompany.id,
      data: {
        name: editForm.name,
        companyCategory: editForm.companyCategory,
        ...(editForm.password ? { password: editForm.password } : {})
      } as any
    }, {
      onSuccess: () => {
        toast({
          title: isAr ? "نجاح" : "Success",
          description: isAr ? "تم تحديث بيانات الشركة بنجاح" : "Company updated successfully"
        });
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        setEditingCompany(null);
      },
      onError: () => {
        toast({
          title: isAr ? "خطأ" : "Error",
          description: isAr ? "حدث خطأ أثناء تحديث البيانات" : "Error updating company account",
          variant: "destructive"
        });
      }
    });
  };

  const handleDeleteCompany = (id: number) => {
    if (confirm(isAr ? "هل أنت متأكد من حذف حساب هذه الشركة؟" : "Are you sure you want to delete this company?")) {
      deleteUser.mutate({ id }, {
        onSuccess: () => {
          toast({
            title: isAr ? "نجاح" : "Success",
            description: isAr ? "تم الحذف بنجاح" : "Deleted successfully",
          });
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        }
      });
    }
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {isAr ? "إدارة الشركات" : "Manage Companies"}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isAr ? "إنشاء وإدارة حسابات الشركات لتمكينهم من نشر الوظائف" : "Create and manage company accounts"}
            </p>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-xl">
                <UserPlus className="h-4 w-4" />
                {isAr ? "إضافة شركة" : "Add Company"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{isAr ? "إضافة حساب شركة جديد" : "Add New Company Account"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{isAr ? "اسم الشركة" : "Company Name"}</label>
                  <Input 
                    value={newCompany.name}
                    onChange={(e) => setNewCompany({...newCompany, name: e.target.value})}
                    placeholder={isAr ? "أدخل اسم الشركة" : "Enter company name"}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{isAr ? "البريد الإلكتروني" : "Email"}</label>
                  <Input 
                    type="email"
                    value={newCompany.email}
                    onChange={(e) => setNewCompany({...newCompany, email: e.target.value})}
                    placeholder={isAr ? "أدخل البريد الإلكتروني" : "Enter email"}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{isAr ? "كلمة المرور" : "Password"}</label>
                  <Input 
                    type="password"
                    value={newCompany.password}
                    onChange={(e) => setNewCompany({...newCompany, password: e.target.value})}
                    placeholder={isAr ? "أدخل كلمة المرور" : "Enter password"}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{isAr ? "تخصص/مجال الشركة" : "Company Category"}</label>
                  <select
                    value={newCompany.companyCategory}
                    onChange={(e) => setNewCompany({...newCompany, companyCategory: e.target.value})}
                    className="w-full h-10 rounded-xl border border-border/60 bg-background px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="tech">{isAr ? "تكنولوجيا وبرمجيات (Tech)" : "Technology & Software"}</option>
                    <option value="marketing">{isAr ? "تسويق ومبيعات (Marketing)" : "Marketing & Sales"}</option>
                    <option value="design">{isAr ? "تصميم وفنون (Design)" : "Design & Arts"}</option>
                    <option value="business">{isAr ? "إدارة وأعمال (Business)" : "Business & Management"}</option>
                    <option value="general">{isAr ? "مجال عام / أخرى (General)" : "General & Others"}</option>
                  </select>
                </div>
                <Button className="w-full" onClick={handleCreateCompany} disabled={createUser.isPending}>
                  {createUser.isPending ? (isAr ? "جاري الإنشاء..." : "Creating...") : (isAr ? "إنشاء حساب" : "Create Account")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))
          ) : companies.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-2xl">
              <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                {isAr ? "لا توجد شركات مسجلة بعد" : "No companies registered yet"}
              </p>
            </div>
          ) : (
            companies.map((company: any) => (
              <div key={company.id} className="group p-6 rounded-2xl border bg-card text-card-foreground shadow-sm hover:shadow-xl hover:border-primary/50 transition-all duration-300 flex flex-col h-full relative overflow-hidden">
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10" onClick={() => handleStartEdit(company)}>
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteCompany(company.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex items-start gap-4 mb-6">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight mb-1">{company.name}</h3>
                    <p className="text-sm text-muted-foreground">{company.email}</p>
                    <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                      {company.companyCategory === "tech" ? (isAr ? "تكنولوجيا وبرمجيات" : "Technology") :
                       company.companyCategory === "marketing" ? (isAr ? "تسويق ومبيعات" : "Marketing") :
                       company.companyCategory === "design" ? (isAr ? "تصميم وفنون" : "Design") :
                       company.companyCategory === "business" ? (isAr ? "إدارة وأعمال" : "Business") :
                       (isAr ? "مجال عام" : "General")}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingCompany} onOpenChange={(open) => !open && setEditingCompany(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{isAr ? "تعديل حساب الشركة" : "Edit Company Account"}</DialogTitle>
            </DialogHeader>
            {editingCompany && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{isAr ? "اسم الشركة" : "Company Name"}</label>
                  <Input 
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    placeholder={isAr ? "أدخل اسم الشركة" : "Enter company name"}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{isAr ? "البريد الإلكتروني (غير قابل للتعديل)" : "Email (Uneditable)"}</label>
                  <Input 
                    type="email"
                    value={editingCompany.email}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{isAr ? "كلمة المرور الجديدة (اتركها فارغة للمحافظة عليها)" : "New Password (Leave empty to keep current)"}</label>
                  <Input 
                    type="password"
                    value={editForm.password}
                    onChange={(e) => setEditForm({...editForm, password: e.target.value})}
                    placeholder={isAr ? "أدخل كلمة مرور جديدة" : "Enter new password"}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{isAr ? "تخصص/مجال الشركة" : "Company Category"}</label>
                  <select
                    value={editForm.companyCategory}
                    onChange={(e) => setEditForm({...editForm, companyCategory: e.target.value})}
                    className="w-full h-10 rounded-xl border border-border/60 bg-background px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="tech">{isAr ? "تكنولوجيا وبرمجيات (Tech)" : "Technology & Software"}</option>
                    <option value="marketing">{isAr ? "تسويق ومبيعات (Marketing)" : "Marketing & Sales"}</option>
                    <option value="design">{isAr ? "تصميم وفنون (Design)" : "Design & Arts"}</option>
                    <option value="business">{isAr ? "إدارة وأعمال (Business)" : "Business & Management"}</option>
                    <option value="general">{isAr ? "مجال عام / أخرى (General)" : "General & Others"}</option>
                  </select>
                </div>
                <Button className="w-full" onClick={handleUpdateCompany} disabled={updateUser.isPending}>
                  {updateUser.isPending ? (isAr ? "جاري التحديث..." : "Updating...") : (isAr ? "تعديل الحساب" : "Update Account")}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
