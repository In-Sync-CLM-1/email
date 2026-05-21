import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2, Megaphone, Trophy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ActivityItem } from "@/hooks/usePlatformDashboard";

interface Props {
  feed: ActivityItem[];
}

const iconMap = {
  org_created: { icon: Building2, color: "text-primary bg-primary/10" },
  campaign_created: { icon: Megaphone, color: "text-success bg-success/10" },
  achievement_unlocked: { icon: Trophy, color: "text-warning bg-warning/10" },
};

export function PlatformActivityFeed({ feed }: Props) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {feed.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No activity yet</p>
        ) : (
          <ScrollArea className="h-[350px] pr-4">
            <div className="space-y-3">
              {feed.map((item) => {
                const config = iconMap[item.type];
                const Icon = config.icon;
                return (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{item.detail}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
