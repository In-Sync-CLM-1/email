import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { motion } from "framer-motion";
import {
  Mail,
  ArrowLeft,
  Sparkles,
  Shield,
  BarChart3,
  Send,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ── Animated inbox mockup ────────────────────────────── */

const mockEmails = [
  { from: "In-Sync", subject: "🎉 Campaign 'Spring Sale' is live!", preview: "Sent to 12,450 contacts — tracking opens & clicks...", time: "2m ago", opened: true, clicked: true },
  { from: "In-Sync", subject: "Weekly Performance Report", preview: "Open rate: 42.8% · Click rate: 12.3% · 0 bounces...", time: "1h ago", opened: true, clicked: false },
  { from: "In-Sync", subject: "Domain verified ✓", preview: "in-sync.co.in is now verified and ready for sending...", time: "3h ago", opened: true, clicked: false },
  { from: "In-Sync", subject: "Welcome to In-Sync!", preview: "You're all set. Start building your first campaign...", time: "1d ago", opened: true, clicked: true },
];

function InboxMockup() {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const timers = mockEmails.map((_, i) =>
      setTimeout(() => setVisible(i + 1), 800 + i * 600)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateY: -5 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className="relative mx-auto w-[320px]"
      style={{ perspective: 1000 }}
    >
      {/* Email client frame */}
      <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-2xl backdrop-blur-sm">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-4 py-2.5">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
          </div>
          <div className="flex-1 text-center">
            <span className="text-[10px] font-medium text-white/50">Inbox — In-Sync</span>
          </div>
        </div>

        {/* Email list */}
        <div className="divide-y divide-white/5">
          {mockEmails.slice(0, visible).map((email, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className={`px-4 py-3 transition-colors ${i === 0 ? "bg-white/10" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-white">{email.from}</span>
                    {email.opened && (
                      <span className="inline-flex items-center rounded-full bg-sky-400/20 px-1.5 py-0.5 text-[7px] font-medium text-sky-300">
                        Opened
                      </span>
                    )}
                    {email.clicked && (
                      <span className="inline-flex items-center rounded-full bg-emerald-400/20 px-1.5 py-0.5 text-[7px] font-medium text-emerald-300">
                        Clicked
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[10px] font-medium text-white/80">{email.subject}</p>
                  <p className="mt-0.5 truncate text-[9px] text-white/40">{email.preview}</p>
                </div>
                <span className="flex-shrink-0 whitespace-nowrap text-[8px] text-white/30">{email.time}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Compose button */}
        <div className="border-t border-white/10 px-4 py-3">
          <div className="flex items-center gap-2 rounded-lg bg-sky-500/20 px-3 py-2">
            <Send className="h-3 w-3 text-sky-300" />
            <span className="text-[10px] font-medium text-sky-200">Compose Campaign</span>
          </div>
        </div>
      </div>

      {/* Glow effect */}
      <div className="absolute -inset-10 -z-10 rounded-full bg-sky-400/10 blur-3xl" />
    </motion.div>
  );
}

/* ── Floating particles ───────────────────────────────── */

function FloatingParticles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white/10"
          style={{
            width: 6 + i * 10,
            height: 6 + i * 10,
            left: `${10 + i * 18}%`,
            top: `${15 + (i % 3) * 28}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 4 + i * 0.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.6,
          }}
        />
      ))}
    </div>
  );
}

/* ── Main component ───────────────────────────────────── */

export default function Login() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(searchParams.get("signup") === "true");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && user) navigate("/dashboard", { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    setIsSignUp(searchParams.get("signup") === "true");
  }, [searchParams]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleVerifyOtp = async () => {
    setOtpLoading(true);
    const { data, error } = await supabase.functions.invoke("verify-otp", {
      body: { email, otp_code: otpValue },
    });
    if (error || data?.error || !data?.tokenHash) {
      toast({ variant: "destructive", title: "Verification failed", description: data?.error || error?.message });
    } else {
      const { error: sessionErr } = await supabase.auth.verifyOtp({
        token_hash: data.tokenHash,
        type: "magiclink",
      });
      if (sessionErr) {
        toast({ variant: "destructive", title: "Login failed", description: sessionErr.message });
      }
      // AuthContext's onAuthStateChange fires → navigates to /dashboard
    }
    setOtpLoading(false);
  };

  const handleResend = async () => {
    const { data, error } = await supabase.functions.invoke("send-otp", {
      body: { email, action: "send" },
    });
    if (!error && !data?.error) {
      setSessionId(data.session_id);
      setResendCooldown(60);
      toast({ title: "Code resent", description: "A new code was sent to your email." });
    } else {
      toast({ variant: "destructive", title: "Failed to resend", description: data?.error || error?.message });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp && otpStep) return;
    setLoading(true);

    if (isForgotPassword) {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: { type: "reset_password", email },
      });
      if (error || data?.error) {
        toast({ variant: "destructive", title: "Error", description: data?.error || error?.message });
      } else {
        toast({ title: "Check your email", description: "If an account exists, we've sent a password reset link." });
      }
    } else if (isSignUp) {
      try {
        const { data, error } = await supabase.functions.invoke("send-email", {
          body: { type: "register", email, password },
        });
        if (error || data?.error) {
          const msg = data?.error || (typeof data === "string" ? data : null) || error?.message || "Something went wrong. Please try again.";
          toast({ variant: "destructive", title: "Sign up failed", description: msg });
        } else {
          setSessionId(data.session_id);
          setOtpStep(true);
          setResendCooldown(60);
          toast({ title: "Check your email", description: "Enter the 6-digit code we sent you." });
        }
      } catch (err: any) {
        toast({ variant: "destructive", title: "Sign up failed", description: err.message || "Something went wrong. Please try again." });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ variant: "destructive", title: "Login failed", description: error.message });
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* ── Left panel ── */}
      <div className="relative hidden w-1/2 overflow-hidden lg:flex lg:flex-col lg:justify-between">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e1a] via-[#0d1828] to-[#0a121e]" />

        {/* Layered color washes */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-primary/30 blur-[150px]" />
          <div className="absolute -bottom-40 -right-20 h-[450px] w-[450px] rounded-full bg-blue-500/20 blur-[130px]" />
          <div className="absolute top-1/3 right-1/4 h-72 w-72 rounded-full bg-sky-400/10 blur-[100px]" />
          <div className="absolute bottom-1/4 left-1/4 h-56 w-56 rounded-full bg-blue-300/8 blur-[90px]" />
        </div>

        {/* Fine grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Diagonal lines texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.1) 35px, rgba(255,255,255,0.1) 36px)",
          }}
        />

        {/* Noise grain overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
            backgroundSize: "128px 128px",
          }}
        />

        {/* Radial spotlight */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.06),transparent_60%)]" />

        <FloatingParticles />

        {/* Content */}
        <div className="relative z-10 flex flex-1 flex-col justify-between px-10 py-10 xl:px-14">
          {/* Top: Logo */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2.5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 shadow-lg backdrop-blur-sm">
              <Mail className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">In-Sync</span>
          </motion.div>

          {/* Center: Phone mockup + text */}
          <div className="flex flex-col items-center">
            <InboxMockup />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="mt-10 text-center"
            >
              <h2 className="text-2xl font-bold leading-tight text-white xl:text-3xl">
                Emails that convert.
                <br />
                <span className="text-white/70">Track every open.</span>
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/50">
                Launch campaigns, track opens & clicks in real time, and scale your email marketing — self-serve with transparent billing.
              </p>
            </motion.div>

            {/* Feature pills */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.5 }}
              className="mt-6 flex flex-wrap items-center justify-center gap-2"
            >
              {[
                { icon: BarChart3, text: "Open & Click Tracking" },
                { icon: Shield, text: "Domain Verification" },
                { icon: Sparkles, text: "Smart Automations" },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white/80 backdrop-blur-sm"
                >
                  <Icon className="h-3 w-3" />
                  {text}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Bottom: Stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.5 }}
          >
            <div className="grid grid-cols-3 gap-4 rounded-2xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur-sm">
              {[
                { value: "42%", label: "Avg Open Rate" },
                { value: "12%", label: "Click-through" },
                { value: "99.2%", label: "Delivery Rate" },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <p className="text-xl font-bold text-white">{value}</p>
                  <p className="text-[9px] font-medium uppercase tracking-widest text-white/40">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div className="relative flex flex-1 flex-col items-center justify-center bg-background px-6">
        {/* Subtle gradient for depth */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 right-0 h-[400px] w-[400px] rounded-full bg-primary/[0.03] blur-[100px]" />
        </div>

        <div className="relative w-full max-w-md">
          {/* Back link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
              <Link to="/">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to home
              </Link>
            </Button>
          </motion.div>

          {/* Form card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <div className="rounded-2xl border border-border/60 bg-card p-8 shadow-xl shadow-black/5">
              {/* Header */}
              <div className="mb-6 text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.3, type: "spring" }}
                  className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25"
                >
                  <Mail className="h-7 w-7 text-primary-foreground" />
                </motion.div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {isForgotPassword
                    ? "Reset password"
                    : isSignUp
                    ? "Create your account"
                    : "Welcome back"}
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {isForgotPassword
                    ? "Enter your email and we'll send you a reset link"
                    : isSignUp
                    ? "Sign up to start managing your email campaigns"
                    : "Sign in to your campaign dashboard"}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isSignUp && otpStep}
                    className="h-11"
                  />
                </div>
                {isSignUp && otpStep ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Enter the 6-digit code sent to <strong>{email}</strong>
                    </p>
                    <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
                      <InputOTPGroup>
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <InputOTPSlot key={i} index={i} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                    <Button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={otpValue.length !== 6 || otpLoading}
                      className="w-full"
                    >
                      {otpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Create Account"}
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => { setOtpStep(false); setOtpValue(""); }}
                        className="flex-1"
                      >
                        Change email
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleResend}
                        disabled={resendCooldown > 0}
                        className="flex-1"
                      >
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {!isForgotPassword && (
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-medium">
                          Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="h-11 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors z-10"
                            tabIndex={-1}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>
                    )}
                    <Button
                      type="submit"
                      className="h-11 w-full text-sm font-semibold shadow-lg shadow-primary/25"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Please wait...
                        </>
                      ) : isForgotPassword ? (
                        "Send Reset Link"
                      ) : isSignUp ? (
                        "Create Account"
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </>
                )}
              </form>

              {/* Forgot password */}
              {!isForgotPassword && !isSignUp && (
                <p className="mt-3 text-center">
                  <button
                    onClick={() => setIsForgotPassword(true)}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </p>
              )}

              {/* Toggle sign in / sign up */}
              <p className="mt-5 text-center text-sm text-muted-foreground">
                {isForgotPassword ? (
                  <button
                    onClick={() => setIsForgotPassword(false)}
                    className="font-medium text-primary hover:underline"
                  >
                    Back to sign in
                  </button>
                ) : (
                  <>
                    {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                    <button
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="font-medium text-primary hover:underline"
                    >
                      {isSignUp ? "Sign in" : "Sign up"}
                    </button>
                  </>
                )}
              </p>

              {/* Trial callout for sign up */}
              {isSignUp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-center"
                >
                  <p className="text-xs font-medium text-primary">
                    Start free — send your first 100 emails on us. No credit card required.
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Mobile-only branding (when left panel hidden) */}
          <div className="mt-8 text-center lg:hidden">
            <div className="mx-auto mb-2 flex items-center justify-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">In-Sync</span>
            </div>
            <p className="text-xs text-muted-foreground">
              AI-powered email broadcast platform
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
