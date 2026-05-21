import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy } from "lucide-react";
import type { AchievementDef } from "@/hooks/useAchievements";

interface MilestoneCelebrationProps {
  achievement: AchievementDef | null;
  onDismiss: () => void;
}

export function MilestoneCelebration({ achievement, onDismiss }: MilestoneCelebrationProps) {
  useEffect(() => {
    if (achievement) {
      const timer = setTimeout(onDismiss, 3000);
      return () => clearTimeout(timer);
    }
  }, [achievement, onDismiss]);

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={onDismiss}
        >
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 10 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="flex flex-col items-center gap-4 rounded-2xl border border-primary/20 bg-card p-8 shadow-2xl"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10"
            >
              <Trophy className="h-10 w-10 text-primary" />
            </motion.div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-primary">
                Achievement Unlocked!
              </p>
              <h3 className="mt-1 text-xl font-bold">{achievement.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {achievement.description}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
