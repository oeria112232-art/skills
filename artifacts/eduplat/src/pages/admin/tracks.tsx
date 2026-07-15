import { useState } from "react";
import { useListTracks, getListTracksQueryKey, useListUsers } from "@workspace/api-client-react";
import {
  Plus, Pencil, Trash2, Clock, Users, Search, Filter, BarChart2,
  Layers, Globe, AlertCircle, RefreshCw, Save, X, BookMarked, Target, BookOpen, Award
} from "lucide-react";
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
import { useAuth } from "@/components/layout/AuthContext";
import { useLocation } from "wouter";

/* ─── Interfaces ─────────────────────────────────────────────────────────────── */
type Level = "beginner" | "intermediate" | "advanced";

interface Track {
  id: number;
  slug: string;
  title: string;
  description: string;
  category: string;
  level: string;
  iconUrl?: string | null;
  moduleCount: number;
  estimatedHours: number;
  enrolledCount?: number;
  createdAt?: string;
}

interface TrackForm {
  slug: string;
  title: string;
  description: string;
  category: string;
  level: string;
  iconUrl: string;
  estimatedHours: string;
  instructorId: string;
  price: string;
  certType: string;
  certLevel: string;
  certCost: string;
}

/* ─── Constants ──────────────────────────────────────────────────────────────── */
const defaultTrackForm: TrackForm = {
  slug: "", title: "", description: "", category: "",
  level: "beginner", iconUrl: "", estimatedHours: "10", instructorId: "none", price: "0",
  certType: "track", certLevel: "3", certCost: "250",
};

const CATEGORIES = ["البرمجة", "التصميم", "إدارة المشاريع", "التسويق الرقمي", "الأمن السيبراني", "الذكاء الاصطناعي", "قواعد البيانات", "الشبكات", "تطوير الويب", "تطوير الجوال"];

const LEVEL_CONFIG: Record<string, { label: string, labelAr: string, color: string, bg: string }> = {
  beginner:     { label: "Beginner",     labelAr: "مبتدئ",   color: "text-emerald-600", bg: "bg-emerald-500/10" },
  intermediate: { label: "Intermediate", labelAr: "متوسط",   color: "text-amber-600",   bg: "bg-amber-500/10" },
  advanced:     { label: "Advanced",     labelAr: "متقدم",   color: "text-red-600",     bg: "bg-red-500/10" },
};

/* ─── API helper ─── */
const api = async (path: string, method = "GET", body?: unknown) => {
  const token = localStorage.getItem("mharat-token");
  const headers: Record<string, string> = {};
  if (body) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  if (res.status === 204) return null;
  return res.json();
};

function StatChip({ icon: Icon, value, label, color }: { icon: React.ComponentType<{className?:string}>, value: number|string, label: string, color: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-card border border-border/60 rounded-xl px-3 py-2">
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <span className="font-bold text-sm">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

/* ─── Track Card ─────────────────────────────────────────────────────────────── */
function TrackCard({
  track, isAr, onDelete, isAdmin
}: {
  track: Track; isAr: boolean; onDelete: (id: number) => void; isAdmin: boolean;
}) {
  const [, setLocation] = useLocation();
  const lvl = LEVEL_CONFIG[track.level] ?? LEVEL_CONFIG.beginner;

  return (
    <div 
      onClick={() => setLocation(`/admin/tracks/${track.id}`)}
      className="group rounded-2xl border border-border/60 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 bg-card p-5 transition-all duration-300 cursor-pointer flex items-start justify-between gap-4"
      data-testid={`track-card-${track.id}`}
    >
      <div className="flex items-start gap-4 min-w-0">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center flex-shrink-0">
          <BookMarked className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-bold text-base leading-tight text-foreground group-hover:text-primary transition-colors">{track.title}</h3>
            <Badge className={`text-[10px] ${lvl.bg} ${lvl.color} border-0`}>{isAr ? lvl.labelAr : lvl.label}</Badge>
            <Badge variant="outline" className="text-[10px] text-muted-foreground">{track.category}</Badge>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-1">{track.description}</p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-muted-foreground"><Layers className="w-3 h-3" />{track.moduleCount} {isAr ? "وحدة" : "modules"}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3 h-3" />{track.estimatedHours}h</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="w-3 h-3" />{track.enrolledCount ?? 0}</span>
            <code className="text-[10px] bg-muted/60 px-1.5 py-0.5 rounded font-mono text-muted-foreground">/{track.slug}</code>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button 
          onClick={(e) => { e.stopPropagation(); setLocation(`/admin/tracks/${track.id}`); }}
          className="p-2 rounded-xl hover:bg-primary/10 text-primary transition-all" 
          title="Open Track Builder Workspace"
        >
          <Pencil className="w-4 h-4" />
        </button>
        {isAdmin && (
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(track.id); }}
            className="p-2 rounded-xl hover:bg-destructive/10 text-destructive transition-all" 
            title="Delete Track"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────────── */
export default function AdminTracksPage() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { data: tracks, isLoading, refetch } = useListTracks();
  const { data: users } = useListUsers();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const usersList = Array.isArray(users) ? users : (users && Array.isArray((users as any).data) ? (users as any).data : []);
  const instructors = usersList.filter((u: any) => u.role === "instructor");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  /* ── State ── */
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"title"|"modules"|"enrolled"|"hours">("title");

  // Track creation dialog
  const [trackDialogOpen, setTrackDialogOpen] = useState(false);
  const [trackForm, setTrackForm] = useState<TrackForm>(defaultTrackForm);
  const [trackSaving, setTrackSaving] = useState(false);

  // Delete confirmation
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ── Track Creation ── */
  const openCreateTrack = () => {
    setTrackForm(defaultTrackForm);
    setTrackDialogOpen(true);
  };

  const saveTrack = async () => {
    if (!trackForm.title.trim() || !trackForm.slug.trim() || !trackForm.category.trim()) {
      toast({ variant: "destructive", title: isAr ? "حقول مطلوبة" : "Required fields" });
      return;
    }
    setTrackSaving(true);
    try {
      const payload = {
        slug: trackForm.slug.trim().toLowerCase().replace(/\s+/g, "-"),
        title: trackForm.title.trim(),
        description: trackForm.description.trim(),
        category: trackForm.category,
        level: trackForm.level,
        iconUrl: trackForm.iconUrl.trim() || null,
        estimatedHours: parseInt(trackForm.estimatedHours, 10) || 0,
        instructorId: trackForm.instructorId === "none" ? null : parseInt(trackForm.instructorId, 10),
        price: parseInt(trackForm.price, 10) || 0,
        certType: trackForm.certType,
        certLevel: parseInt(trackForm.certLevel, 10) || 3,
        certCost: parseInt(trackForm.certCost, 10) || 0,
      };

      const newTrack = await api("/tracks", "POST", payload);
      queryClient.invalidateQueries({ queryKey: getListTracksQueryKey() });
      setTrackDialogOpen(false);
      toast({ title: isAr ? "🎉 تم إنشاء المسار بنجاح" : "🎉 Track created successfully" });
      
      // Navigate straight to the new builder workspace page!
      setLocation(`/admin/tracks/${newTrack.id}`);
    } catch (e: any) {
      toast({ variant: "destructive", title: isAr ? "خطأ" : "Error", description: e.message });
    } finally {
      setTrackSaving(false);
    }
  };

  const confirmDeleteTrack = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      await api(`/tracks/${deleteTargetId}`, "DELETE");
      queryClient.invalidateQueries({ queryKey: getListTracksQueryKey() });
      toast({ title: isAr ? "🗑️ تم الحذف بنجاح" : "🗑️ Deleted successfully" });
    } catch (e: any) {
      toast({ variant: "destructive", title: isAr ? "خطأ" : "Error", description: e.message });
    } finally {
      setDeleting(false);
      setDeleteTargetId(null);
    }
  };

  /* ── Filtering & Sorting ── */
  const filteredTracks = (tracks ?? [])
    .filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.slug.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterLevel !== "all" && t.level !== filterLevel) return false;
      if (filterCategory !== "all" && t.category !== filterCategory) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "modules") return b.moduleCount - a.moduleCount;
      if (sortBy === "enrolled") return (b.enrolledCount ?? 0) - (a.enrolledCount ?? 0);
      if (sortBy === "hours") return b.estimatedHours - a.estimatedHours;
      return 0;
    });

  const uniqueCategories = [...new Set((tracks ?? []).map(t => t.category))].filter(Boolean);
  const totalModules = (tracks ?? []).reduce((s, t) => s + t.moduleCount, 0);
  const totalEnrolled = (tracks ?? []).reduce((s, t) => s + (t.enrolledCount ?? 0), 0);
  const avgHours = tracks?.length ? Math.round((tracks ?? []).reduce((s, t) => s + t.estimatedHours, 0) / tracks.length) : 0;

  return (
    <AppLayout>
      {/* ── Page Header ── */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-extrabold mb-1 flex items-center gap-2" data-testid="heading-admin-tracks">
              <Target className="w-6 h-6 text-primary" />
              {isAr ? "إدارة المسارات التعليمية" : "Learning Tracks Management"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isAr ? "تحكم كامل في المسارات التعليمية والوحدات والمحتوى" : "Full control over learning tracks, modules and content"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-xl gap-1.5" data-testid="button-refresh-tracks">
              <RefreshCw className="w-3.5 h-3.5" /> {isAr ? "تحديث" : "Refresh"}
            </Button>
            <Button size="sm" onClick={openCreateTrack} className="rounded-xl gap-1.5 shadow-md shadow-primary/20" data-testid="button-create-track">
              <Plus className="w-4 h-4" /> {isAr ? "مسار جديد" : "New Track"}
            </Button>
          </div>
        </div>

        {/* ── Stats Bar ── */}
        {!isLoading && (
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <StatChip icon={BookMarked} value={(tracks ?? []).length} label={isAr ? "مسار" : "tracks"} color="text-primary" />
            <StatChip icon={Layers} value={totalModules} label={isAr ? "وحدة" : "modules"} color="text-violet-500" />
            <StatChip icon={Users} value={totalEnrolled} label={isAr ? "منتسب" : "enrolled"} color="text-emerald-500" />
            <StatChip icon={Clock} value={`${avgHours}h`} label={isAr ? "متوسط" : "avg"} color="text-amber-500" />
          </div>
        )}
      </div>

      {/* ── Filters & Search ── */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={isAr ? "ابحث عن مسار..." : "Search tracks..."}
            value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 rounded-xl border-border/60"
            data-testid="input-search-tracks"
          />
        </div>
        <Select value={filterLevel} onValueChange={setFilterLevel}>
          <SelectTrigger className="w-40 rounded-xl border-border/60" data-testid="select-filter-level">
            <Filter className="w-3.5 h-3.5 mr-1" />
            <SelectValue placeholder={isAr ? "المستوى" : "Level"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? "كل المستويات" : "All Levels"}</SelectItem>
            <SelectItem value="beginner">{isAr ? "مبتدئ" : "Beginner"}</SelectItem>
            <SelectItem value="intermediate">{isAr ? "متوسط" : "Intermediate"}</SelectItem>
            <SelectItem value="advanced">{isAr ? "متقدم" : "Advanced"}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-44 rounded-xl border-border/60" data-testid="select-filter-category">
            <SelectValue placeholder={isAr ? "الفئة" : "Category"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? "كل الفئات" : "All Categories"}</SelectItem>
            {uniqueCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-44 rounded-xl border-border/60" data-testid="select-sort-tracks">
            <BarChart2 className="w-3.5 h-3.5 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="title">{isAr ? "الاسم" : "Name"}</SelectItem>
            <SelectItem value="modules">{isAr ? "عدد الوحدات" : "Module Count"}</SelectItem>
            <SelectItem value="enrolled">{isAr ? "عدد المنتسبين" : "Enrolled"}</SelectItem>
            <SelectItem value="hours">{isAr ? "الساعات" : "Hours"}</SelectItem>
          </SelectContent>
        </Select>
        {(search || filterLevel !== "all" || filterCategory !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFilterLevel("all"); setFilterCategory("all"); }}
            className="rounded-xl gap-1.5 text-muted-foreground">
            <X className="w-3.5 h-3.5" /> {isAr ? "مسح" : "Clear"}
          </Button>
        )}
      </div>

      {/* ── Tracks List ── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : filteredTracks.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-border/40 rounded-2xl">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-bold text-lg text-muted-foreground mb-1">{isAr ? "لا توجد مسارات" : "No tracks found"}</p>
          <p className="text-sm text-muted-foreground mb-4">{isAr ? "أنشئ أول مسار تعليمي للمنصة" : "Create the first learning track"}</p>
          <Button onClick={openCreateTrack} className="rounded-xl gap-1.5">
            <Plus className="w-4 h-4" />{isAr ? "إنشاء مسار" : "Create Track"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTracks.map(track => (
            <TrackCard
              key={track.id}
              track={track}
              isAr={isAr}
              onDelete={(id) => setDeleteTargetId(id)}
              isAdmin={isAdmin}
            />
          ))}
          <p className="text-center text-xs text-muted-foreground pt-2">
            {isAr ? `عرض ${filteredTracks.length} من ${(tracks ?? []).length} مسار` : `Showing ${filteredTracks.length} of ${(tracks ?? []).length} tracks`}
          </p>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          Track Create Dialog
      ════════════════════════════════════════════════════════ */}
      <Dialog open={trackDialogOpen} onOpenChange={setTrackDialogOpen}>
        <DialogContent className="max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-primary" />
              {isAr ? "إنشاء مسار تعليمي جديد" : "Create New Learning Track"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Title & Slug */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{isAr ? "عنوان المسار *" : "Track Title *"}</Label>
                <Input
                  value={trackForm.title}
                  onChange={e => {
                    const val = e.target.value;
                    setTrackForm(f => ({
                      ...f, title: val,
                      slug: val.toLowerCase().replace(/\s+/g, "-").replace(/[^\p{L}\p{N}-]/gu, ""),
                    }));
                  }}
                  placeholder={isAr ? "مثال: أساسيات البرمجة" : "e.g. Web Development Fundamentals"}
                  className="rounded-xl" data-testid="input-track-title"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{isAr ? "المعرف الفريد (Slug) *" : "Unique Slug *"}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">/</span>
                  <Input
                    value={trackForm.slug}
                    onChange={e => setTrackForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^\p{L}\p{N}-]/gu, "") }))}
                    placeholder="web-dev-fundamentals"
                    className="pl-6 rounded-xl font-mono text-sm" data-testid="input-track-slug"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{isAr ? "وصف المسار *" : "Track Description *"}</Label>
              <Textarea
                value={trackForm.description}
                onChange={e => setTrackForm(f => ({ ...f, description: e.target.value }))}
                placeholder={isAr ? "وصف شامل وواضح لمحتوى المسار وأهدافه..." : "Comprehensive description of the track content and goals..."}
                className="rounded-xl min-h-[80px] resize-none" data-testid="textarea-track-description"
              />
            </div>

            {/* Category, Level, Hours */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{isAr ? "الفئة *" : "Category *"}</Label>
                <Select value={trackForm.category} onValueChange={v => setTrackForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="rounded-xl" data-testid="select-track-category">
                    <SelectValue placeholder={isAr ? "اختر الفئة" : "Select category"} />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{isAr ? "المستوى *" : "Level *"}</Label>
                <Select value={trackForm.level} onValueChange={v => setTrackForm(f => ({ ...f, level: v }))}>
                  <SelectTrigger className="rounded-xl" data-testid="select-track-level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">{isAr ? "مبتدئ" : "Beginner"}</SelectItem>
                    <SelectItem value="intermediate">{isAr ? "متوسط" : "Intermediate"}</SelectItem>
                    <SelectItem value="advanced">{isAr ? "متقدم" : "Advanced"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{isAr ? "الساعات المقدرة" : "Estimated Hours"}</Label>
                <Input
                  type="number" min="1" max="500"
                  value={trackForm.estimatedHours}
                  onChange={e => setTrackForm(f => ({ ...f, estimatedHours: e.target.value }))}
                  className="rounded-xl" data-testid="input-track-hours"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{isAr ? "السعر (نقاط)" : "Price (points)"}</Label>
                <Input
                  type="number" min="0"
                  value={trackForm.price}
                  onChange={e => setTrackForm(f => ({ ...f, price: e.target.value }))}
                  className="rounded-xl" placeholder="0 = مجاني"
                />
              </div>
            </div>

            {/* Icon URL */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{isAr ? "رابط الأيقونة / الصورة (اختياري)" : "Icon URL (optional)"}</Label>
              <Input
                value={trackForm.iconUrl}
                onChange={e => setTrackForm(f => ({ ...f, iconUrl: e.target.value }))}
                placeholder="https://example.com/icon.svg"
                className="rounded-xl" data-testid="input-track-icon"
              />
            </div>

            {/* Instructor selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{isAr ? "معلم المسار / المدرب" : "Track Instructor"}</Label>
              <Select 
                value={trackForm.instructorId} 
                onValueChange={v => setTrackForm(f => ({ ...f, instructorId: v }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={isAr ? "اختر المعلم" : "Select instructor"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{isAr ? "بلا معلم" : "No Instructor"}</SelectItem>
                  {instructors.map((ins: any) => (
                    <SelectItem key={ins.id} value={String(ins.id)}>
                      {ins.name} ({ins.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Certificate Configuration */}
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
              <div className="flex items-center gap-2 border-b border-primary/10 pb-2">
                <Award className="w-4 h-4 text-primary" />
                <Label className="text-xs font-extrabold text-foreground">{isAr ? "إعدادات شهادة إتمام المسار" : "Track Completion Certificate"}</Label>
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">
                {isAr ? "تُمنح الشهادة تلقائياً للطلاب عند إكمال جميع وحدات المسار." : "Certificate is auto-issued when students complete all track modules."}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground">{isAr ? "نوع الشهادة" : "Certificate Type"}</Label>
                  <Select value={trackForm.certType} onValueChange={v => setTrackForm(f => ({ ...f, certType: v }))}>
                    <SelectTrigger className="rounded-xl h-9 text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="track">{isAr ? "شهادة مسار تعليمي" : "Learning Track Certificate"}</SelectItem>
                      <SelectItem value="participation">{isAr ? "شهادة حضور ومشاركة" : "Participation Certificate"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground">{isAr ? "مستوى الشهادة" : "Certificate Level"}</Label>
                  <Select value={trackForm.certLevel} onValueChange={v => setTrackForm(f => ({ ...f, certLevel: v }))}>
                    <SelectTrigger className="rounded-xl h-9 text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{isAr ? "المستوى 1 — حضور ومشاركة" : "Level 1 — Participation"}</SelectItem>
                      <SelectItem value="2">{isAr ? "المستوى 2 — أخصائي محترف" : "Level 2 — Professional"}</SelectItem>
                      <SelectItem value="3">{isAr ? "المستوى 3 — خبير متخصص" : "Level 3 — Expert"}</SelectItem>
                      <SelectItem value="4">{isAr ? "المستوى 4 — خبير متقدم" : "Level 4 — Master"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground">{isAr ? "تكلفة الاحتفاظ (نقاط)" : "Claim Cost (points)"}</Label>
                  <Input
                    type="number" min="0"
                    value={trackForm.certCost}
                    onChange={e => setTrackForm(f => ({ ...f, certCost: e.target.value }))}
                    className="rounded-xl h-9 text-[11px]"
                    placeholder="0 = مجاني"
                  />
                </div>
              </div>
            </div>

            {/* Preview slug */}
            {trackForm.slug && (
              <div className="bg-muted/40 rounded-xl p-3 flex items-center gap-2 text-xs">
                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">{isAr ? "رابط المسار:" : "Track URL:"}</span>
                <code className="font-mono text-primary">/learn/{trackForm.slug}</code>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setTrackDialogOpen(false)} className="rounded-xl" disabled={trackSaving}>
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={saveTrack} disabled={trackSaving} className="rounded-xl gap-1.5 min-w-32" data-testid="button-save-track">
              {trackSaving ? <><RefreshCw className="w-4 h-4 animate-spin" />{isAr ? "جاري الحفظ..." : "Saving..."}</> : <><Save className="w-4 h-4" />{isAr ? "إنشاء المسار" : "Create Track"}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════
          Delete Confirmation Dialog (Admin only)
      ════════════════════════════════════════════════════════ */}
      {isAdmin && (
      <Dialog open={!!deleteTargetId} onOpenChange={() => setDeleteTargetId(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              {isAr ? "حذف المسار التعليمي" : "Delete Track"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            {isAr ? "سيتم حذف المسار وجميع وحداته وبيانات التقدم المرتبطة به نهائياً. هذا الإجراء لا يمكن التراجع عنه." : "This will permanently delete the track and all its modules and progress data. This action cannot be undone."}
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTargetId(null)} className="rounded-xl" disabled={deleting}>
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button variant="destructive" onClick={confirmDeleteTrack}
              disabled={deleting} className="rounded-xl gap-1.5" data-testid="button-confirm-delete">
              {deleting ? <><RefreshCw className="w-4 h-4 animate-spin" />{isAr ? "جاري الحذف..." : "Deleting..."}</> : <><Trash2 className="w-4 h-4" />{isAr ? "تأكيد الحذف" : "Confirm Delete"}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}
    </AppLayout>
  );
}
