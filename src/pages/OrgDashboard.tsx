import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Send,
  Eye,
  Users,
  CheckCheck,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Megaphone,
  Plus,
  ChevronRight,
  Clock,
  User,
  RefreshCw,
  Target,
  XCircle,
  BarChart3,
  Lock,
  FileText,
  UserPlus,
  Mail,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useOrgDashboard } from "@/hooks/useOrgDashboard";
import type { OrgKpis, RecentCampaign, MessageFunnel, DpdpStatus } from "@/hooks/useOrgDashboard";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import { AiInsights } from "@/components/AiInsights";
import { useNavigate } from "react-router-dom";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// --- KPI Card ---
function KpiCard({
  label,
  value,
  suffix,
  prev,
  colorClass,
  borderClass,
  shadowClass,
  icon: Icon,
  bgIcon: BgIcon,
  onClick,
  subtitle,
}: {
  label: string;
  value: number;
  suffix?: string;
  prev?: number;
  colorClass: string;
  borderClass: string;
  shadowClass: string;
  icon: typeof Send;
  bgIcon: typeof Send;
  onClick?: () => void;
  subtitle?: string;
}) {
  const delta = prev != null && prev > 0 ? Math.round(((value - prev) / prev) * 100) : value > 0 && prev != null ? 100 : null;
  const isUp = delta != null && delta >= 0;

  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${colorClass} border ${borderClass} p-5 text-left transition-all hover:shadow-lg ${shadowClass} hover:-translate-y-1`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {delta != null && (
          <span
            className={`flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded ${
              isUp
                ? "text-blue-600 bg-blue-500/10"
                : "text-red-500 bg-red-500/10"
            }`}
          >
            {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {isUp ? "+" : ""}
            {delta}%
          </span>
        )}
      </div>
      <p className="text-4xl font-extrabold text-foreground">
        {value.toLocaleString()}
        {suffix && <span className="text-2xl">{suffix}</span>}
      </p>
      {subtitle && (
        <p className="text-[11px] text-muted-foreground mt-1">{subtitle}</p>
      )}
      <div className="absolute bottom-0 right-0 opacity-[0.07] group-hover:opacity-[0.12] transition-opacity">
        <BgIcon className="h-20 w-20 -mb-3 -mr-3" />
      </div>
    </button>
  );
}

// --- Messaging Funnel ---
function MessagingFunnel({ funnel }: { funnel: MessageFunnel }) {
  const stages = [
    { label: "Sent", count: funnel.sent, color: "primary", sub: "Total outbound" },
    { label: "Delivered", count: funnel.delivered, color: "blue-500", sub: `${funnel.sent > 0 ? Math.round((funnel.delivered / funnel.sent) * 100) : 0}% of sent` },
    { label: "Opened", count: funnel.opened, color: "violet-500", sub: `${funnel.delivered > 0 ? Math.round((funnel.opened / funnel.delivered) * 100) : 0}% of delivered` },
    { label: "Failed", count: funnel.failed, color: "destructive", sub: `${funnel.sent > 0 ? Math.round((funnel.failed / funnel.sent) * 100) : 0}% failure rate` },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-foreground">Email Pipeline</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">All-time email delivery funnel</p>
        </div>
        <Badge variant="outline" className="text-[10px]">All Time</Badge>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stages.map((stage) => (
          <div
            key={stage.label}
            className="group text-center p-4 rounded-xl bg-muted/50 border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all hover:-translate-y-0.5"
          >
            <p className={`text-3xl md:text-4xl font-extrabold ${
              stage.color === "primary" ? "text-primary" :
              stage.color === "destructive" ? "text-destructive" :
              `text-${stage.color}`
            }`}>
              {stage.count.toLocaleString()}
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mt-2">
              {stage.label}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">{stage.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Campaign Performance Chart ---
function CampaignPerformanceChart({ data }: { data: { day: string; sent: number; delivered: number; opened: number }[] }) {
  const hasData = data.some((d) => d.sent > 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-foreground">Campaign Performance</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Last 7 days email activity</p>
        </div>
        <Badge variant="outline" className="text-[10px]">7 Days</Badge>
      </div>
      {!hasData ? (
        <div className="flex h-[260px] items-center justify-center text-muted-foreground">
          <div className="text-center">
            <BarChart3 className="mx-auto mb-2 h-8 w-8 opacity-30" />
            <p className="text-sm">No email data in the last 7 days</p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid hsl(220,13%,91%)",
                fontSize: 12,
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
            />
            <Bar dataKey="sent" name="Sent" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            <Bar dataKey="delivered" name="Delivered" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="opened" name="Opened" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// --- Key Metrics Card ---
function KeyMetricsCard({ kpis }: { kpis: OrgKpis }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-bold text-foreground mb-4">Key Metrics</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">Delivery Rate</p>
            <p className="text-2xl font-bold text-foreground">{kpis.deliveryRate}%</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Target className="h-5 w-5 text-blue-500" />
          </div>
        </div>
        <div className="h-px bg-border" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">Open Rate</p>
            <p className="text-2xl font-bold text-foreground">{kpis.openRate}%</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Eye className="h-5 w-5 text-violet-500" />
          </div>
        </div>
        <div className="h-px bg-border" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">Contacts This Month</p>
            <p className="text-2xl font-bold text-foreground">{kpis.contactsThisMonth.toLocaleString()}</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <UserPlus className="h-5 w-5 text-amber-500" />
          </div>
        </div>
        <div className="h-px bg-border" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">Active Campaigns</p>
            <p className="text-2xl font-bold text-foreground">{kpis.activeCampaigns} <span className="text-sm font-normal text-muted-foreground">/ {kpis.totalCampaigns}</span></p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <Megaphone className="h-5 w-5 text-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- DPDP Status Card ---
function DpdpCard({ dpdp, navigate }: { dpdp: DpdpStatus; navigate: (path: string) => void }) {
  const encPct = dpdp.totalContacts > 0 ? Math.round((dpdp.encryptedContacts / dpdp.totalContacts) * 100) : 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <h2 className="text-base font-bold text-foreground">DPDP Compliance</h2>
      </div>
      {dpdp.enabled ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground">Encryption Coverage</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-foreground">{encPct}%</p>
                {encPct === 100 && <Badge className="bg-blue-500/10 text-blue-600 border-0 text-[10px]">Complete</Badge>}
              </div>
            </div>
            <div className="h-11 w-11 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Lock className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${encPct}%` }}
            />
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground">Pending Data Requests</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-foreground">{dpdp.pendingRequests}</p>
                {dpdp.pendingRequests > 0 && (
                  <Badge variant="destructive" className="text-[10px]">Action Required</Badge>
                )}
              </div>
            </div>
            <div className="h-11 w-11 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-amber-500" />
            </div>
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground">Active Consents</p>
              <p className="text-2xl font-bold text-foreground">{dpdp.activeConsents}</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </div>
          <button
            onClick={() => navigate("/dpdp")}
            className="w-full text-xs text-primary font-semibold hover:underline flex items-center justify-center gap-1 pt-2"
          >
            View DPDP Dashboard <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
          <ShieldCheck className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-xs text-center">DPDP not enabled</p>
          <button
            onClick={() => navigate("/dpdp")}
            className="mt-2 text-xs text-primary font-semibold hover:underline"
          >
            Enable Now
          </button>
        </div>
      )}
    </div>
  );
}

// --- Status Badge ---
function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "live" || s === "sending" || s === "running") {
    return (
      <Badge className="border-0 bg-blue-500/10 text-blue-600">
        <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
        Live
      </Badge>
    );
  }
  if (s === "scheduled") return <Badge className="border-0 bg-sky-500/10 text-sky-600">Scheduled</Badge>;
  if (s === "done" || s === "sent" || s === "completed") return <Badge className="border-0 bg-gray-500/10 text-gray-500">Done</Badge>;
  if (s === "draft") return <Badge className="border-0 bg-amber-500/10 text-amber-600">Draft</Badge>;
  if (s === "failed") return <Badge className="border-0 bg-red-500/10 text-red-500">Failed</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

// --- Recent Broadcasts Table ---
function RecentBroadcastsTable({ campaigns, navigate }: { campaigns: RecentCampaign[]; navigate: (path: string) => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-foreground">Recent Campaigns</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Latest campaign performance</p>
        </div>
        <button
          onClick={() => navigate("/campaigns")}
          className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
        >
          View All <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Megaphone className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-sm">No campaigns yet</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead className="text-right">Sent</TableHead>
              <TableHead className="text-right">Delivered</TableHead>
              <TableHead>Open Rate</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((c) => (
              <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/campaigns/${c.id}`)}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-right">{c.sent.toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  {c.delivered.toLocaleString()}
                  {c.sent > 0 && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({Math.round((c.delivered / c.sent) * 100)}%)
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-violet-500"
                        style={{ width: `${c.openRate}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium">{c.openRate}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={c.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// --- Message Mix Donut ---
const MIX_COLORS: Record<string, string> = {
  Marketing: "#3b82f6",
  Utility: "#0ea5e9",
  Transactional: "#8b5cf6",
  Uncategorized: "#94a3b8",
};

function getColor(name: string) {
  return MIX_COLORS[name] ?? "#94a3b8";
}

function MessageMixDonut({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-bold text-foreground mb-4">Email Mix</h2>
      {total === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Send className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-sm">No email data</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                dataKey="value"
                stroke="none"
              >
                {data.map((d) => (
                  <Cell key={d.name} fill={getColor(d.name)} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [value.toLocaleString(), "Emails"]}
                contentStyle={{ borderRadius: 12, fontSize: 12 }}
              />
              <text
                x="50%"
                y="48%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-foreground text-2xl font-bold"
              >
                {total.toLocaleString()}
              </text>
              <text
                x="50%"
                y="58%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground text-xs"
              >
                total
              </text>
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-2">
            {data.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: getColor(d.name) }}
                  />
                  <span className="text-muted-foreground">{d.name}</span>
                </div>
                <span className="font-medium">
                  {total > 0 ? Math.round((d.value / total) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// --- Skeleton loader ---
function SectionSkeleton({ height = "h-48" }: { height?: string }) {
  return <Skeleton className={`w-full rounded-2xl ${height}`} />;
}

// --- Main Page ---
export default function OrgDashboard() {
  const { data, loading, refresh } = useOrgDashboard();
  const { currentOrg, orgRole } = useOrg();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = orgRole === "admin";

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "there";

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              Email{" "}
              <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                Command Center
              </span>
            </h1>
            <div className="flex items-center gap-4 mt-1.5">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                </span>
                Live Data
              </span>
              <span className="text-xs text-muted-foreground">
                Welcome, <span className="font-semibold text-foreground">{userName}</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <button
              onClick={() => navigate("/campaigns")}
              className="h-9 px-4 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-sm font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-primary/25 transition-all hover:-translate-y-0.5"
            >
              <Megaphone className="h-4 w-4" />
              New Campaign
            </button>
          </div>
        </div>

        {/* Trial banner */}
        {currentOrg?.org_status === "trial" && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-primary">Free Trial</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {currentOrg.trial_emails_used} of 100 emails used
                {currentOrg.trial_started_at && (
                  <> — {Math.max(0, 14 - Math.floor((Date.now() - new Date(currentOrg.trial_started_at).getTime()) / (1000 * 60 * 60 * 24)))} days remaining</>
                )}
              </p>
              <div className="mt-2 h-2 w-48 rounded-full bg-primary/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, (currentOrg.trial_emails_used / 100) * 100)}%` }}
                />
              </div>
            </div>
            <Button size="sm" onClick={() => navigate("/billing")} className="shrink-0">
              Choose a Plan
            </Button>
          </div>
        )}

        {/* Row 1: KPI Cards */}
        <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={{ delay: 0 }}>
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => <SectionSkeleton key={i} height="h-32" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="Emails Sent MTD"
                value={data.kpis.messagesSentMTD}
                prev={data.kpis.messagesPrevMonth}
                colorClass="from-sky-500/10 to-sky-500/5"
                borderClass="border-sky-500/20"
                shadowClass="hover:shadow-sky-500/10"
                icon={Send}
                bgIcon={Send}
                onClick={() => navigate("/analytics")}
                subtitle="This month's outbound"
              />
              <KpiCard
                label="Delivery Rate"
                value={data.kpis.deliveryRate}
                suffix="%"
                prev={data.kpis.deliveryRatePrev}
                colorClass="from-blue-500/10 to-blue-500/5"
                borderClass="border-blue-500/20"
                shadowClass="hover:shadow-blue-500/10"
                icon={CheckCheck}
                bgIcon={CheckCheck}
                onClick={() => navigate("/analytics")}
                subtitle="Successfully delivered"
              />
              <KpiCard
                label="Open Rate"
                value={data.kpis.openRate}
                suffix="%"
                prev={data.kpis.openRatePrev}
                colorClass="from-amber-500/10 to-amber-500/5"
                borderClass="border-amber-500/20"
                shadowClass="hover:shadow-amber-500/10"
                icon={Eye}
                bgIcon={Mail}
                onClick={() => navigate("/analytics")}
                subtitle="Emails opened by recipients"
              />
              <KpiCard
                label="Total Contacts"
                value={data.kpis.totalContacts}
                prev={data.kpis.totalContactsPrev}
                colorClass="from-violet-500/10 to-violet-500/5"
                borderClass="border-violet-500/20"
                shadowClass="hover:shadow-violet-500/10"
                icon={Users}
                bgIcon={Users}
                onClick={() => navigate("/contacts")}
                subtitle={`+${data.kpis.contactsThisMonth} this month`}
              />
            </div>
          )}
        </motion.div>

        {/* Row 2: AI Insights */}
        <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={{ delay: 0.05 }}>
          {!loading && <AiInsights type="dashboard" />}
        </motion.div>

        {/* Row 3: Pipeline */}
        <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={{ delay: 0.1 }}>
          {loading ? <SectionSkeleton height="h-[220px]" /> : <MessagingFunnel funnel={data.funnel} />}
        </motion.div>

        {/* Row 4: Chart + Email Mix */}
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.15 }}
          className="grid gap-4 lg:grid-cols-3"
        >
          <div className="lg:col-span-2">
            {loading ? <SectionSkeleton height="h-[340px]" /> : <CampaignPerformanceChart data={data.weeklyChart} />}
          </div>
          <div>
            {loading ? <SectionSkeleton height="h-[340px]" /> : <MessageMixDonut data={data.messageMix} />}
          </div>
        </motion.div>

        {/* Row 5: Key Metrics + DPDP + Campaign Summary */}
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <KeyMetricsCard kpis={data.kpis} />
          <DpdpCard dpdp={data.dpdp} navigate={navigate} />
          {/* Campaign Summary */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-foreground">Campaign Status</h2>
              <button
                onClick={() => navigate("/campaigns")}
                className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
              >
                All Campaigns <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-foreground">{data.kpis.activeCampaigns}</p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Megaphone className="h-5 w-5 text-blue-500" />
                </div>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground">Total Campaigns</p>
                  <p className="text-2xl font-bold text-foreground">{data.kpis.totalCampaigns}</p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Send className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground">Failed Emails</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-foreground">{data.kpis.messagesFailed}</p>
                    {data.kpis.messagesFailed > 0 && (
                      <Badge variant="destructive" className="text-[10px]">Review</Badge>
                    )}
                  </div>
                </div>
                <div className="h-11 w-11 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Row 6: Recent Campaigns Table */}
        <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={{ delay: 0.25 }}>
          {loading ? <SectionSkeleton height="h-[300px]" /> : <RecentBroadcastsTable campaigns={data.recentCampaigns} navigate={navigate} />}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
