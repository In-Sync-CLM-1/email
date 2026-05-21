import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { usePlatformDashboard } from "@/hooks/usePlatformDashboard";
import { PlatformSummaryStats } from "@/components/platform/PlatformSummaryStats";
import { PlatformMessageChart } from "@/components/platform/PlatformMessageChart";
import { PlatformTemplateOverview } from "@/components/platform/PlatformTemplateOverview";
import { PlatformOrgsTable } from "@/components/platform/PlatformOrgsTable";
import { PlatformIssuesAnalysis } from "@/components/platform/PlatformIssuesAnalysis";
import { PlatformActivityFeed } from "@/components/platform/PlatformActivityFeed";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function SectionSkeleton({ height = "h-48" }: { height?: string }) {
  return <Skeleton className={`w-full rounded-lg ${height}`} />;
}

export default function PlatformDashboard() {
  const { data, loading, refresh } = usePlatformDashboard();

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Platform Overview</h1>
          <p className="mt-1 text-muted-foreground">Platform-wide statistics across all organizations</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="space-y-6">
        {/* Row 1: Summary Stats */}
        <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={{ delay: 0 }}>
          {loading ? <SectionSkeleton height="h-32" /> : <PlatformSummaryStats summary={data.summary} />}
        </motion.div>

        {/* Row 2: Message Chart + Template Overview */}
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
          className="grid gap-6 lg:grid-cols-3"
        >
          <div className="lg:col-span-2">
            {loading ? <SectionSkeleton height="h-[380px]" /> : <PlatformMessageChart data={data.messageTimeSeries} />}
          </div>
          <div>
            {loading ? <SectionSkeleton height="h-[380px]" /> : <PlatformTemplateOverview stats={data.templateStats} />}
          </div>
        </motion.div>

        {/* Row 3: Orgs Table */}
        <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
          {loading ? <SectionSkeleton height="h-64" /> : <PlatformOrgsTable organizations={data.organizations} />}
        </motion.div>

        {/* Row 4: Issues + Activity Feed */}
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.3 }}
          className="grid gap-6 lg:grid-cols-2"
        >
          {loading ? (
            <>
              <SectionSkeleton height="h-[400px]" />
              <SectionSkeleton height="h-[400px]" />
            </>
          ) : (
            <>
              <PlatformIssuesAnalysis issues={data.issues} />
              <PlatformActivityFeed feed={data.activityFeed} />
            </>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
