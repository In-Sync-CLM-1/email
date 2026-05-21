import { motion } from "framer-motion";
import {
  UserPlus,
  Users,
  Megaphone,
  Send,
  FileText,
  CheckCircle,
  Rocket,
} from "lucide-react";
import type { AchievementDef } from "@/hooks/useAchievements";

const iconMap: Record<string, React.ElementType> = {
  UserPlus,
  Users,
  Megaphone,
  Send,
  FileText,
  CheckCircle,
  Rocket,
};

interface AchievementBadgeProps {
  definition: AchievementDef;
  isUnlocked: boolean;
  unlockedAt?: string;
}

export function AchievementBadge({ definition, isUnlocked, unlockedAt }: AchievementBadgeProps) {
  const Icon = iconMap[definition.icon] || CheckCircle;

  return (
    <motion.div
      initial={isUnlocked ? { scale: 0.8 } : {}}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 200 }}
      className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all ${
        isUnlocked
          ? "border-primary/30 bg-primary/5 shadow-sm"
          : "border-border bg-muted/30 opacity-50"
      }`}
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-full ${
          isUnlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        }`}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm font-semibold">{definition.name}</p>
        <p className="text-xs text-muted-foreground">{definition.description}</p>
      </div>
      {isUnlocked && unlockedAt && (
        <p className="text-[10px] text-primary">
          Unlocked {new Date(unlockedAt).toLocaleDateString()}
        </p>
      )}
    </motion.div>
  );
}
