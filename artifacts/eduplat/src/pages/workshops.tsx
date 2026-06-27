import { Link } from "wouter";
import { useListWorkshops } from "@workspace/api-client-react";
import { BookOpen, Calendar, Clock, Users, ChevronRight, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/AppLayout";
import { useState } from "react";

const statusColors: Record<string, string> = {
  upcoming: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  ongoing: "bg-green-500/10 text-green-600 dark:text-green-400",
  completed: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

export default function WorkshopsPage() {
  const [filter, setFilter] = useState("all");
  const { data: workshops, isLoading } = useListWorkshops(filter !== "all" ? { status: filter } : undefined);

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" data-testid="heading-workshops">Workshops</h1>
        <p className="text-muted-foreground">Enroll in live sessions and earn verified certificates</p>
      </div>

      <div className="flex gap-2 mb-6">
        {["all", "upcoming", "ongoing", "completed"].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            data-testid={`filter-${s}`}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${filter === s ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
          >
            {s === "all" ? "All" : s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {!workshops || workshops.length === 0 ? (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No workshops found</p>
            </div>
          ) : (
            workshops.map(w => (
              <div key={w.id} className="rounded-xl border border-border bg-card hover:shadow-md transition-shadow overflow-hidden" data-testid={`workshop-card-${w.id}`}>
                {w.imageUrl ? (
                  <img src={w.imageUrl} alt={w.title} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-primary/40" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={statusColors[w.status] || ""}>{w.status}</Badge>
                    {w.status === "completed" && <CheckCircle className="w-4 h-4 text-green-500" />}
                  </div>
                  <h3 className="font-semibold mb-1 line-clamp-2" data-testid={`workshop-title-${w.id}`}>{w.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{w.description}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(w.date).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{w.duration}min</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{w.enrolledCount}/{w.capacity}</span>
                  </div>
                  {w.tags && w.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {w.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  )}
                  <Link href={`/workshops/${w.id}`}>
                    <Button size="sm" className="w-full gap-1" variant={w.status === "upcoming" ? "default" : "outline"} data-testid={`button-workshop-view-${w.id}`}>
                      {w.status === "upcoming" ? "Enroll Now" : w.status === "completed" ? "View & Exam" : "View Details"}
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </AppLayout>
  );
}
