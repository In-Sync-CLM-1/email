import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { TemplateStats } from "@/hooks/usePlatformDashboard";

interface Props {
  stats: TemplateStats;
}

const COLORS = {
  approved: "hsl(142,70%,40%)",
  pending: "hsl(38,92%,50%)",
  rejected: "hsl(0,84%,60%)",
};

export function PlatformTemplateOverview({ stats }: Props) {
  const pieData = [
    { name: "Approved", value: stats.approved },
    { name: "Pending", value: stats.pending },
    { name: "Rejected", value: stats.rejected },
  ].filter((d) => d.value > 0);

  const total = stats.approved + stats.pending + stats.rejected;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Template Status</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            No templates yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}

        {stats.orgsPending.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">Pending Templates</p>
            <div className="space-y-1">
              {stats.orgsPending.map((o) => (
                <div key={o.orgName} className="flex items-center justify-between text-sm">
                  <span>{o.orgName}</span>
                  <Badge variant="secondary">{o.count}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats.orgsRejected.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">Rejected Templates</p>
            <div className="space-y-1">
              {stats.orgsRejected.map((o) => (
                <div key={o.orgName} className="flex items-center justify-between text-sm">
                  <span>{o.orgName}</span>
                  <Badge variant="destructive">{o.count}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
