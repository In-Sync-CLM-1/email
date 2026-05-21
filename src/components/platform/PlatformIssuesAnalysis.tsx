import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Sparkles, CheckCircle2 } from "lucide-react";
import type { IssuesAnalysis } from "@/hooks/usePlatformDashboard";

interface Props {
  issues: IssuesAnalysis;
}

export function PlatformIssuesAnalysis({ issues }: Props) {
  const hasIssues = issues.patterns.length > 0;

  const chartData = issues.patterns.slice(0, 6).map((p) => ({
    name: p.category.length > 18 ? p.category.slice(0, 16) + "..." : p.category,
    count: p.count,
    fullName: p.category,
  }));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Issues & Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="patterns">
          <TabsList className="mb-4">
            <TabsTrigger value="patterns">Error Patterns</TabsTrigger>
            <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="patterns">
            {!hasIssues ? (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-success" />
                <p>No failed messages — everything is running smoothly!</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 0 }}>
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: number, _name: string, props: any) => [value, props.payload.fullName]}
                    />
                    <Bar dataKey="count" fill="hsl(0,84%,60%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                <div className="mt-4 space-y-2">
                  {issues.patterns.map((p) => (
                    <div key={p.category} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{p.category}</span>
                        <Badge variant="destructive">{p.count}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{p.sample}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="analysis">
            {!hasIssues ? (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-success" />
                <p>No failed messages — everything is running smoothly!</p>
              </div>
            ) : (
              <div className="rounded-lg bg-gradient-to-br from-primary/5 to-blue-500/5 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="text-sm font-semibold">AI Analysis</span>
                </div>

                <p className="mb-4 text-sm text-foreground/80">{issues.summary}</p>

                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">Recommendations</p>
                  <ol className="list-decimal space-y-1 pl-4">
                    {issues.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-foreground/80">{rec}</li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
