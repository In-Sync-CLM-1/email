import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeErrorMessage } from "@/lib/invokeError";
import { useOrg } from "@/contexts/OrgContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, Mail, CreditCard, Loader2, Bot, Check, Globe, Trash2, RefreshCw,
  Copy, AlertCircle, CheckCircle2, Clock, XCircle,
} from "lucide-react";
import { motion } from "framer-motion";

interface DnsRecord {
  type: string;
  name: string;
  value: string;
  status?: string;
  ttl?: string;
  priority?: number;
}

interface SenderDomain {
  id: string;
  domain: string;
  status: string;
  dns_records: DnsRecord[];
  verified_at: string | null;
  created_at: string;
}

export default function OrgSettings() {
  const { currentOrg, refreshOrgs } = useOrg();
  const { toast } = useToast();

  // Profile
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  // Email config
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [emailConfigLoading, setEmailConfigLoading] = useState(false);

  // Domains
  const [domains, setDomains] = useState<SenderDomain[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [addingDomain, setAddingDomain] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  // AI Config
  const [aiConfig, setAiConfig] = useState({
    system_prompt: "You are a helpful email marketing assistant. Be concise and professional.",
    knowledge_base: "",
    enabled: true,
  });
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!currentOrg) return;
    let cancelled = false;
    setName(currentOrg.name);
    setWebsite(currentOrg.website ?? "");
    setIndustry(currentOrg.industry ?? "");

    // Fetch email credentials
    supabase.functions
      .invoke("manage-org", { body: { action: "get_credentials", org_id: currentOrg.id } })
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.credentials) {
          const c = data.credentials;
          setFromName(c.from_name ?? "");
          setFromEmail(c.from_email ?? "");
          setReplyTo(c.reply_to ?? "");
        }
      });

    // Fetch domains
    fetchDomains();

    // Fetch AI config
    supabase
      .from("ai_config" as any)
      .select("system_prompt, knowledge_base, enabled")
      .eq("org_id", currentOrg.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (cancelled || !data) return;
        setAiConfig({
          system_prompt: data.system_prompt ?? "",
          knowledge_base: data.knowledge_base ?? "",
          enabled: data.enabled ?? true,
        });
      });

    return () => { cancelled = true; };
  }, [currentOrg]);

  const fetchDomains = async () => {
    if (!currentOrg) return;
    const { data } = await supabase.functions.invoke("manage-domains", {
      body: { action: "list_domains", org_id: currentOrg.id },
    });
    if (data?.domains) setDomains(data.domains);
  };

  const saveProfile = async () => {
    if (!currentOrg) return;
    setProfileLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-org", {
        body: { action: "update", org_id: currentOrg.id, name, website, industry },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await refreshOrgs();
      toast({ title: "Profile updated" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
    setProfileLoading(false);
  };

  const saveEmailConfig = async () => {
    if (!currentOrg) return;
    setEmailConfigLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-org", {
        body: {
          action: "update_credentials",
          org_id: currentOrg.id,
          from_name: fromName,
          from_email: fromEmail,
          reply_to: replyTo,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Email configuration saved" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
    setEmailConfigLoading(false);
  };

  const handleAddDomain = async () => {
    if (!currentOrg || !newDomain.trim()) return;
    setAddingDomain(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-domains", {
        body: { action: "add_domain", org_id: currentOrg.id, domain: newDomain.trim().toLowerCase() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Domain added", description: "Add the DNS records below to verify your domain." });
      setNewDomain("");
      await fetchDomains();
      // Auto-expand the newly added domain
      if (data?.domain?.id) setExpandedDomain(data.domain.id);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: await invokeErrorMessage(err) });
    }
    setAddingDomain(false);
  };

  const handleVerifyDomain = async (domainId: string) => {
    if (!currentOrg) return;
    setVerifyingId(domainId);
    try {
      const { data, error } = await supabase.functions.invoke("manage-domains", {
        body: { action: "verify_domain", org_id: currentOrg.id, domain_id: domainId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.status === "verified") {
        toast({ title: "Domain verified!", description: "You can now send emails from this domain." });
      } else {
        toast({ title: "Verification in progress", description: "DNS records not yet propagated. Please wait and try again." });
      }
      await fetchDomains();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Verification failed", description: await invokeErrorMessage(err) });
    }
    setVerifyingId(null);
  };

  const handleDeleteDomain = async (domainId: string) => {
    if (!currentOrg) return;
    try {
      const { data, error } = await supabase.functions.invoke("manage-domains", {
        body: { action: "delete_domain", org_id: currentOrg.id, domain_id: domainId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Domain removed" });
      await fetchDomains();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: await invokeErrorMessage(err) });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const saveAiConfig = async () => {
    if (!currentOrg) return;
    setAiLoading(true);
    try {
      const { error } = await supabase
        .from("ai_config" as any)
        .upsert({
          org_id: currentOrg.id,
          system_prompt: aiConfig.system_prompt,
          knowledge_base: aiConfig.knowledge_base,
          enabled: aiConfig.enabled,
          updated_at: new Date().toISOString(),
        } as any, { onConflict: "org_id" });
      if (error) throw error;
      toast({ title: "AI configuration saved" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
    setAiLoading(false);
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "verified": return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
      case "failed": return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20">Verified</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Organization Settings</h1>
        <p className="mt-1 text-muted-foreground">Manage your organization profile and email configuration</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Profile
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" /> Email Configuration
          </TabsTrigger>
          <TabsTrigger value="domains" className="flex items-center gap-2">
            <Globe className="h-4 w-4" /> Domain Verification
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Bot className="h-4 w-4" /> AI Settings
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Billing
          </TabsTrigger>
        </TabsList>

        {/* ── Profile Tab ── */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Organization Profile</CardTitle>
              <CardDescription>Update your organization's public information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Organization Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Input value={industry} onChange={(e) => setIndustry(e.target.value)} />
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={saveProfile} disabled={profileLoading}>
                  {profileLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Email Configuration Tab ── */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Sender Configuration</CardTitle>
              <CardDescription>
                Configure how your broadcast emails appear to recipients.
                Make sure the sending domain is verified first.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From Name</Label>
                  <Input
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="Your Company Name"
                  />
                  <p className="text-xs text-muted-foreground">
                    The display name recipients see
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>From Email</Label>
                  <Input
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    placeholder="newsletter@yourdomain.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Must use a verified domain
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reply-To Email (optional)</Label>
                <Input
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  placeholder="support@yourdomain.com"
                />
                <p className="text-xs text-muted-foreground">
                  Where replies will be sent. Defaults to From Email if empty.
                </p>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={saveEmailConfig} disabled={emailConfigLoading}>
                  {emailConfigLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Email Config
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Domain Verification Tab ── */}
        <TabsContent value="domains">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Verify Sending Domain</CardTitle>
                <CardDescription>
                  Add your domain and configure DNS records to verify ownership.
                  This ensures your emails are delivered and not marked as spam.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Input
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    placeholder="yourdomain.com"
                    className="flex-1"
                    onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
                  />
                  <Button onClick={handleAddDomain} disabled={addingDomain || !newDomain.trim()}>
                    {addingDomain ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</>
                    ) : (
                      <>Add Domain</>
                    )}
                  </Button>
                </div>

                <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium text-blue-700 dark:text-blue-400">How domain verification works</p>
                      <ol className="mt-2 space-y-1 list-decimal list-inside">
                        <li>Add your domain above</li>
                        <li>Copy the DNS records shown below to your domain registrar</li>
                        <li>Wait for DNS propagation (usually 5-30 minutes)</li>
                        <li>Click "Verify" to check the records</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Domain list */}
            {domains.map((d) => (
              <Card key={d.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {statusIcon(d.status)}
                      <div>
                        <CardTitle className="text-base font-semibold">{d.domain}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Added {new Date(d.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {statusBadge(d.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      {d.status !== "verified" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVerifyDomain(d.id)}
                          disabled={verifyingId === d.id}
                          className="gap-1.5"
                        >
                          {verifyingId === d.id ? (
                            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying...</>
                          ) : (
                            <><RefreshCw className="h-3.5 w-3.5" /> Verify</>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteDomain(d.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedDomain(expandedDomain === d.id ? null : d.id)}
                      >
                        {expandedDomain === d.id ? "Hide DNS" : "Show DNS"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {expandedDomain === d.id && d.dns_records && d.dns_records.length > 0 && (
                  <CardContent className="pt-0">
                    <div className="rounded-lg border border-border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Type</th>
                            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Name / Host</th>
                            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Value</th>
                            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-16">Status</th>
                            <th className="px-4 py-2.5 w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {d.dns_records.map((rec: DnsRecord, i: number) => (
                            <tr key={i} className="border-t border-border">
                              <td className="px-4 py-3">
                                <Badge variant="outline" className="font-mono text-xs">{rec.type}</Badge>
                              </td>
                              <td className="px-4 py-3 font-mono text-xs break-all max-w-[200px]">
                                {rec.name}
                              </td>
                              <td className="px-4 py-3 font-mono text-xs break-all max-w-[300px]">
                                {rec.value}
                              </td>
                              <td className="px-4 py-3">
                                {rec.status === "verified" ? (
                                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                                ) : (
                                  <Clock className="h-4 w-4 text-yellow-500" />
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => copyToClipboard(rec.value)}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {d.status !== "verified" && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Add these records at your domain registrar (GoDaddy, Cloudflare, Namecheap, etc.).
                        DNS changes can take up to 48 hours to propagate, but usually complete within 30 minutes.
                      </p>
                    )}
                  </CardContent>
                )}

                {expandedDomain === d.id && (!d.dns_records || d.dns_records.length === 0) && (
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No DNS records available. Try clicking "Verify" to refresh.
                    </p>
                  </CardContent>
                )}
              </Card>
            ))}

            {domains.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Globe className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No domains added yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add your sending domain above to get started.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── AI Tab ── */}
        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle>AI Settings</CardTitle>
              <CardDescription>
                Configure AI-powered features for email content generation and campaign insights.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium">Enable AI Features</p>
                  <p className="text-xs text-muted-foreground">
                    AI-powered subject line suggestions, content generation, and campaign insights
                  </p>
                </div>
                <Switch
                  checked={aiConfig.enabled}
                  onCheckedChange={(v) => setAiConfig({ ...aiConfig, enabled: v })}
                />
              </div>

              <div className="space-y-2">
                <Label>Brand Voice</Label>
                <Textarea
                  value={aiConfig.system_prompt}
                  onChange={(e) => setAiConfig({ ...aiConfig, system_prompt: e.target.value })}
                  placeholder="Describe your brand's tone, style, and key messaging guidelines..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Tell the AI about your brand voice and communication style
                </p>
              </div>

              <div className="space-y-2">
                <Label>Knowledge Base</Label>
                <Textarea
                  value={aiConfig.knowledge_base}
                  onChange={(e) => setAiConfig({ ...aiConfig, knowledge_base: e.target.value })}
                  placeholder="Paste your product details, key features, value propositions, pricing, etc..."
                  rows={8}
                />
                <p className="text-xs text-muted-foreground">
                  The AI will use this information when generating email content
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={saveAiConfig} disabled={aiLoading}>
                  {aiLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save AI Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Billing Tab ── */}
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing</CardTitle>
              <CardDescription>Manage your subscription and payment methods</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="py-8 text-center text-muted-foreground">
                Billing features coming soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
