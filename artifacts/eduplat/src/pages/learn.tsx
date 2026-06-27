import { Link } from "wouter";
import { useListTracks } from "@workspace/api-client-react";
import { GraduationCap, Clock, Users, ChevronRight, Shield, Globe, Code, Cpu, MessageSquare, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/AppLayout";

const trackIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  tot: MessageSquare,
  networking: Globe,
  cybersecurity: Shield,
  fullstack: Code,
  "computer-basics": Cpu,
  mobile: Smartphone,
};

const trackColors: Record<string, string> = {
  tot: "from-violet-500/20 to-violet-600/10 border-violet-500/30",
  networking: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
  cybersecurity: "from-red-500/20 to-red-600/10 border-red-500/30",
  fullstack: "from-green-500/20 to-green-600/10 border-green-500/30",
  "computer-basics": "from-orange-500/20 to-orange-600/10 border-orange-500/30",
  mobile: "from-pink-500/20 to-pink-600/10 border-pink-500/30",
};

const levelColors: Record<string, string> = {
  beginner: "bg-green-500/10 text-green-600 dark:text-green-400",
  intermediate: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  advanced: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export default function LearnPage() {
  const { data: tracks, isLoading } = useListTracks();

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" data-testid="heading-learn">Learning Paths</h1>
        <p className="text-muted-foreground">Structured roadmaps designed to take you from beginner to job-ready</p>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      ) : !tracks || tracks.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <GraduationCap className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p>No learning tracks available yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tracks.map(track => {
            const Icon = trackIcons[track.slug] || GraduationCap;
            const colorClass = trackColors[track.slug] || "from-gray-500/20 to-gray-600/10 border-gray-500/30";
            return (
              <Link
                key={track.id}
                href={`/learn/${track.slug}`}
                className={`block p-6 rounded-xl border bg-gradient-to-br ${colorClass} hover:shadow-lg transition-all`}
                data-testid={`track-card-${track.slug}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 dark:bg-black/20 flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </div>
                  <Badge className={levelColors[track.level] || ""}>{track.level}</Badge>
                </div>
                <h3 className="font-bold text-lg mb-1" data-testid={`track-title-${track.slug}`}>{track.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{track.description}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{track.estimatedHours}h</span>
                    <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" />{track.moduleCount} modules</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{track.enrolledCount}</span>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
