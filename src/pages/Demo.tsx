import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Mail,
  LayoutDashboard,
  Users,
  Megaphone,
  FileText,
  Zap,
  Settings,
  Wallet,
  Send,
  CheckCheck,
  Eye,
  TrendingUp,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Rocket,
  Upload,
  Sparkles,
  CreditCard,
  IndianRupee,
  Receipt,
  UserPlus,
  Building2,
  CheckCircle,
  ShieldCheck,
  Tag,
  Filter,
  Bookmark,
  Search,
  BarChart3,
  Code2,
  Lock,
  GitBranch,
  Key,
  Copy,
  Webhook,
} from "lucide-react";

/* ── Timing ───────────────────────────────────────────── */

const SCENES = [
  { id: "intro", label: "Intro", duration: 5000 },
  { id: "dashboard", label: "Dashboard", duration: 12000 },
  { id: "contacts", label: "Contacts", duration: 11000 },
  { id: "campaigns", label: "Campaigns", duration: 12000 },
  { id: "templates", label: "Templates", duration: 12000 },
  { id: "automations", label: "Drips", duration: 11000 },
  { id: "developers", label: "API", duration: 11000 },
  { id: "compliance", label: "DPDP", duration: 11000 },
  { id: "billing", label: "Billing", duration: 10000 },
  { id: "outro", label: "Summary", duration: 5000 },
] as const;

const TOTAL = SCENES.reduce((s, sc) => s + sc.duration, 0);

type SceneId = (typeof SCENES)[number]["id"];

/* ── Helpers ──────────────────────────────────────────── */

const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.6 },
};

const slideUp = (delay = 0) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, delay } },
});

const slideLeft = (delay = 0) => ({
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.5, delay } },
});

const slideRight = (delay = 0) => ({
  initial: { opacity: 0, x: -40 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.5, delay } },
});

/* ── Simulated sidebar ────────────────────────────────── */

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: Users, label: "Contacts" },
  { icon: Megaphone, label: "Campaigns" },
  { icon: FileText, label: "Templates" },
  { icon: Zap, label: "Automations" },
  { icon: BarChart3, label: "Analytics" },
  { icon: ShieldCheck, label: "Compliance" },
  { icon: Code2, label: "Developers" },
  { icon: Wallet, label: "Billing" },
];

function MockSidebar({ active }: { active: string }) {
  return (
    <motion.div
      {...slideRight()}
      className="flex w-56 shrink-0 flex-col border-r border-border/60 bg-[hsl(var(--sidebar-background))]"
    >
      <div className="flex h-14 items-center gap-2 border-b border-border/40 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Mail className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-bold tracking-tight text-foreground">In-Sync</span>
      </div>
      <div className="border-b border-border/40 px-4 py-2">
        <div className="rounded-md bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
          In-Sync Platform Demo
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-3">
        {navItems.map((item) => {
          const isActive = item.label === active;
          return (
            <div
              key={item.label}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-border/40 px-4 py-3">
        <p className="truncate text-[10px] text-muted-foreground">demo@in-sync.co.in</p>
      </div>
    </motion.div>
  );
}

/* ── KPI Card ─────────────────────────────────────────── */

function KpiCard({
  label, value, change, color, icon: Icon, delay,
}: {
  label: string; value: string; change: string; color: string; icon: any; delay: number;
}) {
  return (
    <motion.div {...slideUp(delay)} className="relative overflow-hidden rounded-xl border border-border/60 bg-card p-4">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${color}`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <AnimatedValue value={value} delay={delay + 0.3} />
        </div>
        <div className="rounded-lg bg-muted/50 p-1.5">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: delay + 0.8 } }}
        className="mt-2 flex items-center gap-1 text-[10px] text-blue-600"
      >
        <TrendingUp className="h-3 w-3" /> {change}
      </motion.div>
    </motion.div>
  );
}

function AnimatedValue({ value, delay }: { value: string; delay: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay * 1000);
    return () => clearTimeout(t);
  }, [delay]);
  return <p className="mt-1 text-2xl font-bold text-foreground">{show ? value : "—"}</p>;
}

/* ── Animated bar chart ───────────────────────────────── */

function MiniBarChart() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const data = [
    { sent: 85, delivered: 78, read: 52 },
    { sent: 70, delivered: 65, read: 40 },
    { sent: 95, delivered: 90, read: 68 },
    { sent: 60, delivered: 55, read: 35 },
    { sent: 110, delivered: 100, read: 80 },
    { sent: 45, delivered: 42, read: 28 },
    { sent: 80, delivered: 75, read: 55 },
  ];
  const max = 110;
  return (
    <motion.div {...slideUp(0.6)} className="overflow-hidden rounded-xl border border-border/60 bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground">Campaign Performance</p>
        <div className="flex gap-3 text-[9px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-500" /> Sent</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Delivered</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-500" /> Opened</span>
        </div>
      </div>
      <div className="flex items-end gap-2" style={{ height: 100 }}>
        {data.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-px">
            <div className="flex w-full items-end gap-px" style={{ height: 80 }}>
              {[
                { val: d.sent, color: "bg-sky-500" },
                { val: d.delivered, color: "bg-blue-500" },
                { val: d.read, color: "bg-violet-500" },
              ].map((bar, j) => (
                <motion.div
                  key={j}
                  className={`flex-1 rounded-t ${bar.color}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${(bar.val / max) * 100}%` }}
                  transition={{ duration: 0.8, delay: 1.0 + i * 0.1 + j * 0.05, ease: "easeOut" }}
                />
              ))}
            </div>
            <span className="mt-1 text-[9px] text-muted-foreground">{days[i]}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ── AI Insights widget ──────────────────────────────── */

function AiInsights() {
  const [text, setText] = useState("");
  const full =
    "📊 Open rate up 12% this week — Tuesday & Thursday sends outperform weekends by 3x\n\n🎯 340 contacts dormant 30+ days — I recommend a re-engagement drip sequence\n\n⏰ Open rates peak 10 AM–12 PM IST — schedule your next campaign in this window for maximum impact";

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i <= full.length) { setText(full.slice(0, i)); i++; }
      else clearInterval(interval);
    }, 16);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div {...slideUp(1.0)} className="overflow-hidden rounded-xl border-2 border-primary/30 bg-primary/[0.04] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <span className="text-xs font-bold text-primary">AI-Powered Insights</span>
            <p className="text-[9px] text-muted-foreground">Automatically generated from your campaign data</p>
          </div>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[9px] font-semibold text-primary">
          Live
        </span>
      </div>
      <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground/80">
        {text}
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="inline-block w-1 h-3 bg-primary ml-0.5 align-middle"
        />
      </p>
    </motion.div>
  );
}

/* ── Typewriter ───────────────────────────────────────── */

function TypewriterText({ text, delay = 0, speed = 30 }: { text: string; delay?: number; speed?: number }) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    const timeout = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        if (i <= text.length) { setShown(text.slice(0, i)); i++; } else clearInterval(interval);
      }, speed);
      return () => clearInterval(interval);
    }, delay * 1000);
    return () => clearTimeout(timeout);
  }, [text, delay, speed]);
  return <>{shown}<motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity }} className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle" /></>;
}

/* ── Scene: Intro ─────────────────────────────────────── */

function SceneIntro() {
  return (
    <motion.div {...fade} className="flex h-full flex-col items-center justify-center bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/3 left-1/4 h-[400px] w-[400px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 h-[300px] w-[300px] rounded-full bg-sky-500/8 blur-[100px]" />
      </div>

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, type: "spring" }}
        className="relative mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-primary shadow-2xl shadow-primary/30"
      >
        <Mail className="h-12 w-12 text-primary-foreground" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="relative text-5xl font-extrabold tracking-tight text-foreground"
      >
        In-Sync
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="relative mt-3 text-lg text-muted-foreground"
      >
        AI-Powered Email Broadcast Platform
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="relative mt-8 flex items-center gap-4"
      >
        {[
          { icon: Sparkles, label: "AI-Powered" },
          { icon: ShieldCheck, label: "DPDP Compliant" },
          { icon: Rocket, label: "100% Self-Serve" },
          { icon: Code2, label: "Developer API" },
        ].map((p, i) => (
          <motion.div
            key={p.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4 + i * 0.15 }}
            className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary"
          >
            <p.icon className="h-3 w-3" /> {p.label}
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

/* ── Scene: Dashboard ─────────────────────────────────── */

function SceneDashboard() {
  return (
    <motion.div {...fade} className="flex h-full">
      <MockSidebar active="Dashboard" />
      <div className="flex-1 overflow-hidden p-5">
        <motion.div {...slideUp(0)} className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Dashboard</h2>
            <p className="text-xs text-muted-foreground">Your email broadcast command centre</p>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-[10px] font-semibold text-primary"
          >
            <Sparkles className="h-3 w-3" /> AI-Enhanced Analytics
          </motion.div>
        </motion.div>

        <div className="mt-4 grid grid-cols-4 gap-3">
          <KpiCard label="Emails Sent MTD" value="2,847" change="+18% vs last month" color="from-sky-500 to-blue-600" icon={Send} delay={0.15} />
          <KpiCard label="Delivery Rate" value="96.3%" change="+2.1% vs last month" color="from-blue-500 to-blue-600" icon={CheckCheck} delay={0.25} />
          <KpiCard label="Open Rate" value="42.8%" change="+5.4% vs last month" color="from-violet-500 to-purple-600" icon={Eye} delay={0.35} />
          <KpiCard label="Total Contacts" value="1,204" change="+86 this month" color="from-amber-500 to-orange-600" icon={Users} delay={0.45} />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <MiniBarChart />
          </div>
          <AiInsights />
        </div>
      </div>
    </motion.div>
  );
}

/* ── Scene: Contacts & Segments (NEW) ─────────────────── */

function SceneContacts() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 1500),
      setTimeout(() => setStep(2), 3500),
      setTimeout(() => setStep(3), 5500),
      setTimeout(() => setStep(4), 7500),
      setTimeout(() => setStep(5), 9000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const allContacts = [
    { name: "Amit Sharma", email: "amit.sharma@acmecorp.com", tags: ["VIP", "Active"], source: "Campaign" },
    { name: "Priya Patel", email: "priya.patel@designhub.io", tags: ["VIP"], source: "Manual" },
    { name: "Raj Kumar", email: "raj.kumar@techstart.in", tags: ["New"], source: "CSV" },
    { name: "Sneha Iyer", email: "sneha@iyer-consulting.com", tags: ["VIP", "Enterprise"], source: "Form" },
    { name: "Vikram Desai", email: "vikram.d@globalfin.co", tags: ["Active"], source: "Inbound" },
  ];

  const contacts = step >= 2 ? allContacts.filter((c) => c.tags.includes("VIP")) : allContacts;

  return (
    <motion.div {...fade} className="flex h-full">
      <MockSidebar active="Contacts" />
      <div className="flex-1 overflow-hidden p-5">
        <motion.div {...slideUp(0)} className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Contacts</h2>
            <p className="text-xs text-muted-foreground">Manage, segment, and target your audience</p>
          </div>
          <div className="flex items-center gap-2">
            <motion.div {...slideLeft(0.3)} className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-[10px] text-muted-foreground">
              <Search className="h-3 w-3" /> Search contacts...
            </motion.div>
            <motion.div {...slideLeft(0.4)} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[10px] font-semibold text-primary-foreground">
              <UserPlus className="h-3 w-3" /> Add
            </motion.div>
          </div>
        </motion.div>

        {/* Filter row */}
        <motion.div {...slideUp(0.15)} className="mt-3 flex items-center gap-2">
          <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] transition-colors ${
            step >= 2 ? "border-primary/50 bg-primary/5 text-primary font-medium" : "border-border bg-background text-muted-foreground"
          }`}>
            <Tag className="h-3 w-3" /> {step >= 2 ? "Tag: VIP" : "Filter by Tag"}
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[10px] text-muted-foreground">
            <Filter className="h-3 w-3" /> Source: All
          </div>
          {step >= 2 && (
            <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[9px] font-medium text-primary">
              {contacts.length} matches
            </motion.span>
          )}

          <AnimatePresence>
            {step >= 3 && step < 4 && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="ml-auto flex items-center gap-2 rounded-lg border border-primary/30 bg-card p-2 shadow-lg">
                <div className="rounded border border-border bg-background px-2 py-1 text-[10px] text-foreground">VIP Customers</div>
                <div className="flex items-center gap-1 rounded bg-primary px-2 py-1 text-[9px] font-semibold text-primary-foreground">
                  <Bookmark className="h-2.5 w-2.5" /> Save
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {step >= 4 && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="ml-auto flex items-center gap-1.5 text-[10px] font-medium text-blue-600">
              <CheckCircle className="h-3.5 w-3.5" /> Segment "VIP Customers" saved
            </motion.div>
          )}
        </motion.div>

        {/* Contact table */}
        <motion.div {...slideUp(0.25)} className="mt-3 overflow-hidden rounded-xl border border-border/60 bg-card">
          <div className="flex items-center border-b border-border/40 bg-muted/30 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {step >= 5 && <div className="w-6 shrink-0" />}
            <div className="flex-[2]">Name</div>
            <div className="flex-[2]">Email</div>
            <div className="flex-[2]">Tags</div>
            <div className="flex-1">Source</div>
          </div>
          <div className="divide-y divide-border/30">
            {contacts.map((c, i) => (
              <motion.div key={c.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0, transition: { delay: 0.35 + i * 0.08 } }}
                className="flex items-center px-4 py-2">
                {step >= 5 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-6 shrink-0">
                    <div className="h-3.5 w-3.5 rounded border-2 border-primary bg-primary/20" />
                  </motion.div>
                )}
                <div className="flex flex-[2] items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                    {c.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <span className="text-xs font-medium text-foreground">{c.name}</span>
                </div>
                <span className="flex-[2] text-xs text-muted-foreground">{c.email}</span>
                <div className="flex flex-[2] gap-1">
                  {c.tags.map((t) => (
                    <span key={t} className="rounded-full bg-primary/10 px-2 py-0.5 text-[8px] font-medium text-primary">{t}</span>
                  ))}
                </div>
                <span className="flex-1">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">{c.source}</span>
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Bulk action */}
        <AnimatePresence>
          {step >= 5 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="mt-3 flex items-center justify-between rounded-xl border-2 border-primary/30 bg-primary/5 p-3">
              <span className="text-xs text-muted-foreground"><strong className="text-foreground">{contacts.length}</strong> contacts selected</span>
              <div className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[10px] font-semibold text-primary-foreground">
                <Megaphone className="h-3 w-3" /> Launch Campaign ({contacts.length})
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ── Scene: Campaigns ─────────────────────────────────── */

function SceneCampaigns() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 1500),
      setTimeout(() => setStep(2), 3500),
      setTimeout(() => setStep(3), 5500),
      setTimeout(() => setStep(4), 8000),
      setTimeout(() => setStep(5), 10000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div {...fade} className="flex h-full">
      <MockSidebar active="Campaigns" />
      <div className="flex-1 overflow-hidden p-5">
        <motion.div {...slideUp(0)}>
          <h2 className="text-xl font-bold text-foreground">New Campaign</h2>
          <p className="text-xs text-muted-foreground">Create and launch — completely self-serve</p>
        </motion.div>

        <div className="mt-4 flex gap-4">
          <div className="flex-1 space-y-3">
            {/* Campaign name */}
            <motion.div {...slideUp(0.2)} className="rounded-xl border border-border/60 bg-card p-3">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Campaign Name</p>
              <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                <TypewriterText text="March Promo — 20% Off" delay={0.4} speed={40} />
              </div>
            </motion.div>

            {/* Template */}
            <motion.div {...slideUp(0.3)} className="rounded-xl border border-border/60 bg-card p-3">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Template</p>
              <AnimatePresence>
                {step >= 1 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">promo_offer_march</span>
                    <span className="ml-auto rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-medium text-blue-700">Marketing · ₹1.00/msg</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* CSV */}
            <AnimatePresence>
              {step >= 2 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-border/60 bg-card p-3">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Contact List</p>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">contacts_march.csv</span>
                    <span className="ml-auto rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-medium text-blue-700">✓ 847 valid</span>
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-medium text-red-700">⚠ 3 skipped</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Variables */}
            <AnimatePresence>
              {step >= 3 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-border/60 bg-card p-3">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Map Variables</p>
                  <div className="space-y-2">
                    {[{ var: "{{1}}", col: "name" }, { var: "{{2}}", col: "discount_code" }].map((m) => (
                      <div key={m.var} className="flex items-center gap-2 text-sm">
                        <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary">{m.var}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="rounded-lg border border-border bg-background px-3 py-1 text-xs">{m.col}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Launch bar */}
            <AnimatePresence>
              {step >= 4 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-muted-foreground"><strong className="text-foreground">847</strong> recipients</span>
                        <span className="text-muted-foreground">Rate: <strong className="text-foreground">₹1.00</strong>/msg</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 font-semibold text-foreground">
                          <IndianRupee className="h-3 w-3" /> Est. cost: ₹847.00
                        </span>
                        <span className="text-muted-foreground">Wallet: <strong className="text-blue-600">₹2,340</strong></span>
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-medium text-blue-700">✓ Sufficient balance</span>
                      </div>
                    </div>
                    <motion.div
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground"
                    >
                      <Rocket className="h-3.5 w-3.5" /> Launch Campaign
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Progress */}
            <AnimatePresence>
              {step >= 5 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-border/60 bg-card p-3">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Sending...</span>
                    <span className="font-medium text-foreground">423 / 847 · ₹423 spent</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <motion.div className="h-full rounded-full bg-primary" initial={{ width: "0%" }}
                      animate={{ width: "50%" }} transition={{ duration: 2.5, ease: "easeOut" }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Email preview */}
          <motion.div {...slideLeft(0.4)} className="w-56 shrink-0">
            <div className="rounded-xl border border-border/60 bg-card p-3">
              <p className="mb-2 text-xs font-semibold text-foreground">Email Preview</p>
              <div className="rounded-lg border border-border/40 bg-white overflow-hidden">
                {/* Email header */}
                <div className="border-b border-gray-100 px-2.5 py-2 space-y-1">
                  <div className="flex items-center gap-1 text-[8px]">
                    <span className="text-gray-400">From:</span>
                    <span className="font-medium text-gray-700">Acme Corp &lt;promo@acmecorp.com&gt;</span>
                  </div>
                  <div className="flex items-center gap-1 text-[8px]">
                    <span className="text-gray-400">Subject:</span>
                    <span className="font-semibold text-gray-900">Get 20% OFF this March!</span>
                  </div>
                </div>
                {/* Email body */}
                <div className="px-2.5 py-2">
                  <div className="mb-2 aspect-[2/1] overflow-hidden rounded bg-gradient-to-br from-primary/20 to-sky-500/20 flex items-center justify-center">
                    <span className="text-[8px] text-primary font-medium">Promo Banner</span>
                  </div>
                  <p className="text-[9px] leading-relaxed text-gray-800">
                    Hi <strong>Amit</strong>,<br /><br />
                    Get <strong>20% OFF</strong> on all plans this March!<br /><br />
                    Use code: <strong className="text-primary">MARCH20</strong><br />
                    <span className="text-gray-500">Valid till 31st March 2026.</span>
                  </p>
                  <div className="mt-2 flex justify-center">
                    <span className="rounded bg-primary px-3 py-1 text-[8px] font-semibold text-white">Shop Now</span>
                  </div>
                  <p className="mt-2 text-center text-[7px] text-gray-300">Unsubscribe · Acme Corp, Mumbai, India</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Scene: Email Templates ───────────────────────────── */

function SceneTemplates() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 1200),
      setTimeout(() => setStep(2), 3000),
      setTimeout(() => setStep(3), 5000),
      setTimeout(() => setStep(4), 7000),
      setTimeout(() => setStep(5), 9000),
      setTimeout(() => setStep(6), 10500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div {...fade} className="flex h-full">
      <MockSidebar active="Templates" />
      <div className="flex flex-1 overflow-hidden">
        {/* Template list */}
        <motion.div {...slideRight(0.1)} className="w-48 shrink-0 border-r border-border/60 bg-card">
          <div className="border-b border-border/40 p-2.5">
            <div className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[10px] font-semibold text-primary-foreground">
              <FileText className="h-3 w-3" /> New Template
            </div>
          </div>
          <div className="space-y-0.5 p-2">
            {[
              { name: "Welcome Email", status: "Active", type: "Onboarding" },
              { name: "March Promo", status: "Active", type: "Marketing" },
              { name: "Order Confirmation", status: "Active", type: "Transactional" },
              { name: "Re-engagement", status: "Draft", type: "Marketing" },
              { name: "Monthly Newsletter", status: "Active", type: "Newsletter" },
            ].map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0, transition: { delay: 0.2 + i * 0.08 } }}
                className={`rounded-lg px-2.5 py-2 ${i === 0 ? "bg-accent" : ""}`}
              >
                <p className="text-[10px] font-medium text-foreground">{t.name}</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className={`rounded-full px-1.5 py-0.5 text-[7px] font-medium ${
                    t.status === "Active" ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground"
                  }`}>{t.status}</span>
                  <span className="text-[7px] text-muted-foreground">{t.type}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Template editor area */}
        <div className="flex-1 p-5 overflow-hidden">
          <motion.div {...slideUp(0)} className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">Welcome Email</h2>
              <p className="text-xs text-muted-foreground">Onboarding template · Last edited 2 hours ago</p>
            </div>
            <div className="flex items-center gap-2">
              {step >= 5 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-center gap-1.5 text-[10px] text-blue-600">
                  <CheckCircle className="h-3.5 w-3.5" /> Saved
                </motion.div>
              )}
              <div className="rounded-lg bg-primary px-3 py-1.5 text-[10px] font-semibold text-primary-foreground">Save</div>
            </div>
          </motion.div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            {/* Left: Settings & merge tags */}
            <div className="space-y-3">
              {/* Subject line */}
              <motion.div {...slideUp(0.2)} className="rounded-xl border border-border/60 bg-card p-3">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Subject Line</p>
                <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                  <TypewriterText text="Welcome to Acme Corp, {{name}}!" delay={0.4} speed={35} />
                </div>
              </motion.div>

              {/* Preview text */}
              <AnimatePresence>
                {step >= 1 && (
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-border/60 bg-card p-3">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Preview Text</p>
                    <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                      Your account is ready. Here's what you can do first...
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* From address */}
              <AnimatePresence>
                {step >= 2 && (
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-border/60 bg-card p-3">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">From</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground">
                        Acme Corp
                      </div>
                      <div className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground">
                        hello@acmecorp.com
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Merge tags */}
              <AnimatePresence>
                {step >= 3 && (
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-border/60 bg-card p-3">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Available Merge Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {["{{name}}", "{{email}}", "{{company}}", "{{unsubscribe_url}}"].map((tag, i) => (
                        <motion.span key={tag}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1, transition: { delay: i * 0.1 } }}
                          className="rounded-md border border-primary/30 bg-primary/5 px-2 py-1 font-mono text-[9px] font-medium text-primary">
                          {tag}
                        </motion.span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* HTML toggle */}
              <AnimatePresence>
                {step >= 4 && (
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-border/60 bg-card p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Code2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-semibold text-foreground">HTML Source</span>
                      </div>
                      <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
                        <span className="rounded-md bg-background px-2.5 py-1 text-[9px] font-medium text-foreground shadow-sm">Visual</span>
                        <span className="rounded-md px-2.5 py-1 text-[9px] font-medium text-muted-foreground">HTML</span>
                      </div>
                    </div>
                    <div className="mt-2 rounded-lg border border-border bg-background p-2 font-mono text-[8px] text-muted-foreground leading-relaxed">
                      &lt;h1&gt;Welcome, {"{{name}}"}!&lt;/h1&gt;<br />
                      &lt;p&gt;Your account is ready.&lt;/p&gt;<br />
                      &lt;a href="..."&gt;Get Started&lt;/a&gt;
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right: Live email preview */}
            <motion.div {...slideLeft(0.3)} className="rounded-xl border border-border/60 bg-card p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">Live Preview</p>
                <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                  <Eye className="h-3 w-3" /> Desktop
                </div>
              </div>
              <div className="rounded-lg border border-border/40 bg-white overflow-hidden">
                {/* Email header */}
                <div className="border-b border-gray-100 bg-gray-50/50 px-3 py-2 space-y-0.5">
                  <div className="flex items-center gap-1 text-[8px]">
                    <span className="text-gray-400">From:</span>
                    <span className="font-medium text-gray-700">Acme Corp &lt;hello@acmecorp.com&gt;</span>
                  </div>
                  <div className="flex items-center gap-1 text-[8px]">
                    <span className="text-gray-400">Subject:</span>
                    <span className="font-semibold text-gray-900">Welcome to Acme Corp, Amit!</span>
                  </div>
                </div>
                {/* Email body */}
                <div className="px-4 py-3 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm font-bold text-gray-900">Welcome, Amit!</p>
                  <p className="mt-1.5 text-[9px] leading-relaxed text-gray-600">
                    Your account is ready. Here's how to get the most out of Acme Corp's email platform.
                  </p>
                  <div className="mt-3 space-y-1.5">
                    {step >= 6 ? (
                      [
                        { step: "1", text: "Verify your sending domain" },
                        { step: "2", text: "Import your contact list" },
                        { step: "3", text: "Create your first campaign" },
                      ].map((s, i) => (
                        <motion.div key={s.step}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0, transition: { delay: i * 0.15 } }}
                          className="flex items-center gap-2 rounded-md bg-gray-50 px-2 py-1 text-left">
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-[7px] font-bold text-white">{s.step}</span>
                          <span className="text-[8px] text-gray-700">{s.text}</span>
                        </motion.div>
                      ))
                    ) : (
                      <div className="space-y-1.5">
                        <div className="h-5 w-full rounded bg-gray-100 animate-pulse" />
                        <div className="h-5 w-full rounded bg-gray-100 animate-pulse" />
                        <div className="h-5 w-3/4 mx-auto rounded bg-gray-100 animate-pulse" />
                      </div>
                    )}
                  </div>
                  <div className="mt-3">
                    <span className="rounded-md bg-primary px-4 py-1.5 text-[9px] font-semibold text-white">Get Started</span>
                  </div>
                  <p className="mt-3 text-[7px] text-gray-300">
                    Acme Corp, Mumbai, India · <span className="underline">Unsubscribe</span>
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Scene: Automations / Drip Campaigns (NEW) ────────── */

function SceneAutomations() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 1200),
      setTimeout(() => setStep(2), 3000),
      setTimeout(() => setStep(3), 5000),
      setTimeout(() => setStep(4), 7000),
      setTimeout(() => setStep(5), 9000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div {...fade} className="flex h-full">
      <MockSidebar active="Automations" />
      <div className="flex-1 overflow-hidden p-5">
        <motion.div {...slideUp(0)} className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Automations</h2>
            <p className="text-xs text-muted-foreground">Drip campaigns with daily limits and response-based branching</p>
          </div>
          <motion.div {...slideLeft(0.3)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[10px] font-semibold text-primary-foreground">
            <Zap className="h-3 w-3" /> New Automation
          </motion.div>
        </motion.div>

        {/* Automation card */}
        <motion.div {...slideUp(0.2)} className="mt-4 rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">Welcome Drip Series</span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-semibold text-blue-700">Active</span>
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                327/547 contacts processed · 10/day limit · Created Mar 5
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 text-[10px] text-muted-foreground">
                <Pause className="h-3 w-3" /> Pause
              </div>
            </div>
          </div>

          {/* Expanded: Steps flow */}
          <AnimatePresence>
            {step >= 1 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                className="border-t border-border/40 bg-muted/20 px-5 py-4">

                {/* Contact status breakdown */}
                <AnimatePresence>
                  {step >= 2 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="mb-4 grid grid-cols-5 gap-2">
                      {[
                        { label: "Pending", value: "200", color: "text-muted-foreground" },
                        { label: "In Progress", value: "47", color: "text-blue-600" },
                        { label: "Waiting", value: "32", color: "text-amber-600" },
                        { label: "Completed", value: "248", color: "text-blue-600" },
                        { label: "Failed", value: "20", color: "text-red-500" },
                      ].map((stat, i) => (
                        <motion.div key={stat.label}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0, transition: { delay: i * 0.08 } }}
                          className="rounded-lg border border-border/40 bg-background p-2 text-center">
                          <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                          <p className="text-[8px] text-muted-foreground">{stat.label}</p>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className="mb-2 text-[10px] font-semibold text-foreground">Steps</p>
                <div className="space-y-0">
                  {[
                    { order: 1, icon: Send, type: "Send Email", detail: "welcome_offer", color: "text-blue-600" },
                    { order: 2, icon: Clock, type: "Wait", detail: "24 hours", color: "text-amber-600" },
                    { order: 3, icon: GitBranch, type: "Condition", detail: "Opened → Step 4 · No Open → Step 5", color: "text-orange-600" },
                    { order: 4, icon: Send, type: "Send Email", detail: "product_catalog", color: "text-blue-600" },
                    { order: 5, icon: Send, type: "Send Email", detail: "reminder_followup", color: "text-blue-600" },
                  ].map((s, i) => (
                    <motion.div key={s.order}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0, transition: { delay: 0.1 + i * 0.12 } }}
                      className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                          {s.order}
                        </span>
                        {i < 4 && <div className="my-0.5 h-4 w-px bg-border/60" />}
                      </div>
                      <div className="flex items-center gap-2 rounded-md border border-border/40 bg-background px-3 py-1.5 text-[10px]">
                        <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                        <span className="font-medium text-foreground">{s.type}:</span>
                        <span className="text-muted-foreground">{s.detail}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Progress bar */}
                <AnimatePresence>
                  {step >= 3 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Progress</span>
                        <span className="font-medium text-foreground">60%</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                        <motion.div className="h-full rounded-full bg-primary"
                          initial={{ width: "0%" }}
                          animate={{ width: "60%" }}
                          transition={{ duration: 1.5, ease: "easeOut" }} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Second automation (inactive) */}
        <AnimatePresence>
          {step >= 4 && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              className="mt-3 rounded-xl border border-border/60 bg-card p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50">
                  <Zap className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">Re-engagement Campaign</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">Draft</span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    0/0 contacts · 5/day limit · Created Mar 9
                  </p>
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 text-[10px] text-muted-foreground">
                  <Play className="h-3 w-3" /> Start
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add step hint */}
        <AnimatePresence>
          {step >= 5 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="mt-3 flex items-center gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] p-3">
              <p className="text-[10px] text-muted-foreground">
                Build multi-step flows with <strong className="text-foreground">Send Email</strong>,{" "}
                <strong className="text-foreground">Wait</strong>, and{" "}
                <strong className="text-foreground">Condition</strong> steps.
                Branch based on opened/clicked/bounced status.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ── Scene: Developer Tools (NEW) ─────────────────────── */

function SceneDevelopers() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 1200),
      setTimeout(() => setStep(2), 3000),
      setTimeout(() => setStep(3), 5000),
      setTimeout(() => setStep(4), 7000),
      setTimeout(() => setStep(5), 9000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div {...fade} className="flex h-full">
      <MockSidebar active="Developers" />
      <div className="flex-1 overflow-hidden p-5">
        <motion.div {...slideUp(0)}>
          <h2 className="text-xl font-bold text-foreground">Developers</h2>
          <p className="text-xs text-muted-foreground">Webhooks, API keys, and integration connectors</p>
        </motion.div>

        {/* Tabs */}
        <motion.div {...slideUp(0.15)} className="mt-4 flex items-center gap-1 rounded-lg bg-muted/50 p-1 w-fit">
          {[
            { icon: Webhook, label: "Webhooks", active: step < 3 },
            { icon: Key, label: "API Keys", active: step >= 3 && step < 5 },
            { icon: Code2, label: "API Docs", active: step >= 5 },
          ].map((tab) => (
            <div key={tab.label}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[10px] font-medium transition-colors ${
                tab.active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}>
              <tab.icon className="h-3 w-3" /> {tab.label}
            </div>
          ))}
        </motion.div>

        {/* Webhooks content */}
        <AnimatePresence mode="wait">
          {step >= 1 && step < 3 && (
            <motion.div key="webhooks" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-4 space-y-3">
              {/* Webhook card */}
              <div className="rounded-xl border border-border/60 bg-card p-4">
                <div className="flex items-center gap-3">
                  <Webhook className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">CRM Sync</span>
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-semibold text-blue-700">Active</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">https://crm.acmecorp.com/webhook</p>
                    <div className="mt-1.5 flex gap-1">
                      {["message.inbound", "message.status", "contact.created"].map((e) => (
                        <span key={e} className="rounded border border-border/40 bg-background px-1.5 py-0.5 text-[8px] text-muted-foreground">{e}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" /> Logs
                  </div>
                </div>

                {/* Delivery logs */}
                <AnimatePresence>
                  {step >= 2 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                      className="mt-3 space-y-1.5 border-t border-border/40 pt-3">
                      <p className="text-[10px] font-semibold text-foreground">Recent Deliveries</p>
                      {[
                        { event: "message.inbound", status: 200, success: true, time: "2 min ago" },
                        { event: "contact.created", status: 200, success: true, time: "15 min ago" },
                        { event: "message.status", status: 500, success: false, time: "1 hour ago" },
                      ].map((d, i) => (
                        <motion.div key={i}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1, transition: { delay: i * 0.12 } }}
                          className="flex items-center gap-2 rounded-lg bg-background px-3 py-1.5 text-[10px]">
                          {d.success
                            ? <CheckCircle className="h-3 w-3 text-blue-500" />
                            : <span className="flex h-3 w-3 items-center justify-center rounded-full bg-red-100 text-[7px] font-bold text-red-600">!</span>
                          }
                          <span className="font-medium text-foreground">{d.event}</span>
                          <span className={`rounded px-1.5 py-0.5 text-[8px] font-medium ${
                            d.success ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                          }`}>{d.status}</span>
                          <span className="ml-auto text-muted-foreground">{d.time}</span>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Second webhook */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }}
                className="rounded-xl border border-border/60 bg-card p-4">
                <div className="flex items-center gap-3">
                  <Webhook className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">Analytics Pipeline</span>
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-semibold text-blue-700">Active</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">https://analytics.acmecorp.com/ingest</p>
                    <div className="mt-1.5 flex gap-1">
                      {["message.outbound", "message.status"].map((e) => (
                        <span key={e} className="rounded border border-border/40 bg-background px-1.5 py-0.5 text-[8px] text-muted-foreground">{e}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* API Keys content */}
          {step >= 3 && step < 5 && (
            <motion.div key="apikeys" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-4 space-y-3">
              {/* Generated key alert */}
              <AnimatePresence>
                {step >= 4 && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border-2 border-blue-300 bg-blue-50 p-3">
                    <p className="mb-2 text-[10px] font-semibold text-blue-700">
                      API Key Generated — copy it now, it won't be shown again!
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 rounded-lg bg-white px-3 py-1.5 font-mono text-[10px] text-foreground">
                        insync_a83f4e2b1c9d7f6e5a3b8c4d...
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="rounded-md bg-background p-1.5 border border-border"><Eye className="h-3 w-3 text-muted-foreground" /></div>
                        <div className="rounded-md bg-background p-1.5 border border-border"><Copy className="h-3 w-3 text-muted-foreground" /></div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Key cards */}
              {[
                { name: "Shopify Integration", prefix: "insync_a83f...", scopes: ["read", "write"], used: "2 hours ago" },
                { name: "Analytics Dashboard", prefix: "insync_7b2e...", scopes: ["read"], used: "5 days ago" },
              ].map((k, i) => (
                <motion.div key={k.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: i * 0.15 } }}
                  className="rounded-xl border border-border/60 bg-card p-4">
                  <div className="flex items-center gap-3">
                    <Key className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{k.name}</span>
                        <code className="text-[10px] text-muted-foreground">{k.prefix}</code>
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>Scopes: {k.scopes.map((s) => (
                          <span key={s} className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-[8px] font-medium text-primary">{s}</span>
                        ))}</span>
                        <span>Last used: {k.used}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* API Docs content */}
          {step >= 5 && (
            <motion.div key="docs" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-4">
              <div className="rounded-xl border border-border/60 bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-foreground">REST API Reference</span>
                </div>
                <div className="mb-3 text-[10px] text-muted-foreground">
                  Base URL: <code className="rounded bg-muted px-1.5 py-0.5 text-[9px]">https://api.insync.com/v1</code>
                  {" · "}Header: <code className="rounded bg-muted px-1.5 py-0.5 text-[9px]">x-api-key: your_key</code>
                </div>
                <div className="space-y-1.5">
                  {[
                    { method: "GET", path: "/contacts", desc: "List contacts (paginated)" },
                    { method: "POST", path: "/contacts", desc: "Create or update a contact" },
                    { method: "GET", path: "/campaigns", desc: "List campaigns (?status=running)" },
                    { method: "POST", path: "/messages/send", desc: "Send an email to a contact" },
                    { method: "GET", path: "/templates", desc: "List all approved templates" },
                  ].map((ep, i) => (
                    <motion.div key={ep.path + ep.method}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0, transition: { delay: i * 0.08 } }}
                      className="flex items-center gap-2 rounded-lg bg-background px-3 py-1.5">
                      <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${
                        ep.method === "GET" ? "bg-blue-100 text-blue-700" : "bg-blue-100 text-blue-700"
                      }`}>{ep.method}</span>
                      <code className="text-[10px] font-medium text-foreground">{ep.path}</code>
                      <span className="ml-auto text-[9px] text-muted-foreground">{ep.desc}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ── Scene: DPDP Compliance (NEW) ─────────────────────── */

function SceneCompliance() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 1500),
      setTimeout(() => setStep(2), 3500),
      setTimeout(() => setStep(3), 5500),
      setTimeout(() => setStep(4), 7500),
      setTimeout(() => setStep(5), 9000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div {...fade} className="flex h-full">
      <MockSidebar active="Compliance" />
      <div className="flex-1 overflow-hidden p-5">
        <motion.div {...slideUp(0)} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">DPDP Compliance</h2>
              <p className="text-xs text-muted-foreground">Digital Personal Data Protection Act 2023</p>
            </div>
          </div>
          <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
            className="rounded-full bg-blue-100 px-3 py-1 text-[10px] font-semibold text-blue-700">
            ✓ DPDP Enabled
          </motion.span>
        </motion.div>

        {/* Encryption status */}
        <AnimatePresence>
          {step >= 1 && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-blue-50/30 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                    <Lock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">AES-256 Encryption Active</p>
                    <p className="text-[10px] text-muted-foreground">Key set on Mar 1, 2026 · Hint: ••••k3y9</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">100%</p>
                  <p className="text-[9px] text-muted-foreground">Contacts Encrypted</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats grid */}
        <AnimatePresence>
          {step >= 2 && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              className="mt-3 grid grid-cols-4 gap-3">
              {[
                { label: "Encrypted Contacts", value: "1,204", color: "text-blue-600", sub: "100% coverage" },
                { label: "Active Consents", value: "1,148", color: "text-blue-600", sub: "95.3% consent rate" },
                { label: "Data Requests", value: "3", color: "text-amber-600", sub: "2 pending" },
                { label: "PII Access Events", value: "847", color: "text-violet-600", sub: "All audited" },
              ].map((stat, i) => (
                <motion.div key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: i * 0.1 } }}
                  className="rounded-xl border border-border/60 bg-card p-3">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                  <p className={`mt-1 text-xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="mt-0.5 text-[9px] text-muted-foreground">{stat.sub}</p>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Consents & Data requests side by side */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <AnimatePresence>
            {step >= 3 && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border/60 bg-card p-3">
                <p className="mb-2 text-xs font-semibold text-foreground">Recent Consents</p>
                <div className="space-y-1.5">
                  {[
                    { user: "amit.s@acmecorp.com", purpose: "Marketing communications", status: "Active" },
                    { user: "priya.p@designhub.io", purpose: "Service notifications", status: "Active" },
                    { user: "raj.k@techstart.in", purpose: "Marketing communications", status: "Withdrawn" },
                  ].map((c, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, transition: { delay: i * 0.15 } }}
                      className="flex items-center justify-between rounded-lg bg-background px-3 py-1.5">
                      <div>
                        <p className="text-[10px] font-medium text-foreground">{c.user}</p>
                        <p className="text-[8px] text-muted-foreground">{c.purpose}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[8px] font-medium ${
                        c.status === "Active" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                      }`}>{c.status}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {step >= 4 && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border/60 bg-card p-3">
                <p className="mb-2 text-xs font-semibold text-foreground">Data Subject Requests</p>
                <div className="space-y-1.5">
                  {[
                    { type: "Erasure", status: "Pending", due: "Mar 15" },
                    { type: "Access", status: "Completed", due: "Mar 10" },
                    { type: "Correction", status: "Pending", due: "Mar 18" },
                  ].map((r, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, transition: { delay: i * 0.15 } }}
                      className="flex items-center justify-between rounded-lg bg-background px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`rounded px-1.5 py-0.5 text-[8px] font-semibold ${
                          r.type === "Erasure" ? "bg-red-100 text-red-700" :
                          r.type === "Access" ? "bg-blue-100 text-blue-700" :
                          "bg-amber-100 text-amber-700"
                        }`}>{r.type}</span>
                        <span className="text-[9px] text-muted-foreground">Due: {r.due}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[8px] font-medium ${
                          r.status === "Completed" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                        }`}>{r.status}</span>
                        {r.status === "Pending" && step >= 5 && (
                          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="rounded bg-primary px-2 py-0.5 text-[8px] font-semibold text-primary-foreground">
                            Process
                          </motion.span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Scene: Billing ───────────────────────────────────── */

function SceneBilling() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 1500),
      setTimeout(() => setStep(2), 3500),
      setTimeout(() => setStep(3), 6000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div {...fade} className="flex h-full">
      <MockSidebar active="Billing" />
      <div className="flex-1 overflow-hidden p-5">
        <motion.div {...slideUp(0)} className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Billing</h2>
            <p className="text-xs text-muted-foreground">Simple subscription plans — no per-message charges</p>
          </div>
        </motion.div>

        {/* Current plan status */}
        <motion.div {...slideUp(0.2)} className="mt-4 rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/[0.02] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Growth Plan — Active</p>
                <p className="text-[10px] text-muted-foreground">50,000 emails/month · Billed monthly</p>
              </div>
            </div>
            <div className="text-right">
              <AnimatedValue value="₹2,499/mo" delay={0.5} />
              <p className="text-[9px] text-muted-foreground">+ 18% GST</p>
            </div>
          </div>
        </motion.div>

        {/* Subscription plans */}
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {[
            { name: "Starter", price: "₹999", period: "/user/mo", billing: "Quarterly", emails: "10K emails", color: "border-border/40" },
            { name: "Growth", price: "₹2,499", period: "/mo", billing: "Monthly", emails: "50K emails", color: "border-primary ring-1 ring-primary/20", current: true },
            { name: "Scale", price: "₹5,999", period: "/mo", billing: "Monthly", emails: "2L emails", color: "border-border/40" },
          ].map((plan, i) => (
            <motion.div key={plan.name}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.5 + i * 0.15 } }}
              className={`rounded-xl border bg-card p-3.5 ${plan.color}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-foreground">{plan.name}</p>
                {plan.current && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[8px] font-semibold text-primary">Current</span>}
              </div>
              <p className="text-lg font-bold text-foreground">{plan.price}<span className="text-[9px] font-normal text-muted-foreground">{plan.period}</span></p>
              <p className="text-[9px] text-muted-foreground">{plan.billing} · {plan.emails}</p>
            </motion.div>
          ))}
        </div>

        {/* Payment history */}
        <AnimatePresence>
          {step >= 2 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-xl border border-border/60 bg-card p-4">
              <p className="mb-3 text-xs font-semibold text-foreground">Payment History</p>
              <div className="space-y-1.5">
                {[
                  { desc: "Growth plan — March 2026", amount: "₹2,948.82", status: "paid", time: "1 Mar 2026" },
                  { desc: "Growth plan — February 2026", amount: "₹2,948.82", status: "paid", time: "1 Feb 2026" },
                  { desc: "Growth plan — January 2026", amount: "₹2,948.82", status: "paid", time: "1 Jan 2026" },
                ].map((tx, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: i * 0.2 } }}
                    className="flex items-center justify-between rounded-lg bg-background px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[11px] text-foreground">{tx.desc}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-muted-foreground">{tx.time}</span>
                      <span className="text-xs font-semibold text-foreground">{tx.amount}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ── Scene: Outro ─────────────────────────────────────── */

function SceneOutro() {
  return (
    <motion.div {...fade} className="flex h-full flex-col items-center justify-center bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/3 left-1/3 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative text-4xl font-extrabold tracking-tight text-foreground"
      >
        Everything you need. Zero friction.
      </motion.h2>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="relative mt-8 grid grid-cols-4 gap-3"
      >
        {[
          { icon: Sparkles, title: "AI-Powered", desc: "Smart insights and AI campaign analytics" },
          { icon: FileText, title: "Email Templates", desc: "Create, manage, and reuse branded email templates" },
          { icon: Zap, title: "Drip Automations", desc: "Multi-step drip campaigns with branching and daily limits" },
          { icon: Users, title: "Contact Segments", desc: "Filter, tag, and save audiences for targeting" },
          { icon: ShieldCheck, title: "DPDP Compliance", desc: "AES-256 encryption, consent tracking, data rights" },
          { icon: Webhook, title: "Webhooks", desc: "Real-time HTTP callbacks for all platform events" },
          { icon: Code2, title: "REST API", desc: "Full API with scoped keys for external integrations" },
          { icon: IndianRupee, title: "Transparent Billing", desc: "Per-message pricing with self-serve Razorpay top-ups" },
        ].map((p, i) => (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 + i * 0.1 }}
            className="relative rounded-xl border border-border/60 bg-card p-4 text-center"
          >
            <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <p.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm font-bold text-foreground">{p.title}</p>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{p.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8 }}
        className="relative mt-8"
      >
        <Button size="lg" className="text-base px-8 shadow-xl shadow-primary/25" asChild>
          <Link to="/login?signup=true">
            Start Free — 100 Emails Included <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </motion.div>
    </motion.div>
  );
}

/* ── Main Demo Page ───────────────────────────────────── */

export default function Demo() {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  const currentScene = SCENES[sceneIndex];

  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      if (sceneIndex < SCENES.length - 1) {
        setSceneIndex((i) => i + 1);
      } else {
        setPlaying(false);
      }
    }, currentScene.duration);
    return () => clearTimeout(timer);
  }, [sceneIndex, playing, currentScene.duration]);

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => { setElapsed((e) => e + 100); }, 100);
    return () => clearInterval(interval);
  }, [playing]);

  useEffect(() => { setElapsed(0); }, [sceneIndex]);

  const totalElapsed = SCENES.slice(0, sceneIndex).reduce((s, sc) => s + sc.duration, 0) + elapsed;
  const progress = Math.min((totalElapsed / TOTAL) * 100, 100);

  const restart = useCallback(() => {
    setSceneIndex(0);
    setElapsed(0);
    setPlaying(true);
  }, []);

  const renderScene = () => {
    switch (currentScene.id) {
      case "intro": return <SceneIntro />;
      case "dashboard": return <SceneDashboard />;
      case "contacts": return <SceneContacts />;
      case "campaigns": return <SceneCampaigns />;
      case "templates": return <SceneTemplates />;
      case "automations": return <SceneAutomations />;
      case "developers": return <SceneDevelopers />;
      case "compliance": return <SceneCompliance />;
      case "billing": return <SceneBilling />;
      case "outro": return <SceneOutro />;
    }
  };

  return (
    <div className="flex h-screen flex-col bg-black">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-black px-4 py-2">
        <Link to="/" className="flex items-center gap-2 text-sm text-white/60 hover:text-white/80">
          <Mail className="h-4 w-4" />
          <span className="font-medium">In-Sync Demo</span>
        </Link>

        <div className="flex items-center gap-2">
          <div className="mr-4 hidden items-center gap-1 sm:flex">
            {SCENES.map((s, i) => (
              <button
                key={s.id}
                onClick={() => { setSceneIndex(i); setElapsed(0); setPlaying(true); }}
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
                  i === sceneIndex
                    ? "bg-primary text-primary-foreground"
                    : i < sceneIndex
                    ? "bg-white/20 text-white/60"
                    : "bg-white/5 text-white/30"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setPlaying(!playing)}
            className="rounded-lg bg-white/10 p-1.5 text-white/60 hover:bg-white/20 hover:text-white"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button onClick={restart} className="rounded-lg bg-white/10 p-1.5 text-white/60 hover:bg-white/20 hover:text-white">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-white/5">
        <motion.div className="h-full bg-primary" style={{ width: `${progress}%` }} transition={{ duration: 0.1 }} />
      </div>

      {/* Scene viewport */}
      <div className="flex-1 overflow-hidden">
        <div className="mx-auto h-full max-w-6xl">
          <AnimatePresence mode="wait">
            <motion.div key={currentScene.id} className="h-full">
              {renderScene()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
