import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import confetti from "canvas-confetti";

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  threshold: number;
  sort_order: number;
}

export interface OrgAchievement {
  achievement_id: string;
  unlocked_at: string;
}

interface Stats {
  totalContacts: number;
  totalCampaigns: number;
  totalMessages: number;
  sentMessages?: number;
  deliveredMessages?: number;
  failedMessages?: number;
}

export function useAchievements(stats?: Stats) {
  const { currentOrg } = useOrg();
  const [definitions, setDefinitions] = useState<AchievementDef[]>([]);
  const [unlocked, setUnlocked] = useState<OrgAchievement[]>([]);
  const [newlyUnlocked, setNewlyUnlocked] = useState<AchievementDef | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!currentOrg) return;

    const [defsRes, unlockedRes] = await Promise.all([
      supabase.from("achievement_definitions").select("*").order("sort_order"),
      supabase.from("org_achievements").select("achievement_id, unlocked_at").eq("org_id", currentOrg.id),
    ]);

    setDefinitions((defsRes.data as AchievementDef[]) ?? []);
    setUnlocked((unlockedRes.data as OrgAchievement[]) ?? []);
    setLoading(false);
  }, [currentOrg]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Check and unlock achievements when stats change
  useEffect(() => {
    if (!stats || !currentOrg || definitions.length === 0) return;

    const unlockedIds = new Set(unlocked.map((u) => u.achievement_id));

    const checkAndUnlock = async (achievementId: string, currentValue: number) => {
      const def = definitions.find((d) => d.id === achievementId);
      if (!def || unlockedIds.has(achievementId)) return;
      if (currentValue < def.threshold) return;

      // Unlock!
      const { error } = await supabase.from("org_achievements").insert({
        org_id: currentOrg.id,
        achievement_id: achievementId,
      });

      if (!error) {
        setUnlocked((prev) => [...prev, { achievement_id: achievementId, unlocked_at: new Date().toISOString() }]);
        setNewlyUnlocked(def);

        // Confetti!
        confetti({ particleCount: 100, spread: 60, origin: { y: 0.7 } });
      }
    };

    // Contact achievements
    checkAndUnlock("first_contact", stats.totalContacts);
    checkAndUnlock("contact_10", stats.totalContacts);
    checkAndUnlock("contact_100", stats.totalContacts);
    checkAndUnlock("contact_1000", stats.totalContacts);

    // Campaign achievements
    checkAndUnlock("first_campaign", stats.totalCampaigns);
    checkAndUnlock("campaign_10", stats.totalCampaigns);

    // Message achievements
    checkAndUnlock("first_message", stats.totalMessages);
    checkAndUnlock("message_100", stats.totalMessages);
    checkAndUnlock("message_1000", stats.totalMessages);
  }, [stats, definitions, unlocked, currentOrg]);

  const dismissCelebration = () => setNewlyUnlocked(null);

  const unlockedCount = unlocked.length;
  const totalCount = definitions.length;
  const progress = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return {
    definitions,
    unlocked,
    newlyUnlocked,
    dismissCelebration,
    unlockedCount,
    totalCount,
    progress,
    loading,
    refresh: fetchData,
  };
}
