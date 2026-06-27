import { useRoute, Link } from "wouter";
import { useGetTrack, useGetTrackProgress, useUpdateTrackProgress, getGetTrackProgressQueryKey } from "@workspace/api-client-react";
import { ArrowLeft, CheckCircle, Circle, Clock, BookOpen, Code, PlayCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/components/layout/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

const moduleTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  lesson: BookOpen,
  exercise: Code,
  video: PlayCircle,
  quiz: FileText,
};

export default function TrackDetailPage() {
  const [, params] = useRoute("/learn/:slug");
  const slug = params?.slug || "";
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: track, isLoading: trackLoading } = useGetTrack(slug, { query: { enabled: !!slug } });
  const { data: progress, isLoading: progressLoading } = useGetTrackProgress(slug, {
    query: { enabled: !!slug && !!user, queryKey: getGetTrackProgressQueryKey(slug) },
  });
  const updateProgress = useUpdateTrackProgress();

  if (trackLoading) return <AppLayout><Skeleton className="h-96 w-full rounded-xl" /></AppLayout>;
  if (!track) return <AppLayout><p className="text-center text-muted-foreground mt-16">Track not found</p></AppLayout>;

  const completedSet = new Set(progress?.completedModules ?? []);

  const toggleModule = async (moduleId: number) => {
    if (!user) return;
    const wasCompleted = completedSet.has(moduleId);
    await updateProgress.mutateAsync({
      slug,
      data: { userId: user.id, moduleId, completed: !wasCompleted },
    });
    queryClient.invalidateQueries({ queryKey: getGetTrackProgressQueryKey(slug) });
  };

  const percent = progress?.percentComplete ?? 0;

  return (
    <AppLayout>
      <Link href="/learn" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors" data-testid="link-back-learn">
        <ArrowLeft className="w-4 h-4" /> Back to Learning Paths
      </Link>

      <div className="max-w-3xl">
        {/* Header */}
        <div className="p-6 rounded-xl border border-border bg-card mb-6">
          <h1 className="text-2xl font-bold mb-2" data-testid="heading-track-title">{track.title}</h1>
          <p className="text-muted-foreground mb-4">{track.description}</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 flex-wrap">
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{track.estimatedHours}h estimated</span>
            <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" />{track.moduleCount} modules</span>
          </div>
          {user && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Your Progress</span>
                <span className="text-sm font-bold text-primary" data-testid="text-progress-percent">{percent}%</span>
              </div>
              <Progress value={percent} className="h-3" data-testid="progress-bar-track" />
              {!progressLoading && (
                <p className="text-xs text-muted-foreground mt-1">
                  {progress?.completedModules.length ?? 0} of {progress?.totalModules ?? 0} modules completed · {progress?.points ?? 0} pts earned
                </p>
              )}
            </div>
          )}
        </div>

        {/* Roadmap modules */}
        <div className="space-y-3">
          {track.modules?.map((mod, idx) => {
            const isCompleted = completedSet.has(mod.id);
            const Icon = moduleTypeIcons[mod.type] || BookOpen;
            return (
              <div
                key={mod.id}
                className={`p-4 rounded-xl border transition-all ${isCompleted ? "border-primary/40 bg-primary/5" : "border-border bg-card hover:border-primary/30"}`}
                data-testid={`module-card-${mod.id}`}
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => toggleModule(mod.id)}
                    className="flex-shrink-0 mt-0.5 transition-transform hover:scale-110"
                    data-testid={`button-toggle-module-${mod.id}`}
                  >
                    {isCompleted
                      ? <CheckCircle className="w-6 h-6 text-primary" />
                      : <Circle className="w-6 h-6 text-muted-foreground" />
                    }
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground capitalize">{mod.type}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{mod.estimatedMinutes}min</span>
                    </div>
                    <h3 className={`font-medium ${isCompleted ? "line-through text-muted-foreground" : ""}`} data-testid={`module-title-${mod.id}`}>
                      {idx + 1}. {mod.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">{mod.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
