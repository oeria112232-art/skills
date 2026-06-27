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

type JobForm = {
  title: string; company: string; description: string;
  type: string; level: string; location: string;
  isRemote: boolean; salaryMin: string; salaryMax: string; passScore: string;
};

const defaultForm: JobForm = { title: "", company: "", description: "", type: "full-time", level: "mid", location: "", isRemote: false, salaryMin: "", salaryMax: "", passScore: "70" };

export default function AdminJobsPage() {
  const { data: jobs, isLoading } = useListJobs();
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<JobForm>(defaultForm);

  const handleOpen = (job?: typeof jobs extends (infer T)[] ? T : never) => {
    if (job) {
      setEditing(job.id);
      setForm({ title: job.title, company: job.company, description: job.description, type: job.type, level: job.level, location: job.location || "", isRemote: job.isRemote, salaryMin: job.salaryMin?.toString() || "", salaryMax: job.salaryMax?.toString() || "", passScore: job.passScore.toString() });
    } else {
      setEditing(null);
      setForm(defaultForm);
    }
    setOpen(true);
  };

  const handleSave = async () => {
    const data = {
      title: form.title, company: form.company, description: form.description,
      type: form.type, level: form.level, location: form.location || undefined,
      isRemote: form.isRemote,
      salaryMin: form.salaryMin ? parseInt(form.salaryMin) : undefined,
      salaryMax: form.salaryMax ? parseInt(form.salaryMax) : undefined,
      passScore: parseInt(form.passScore),
    };
    if (editing) {
      await updateJob.mutateAsync({ id: editing, data });
      toast({ title: "Job updated" });
    } else {
      await createJob.mutateAsync({ data });
      toast({ title: "Job created" });
    }
    queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
    setOpen(false);
  };

  const handleDelete = async (id: number) => {
    await deleteJob.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
    toast({ title: "Job deleted" });
  };

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1" data-testid="heading-admin-jobs">Manage Jobs</h1>
          <p className="text-muted-foreground">Create and manage job postings</p>
        </div>
        <Button onClick={() => handleOpen()} className="gap-2" data-testid="button-add-job">
          <Plus className="w-4 h-4" /> Add Job
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Title</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Company</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Type</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!jobs || jobs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-muted-foreground"><Briefcase className="w-8 h-8 mx-auto mb-2 opacity-20" /><p>No jobs yet</p></td></tr>
              ) : jobs.map(job => (
                <tr key={job.id} className="hover:bg-muted/30 transition-colors" data-testid={`admin-job-row-${job.id}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-sm">{job.title}</p>
                    <p className="text-xs text-muted-foreground">{job.applicationCount} applicants</p>
                  </td>
                  <td className="px-4 py-3 text-sm hidden sm:table-cell">{job.company}</td>
                  <td className="px-4 py-3 text-sm hidden md:table-cell capitalize">{job.type}</td>
                  <td className="px-4 py-3">
                    <Badge variant={job.status === "open" ? "default" : "secondary"}>{job.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleOpen(job)} data-testid={`button-edit-job-${job.id}`}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(job.id)} data-testid={`button-delete-job-${job.id}`}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Job" : "New Job Posting"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Job Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Senior Developer" data-testid="input-job-title" /></div>
              <div className="col-span-2"><Label>Company</Label><Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Company name" data-testid="input-job-company" /></div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Level</Label>
                <Select value={form.level} onValueChange={v => setForm(f => ({ ...f, level: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="junior">Junior</SelectItem>
                    <SelectItem value="mid">Mid</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Location</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Cairo, Egypt" /></div>
              <div><Label>Pass Score (%)</Label><Input type="number" value={form.passScore} onChange={e => setForm(f => ({ ...f, passScore: e.target.value }))} data-testid="input-pass-score" /></div>
              <div><Label>Salary Min ($)</Label><Input type="number" value={form.salaryMin} onChange={e => setForm(f => ({ ...f, salaryMin: e.target.value }))} /></div>
              <div><Label>Salary Max ($)</Label><Input type="number" value={form.salaryMax} onChange={e => setForm(f => ({ ...f, salaryMax: e.target.value }))} /></div>
              <div className="col-span-2 flex items-center gap-3">
                <Switch checked={form.isRemote} onCheckedChange={v => setForm(f => ({ ...f, isRemote: v }))} id="remote-toggle" />
                <Label htmlFor="remote-toggle">Remote position</Label>
              </div>
              <div className="col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} placeholder="Job description..." data-testid="textarea-job-description" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.title || !form.company || createJob.isPending || updateJob.isPending} data-testid="button-save-job">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
