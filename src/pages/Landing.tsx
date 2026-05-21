import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import {
  Mail,
  Users,
  BarChart3,
  Zap,
  Shield,
  ArrowRight,
  CheckCircle,
  Send,
  Globe,
  Clock,
  TrendingUp,
  MousePointerClick,
  FileCode,
  Check,
  Star,
  IndianRupee,
  ShieldCheck,
} from "lucide-react";

/* ── data ─────────────────────────────────────────────── */

const features = [
  {
    icon: ShieldCheck,
    title: "DPDP Compliance Built-In",
    description:
      "India's first email platform with native DPDP Act compliance — one-click unsubscribe, consent tracking, and data retention controls out of the box.",
    gradient: "from-emerald-500/20 to-teal-500/20",
    iconColor: "text-emerald-500",
  },
  {
    icon: Shield,
    title: "Deliverability Infrastructure",
    description:
      "Authenticated sending with SPF, DKIM, and DMARC — your emails land in inboxes, not spam folders. Domain verification and reputation monitoring included.",
    gradient: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-amber-500",
  },
  {
    icon: FileCode,
    title: "HTML Email Templates",
    description:
      "Design beautiful email campaigns with our drag-and-drop editor or import custom HTML templates with dynamic merge tags.",
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-500",
  },
  {
    icon: Users,
    title: "Contact Management",
    description:
      "Import contacts via CSV, organize with tags, and build segmented audiences for precision targeting.",
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-500",
  },
  {
    icon: MousePointerClick,
    title: "Open & Click Tracking",
    description:
      "Track opens, link clicks, and engagement metrics with live dashboards and exportable reports.",
    gradient: "from-violet-500/20 to-purple-500/20",
    iconColor: "text-violet-500",
  },
  {
    icon: Zap,
    title: "Enterprise Security",
    description:
      "Role-based access, encrypted credentials, and row-level data isolation keep your data safe.",
    gradient: "from-rose-500/20 to-pink-500/20",
    iconColor: "text-rose-500",
  },
  {
    icon: BarChart3,
    title: "Campaign Analytics",
    description:
      "Monitor every email in real-time with status tracking from sent to delivered to opened to clicked.",
    gradient: "from-sky-500/20 to-indigo-500/20",
    iconColor: "text-sky-500",
  },
];

const stats = [
  { value: 100, suffix: "+", label: "Active Businesses" },
  { value: 10, suffix: "M+", label: "Emails Delivered" },
  { value: 42, suffix: "%", label: "Avg. Open Rate" },
  { value: 5.8, suffix: "%", label: "Avg. Click Rate" },
];

const steps = [
  {
    icon: Globe,
    title: "Create Your Org",
    description: "Set up your organization in seconds with our guided onboarding flow.",
  },
  {
    icon: Users,
    title: "Import Contacts",
    description: "Upload your audience via CSV or add contacts manually with automatic deduplication and validation.",
  },
  {
    icon: Send,
    title: "Launch Campaigns",
    description: "Pick a template, select your audience, and hit send — emails land in inboxes within seconds.",
  },
  {
    icon: TrendingUp,
    title: "Track Results",
    description: "Watch opens, clicks, and bounce metrics roll in on your real-time dashboard.",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "999",
    period: "/user/mo",
    billing: "Billed quarterly",
    description: "For small teams & newsletters",
    highlight: false,
    features: [
      "10,000 emails/month",
      "3 sender domains",
      "HTML template editor",
      "Open & click tracking",
      "Email support",
    ],
    cta: "Start Free Trial",
    ctaLink: "/login?signup=true",
  },
  {
    name: "Growth",
    price: "2,499",
    period: "/mo",
    billing: "Monthly or quarterly",
    description: "For scaling businesses",
    highlight: true,
    features: [
      "50,000 emails/month",
      "Unlimited sender domains",
      "Full automation workflows",
      "AI Insights",
      "DPDP compliance tools",
      "Priority support",
    ],
    cta: "Start Free Trial",
    ctaLink: "/login?signup=true",
  },
  {
    name: "Scale",
    price: "5,999",
    period: "/mo",
    billing: "Monthly or quarterly",
    description: "For high-volume senders",
    highlight: false,
    features: [
      "2,00,000 emails/month",
      "Dedicated IP",
      "Advanced analytics",
      "Multi-user / roles",
      "SLA-backed support",
    ],
    cta: "Start Free Trial",
    ctaLink: "/login?signup=true",
  },
];

const clientLogos = [
  { src: "/logos/quess.png", alt: "Quess Corp" },
  { src: "/logos/motherson.jpg", alt: "Motherson" },
  { src: "/logos/hiranandani.png", alt: "Hiranandani" },
  { src: "/logos/audi.png", alt: "Audi" },
  { src: "/logos/college-dekho.jpg", alt: "College Dekho" },
  { src: "/logos/zolve.webp", alt: "Zolve" },
  { src: "/logos/capital-india.webp", alt: "Capital India" },
  { src: "/logos/ecofy.png", alt: "Ecofy" },
  { src: "/logos/zopper.png", alt: "Zopper" },
  { src: "/logos/alice-blue.png", alt: "Alice Blue" },
  { src: "/logos/ezeepay.png", alt: "Ezeepay" },
  { src: "/logos/incred.png", alt: "InCred" },
  { src: "/logos/seeds.png", alt: "Seeds" },
  { src: "/logos/growthvine.png", alt: "GrowthVine" },
  { src: "/logos/uhc.png", alt: "UHC" },
  { src: "/logos/car-trends.webp", alt: "Car Trends" },
  { src: "/logos/legitquest.png", alt: "LegitQuest" },
  { src: "/logos/evco.jpg", alt: "EV Co" },
  { src: "/logos/bluspring.png", alt: "BluSpring" },
  { src: "/logos/cubit.jpeg", alt: "Cubit" },
  { src: "/logos/smb-connect.jpg", alt: "SMB Connect" },
  { src: "/logos/rb.jpg", alt: "RB" },
];

/* ── animation helpers ────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

function AnimatedSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Animated counter ─────────────────────────────────── */

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1500;
    const increment = value / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, value]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

/* ── Floating particles for hero ──────────────────────── */

function FloatingParticles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-primary/10"
          style={{
            width: 8 + i * 12,
            height: 8 + i * 12,
            left: `${15 + i * 14}%`,
            top: `${20 + (i % 3) * 25}%`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 15 * (i % 2 === 0 ? 1 : -1), 0],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 4 + i * 0.7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.5,
          }}
        />
      ))}
    </div>
  );
}

/* ── Main component ───────────────────────────────────── */

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Nav ────────────────────────────────────── */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 border-b border-border/50 bg-background/60 backdrop-blur-xl"
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25">
              <Mail className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              In-Sync
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="hidden sm:inline-flex" asChild>
              <a href="#features">Features</a>
            </Button>
            <Button variant="ghost" className="hidden sm:inline-flex" asChild>
              <a href="#how-it-works">How It Works</a>
            </Button>
            <Button variant="ghost" className="hidden sm:inline-flex" asChild>
              <a href="#pricing">Pricing</a>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild className="shadow-lg shadow-primary/25">
              <Link to="/login?signup=true">
                Get Started <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </motion.header>

      {/* ── Hero ───────────────────────────────────── */}
      <section ref={heroRef} className="relative overflow-hidden">
        {/* Gradient mesh background */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/4 h-[600px] w-[600px] rounded-full bg-primary/8 blur-[120px]" />
          <div className="absolute -bottom-20 right-1/4 h-[400px] w-[400px] rounded-full bg-primary/6 blur-[100px]" />
          <div className="absolute top-1/3 right-1/3 h-[300px] w-[300px] rounded-full bg-sky-500/5 blur-[100px]" />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <FloatingParticles />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative mx-auto max-w-6xl px-4 pb-12 pt-20 sm:px-6 sm:pb-16 sm:pt-28 lg:pt-36"
        >
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-5 py-2 text-sm font-medium text-primary backdrop-blur-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Email Broadcast Platform for Growing Teams
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl"
            >
              Launch Email
              <br />
              Campaigns{" "}
              <span className="relative">
                <span className="bg-gradient-to-r from-primary via-sky-400 to-primary bg-clip-text text-transparent">
                  That Convert
                </span>
                <motion.span
                  className="absolute -bottom-2 left-0 h-1 rounded-full bg-gradient-to-r from-primary via-sky-400 to-primary"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                />
              </span>
            </motion.h1>

            {/* Subhead */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
            >
              India's first DPDP-compliant email platform with enterprise-grade
              deliverability — SPF, DKIM &amp; DMARC built in. Create your org,
              invite your team, and land in inboxes — not spam folders.
            </motion.p>

            {/* Hero highlight cards — Deliverability + DPDP */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="mx-auto mt-10 grid max-w-2xl gap-4 sm:grid-cols-2"
            >
              <div className="flex items-start gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 px-5 py-4 text-left backdrop-blur-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/15">
                  <Shield className="h-5 w-5 text-sky-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Deliverability Infrastructure</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    Authenticated sending with SPF, DKIM &amp; DMARC — land in inboxes, not spam folders
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4 text-left backdrop-blur-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">DPDP Compliance Built-In</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    One-click unsubscribe, consent tracking &amp; data retention — compliant out of the box
                  </p>
                </div>
              </div>
            </motion.div>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45 }}
              className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <Button
                size="lg"
                className="group relative overflow-hidden text-base px-8 shadow-xl shadow-primary/25 transition-shadow hover:shadow-2xl hover:shadow-primary/30"
                asChild
              >
                <Link to="/login?signup=true">
                  Start Free — 100 Emails Included
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="group text-base px-8 backdrop-blur-sm"
                asChild
              >
                <a href="#features">
                  <Clock className="mr-2 h-4 w-4" />
                  See Features
                </a>
              </Button>
            </motion.div>

            {/* Trust signals */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
            >
              {["DPDP-compliant", "SPF/DKIM/DMARC included", "100 free emails included", "No credit card required", "Setup in 2 minutes"].map(
                (t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-primary" />
                    {t}
                  </span>
                )
              )}
            </motion.div>
          </div>

        </motion.div>

        {/* Embedded product demo — outside parallax wrapper so it doesn't fade */}
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.7 }}
          className="relative mx-auto max-w-5xl px-4 pb-20 sm:px-6 sm:pb-28"
        >
          <div className="relative rounded-2xl border border-border/60 bg-black shadow-2xl shadow-primary/10 overflow-hidden">
            {/* Browser-style top bar */}
            <div className="flex items-center gap-2 border-b border-white/10 bg-black/80 px-4 py-2.5">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <div className="h-3 w-3 rounded-full bg-green-500/80" />
              </div>
              <div className="ml-3 flex-1 rounded-md bg-white/10 px-3 py-1 text-[11px] text-white/40">
                app.insync.live/demo
              </div>
            </div>
            <iframe
              src="/demo"
              title="In-Sync Product Demo"
              className="w-full border-0"
              style={{ height: "min(70vh, 540px)" }}
              loading="eager"
            />
          </div>
        </motion.div>
      </section>

      {/* ── Logo Marquee ───────────────────────────── */}
      <section className="relative border-t border-border/50 bg-muted/30 py-14 sm:py-16">
        <AnimatedSection className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.p
            variants={fadeUp}
            className="mb-10 text-center text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground"
          >
            Trusted by 100+ businesses across India
          </motion.p>
        </AnimatedSection>

        <div className="space-y-5 overflow-hidden">
          {[0, 1].map((row) => {
            const rowLogos =
              row === 0
                ? clientLogos.slice(0, Math.ceil(clientLogos.length / 2))
                : clientLogos.slice(Math.ceil(clientLogos.length / 2));
            const doubled = [...rowLogos, ...rowLogos];
            return (
              <div key={row} className="relative flex overflow-hidden">
                <div
                  className={`flex shrink-0 items-center gap-8 ${
                    row === 0 ? "animate-marquee" : "animate-marquee-reverse"
                  }`}
                >
                  {doubled.map((logo, i) => (
                    <div
                      key={`${row}-${i}`}
                      className="flex h-14 w-32 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-background/80 px-4 py-2 grayscale opacity-50 transition-all duration-300 hover:border-border hover:opacity-100 hover:grayscale-0 hover:shadow-md"
                    >
                      <img
                        src={logo.src}
                        alt={logo.alt}
                        className="max-h-full max-w-full object-contain"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Features ───────────────────────────────── */}
      <section id="features" className="relative overflow-hidden border-t border-border/50">
        {/* Subtle gradient bg */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/[0.03] blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          <AnimatedSection className="mx-auto max-w-2xl text-center">
            <motion.div
              variants={fadeUp}
              className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary"
            >
              <Zap className="h-3.5 w-3.5" />
              Features
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl"
            >
              Everything you need to
              <br />
              <span className="text-primary">run campaigns at scale</span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="mt-5 text-lg text-muted-foreground"
            >
              A complete toolkit for email marketing — from contact import to
              delivery analytics.
            </motion.p>
          </AnimatedSection>

          <AnimatedSection className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-7 backdrop-blur-sm transition-colors hover:border-primary/30"
              >
                {/* Gradient hover glow */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                />

                <div className="relative">
                  <div
                    className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.gradient} ring-1 ring-border/50`}
                  >
                    <f.icon className={`h-6 w-6 ${f.iconColor}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {f.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                    {f.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatedSection>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────── */}
      <section
        id="how-it-works"
        className="relative border-t border-border/50 bg-muted/30"
      >
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          <AnimatedSection className="mx-auto max-w-2xl text-center">
            <motion.div
              variants={fadeUp}
              className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary"
            >
              <Clock className="h-3.5 w-3.5" />
              How It Works
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl"
            >
              Up and running in{" "}
              <span className="text-primary">minutes</span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="mt-5 text-lg text-muted-foreground"
            >
              Four simple steps to your first campaign
            </motion.p>
          </AnimatedSection>

          <AnimatedSection className="relative mt-20 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Connecting line (desktop only) */}
            <div className="pointer-events-none absolute top-14 left-[12%] right-[12%] hidden h-px bg-gradient-to-r from-transparent via-border to-transparent lg:block" />

            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                variants={fadeUp}
                className="relative text-center"
              >
                {/* Step number ring */}
                <div className="relative mx-auto mb-6 flex h-28 w-28 items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-primary/20" />
                  <div className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-lg shadow-primary/25">
                    {i + 1}
                  </div>
                  <step.icon className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mx-auto mt-2 max-w-[240px] text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </AnimatedSection>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────── */}
      <section className="relative border-t border-border/50">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute bottom-0 left-1/3 h-[400px] w-[600px] rounded-full bg-primary/[0.04] blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          <AnimatedSection className="mx-auto max-w-2xl text-center mb-16">
            <motion.h2
              variants={fadeUp}
              className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl"
            >
              Powering email marketing{" "}
              <span className="text-primary">at scale</span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="mt-4 text-lg text-muted-foreground"
            >
              Businesses across industries trust In-Sync for their email
              campaigns
            </motion.p>
          </AnimatedSection>

          <AnimatedSection className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                variants={fadeUp}
                className="group rounded-2xl border border-border/50 bg-card/50 p-8 text-center backdrop-blur-sm transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
              >
                <p className="text-4xl font-extrabold text-primary sm:text-5xl">
                  <Counter value={s.value} suffix={s.suffix} />
                </p>
                <p className="mt-2 text-sm font-medium text-muted-foreground">
                  {s.label}
                </p>
              </motion.div>
            ))}
          </AnimatedSection>

          {/* Featured logos */}
          <AnimatedSection className="mt-16">
            <motion.div
              variants={fadeUp}
              className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6"
            >
              {clientLogos.slice(0, 12).map((logo) => (
                <div
                  key={logo.alt}
                  className="flex h-12 w-28 items-center justify-center grayscale opacity-40 transition-all duration-300 hover:opacity-100 hover:grayscale-0"
                >
                  <img
                    src={logo.src}
                    alt={logo.alt}
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                  />
                </div>
              ))}
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────── */}
      <section id="pricing" className="relative border-t border-border/50 bg-muted/30">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/2 left-1/2 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.03] blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          <AnimatedSection className="mx-auto max-w-2xl text-center">
            <motion.div
              variants={fadeUp}
              className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary"
            >
              <IndianRupee className="h-3.5 w-3.5" />
              Pricing
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl"
            >
              Simple, transparent{" "}
              <span className="text-primary">pricing</span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="mt-5 text-lg text-muted-foreground"
            >
              Every plan starts with 100 free emails. No credit card required.
            </motion.p>
          </AnimatedSection>

          <AnimatedSection className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <motion.div
                key={plan.name}
                variants={fadeUp}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className={`relative flex flex-col rounded-2xl border p-6 backdrop-blur-sm transition-colors ${
                  plan.highlight
                    ? "border-primary bg-primary/[0.03] shadow-lg shadow-primary/10 ring-1 ring-primary/20"
                    : "border-border/60 bg-card/80 hover:border-primary/30"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/25">
                      <Star className="h-3 w-3" /> Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-foreground">
                    ₹{plan.price}
                  </span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                  <p className="mt-1 text-xs text-muted-foreground">{plan.billing}</p>
                </div>

                <ul className="mb-8 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlight ? "text-primary" : "text-emerald-500"}`} />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${
                    plan.highlight
                      ? "shadow-lg shadow-primary/25"
                      : ""
                  }`}
                  variant={plan.highlight ? "default" : "outline"}
                  asChild
                >
                  <Link to={plan.ctaLink}>
                    {plan.cta}
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>
            ))}
          </AnimatedSection>

          <AnimatedSection className="mt-12">
            <motion.p variants={fadeUp} className="text-center text-sm text-muted-foreground">
              All paid plans include 18% GST. Need a custom plan?{" "}
              <a href="mailto:a@in-sync.co.in" className="font-medium text-primary hover:underline">
                Contact us
              </a>
            </motion.p>
          </AnimatedSection>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────── */}
      <section className="border-t border-border/50">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          <AnimatedSection>
            <motion.div
              variants={fadeUp}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-sky-600 px-6 py-20 text-center sm:px-16"
            >
              {/* Decorative elements */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-black/10 blur-3xl" />
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                    backgroundSize: "40px 40px",
                  }}
                />
              </div>

              <div className="relative">
                <h2 className="text-3xl font-bold text-primary-foreground sm:text-5xl">
                  Ready to reach your audience?
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-lg text-primary-foreground/80">
                  Register your organization in seconds and launch your first
                  email campaign today. Start free — send your first 100 emails on us.
                </p>
                <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="group text-base px-8 shadow-xl"
                    asChild
                  >
                    <Link to="/login?signup=true">
                      Start Free Trial
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                </div>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-primary-foreground/70">
                  {[
                    "No credit card required",
                    "Multi-tenant isolation",
                    "Enterprise-grade security",
                  ].map((t) => (
                    <span key={t} className="flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4" /> {t}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────── */}
      <footer className="border-t border-border/50 bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <Mail className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">In-Sync</span>
            </div>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} In-Sync. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
