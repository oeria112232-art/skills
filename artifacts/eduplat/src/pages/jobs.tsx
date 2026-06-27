import { useState } from "react";
import { Link } from "wouter";
import { useListJobs } from "@workspace/api-client-react";
import { Briefcase, MapPin, Clock, DollarSign, Search, Filter, ChevronRight, Wifi } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/AppLayout";

const typeColors: Record<string, string> = {
  "full-time": "bg-green-500/10 text-green-600 dark:text-green-400",
  "part-time": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "contract": "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  "internship": "bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

export default function JobsPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [level, setLevel] = useState("all");
  const [remote, setRemote] = useState("all");

  const params = {
    ...(type !== "all" && { type }),
    ...(level !== "all" && { level }),
    ...(remote === "remote" && { remote: "true" }),
    ...(search && { search }),
  };

  const { data: jobs, isLoading } = useListJobs(Object.keys(params).length > 0 ? params : undefined);

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" data-testid="heading-jobs">Job Board</h1>
        <p className="text-muted-foreground">Browse opportunities and take the screening test to apply</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs or companies..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-jobs"
          />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full sm:w-36" data-testid="select-job-type">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="full-time">Full-time</SelectItem>
            <SelectItem value="part-time">Part-time</SelectItem>
            <SelectItem value="contract">Contract</SelectItem>
            <SelectItem value="internship">Internship</SelectItem>
          </SelectContent>
        </Select>
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="w-full sm:w-36" data-testid="select-job-level">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="junior">Junior</SelectItem>
            <SelectItem value="mid">Mid</SelectItem>
            <SelectItem value="senior">Senior</SelectItem>
          </SelectContent>
        </Select>
        <Select value={remote} onValueChange={setRemote}>
          <SelectTrigger className="w-full sm:w-36" data-testid="select-remote">
            <SelectValue placeholder="Remote" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="remote">Remote Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Jobs list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {!jobs || jobs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No jobs found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            jobs.map(job => (
              <div
                key={job.id}
                className="p-5 rounded-xl border border-border bg-card hover:shadow-md hover:border-primary/30 transition-all"
                data-testid={`job-card-${job.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h2 className="font-semibold text-lg" data-testid={`job-title-${job.id}`}>{job.title}</h2>
                      <Badge className={typeColors[job.type] || ""}>{job.type}</Badge>
                      {job.isRemote && (
                        <Badge variant="outline" className="gap-1">
                          <Wifi className="w-3 h-3" /> Remote
                        </Badge>
                      )}
                    </div>
                    <p className="text-primary font-medium text-sm mb-2" data-testid={`job-company-${job.id}`}>{job.company}</p>
                    <p className="text-muted-foreground text-sm line-clamp-2 mb-3">{job.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {job.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {job.level} level
                      </span>
                      {job.salaryMin && job.salaryMax && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" /> ${job.salaryMin.toLocaleString()} – ${job.salaryMax.toLocaleString()}
                        </span>
                      )}
                      <span className="text-muted-foreground">{job.applicationCount} applicants</span>
                    </div>
                  </div>
                  <Link href={`/jobs/${job.id}`}>
                    <Button size="sm" className="flex-shrink-0 gap-1" data-testid={`button-view-job-${job.id}`}>
                      Apply <ChevronRight className="w-3 h-3" />
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
