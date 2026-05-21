import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { invokeErrorMessage } from "@/lib/invokeError";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Building2,
  Mail,
  Users,
  Rocket,
  ArrowRight,
  ArrowLeft,
  Check,
  SkipForward,
  Upload,
  Globe,
  Image,
  Loader2,
  Copy,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";

const INDUSTRIES = [
  "Technology", "Healthcare", "Education", "Retail", "Finance",
  "Real Estate", "Food & Beverage", "Travel", "Manufacturing", "Other",
];

type StepId = "profile" | "domain" | "sender" | "invite" | "launch";

interface StepDef {
  id: StepId;
  title: string;
  icon: any;
  description: string;
}

const STEPS: StepDef[] = [
  { id: "profile", title: "Business Profile", icon: Building2, description: "Tell us about your business" },
  { id: "domain", title: "Verify Domain", icon: Globe, description: "Verify your sending domain" },
  { id: "sender", title: "Sender Details", icon: Mail, description: "Configure your sender identity" },
  { id: "invite", title: "Invite Team", icon: Users, description: "Add team members" },
  { id: "launch", title: "Launch", icon: Rocket, description: "You're all set!" },
];

interface DnsRecord {
  type: string;
  name: string;
  value: string;
  status?: string;
}

export default function OnboardingWizard() {
  const { user } = useAuth();
  const { currentOrg, refreshOrgs } = useOrg();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step: Business profile
  const [orgName, setOrgName] = useState(currentOrg?.name ?? "");
  const [website, setWebsite] = useState(currentOrg?.website ?? "");
  const [industry, setIndustry] = useState(currentOrg?.industry ?? "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(currentOrg?.logo_url ?? null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Step: Domain
  const [domainInput, setDomainInput] = useState("");
  const [addingDomain, setAddingDomain] = useState(false);
  const [domainAdded, setDomainAdded] = useState(false);
  const [domainId, setDomainId] = useState<string | null>(null);
  const [domainStatus, setDomainStatus] = useState<string>("pending");
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);
  const [verifying, setVerifying] = useState(false);

  // Step: Sender details
  const [fromName, setFromName] = useState(currentOrg?.name ?? "");
  const [fromEmail, setFromEmail] = useState("");
  const [replyTo, setReplyTo] = useState("");

  // Step: Invite team
  const [inviteEmail, setInviteEmail] = useState("");

  if (!user || !currentOrg) {
    navigate("/login");
    return null;
  }

  const currentStepId = STEPS[step]?.id;
  const handleNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  // ── Logo handling ──
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Logo must be under 2MB." });
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return logoPreview;
    setUploadingLogo(true);
    const ext = logoFile.name.split(".").pop();
    const path = `${currentOrg.id}/logo.${ext}`;
    const { error } = await supabase.storage.from("org-logos").upload(path, logoFile, { upsert: true });
    setUploadingLogo(false);
    if (error) {
      toast({ variant: "destructive", title: "Logo upload failed", description: error.message });
      return null;
    }
    const { data: urlData } = supabase.storage.from("org-logos").getPublicUrl(path);
    return urlData.publicUrl;
  };

  // ── Save business profile ──
  const handleSaveProfile = async () => {
    if (!orgName.trim()) {
      toast({ variant: "destructive", title: "Validation", description: "Organization name is required." });
      return;
    }
    setLoading(true);
    try {
      let logoUrl = currentOrg.logo_url;
      if (logoFile) {
        logoUrl = await uploadLogo();
        if (!logoUrl) { setLoading(false); return; }
      }
      await supabase.functions.invoke("manage-org", {
        body: { action: "update", org_id: currentOrg.id, name: orgName, website, industry, logo_url: logoUrl },
      });
      toast({ title: "Profile saved" });
      handleNext();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
    setLoading(false);
  };

  // ── Add domain ──
  const handleAddDomain = async () => {
    if (!domainInput.trim()) return;
    setAddingDomain(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-domains", {
        body: { action: "add_domain", org_id: currentOrg.id, domain: domainInput.trim().toLowerCase() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setDomainAdded(true);
      setDomainId(data?.domain?.id || null);
      setDomainStatus(data?.domain?.status || "pending");
      setDnsRecords(data?.resend?.records || data?.domain?.dns_records || []);
      toast({ title: "Domain added", description: "Configure the DNS records below." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: await invokeErrorMessage(err) });
    }
    setAddingDomain(false);
  };

  // ── Verify domain ──
  const handleVerifyDomain = async () => {
    if (!domainId) return;
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-domains", {
        body: { action: "verify_domain", org_id: currentOrg.id, domain_id: domainId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setDomainStatus(data?.status || "pending");
      if (data?.records) setDnsRecords(data.records);

      if (data?.status === "verified") {
        toast({ title: "Domain verified!", description: "You can now send emails from this domain." });
        // Auto-populate from email
        if (!fromEmail) setFromEmail(`newsletter@${domainInput.trim().toLowerCase()}`);
      } else {
        toast({ title: "Not yet verified", description: "DNS records may take up to 48 hours to propagate. Try again later." });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Verification failed", description: await invokeErrorMessage(err) });
    }
    setVerifying(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  // ── Save sender config ──
  const handleSaveSender = async () => {
    if (!fromEmail.trim() || !fromName.trim()) {
      toast({ variant: "destructive", title: "Validation", description: "From name and email are required." });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-org", {
        body: {
          action: "update_credentials",
          org_id: currentOrg.id,
          from_name: fromName,
          from_email: fromEmail,
          reply_to: replyTo || fromEmail,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Sender configuration saved" });
      handleNext();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
    setLoading(false);
  };

  // ── Invite team ──
  const handleInvite = async () => {
    if (!inviteEmail) { handleNext(); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: {
          action: "create",
          org_id: currentOrg.id,
          email: inviteEmail,
          password: Math.random().toString(36).slice(-10) + "A1!",
          role: "member",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Team member invited" });
      setInviteEmail("");
      handleNext();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
    setLoading(false);
  };

  // ── Complete onboarding ──
  const handleComplete = async () => {
    setLoading(true);
    try {
      await supabase.functions.invoke("manage-org", {
        body: { action: "complete_onboarding", org_id: currentOrg.id },
      });
      await refreshOrgs();
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => confetti({ particleCount: 100, spread: 100, origin: { y: 0.5 } }), 300);
      toast({ title: "Welcome aboard! Your organization is ready." });
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
    setLoading(false);
  };

  const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction > 0 ? -300 : 300, opacity: 0 }),
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12 overflow-hidden">
      {/* Background pattern + gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/5" />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-3xl" />

      {/* Progress stepper */}
      <div className="relative z-10 mb-8 flex items-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1.5">
                <motion.div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                    i < step
                      ? "bg-primary text-primary-foreground"
                      : i === step
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground"
                  }`}
                  animate={{ scale: i === step ? 1.1 : 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {i < step ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </motion.div>
                <span className={`hidden text-[10px] font-medium sm:block ${i === step ? "text-primary" : i < step ? "text-foreground" : "text-muted-foreground"}`}>
                  {s.title}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-6 transition-colors sm:w-8 ${i < step ? "bg-primary" : "bg-muted"} mb-5 sm:mb-5`} />
              )}
            </div>
          );
        })}
      </div>

      <Card className="relative z-10 w-full max-w-lg border-border shadow-xl overflow-hidden">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{STEPS[step].title}</CardTitle>
          <p className="text-sm text-muted-foreground">{STEPS[step].description}</p>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait" custom={1}>
            <motion.div
              key={step}
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {/* ══════ Business Profile ══════ */}
              {currentStepId === "profile" && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-3">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="group relative flex h-24 w-24 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30 bg-muted/50 transition-colors hover:border-primary/50 hover:bg-muted overflow-hidden"
                    >
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                          <Image className="h-6 w-6" />
                          <span className="text-[10px]">Add Logo</span>
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <Upload className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleLogoSelect}
                    />
                    <p className="text-xs text-muted-foreground">PNG, JPG or WebP, max 2MB</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Organization Name *</Label>
                    <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme Corp" />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://acme.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Select value={industry} onValueChange={setIndustry}>
                      <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map((ind) => (
                          <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button onClick={handleSaveProfile} disabled={loading || uploadingLogo} className="gap-2">
                      {loading ? "Saving..." : <>Save & Continue <ArrowRight className="h-4 w-4" /></>}
                    </Button>
                  </div>
                </div>
              )}

              {/* ══════ Domain Verification ══════ */}
              {currentStepId === "domain" && (
                <div className="space-y-4">
                  {!domainAdded ? (
                    <>
                      <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-4">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                          <div className="text-sm text-muted-foreground">
                            <p className="font-medium text-blue-700 dark:text-blue-400">Why verify a domain?</p>
                            <p className="mt-1">
                              Domain verification proves you own the domain, improving deliverability
                              and preventing your emails from being marked as spam.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Your Sending Domain</Label>
                        <div className="flex gap-2">
                          <Input
                            value={domainInput}
                            onChange={(e) => setDomainInput(e.target.value)}
                            placeholder="yourdomain.com"
                            className="flex-1"
                            onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
                          />
                          <Button onClick={handleAddDomain} disabled={addingDomain || !domainInput.trim()}>
                            {addingDomain ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <Globe className="h-5 w-5 text-primary" />
                        <span className="font-semibold">{domainInput}</span>
                        {domainStatus === "verified" ? (
                          <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20">Verified</Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </div>

                      {domainStatus === "verified" ? (
                        <div className="flex flex-col items-center gap-3 py-4">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200 }}
                            className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10"
                          >
                            <CheckCircle2 className="h-8 w-8 text-blue-500" />
                          </motion.div>
                          <h4 className="font-semibold text-blue-700 dark:text-blue-400">Domain Verified!</h4>
                          <p className="text-sm text-muted-foreground text-center">
                            You can now send emails from this domain.
                          </p>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground">
                            Add these DNS records at your domain registrar, then click Verify.
                          </p>

                          {dnsRecords.length > 0 && (
                            <div className="rounded-lg border border-border overflow-hidden">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-muted/50">
                                    <th className="px-3 py-2 text-left font-medium">Type</th>
                                    <th className="px-3 py-2 text-left font-medium">Name</th>
                                    <th className="px-3 py-2 text-left font-medium">Value</th>
                                    <th className="px-3 py-2 w-8"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {dnsRecords.map((rec, i) => (
                                    <tr key={i} className="border-t border-border">
                                      <td className="px-3 py-2">
                                        <Badge variant="outline" className="font-mono text-[10px]">{rec.type}</Badge>
                                      </td>
                                      <td className="px-3 py-2 font-mono break-all max-w-[120px]">{rec.name}</td>
                                      <td className="px-3 py-2 font-mono break-all max-w-[180px]">{rec.value}</td>
                                      <td className="px-3 py-2">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => copyToClipboard(rec.value)}
                                        >
                                          <Copy className="h-3 w-3" />
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          <div className="flex justify-center pt-2">
                            <Button
                              onClick={handleVerifyDomain}
                              disabled={verifying}
                              variant="outline"
                              className="gap-2"
                            >
                              {verifying ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Checking...</>
                              ) : (
                                <><RefreshCw className="h-4 w-4" /> Verify DNS Records</>
                              )}
                            </Button>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  <div className="flex justify-between gap-2 pt-4">
                    <Button variant="outline" onClick={handleBack} className="gap-2">
                      <ArrowLeft className="h-4 w-4" /> Back
                    </Button>
                    <div className="flex gap-2">
                      {domainStatus !== "verified" && (
                        <Button variant="ghost" onClick={handleNext} className="gap-2">
                          <SkipForward className="h-4 w-4" /> Skip for now
                        </Button>
                      )}
                      {(domainStatus === "verified" || domainAdded) && (
                        <Button onClick={handleNext} className="gap-2">
                          Continue <ArrowRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ══════ Sender Details ══════ */}
              {currentStepId === "sender" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>From Name *</Label>
                    <Input
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      placeholder="Your Company Name"
                    />
                    <p className="text-xs text-muted-foreground">
                      How your name appears in the recipient's inbox
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>From Email *</Label>
                    <Input
                      value={fromEmail}
                      onChange={(e) => setFromEmail(e.target.value)}
                      placeholder="newsletter@yourdomain.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      Must use a verified domain
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Reply-To Email (optional)</Label>
                    <Input
                      value={replyTo}
                      onChange={(e) => setReplyTo(e.target.value)}
                      placeholder="support@yourdomain.com"
                    />
                  </div>
                  <div className="flex justify-between gap-2 pt-4">
                    <Button variant="outline" onClick={handleBack} className="gap-2">
                      <ArrowLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button onClick={handleSaveSender} disabled={loading} className="gap-2">
                      {loading ? "Saving..." : <>Save & Continue <ArrowRight className="h-4 w-4" /></>}
                    </Button>
                  </div>
                </div>
              )}

              {/* ══════ Invite Team ══════ */}
              {currentStepId === "invite" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@company.com" type="email" />
                  </div>
                  <p className="text-xs text-muted-foreground">They'll be added as a member. You can change roles later.</p>
                  <div className="flex justify-between gap-2 pt-4">
                    <Button variant="outline" onClick={handleBack} className="gap-2">
                      <ArrowLeft className="h-4 w-4" /> Back
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={handleNext} className="gap-2">
                        <SkipForward className="h-4 w-4" /> Skip
                      </Button>
                      <Button onClick={handleInvite} disabled={loading} className="gap-2">
                        {loading ? "Inviting..." : <>Invite & Continue <ArrowRight className="h-4 w-4" /></>}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ══════ Launch ══════ */}
              {currentStepId === "launch" && (
                <div className="space-y-6 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                    className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10"
                  >
                    <Rocket className="h-10 w-10 text-primary" />
                  </motion.div>
                  <div>
                    <h3 className="text-lg font-bold">You're all set!</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Your organization is ready. Head to the dashboard to create your first email campaign.
                    </p>
                  </div>
                  <div className="flex justify-between gap-2 pt-4">
                    <Button variant="outline" onClick={handleBack} className="gap-2">
                      <ArrowLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button onClick={handleComplete} disabled={loading} className="gap-2" size="lg">
                      {loading ? "Completing..." : <>Launch Dashboard <Rocket className="h-4 w-4" /></>}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Email marketing stats ribbon */}
      <div className="relative z-10 mt-10 grid w-full max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { value: "4200%", label: "Avg. Email ROI" },
          { value: "21%", label: "Avg. Open Rate" },
          { value: "4B+", label: "Email Users" },
          { value: "$42", label: "Return per $1" },
        ].map(({ value, label }) => (
          <div key={label} className="rounded-lg border border-border/50 bg-card/60 backdrop-blur-sm px-4 py-3 text-center">
            <p className="text-lg font-bold text-primary">{value}</p>
            <p className="text-[11px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
