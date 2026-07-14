import { useState } from "react";
import { useListJobs, useCreateJob, useUpdateJob, useDeleteJob, getListJobsQueryKey } from "@workspace/api-client-react";
import { Plus, Pencil, Trash2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/components/layout/LanguageContext";
import { useAuth } from "@/components/layout/AuthContext";

type JobForm = {
  title: string; description: string;
  type: string; level: string; location: string;
  isRemote: boolean; salaryMin: string; salaryMax: string; passScore: string;
};

const defaultForm: JobForm = { title: "", description: "", type: "full-time", level: "mid", location: "", isRemote: false, salaryMin: "", salaryMax: "", passScore: "70" };

export default function CompanyJobsPage() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { user } = useAuth();
  
  const { data: jobs, isLoading } = useListJobs({ companyId: user?.id });
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<JobForm>(defaultForm);

  const handleOpen = (job?: Exclude<typeof jobs, undefined> extends (infer T)[] ? T : never) => {
    if (job) {
      setEditing(job.id);
      setForm({ title: job.title, description: job.description, type: job.type, level: job.level, location: job.location || "", isRemote: job.isRemote, salaryMin: job.salaryMin?.toString() || "", salaryMax: job.salaryMax?.toString() || "", passScore: job.passScore.toString() });
    } else {
      setEditing(null);
      setForm(defaultForm);
    }
    setOpen(true);
  };

  const handleSave = () => {
    const data = {
      title: form.title,
      company: user?.name || "Company",
      companyId: user?.id,
      description: form.description,
      type: form.type,
      level: form.level,
      location: form.location || undefined,
      isRemote: form.isRemote,
      salaryMin: form.salaryMin ? parseInt(form.salaryMin) : undefined,
      salaryMax: form.salaryMax ? parseInt(form.salaryMax) : undefined,
      passScore: parseInt(form.passScore) || 70,
    };

    if (editing) {
      updateJob.mutate({ id: editing, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListJobsQueryKey({ companyId: user?.id }) });
          setOpen(false);
          toast({ title: isAr ? "تم تحديث الوظيفة بنجاح" : "Job updated successfully" });
        }
      });
    } else {
      createJob.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListJobsQueryKey({ companyId: user?.id }) });
          setOpen(false);
          toast({ title: isAr ? "تم إنشاء الوظيفة بنجاح" : "Job created successfully" });
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm(isAr ? "هل أنت متأكد من حذف هذه الوظيفة؟" : "Are you sure you want to delete this job?")) {
      deleteJob.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListJobsQueryKey({ companyId: user?.id }) });
          toast({ title: isAr ? "تم حذف الوظيفة" : "Job deleted" });
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
              {isAr ? "وظائفي" : "My Jobs"}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isAr ? "إدارة الوظائف التي قمت بنشرها" : "Manage jobs you have posted"}
            </p>
          </div>
          <Button onClick={() => handleOpen()} className="gap-2 rounded-xl">
            <Plus className="h-4 w-4" />
            {isAr ? "وظيفة جديدة" : "New Job"}
          </Button>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? (isAr ? "تعديل الوظيفة" : "Edit Job") : (isAr ? "وظيفة جديدة" : "New Job")}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2 col-span-2">
                <Label>{isAr ? "المسمى الوظيفي" : "Job Title"}</Label>
                <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder={isAr ? "مثال: مطور واجهات أمامية" : "e.g. Frontend Developer"} />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "النوع" : "Type"}</Label>
                <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">{isAr ? "دوام كامل" : "Full-time"}</SelectItem>
                    <SelectItem value="part-time">{isAr ? "دوام جزئي" : "Part-time"}</SelectItem>
                    <SelectItem value="contract">{isAr ? "عقد" : "Contract"}</SelectItem>
                    <SelectItem value="freelance">{isAr ? "عمل حر" : "Freelance"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "المستوى" : "Level"}</Label>
                <Select value={form.level} onValueChange={v => setForm({...form, level: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">{isAr ? "مبتدئ" : "Entry Level"}</SelectItem>
                    <SelectItem value="mid">{isAr ? "متوسط" : "Mid Level"}</SelectItem>
                    <SelectItem value="senior">{isAr ? "خبير" : "Senior Level"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>{isAr ? "الوصف الوظيفي" : "Job Description"}</Label>
                <Textarea className="min-h-[100px]" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "الموقع" : "Location"}</Label>
                <Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
              </div>
              <div className="space-y-2 flex flex-col justify-end">
                <div className="flex items-center space-x-2 space-x-reverse h-10">
                  <Switch checked={form.isRemote} onCheckedChange={c => setForm({...form, isRemote: c})} />
                  <Label>{isAr ? "العمل عن بعد" : "Remote Work"}</Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "الحد الأدنى للراتب" : "Min Salary"}</Label>
                <Input type="number" value={form.salaryMin} onChange={e => setForm({...form, salaryMin: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? "الحد الأعلى للراتب" : "Max Salary"}</Label>
                <Input type="number" value={form.salaryMax} onChange={e => setForm({...form, salaryMax: e.target.value})} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>{isAr ? "درجة النجاح في التقييم (%)" : "Assessment Pass Score (%)"}</Label>
                <Input type="number" value={form.passScore} onChange={e => setForm({...form, passScore: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSave} disabled={createJob.isPending || updateJob.isPending}>
                {isAr ? "حفظ الوظيفة" : "Save Job"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))
          ) : !jobs?.length ? (
            <div className="col-span-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-2xl">
              <Briefcase className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">{isAr ? "لم تقم بإضافة أي وظائف بعد" : "You haven't posted any jobs yet"}</p>
            </div>
          ) : (
            jobs.map(job => (
              <div key={job.id} className="group p-6 rounded-2xl border bg-card hover:shadow-xl hover:border-primary/50 transition-all duration-300 flex flex-col h-full relative">
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleOpen(job)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(job.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex items-start gap-4 mb-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Briefcase className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 pr-12">
                    <h3 className="font-bold text-lg leading-tight mb-1 line-clamp-1">{job.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
                  </div>
                </div>

                <div className="mt-auto pt-4 flex flex-wrap gap-2">
                  <Badge variant={job.status === 'open' ? 'default' : 'secondary'} className="rounded-full">
                    {job.status}
                  </Badge>
                  <Badge variant="outline" className="rounded-full">{job.type}</Badge>
                  <Badge variant="outline" className="rounded-full">{job.level}</Badge>
                  <Badge variant="secondary" className="rounded-full bg-blue-500/10 text-blue-600 border-none">
                    {job.applicationCount} {isAr ? "طلبات" : "Apps"}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
