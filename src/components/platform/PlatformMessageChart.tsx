import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { MessageTimePoint } from "@/hooks/usePlatformDashboard";

interface Props {
  data: MessageTimePoint[];
}

export function PlatformMessageChart({ data }: Props) {
  const hasData = data.some((d) => d.delivered + d.failed + d.pending > 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Message Delivery (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No message data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="delivered"
                stackId="1"
                stroke="hsl(142,70%,40%)"
                fill="hsl(142,70%,40%)"
                fillOpacity={0.6}
                name="Delivered"
              />
              <Area
                type="monotone"
                dataKey="failed"
                stackId="1"
                stroke="hsl(0,84%,60%)"
                fill="hsl(0,84%,60%)"
                fillOpacity={0.6}
                name="Failed"
              />
              <Area
                type="monotone"
                dataKey="pending"
                stackId="1"
                stroke="hsl(38,92%,50%)"
                fill="hsl(38,92%,50%)"
                fillOpacity={0.6}
                name="Pending"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
