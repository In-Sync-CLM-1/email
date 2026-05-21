import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Megaphone, MessageSquare, CheckCircle, FileCheck } from "lucide-react";
import type { PlatformSummary } from "@/hooks/usePlatformDashboard";

interface Props {
  summary: PlatformSummary;
}

export function PlatformSummaryStats({ summary }: Props) {
  const cards = [
    {
      title: "Organizations",
      value: summary.totalOrgs,
      icon: Building2,
      color: "text-primary",
      sub: `${summary.totalOrgs} onboarded`,
    },
    {
      title: "Active Users",
      value: summary.totalUsers,
      icon: Users,
      color: "text-info",
      sub: `across ${summary.uniqueUserOrgs} orgs`,
    },
    {
      title: "Campaigns",
      value: summary.totalCampaigns,
      icon: Megaphone,
      color: "text-success",
      sub: `${summary.recentCampaigns} last 7 days`,
    },
    {
      title: "Messages Sent",
      value: summary.totalMessagesSent,
      icon: MessageSquare,
      color: "text-warning",
      sub: `${summary.todayMessages} today`,
    },
    {
      title: "Delivery Rate",
      value: `${summary.deliveryRate}%`,
      icon: CheckCircle,
      color: summary.deliveryRate >= 80 ? "text-success" : "text-destructive",
      sub: `${summary.delivered}/${summary.totalDeliverable}`,
    },
    {
      title: "Templates Approved",
      value: summary.templatesApproved,
      icon: FileCheck,
      color: "text-primary",
      sub: `${summary.templatesPending} pending`,
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.title} className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
            <card.icon className={`h-5 w-5 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{card.value}</div>
            <p className="mt-1 text-xs text-muted-foreground">{card.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
