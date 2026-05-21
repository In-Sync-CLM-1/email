import { useState } from "react";
import { AchievementBadge } from "./AchievementBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AchievementDef, OrgAchievement } from "@/hooks/useAchievements";

interface AchievementGridProps {
  definitions: AchievementDef[];
  unlocked: OrgAchievement[];
}

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "contacts", label: "Contacts" },
  { value: "campaigns", label: "Campaigns" },
  { value: "messages", label: "Messages" },
  { value: "templates", label: "Templates" },
  { value: "team", label: "Team" },
  { value: "onboarding", label: "Onboarding" },
];

export function AchievementGrid({ definitions, unlocked }: AchievementGridProps) {
  const [category, setCategory] = useState("all");
  const unlockedMap = new Map(unlocked.map((u) => [u.achievement_id, u.unlocked_at]));

  const filtered = category === "all"
    ? definitions
    : definitions.filter((d) => d.category === category);

  return (
    <div className="space-y-4">
      <Tabs value={category} onValueChange={setCategory}>
        <TabsList className="flex-wrap">
          {CATEGORIES.map((c) => (
            <TabsTrigger key={c.value} value={c.value} className="text-xs">
              {c.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((def) => (
          <AchievementBadge
            key={def.id}
            definition={def}
            isUnlocked={unlockedMap.has(def.id)}
            unlockedAt={unlockedMap.get(def.id)}
          />
        ))}
      </div>
    </div>
  );
}
