import { useGetLeaderboard, getGetLeaderboardQueryKey } from "@workspace/api-client-react";
import { Trophy, Flame, Award, Users, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/components/layout/AuthContext";
import { useLanguage } from "@/components/layout/LanguageContext";
import { motion } from "framer-motion";

const medalGlows = [
  "border-amber-500/50 bg-amber-500/10 text-amber-500 ring-amber-500/10",
  "border-slate-400/50 bg-slate-400/10 text-slate-400 ring-slate-400/10",
  "border-amber-700/50 bg-amber-700/10 text-amber-700 ring-amber-700/10",
];

function getInitials(name?: string | null): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  return parts.map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function getFirstName(name?: string | null): string {
  if (!name) return "User";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts[0] || "User";
}

export default function LeaderboardPage() {
  const { data: entries, isLoading } = useGetLeaderboard(undefined, { query: { queryKey: getGetLeaderboardQueryKey() } });
  const { user } = useAuth();
  const { language } = useLanguage();
  const isAr = language === "ar";

  return (
    <AppLayout>
      <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-start">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold px-3 py-0.5 rounded-full text-[10px]">
              {isAr ? "لوحة الصدارة والتنافس" : "Gamification & Leaderboard"}
            </Badge>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight" data-testid="heading-leaderboard">
            {isAr ? "لائحة المتميزين | Leaderboard" : "Leaderboard"}
          </h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            {isAr
              ? "أبرز الطلاب وأكثرهم نشاطاً ونقاطاً على مستوى منصة مهارات."
              : "Highlighting the most active and top-scoring students on Skills Platform."}
          </p>
        </div>
      </div>

      {/* Top 3 podium */}
      {!isLoading && Array.isArray(entries) && entries.length >= 3 && (
        <div className="flex items-end justify-center gap-3 sm:gap-6 mb-12 mt-6 max-w-lg mx-auto bg-card/40 border border-border/50 p-6 rounded-3xl backdrop-blur-sm shadow-md relative">
          <div className="absolute top-3 left-3 w-16 h-16 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
          
          {/* Rank 2 (Left) */}
          {entries[1] && (
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="flex flex-col items-center gap-2 flex-1" 
              data-testid={`podium-rank-${entries[1].rank}`}
            >
              <div className="relative group">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-sm font-extrabold border-2 ring-4 ${medalGlows[1]}`}>
                  {getInitials(entries[1].name)}
                </div>
                <div className="absolute -top-3.5 -right-1 bg-slate-400 text-[10px] w-5 h-5 rounded-lg flex items-center justify-center text-white font-bold border-2 border-background">
                  2
                </div>
              </div>
              <p className="text-xs font-bold text-center truncate max-w-20 mt-1 text-foreground">{getFirstName(entries[1].name)}</p>
              <div className="h-20 w-16 sm:w-20 rounded-t-xl flex flex-col items-center justify-end pb-3 bg-gradient-to-t from-slate-400/20 to-slate-400/5 border border-slate-400/20 shadow-inner">
                <Trophy className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-[10px] text-muted-foreground font-bold">{entries[1].points.toLocaleString()} {isAr ? "نقطة" : "pts"}</p>
            </motion.div>
          )}

          {/* Rank 1 (Center) */}
          {entries[0] && (
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center gap-2 flex-1 z-10" 
              data-testid={`podium-rank-${entries[0].rank}`}
            >
              <div className="relative group">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-base font-extrabold border-2 ring-4 ${medalGlows[0]} shadow-lg shadow-amber-500/10`}>
                  {getInitials(entries[0].name)}
                </div>
                <div className="absolute -top-4 -right-1.5 bg-amber-500 text-xs w-6 h-6 rounded-lg flex items-center justify-center text-white font-bold border-2 border-background shadow-md">
                  👑
                </div>
              </div>
              <p className="text-sm font-bold text-center truncate max-w-24 mt-1 text-foreground">{getFirstName(entries[0].name)}</p>
              <div className="h-26 w-20 sm:w-24 rounded-t-xl flex flex-col items-center justify-end pb-4 bg-gradient-to-t from-amber-500/20 to-amber-500/5 border border-amber-500/20 shadow-inner relative">
                <div className="absolute inset-0 bg-primary/2 rounded-t-xl" />
                <Trophy className="w-6 h-6 text-amber-500 animate-pulse relative z-10" />
              </div>
              <p className="text-xs font-black text-amber-500 text-glow-primary">{entries[0].points.toLocaleString()} {isAr ? "نقطة" : "pts"}</p>
            </motion.div>
          )}

          {/* Rank 3 (Right) */}
          {entries[2] && (
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col items-center gap-2 flex-1" 
              data-testid={`podium-rank-${entries[2].rank}`}
            >
              <div className="relative group">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-sm font-extrabold border-2 ring-4 ${medalGlows[2]}`}>
                  {getInitials(entries[2].name)}
                </div>
                <div className="absolute -top-3.5 -right-1 bg-amber-700 text-[10px] w-5 h-5 rounded-lg flex items-center justify-center text-white font-bold border-2 border-background">
                  3
                </div>
              </div>
              <p className="text-xs font-bold text-center truncate max-w-20 mt-1 text-foreground">{getFirstName(entries[2].name)}</p>
              <div className="h-16 w-16 sm:w-20 rounded-t-xl flex flex-col items-center justify-end pb-2.5 bg-gradient-to-t from-amber-700/20 to-amber-700/5 border border-amber-700/20 shadow-inner">
                <Trophy className="w-4 h-4 text-amber-700" />
              </div>
              <p className="text-[10px] text-muted-foreground font-bold">{entries[2].points.toLocaleString()} {isAr ? "نقطة" : "pts"}</p>
            </motion.div>
          )}
        </div>
      )}

      {/* Full table */}
      <div className="rounded-2xl border border-border/50 bg-card/65 backdrop-blur-sm overflow-hidden shadow-md text-start">
        <div className="overflow-x-auto">
          <table className={`w-full ${isAr ? "text-right" : "text-left"}`}>
            <thead>
              <tr className="bg-muted/40 border-b border-border/50 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <th className="px-5 py-3.5 w-16">{isAr ? "الترتيب" : "#"}</th>
                <th className="px-5 py-3.5">{isAr ? "الطالب" : "Student"}</th>
                <th className={`px-5 py-3.5 ${isAr ? "text-left" : "text-right"}`}>{isAr ? "النقاط" : "Points"}</th>
                <th className={`px-5 py-3.5 hidden sm:table-cell ${isAr ? "text-left" : "text-right"}`}>{isAr ? "نشاط متواصل" : "Streak"}</th>
                <th className={`px-5 py-3.5 hidden md:table-cell ${isAr ? "text-left" : "text-right"}`}>{isAr ? "الشهادات" : "Certificates"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/40">
                    <td colSpan={5} className="px-5 py-4"><Skeleton className="h-6 w-full bg-muted/70" /></td>
                  </tr>
                ))
              ) : !Array.isArray(entries) || entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-20 text-muted-foreground">
                    <Trophy className="w-14 h-14 mx-auto mb-3 opacity-25 text-primary" />
                    <h4 className="font-bold">{isAr ? "لا توجد بيانات صدارة حالياً" : "No ranking data yet"}</h4>
                    <p className="text-[11px] text-muted-foreground/80 mt-0.5">{isAr ? "ابدأ بالتعلم لكسب النقاط والدخول للوحة الصدارة!" : "Start learning to earn points and climb the board!"}</p>
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const isMe = user?.id === entry.userId;
                  return (
                    <tr 
                      key={entry.userId} 
                      data-testid={`leaderboard-row-${entry.rank}`}
                      className={`hover:bg-muted/20 transition-colors duration-150 ${isMe ? "bg-primary/5 font-extrabold text-primary" : "text-muted-foreground"}`}
                    >
                      <td className="px-5 py-4 font-mono text-xs font-bold text-foreground">
                        {entry.rank === 1 && "🥇"}
                        {entry.rank === 2 && "🥈"}
                        {entry.rank === 3 && "🥉"}
                        {entry.rank > 3 && `#${entry.rank}`}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[10.5px] border ${
                            isMe ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border/60"
                          }`}>
                            {getInitials(entry.name)}
                          </div>
                          <div>
                            <span className="font-bold text-foreground">{entry.name || (isAr ? "مستخدم" : "User")}</span>
                            {isMe && <span className={`text-[9.5px] font-black ${isAr ? "mr-1.5" : "ml-1.5"} px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20`}>{isAr ? "أنت" : "YOU"}</span>}
                          </div>
                        </div>
                      </td>
                      <td className={`px-5 py-4 font-bold text-foreground ${isAr ? "text-left" : "text-right"}`}>
                        {entry.points.toLocaleString()} {isAr ? "نقطة" : "pts"}
                      </td>
                      <td className={`px-5 py-4 hidden sm:table-cell ${isAr ? "text-left" : "text-right"}`}>
                        {entry.streak > 0 ? (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-500">
                            <Flame className="w-3.5 h-3.5 fill-current" />
                            {entry.streak} {isAr ? "أيام" : "days"}
                          </span>
                        ) : "-"}
                      </td>
                      <td className={`px-5 py-4 hidden md:table-cell ${isAr ? "text-left" : "text-right"}`}>
                        {entry.certificateCount > 0 ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                            <Award className="w-3.5 h-3.5" />
                            {entry.certificateCount} {isAr ? "شهادات" : "certs"}
                          </span>
                        ) : "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
