import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAchievements } from "@/hooks/useAchievements";
import { ProgressRing } from "./ProgressRing";
import { AchievementBadge } from "./AchievementBadge";
import { MilestoneCelebration } from "./MilestoneCelebration";
import { Trophy } from "lucide-react";

interface Stats {
  totalContacts: number;
  totalCampaigns: number;
  totalMessages: number;
  sentMessages?: number;
  deliveredMessages?: number;
  failedMessages?: number;
}

interface GamificationDashboardWidgetsProps {
  stats: Stats;
}

export function GamificationDashboardWidgets({ stats }: GamificationDashboardWidgetsProps) {
  const {
    definitions,
    unlocked,
    newlyUnlocked,
    dismissCelebration,
    unlockedCount,
    totalCount,
    progress,
    loading,
  } = useAchievements(stats);

  if (loading) return null;

  const unlockedMap = new Map(unlocked.map((u) => [u.achievement_id, u.unlocked_at]));

  // Recent unlocks (last 5)
  const recentUnlocks = [...unlocked]
    .sort((a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime())
    .slice(0, 5);

  // Next to unlock
  const nextAchievements = definitions
    .filter((d) => !unlockedMap.has(d.id))
    .slice(0, 3);

  return (
    <>
      <MilestoneCelebration achievement={newlyUnlocked} onDismiss={dismissCelebration} />

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {/* Achievement summary */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Trophy className="h-5 w-5 text-primary" />
            <CardTitle className="text-sm font-medium">Achievements</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <ProgressRing value={unlockedCount} max={totalCount} label="Unlocked" />
            <div>
              <p className="text-2xl font-bold">{progress}%</p>
              <p className="text-xs text-muted-foreground">
                {unlockedCount} of {totalCount} achievements
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Progress to next milestones */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Next Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            {nextAchievements.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">All achievements unlocked!</p>
            ) : (
              <div className="space-y-2">
                {nextAchievements.map((def) => {
                  let current = 0;
                  if (def.category === "contacts") current = stats.totalContacts;
                  else if (def.category === "campaigns") current = stats.totalCampaigns;
                  else if (def.category === "messages") current = stats.totalMessages;

                  const pct = Math.min(Math.round((current / def.threshold) * 100), 99);
                  return (
                    <div key={def.id} className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-xs font-medium">{def.name}</p>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {current}/{def.threshold}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent unlocks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recent Unlocks</CardTitle>
          </CardHeader>
          <CardContent>
            {recentUnlocks.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">No achievements yet. Keep going!</p>
            ) : (
              <div className="space-y-2">
                {recentUnlocks.map((u) => {
                  const def = definitions.find((d) => d.id === u.achievement_id);
                  if (!def) return null;
                  return (
                    <div key={u.achievement_id} className="flex items-center gap-2 rounded-lg border border-primary/10 bg-primary/5 px-3 py-2">
                      <Trophy className="h-4 w-4 text-primary" />
                      <div className="flex-1">
                        <p className="text-xs font-semibold">{def.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(u.unlocked_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
