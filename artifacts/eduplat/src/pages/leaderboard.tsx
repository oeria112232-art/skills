import { useGetLeaderboard } from "@workspace/api-client-react";
import { Trophy, Award, Flame, GraduationCap, Medal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/components/layout/AuthContext";

const medalColors = ["text-yellow-500", "text-gray-400", "text-orange-600"];
const medalIcons = [Trophy, Medal, Award];

export default function LeaderboardPage() {
  const { data: entries, isLoading } = useGetLeaderboard({ limit: 20 });
  const { user } = useAuth();

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" data-testid="heading-leaderboard">Leaderboard</h1>
        <p className="text-muted-foreground">Top performers across the platform</p>
      </div>

      {/* Top 3 podium */}
      {!isLoading && entries && entries.length >= 3 && (
        <div className="flex items-end justify-center gap-4 mb-10">
          {[entries[1], entries[0], entries[2]].map((entry, podiumIdx) => {
            const heights = ["h-24", "h-32", "h-20"];
            const realRank = podiumIdx === 0 ? 1 : podiumIdx === 1 ? 0 : 2;
            return (
              <div key={entry.userId} className="flex flex-col items-center gap-2" data-testid={`podium-rank-${entry.rank}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${realRank === 1 ? "bg-yellow-500/20 text-yellow-600 ring-4 ring-yellow-500/40" : realRank === 0 ? "bg-gray-400/20 text-gray-500" : "bg-orange-600/20 text-orange-600"}`}>
                  {entry.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </div>
                <p className="text-xs font-semibold text-center max-w-16 line-clamp-1">{entry.name.split(" ")[0]}</p>
                <div className={`${heights[podiumIdx]} w-20 rounded-t-lg flex flex-col items-center justify-end pb-2 ${realRank === 1 ? "bg-yellow-500/20 border border-yellow-500/30" : realRank === 0 ? "bg-gray-400/20 border border-gray-400/30" : "bg-orange-600/20 border border-orange-600/30"}`}>
                  <span className={`text-2xl font-bold ${medalColors[realRank]}`}>{entry.rank}</span>
                </div>
                <p className="text-xs text-muted-foreground">{entry.points.toLocaleString()} pts</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Full table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50 text-left">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-12">#</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">User</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">Points</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right hidden sm:table-cell">Streak</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right hidden md:table-cell">Certs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="px-4 py-3"><Skeleton className="h-8 w-full" /></td>
                </tr>
              ))
            ) : !entries || entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-16 text-muted-foreground">
                  <Trophy className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No rankings yet</p>
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const isMe = user?.id === entry.userId;
                const MedalIcon = entry.rank <= 3 ? medalIcons[entry.rank - 1] : null;
                return (
                  <tr
                    key={entry.userId}
                    className={`transition-colors ${isMe ? "bg-primary/5" : "hover:bg-muted/30"}`}
                    data-testid={`leaderboard-row-${entry.rank}`}
                  >
                    <td className="px-4 py-3 font-bold text-sm">
                      {MedalIcon ? <MedalIcon className={`w-5 h-5 ${medalColors[entry.rank - 1]}`} /> : <span className="text-muted-foreground">{entry.rank}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isMe ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          {entry.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className={`font-medium text-sm ${isMe ? "text-primary" : ""}`}>{entry.name}</p>
                          {isMe && <p className="text-xs text-muted-foreground">You</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-primary" data-testid={`leaderboard-points-${entry.rank}`}>{entry.points.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-sm text-muted-foreground hidden sm:table-cell">
                      {entry.streak > 0 && <span className="flex items-center justify-end gap-1"><Flame className="w-3 h-3 text-orange-500" />{entry.streak}d</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-muted-foreground hidden md:table-cell">
                      <span className="flex items-center justify-end gap-1"><Award className="w-3 h-3 text-yellow-500" />{entry.certificateCount}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
