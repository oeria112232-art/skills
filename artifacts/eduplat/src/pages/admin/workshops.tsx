import { useState } from "react";
import { useListWorkshops, useCreateWorkshop, useUpdateWorkshop, useDeleteWorkshop, getListWorkshopsQueryKey } from "@workspace/api-client-react";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
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

type WorkshopForm = { title: string; description: string; date: string; duration: string; instructor: string; capacity: string; passScore: string; status: string; tags: string; };
const defaultForm: WorkshopForm = { title: "", description: "", date: "", duration: "60", instructor: "", capacity: "50", passScore: "70", status: "upcoming", tags: "" };

export default function AdminWorkshopsPage() {
  const { data: workshops, isLoading } = useListWorkshops();
  const createWorkshop = useCreateWorkshop();
  const updateWorkshop = useUpdateWorkshop();
  const deleteWorkshop = useDeleteWorkshop();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<WorkshopForm>(defaultForm);

  const handleOpen = (w?: any) => {
    if (w) {
      setEditing(w.id);
      setForm({ title: w.title, description: w.description, date: w.date.slice(0, 16), duration: w.duration.toString(), instructor: w.instructor, capacity: w.capacity.toString(), passScore: w.passScore.toString(), status: w.status, tags: (w.tags || []).join(", ") });
    } else {
      setEditing(null);
      setForm(defaultForm);
    }
    setOpen(true);
  };

  const handleSave = async () => {
    const data = {
      title: form.title, description: form.description, date: form.date,
      duration: parseInt(form.duration), instructor: form.instructor,
      capacity: parseInt(form.capacity), passScore: parseInt(form.passScore),
      status: form.status,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    };
    if (editing) {
      await updateWorkshop.mutateAsync({ id: editing, data });
      toast({ title: "Workshop updated" });
    } else {
      await createWorkshop.mutateAsync({ data });
      toast({ title: "Workshop created" });
    }
    queryClient.invalidateQueries({ queryKey: getListWorkshopsQueryKey() });
    setOpen(false);
  };

  const handleDelete = async (id: number) => {
    await deleteWorkshop.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListWorkshopsQueryKey() });
    toast({ title: "Workshop deleted" });
  };

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1" data-testid="heading-admin-workshops">Manage Workshops</h1>
          <p className="text-muted-foreground">Create and manage workshop sessions</p>
        </div>
        <Button onClick={() => handleOpen()} className="gap-2" data-testid="button-add-workshop">
          <Plus className="w-4 h-4" /> Add Workshop
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Workshop</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Date</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Enrolled</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!workshops || workshops.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-muted-foreground"><BookOpen className="w-8 h-8 mx-auto mb-2 opacity-20" /><p>No workshops</p></td></tr>
              ) : workshops.map(w => (
                <tr key={w.id} className="hover:bg-muted/30" data-testid={`admin-workshop-row-${w.id}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-sm">{w.title}</p>
                    <p className="text-xs text-muted-foreground">{w.instructor}</p>
                  </td>
                  <td className="px-4 py-3 text-sm hidden sm:table-cell">{new Date(w.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm hidden md:table-cell">{w.enrolledCount}/{w.capacity}</td>
                  <td className="px-4 py-3"><Badge variant={w.status === "upcoming" ? "default" : "secondary"}>{w.status}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleOpen(w)} data-testid={`button-edit-workshop-${w.id}`}><Pencil className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(w.id)} data-testid={`button-delete-workshop-${w.id}`}><Trash2 className="w-3 h-3" /></Button>
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
          <DialogHeader><DialogTitle>{editing ? "Edit Workshop" : "New Workshop"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} data-testid="input-workshop-title" /></div>
            <div><Label>Instructor</Label><Input value={form.instructor} onChange={e => setForm(f => ({ ...f, instructor: e.target.value }))} /></div>
            <div><Label>Date & Time</Label><Input type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Duration (min)</Label><Input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} /></div>
              <div><Label>Capacity</Label><Input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} /></div>
              <div><Label>Pass Score (%)</Label><Input type="number" value={form.passScore} onChange={e => setForm(f => ({ ...f, passScore: e.target.value }))} /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Tags (comma-separated)</Label><Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="e.g. React, TypeScript, Web" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.title || !form.instructor || createWorkshop.isPending || updateWorkshop.isPending} data-testid="button-save-workshop">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
