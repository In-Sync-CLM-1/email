import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Play, Eye, ArrowLeft, ArrowRight, Upload, Download,
  FileText, AlertCircle, Loader2, X, Rocket, CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ─── Types ───

interface Template {
  id: string;
  name: string;
  content: string;
  category: string | null;
  language: string | null;
  status: string | null;
}

interface CsvRow {
  [key: string]: string;
}

interface CsvError {
  row: number;
  reason: string;
}

// ─── Helpers ───

const UPLOAD_BATCH = 5000;
const UPSERT_BATCH = 500;

function extractTemplateVars(text: string): string[] {
  const matches = text.match(/\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g);
  if (!matches) return [];
  const vars = [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")))];
  return vars.sort((a, b) => {
    const aNum = /^\d+$/.test(a);
    const bNum = /^\d+$/.test(b);
    if (aNum && bNum) return parseInt(a, 10) - parseInt(b, 10);
    if (aNum) return -1;
    if (bNum) return 1;
    return a.localeCompare(b);
  });
}

function resolveMessage(text: string, mapping: Record<string, string>, row: CsvRow): string {
  let resolved = text;
  for (const [varName, col] of Object.entries(mapping)) {
    resolved = resolved.replaceAll(`{{${varName}}}`, row[col] || `{{${varName}}}`);
  }
  return resolved;
}

/** Parse a single CSV line respecting quoted fields (e.g. "Doe, John") */
function parseCsvLine(line: string): string[] {
  const cols: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++; // skip escaped quote
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        cols.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
  }
  cols.push(cur.trim());
  return cols;
}

function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  // Strip BOM if present
  const clean = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
  const lines = clean.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const row: CsvRow = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] || "";
    });
    return row;
  });
  return { headers, rows };
}

function isEmailColumn(h: string): boolean {
  const l = h.toLowerCase();
  return l.includes("email") || l === "e-mail" || l === "mail";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-info/10 text-info",
  running: "bg-warning/10 text-warning",
  completed: "bg-success/10 text-success",
  failed: "bg-destructive/10 text-destructive",
};

// ─── Campaign List ───

function CampaignList({ onNew }: { onNew: () => void }) {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [launchingId, setLaunchingId] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    const { data } = await supabase
      .from("campaigns")
      .select("*")
      .eq("org_id", currentOrg.id)
      .order("created_at", { ascending: false });
    setCampaigns(data ?? []);
    setLoading(false);
  }, [currentOrg]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const launchCampaign = async (id: string) => {
    if (launchingId) return; // Prevent double-launch
    setLaunchingId(id);

    try {
      const { count } = await supabase
        .from("campaign_contacts")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", id);

      if (!count || count === 0) {
        toast({ variant: "destructive", title: "No contacts", description: "Assign contacts to this campaign first." });
        return;
      }

      // Find current status to know which transition to attempt
      const { data: camp } = await supabase.from("campaigns").select("status").eq("id", id).single();
      const fromStatus = camp?.status === "scheduled" ? "scheduled" : "draft";

      // Atomic status transition: draft/scheduled→running (prevents double-launch at DB level)
      const { data: transitioned } = await supabase.rpc("transition_campaign_status", {
        _campaign_id: id,
        _from_status: fromStatus,
        _to_status: "running",
      });

      if (!transitioned) {
        toast({ variant: "destructive", title: "Already launched", description: "This campaign is no longer launchable." });
        fetchCampaigns();
        return;
      }

      toast({ title: "Campaign launched!" });
      const { data: sendResult, error: invokeErr } = await supabase.functions.invoke("send-campaign", { body: { campaign_id: id } });
      if (invokeErr) {
        toast({ variant: "destructive", title: "Error", description: invokeErr.message || "Failed to start send" });
      } else if (sendResult?.error === "Trial email limit reached") {
        toast({
          variant: "destructive",
          title: "Trial Limit Reached",
          description: `You've used ${sendResult.trial_emails_used} of 100 trial emails. Subscribe to a plan to keep sending.`,
        });
      } else if (sendResult?.error === "Organization is suspended") {
        toast({
          variant: "destructive",
          title: "Organization Suspended",
          description: "Your trial has expired. Subscribe to a plan to reactivate.",
        });
      }
      fetchCampaigns();
    } finally {
      setLaunchingId(null);
    }
  };

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Campaigns</h1>
          <p className="text-muted-foreground">Create and manage email broadcast campaigns</p>
        </div>
        <Button className="gap-2" onClick={onNew}>
          <Plus className="h-4 w-4" /> New Campaign
        </Button>
      </div>

      {loading ? (
        <p className="py-8 text-center text-muted-foreground">Loading...</p>
      ) : campaigns.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No campaigns yet. Create your first one!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <Card key={c.id} className="border-border">
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{c.name}</CardTitle>
                  {c.description && <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>}
                </div>
                <Badge className={statusColor[c.status] || ""}>{c.status}</Badge>
              </CardHeader>
              <CardContent>
                {c.template_message && (
                  <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                    {c.template_message}
                  </p>
                )}
                {c.status === "scheduled" && c.scheduled_at && (
                  <p className="mb-3 text-xs text-muted-foreground">
                    Scheduled: {new Date(c.scheduled_at).toLocaleString()}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate(`/campaigns/${c.id}`)}>
                    <Eye className="h-3.5 w-3.5" /> View
                  </Button>
                  {(c.status === "draft" || c.status === "scheduled") && (
                    <Button size="sm" className="gap-1" onClick={() => launchCampaign(c.id)} disabled={launchingId === c.id}>
                      {launchingId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                      {launchingId === c.id ? "Launching..." : c.status === "scheduled" ? "Launch Now" : "Launch"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Campaign Creator (Single Page) ───

function CampaignCreator({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [subject, setSubject] = useState("");

  // CSV
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvErrors, setCsvErrors] = useState<CsvError[]>([]);

  // Variable mapping
  const [variableMapping, setVariableMapping] = useState<Record<string, string>>({});


  // Scheduling
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");

  // Launching + progress
  const [launching, setLaunching] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number; failed: number } | null>(null);

  // Derived
  const templateVars = useMemo(
    () => (selectedTemplate ? extractTemplateVars(selectedTemplate.content || "") : []),
    [selectedTemplate]
  );

  const displayContent = useMemo(
    () => (selectedTemplate ? (selectedTemplate.content || "") : ""),
    [selectedTemplate]
  );

  // Fetch approved templates
  useEffect(() => {
    if (!currentOrg) return;
    supabase
      .from("templates")
      .select("id, name, content, category, language, status")
      .eq("org_id", currentOrg.id)
      .eq("status", "approved")
      .then(({ data }) => setTemplates((data as any) || []));
  }, [currentOrg]);

  // Email column detection (primary)
  const emailColumn = useMemo(() => {
    return csvHeaders.find((h) => isEmailColumn(h)) || "";
  }, [csvHeaders]);

  // Auto-map variables
  useEffect(() => {
    if (templateVars.length === 0 || csvHeaders.length === 0) return;
    const auto: Record<string, string> = {};
    for (const varName of templateVars) {
      const braced = `{{${varName}}}`.toLowerCase();
      const raw = varName.toLowerCase();
      const match = csvHeaders.find((h) => {
        const hl = h.toLowerCase();
        return hl === raw || hl === braced;
      });
      if (match) {
        auto[varName] = match;
      }
    }
    setVariableMapping(auto);
  }, [templateVars, csvHeaders, emailColumn]);

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    file.text().then((text) => {
      const { headers, rows } = parseCsv(text);
      if (headers.length === 0) {
        toast({ variant: "destructive", title: "Invalid CSV", description: "No columns found." });
        return;
      }
      const emailCol = headers.find((h) => isEmailColumn(h));
      if (!emailCol) {
        toast({ variant: "destructive", title: "Missing email column", description: "CSV must have an email column." });
        return;
      }

      // Validate rows
      const errors: CsvError[] = [];
      const validRows: CsvRow[] = [];
      const seenEmails = new Set<string>();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rawEmail = row[emailCol] || "";
        const rowNum = i + 2;

        if (!rawEmail) {
          errors.push({ row: rowNum, reason: "Missing email" });
          continue;
        }

        if (!isValidEmail(rawEmail)) {
          errors.push({ row: rowNum, reason: `Invalid email: ${rawEmail}` });
          continue;
        }

        const normalizedEmail = rawEmail.trim().toLowerCase();
        if (seenEmails.has(normalizedEmail)) {
          errors.push({ row: rowNum, reason: `Duplicate: ${rawEmail}` });
          continue;
        }

        seenEmails.add(normalizedEmail);
        row[emailCol] = normalizedEmail;

        validRows.push(row);
      }

      setCsvErrors(errors);
      setCsvHeaders(headers);
      setCsvRows(validRows);
    });
  };

  const clearCsv = () => {
    setCsvHeaders([]);
    setCsvRows([]);
    setCsvFileName("");
    setCsvErrors([]);
  };

  const downloadCsvTemplate = () => {
    if (!selectedTemplate) return;
    const varCols = templateVars.map((v) => `{{${v}}}`);
    const cols = ["email", ...varCols];
    const header = cols.join(",");
    const sampleRow = (email: string) =>
      [email, ...templateVars.map((v) => `sample_${v}`)].join(",");
    const csv = [header, sampleRow("john@example.com"), sampleRow("jane@example.com")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "campaign_contacts.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const previewMessage = useMemo(() => {
    if (!selectedTemplate) return "";
    if (csvRows.length === 0) return displayContent;
    return resolveMessage(selectedTemplate.content || "", variableMapping, csvRows[0]);
  }, [selectedTemplate, displayContent, variableMapping, csvRows]);


  const canLaunch = !!selectedTemplate && csvRows.length > 0 && !!subject;

  const launch = async () => {
    if (!user || !currentOrg || !selectedTemplate) return;
    setLaunching(true);
    setUploadProgress({ done: 0, total: csvRows.length, failed: 0 });

    let createdCampaignId: string | null = null;
    let totalAssigned = 0;

    try {
      // 1. Create campaign
      const { data: campaign, error: campErr } = await supabase
        .from("campaigns")
        .insert({
          user_id: user.id,
          org_id: currentOrg.id,
          name: campaignName || `${selectedTemplate.name} - ${new Date().toLocaleDateString()}`,
          subject: subject || (selectedTemplate as any).subject || selectedTemplate.name,
          template_id: selectedTemplate.id,
          template_message: selectedTemplate.content,
          variable_mapping: variableMapping,
          message_category: (selectedTemplate.category || "marketing").toLowerCase(),
        } as any)
        .select("id")
        .single();
      if (campErr) throw campErr;
      createdCampaignId = campaign.id;

      // 3. Prepare contact inserts
      const nameCol = csvHeaders.find((h) => h.toLowerCase() === "name");
      const contactInserts = csvRows.map((row) => {
        const email = row[emailColumn] || "";
        const customFields: Record<string, string> = {};
        for (const h of csvHeaders) {
          if (h === emailColumn || h === nameCol) continue;
          if (row[h]) customFields[h] = row[h];
        }
        return {
          user_id: user.id,
          org_id: currentOrg.id,
          email,
          name: nameCol ? row[nameCol] || null : null,
          source: "campaign_csv",
          custom_fields: customFields,
        };
      }).filter((c) => c.email);

      // 4. Process in chunks of UPLOAD_BATCH (5000), each chunk sub-batched by UPSERT_BATCH (500)
      // On batch failure, retry record-by-record to isolate bad rows and continue
      let totalUploaded = 0;
      let totalFailed = 0;

      for (let chunkStart = 0; chunkStart < contactInserts.length; chunkStart += UPLOAD_BATCH) {
        const chunk = contactInserts.slice(chunkStart, chunkStart + UPLOAD_BATCH);
        const chunkContacts: { id: string; phone_number: string }[] = [];

        for (let i = 0; i < chunk.length; i += UPSERT_BATCH) {
          const batch = chunk.slice(i, i + UPSERT_BATCH);
          const { data, error } = await supabase
            .from("contacts")
            .upsert(batch, { onConflict: "email,org_id", ignoreDuplicates: false })
            .select("id, phone_number");

          if (error) {
            // Batch failed — retry each record individually to isolate bad rows
            for (const record of batch) {
              const { data: single, error: singleErr } = await supabase
                .from("contacts")
                .upsert(record, { onConflict: "email,org_id", ignoreDuplicates: false })
                .select("id, phone_number")
                .single();
              if (singleErr) {
                totalFailed++;
              } else if (single) {
                chunkContacts.push(single);
              }
            }
          } else {
            chunkContacts.push(...(data ?? []));
          }

          totalUploaded += batch.length;
          setUploadProgress({ done: totalUploaded, total: contactInserts.length, failed: totalFailed });
        }

        // Assign this chunk's contacts to campaign
        if (chunkContacts.length > 0) {
          const assignments = chunkContacts.map((c) => ({
            campaign_id: campaign.id,
            contact_id: c.id,
            org_id: currentOrg.id,
          }));
          for (let i = 0; i < assignments.length; i += UPSERT_BATCH) {
            const batch = assignments.slice(i, i + UPSERT_BATCH);
            const { error: assignErr } = await supabase.from("campaign_contacts").insert(batch);
            if (assignErr) {
              // Same fallback — retry individually
              for (const row of batch) {
                const { error: sErr } = await supabase.from("campaign_contacts").insert(row);
                if (sErr) totalFailed++;
                else totalAssigned++;
              }
            } else {
              totalAssigned += batch.length;
            }
          }
        }
      }

      if (totalAssigned === 0) {
        throw new Error("No contacts could be uploaded. Check your CSV data.");
      }

      // 5. Schedule or launch immediately
      if (scheduleMode && scheduledAt) {
        // Schedule for later
        await supabase
          .from("campaigns")
          .update({ status: "scheduled", scheduled_at: new Date(scheduledAt).toISOString() })
          .eq("id", campaign.id);

        const failNote = totalFailed > 0 ? ` (${totalFailed} records failed to upload)` : "";
        toast({
          title: "Campaign scheduled!",
          description: `Will send to ${totalAssigned.toLocaleString()} contacts at ${new Date(scheduledAt).toLocaleString()}.${failNote}`,
        });
      } else {
        // Launch immediately
        await supabase.rpc("transition_campaign_status", {
          _campaign_id: campaign.id,
          _from_status: "draft",
          _to_status: "running",
        });
        const { data: sendResult, error: invokeErr } = await supabase.functions.invoke("send-campaign", {
          body: { campaign_id: campaign.id },
        });

        if (invokeErr) {
          throw new Error(invokeErr.message || "Failed to start campaign send");
        }

        if (sendResult?.error === "Trial email limit reached") {
          toast({
            variant: "destructive",
            title: "Trial Limit Reached",
            description: `You've used ${sendResult.trial_emails_used} of 100 trial emails. Subscribe to a plan to keep sending.`,
          });
        } else if (sendResult?.error === "Organization is suspended") {
          toast({
            variant: "destructive",
            title: "Organization Suspended",
            description: "Your trial has expired. Subscribe to a plan to reactivate.",
          });
        } else {
          const failNote = totalFailed > 0 ? ` (${totalFailed} records failed to upload)` : "";
          toast({
            title: "Campaign launched!",
            description: `Sending to ${totalAssigned.toLocaleString()} contacts.${failNote}`,
          });
        }
      }

      navigate(`/campaigns/${campaign.id}`);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
      // Roll back: if we created a campaign row but no contacts got attached,
      // delete it so the user isn't left with an unlaunchable draft.
      if (createdCampaignId && totalAssigned === 0) {
        await supabase.from("campaigns").delete().eq("id", createdCampaignId);
      }
    } finally {
      setLaunching(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Create Campaign</h1>
      </div>

      <div className="flex gap-6 items-start">
        {/* ─── Left: Form ─── */}
        <div className="flex-1 space-y-6">
          {/* Section 1: Template & Name */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Template & Name</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Campaign Name</Label>
                <Input
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g., March Newsletter"
                />
              </div>
              <div>
                <Label>Subject Line *</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Your weekly update from Acme"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Supports variables like {"{{name}}"} from your template
                </p>
              </div>
              <div>
                <Label>Template</Label>
                {templates.length === 0 ? (
                  <p className="py-3 text-center text-sm text-muted-foreground">
                    No approved templates. Create and submit a template first.
                  </p>
                ) : (
                  <Select
                    value={selectedTemplate?.id || ""}
                    onValueChange={(val) => {
                      const t = templates.find((t) => t.id === val);
                      setSelectedTemplate(t || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} — {t.category || "marketing"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              {selectedTemplate && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{displayContent}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 2: Upload Contacts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contact List</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Format guide + download template — only show when template is selected and no CSV uploaded */}
              {!csvFileName && selectedTemplate && (
                <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 p-4 space-y-3">
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium text-foreground">CSV Format</p>
                    <p className="text-xs text-muted-foreground">
                      Your file must have an <span className="font-mono font-medium text-foreground">email</span> column{templateVars.length > 0 && <> and columns for each template variable (<span className="font-mono font-medium text-foreground">{templateVars.map((v) => `{{${v}}}`).join(", ")}</span>)</>}.
                    </p>
                  </div>
                  <div className="overflow-hidden rounded border bg-background">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">email</th>
                          {templateVars.map((v) => (
                            <th key={v} className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                              {`{{${v}}}`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="text-muted-foreground">
                        <tr className="border-b">
                          <td className="px-3 py-1.5">john@example.com</td>
                          {templateVars.map((v) => (
                            <td key={v} className="px-3 py-1.5">sample_{v}</td>
                          ))}
                        </tr>
                        <tr>
                          <td className="px-3 py-1.5">jane@example.com</td>
                          {templateVars.map((v) => (
                            <td key={v} className="px-3 py-1.5">sample_{v}</td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="default" size="sm" className="gap-2" onClick={downloadCsvTemplate}>
                      <Download className="h-3.5 w-3.5" /> Download Template
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-3.5 w-3.5" /> Upload CSV
                    </Button>
                  </div>
                </div>
              )}

              {/* Prompt to select template first */}
              {!csvFileName && !selectedTemplate && (
                <p className="py-3 text-center text-sm text-muted-foreground">
                  Select a template above to see the required CSV format.
                </p>
              )}

              {/* Buttons when CSV already loaded (for replacing) */}
              {csvFileName && (
                <div className="flex gap-3">
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-3.5 w-3.5" /> Replace CSV
                  </Button>
                  {selectedTemplate && templateVars.length > 0 && (
                    <Button variant="ghost" size="sm" className="gap-2" onClick={downloadCsvTemplate}>
                      <Download className="h-3.5 w-3.5" /> Download Template
                    </Button>
                  )}
                </div>
              )}
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />

              {csvFileName && (
                <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{csvFileName}</span>
                  <div className="ml-auto flex items-center gap-2">
                    <Badge variant="outline" className="gap-1">
                      <CheckCircle2 className="h-3 w-3 text-blue-600" />
                      {csvRows.length.toLocaleString()} valid
                    </Badge>
                    {csvErrors.length > 0 && (
                      <Badge variant="outline" className="gap-1 text-destructive border-destructive/30">
                        <AlertCircle className="h-3 w-3" />
                        {csvErrors.length.toLocaleString()} skipped
                      </Badge>
                    )}
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearCsv}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              {csvErrors.length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    View {csvErrors.length} skipped row{csvErrors.length > 1 ? "s" : ""}
                  </summary>
                  <div className="mt-1 max-h-32 overflow-y-auto rounded border p-2 space-y-0.5">
                    {csvErrors.slice(0, 50).map((e, i) => (
                      <p key={i} className="text-muted-foreground">
                        Row {e.row}: {e.reason}
                      </p>
                    ))}
                    {csvErrors.length > 50 && (
                      <p className="text-muted-foreground">...and {csvErrors.length - 50} more</p>
                    )}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Variable Mapping (conditional) */}
          {templateVars.length > 0 && csvRows.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Map Variables</CardTitle>
                <CardDescription className="text-xs">Connect template variables to CSV columns</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {templateVars.map((varName) => (
                    <div key={varName} className="flex items-center gap-3">
                      <div className="flex h-7 min-w-14 px-2 items-center justify-center rounded bg-primary/10 text-xs font-mono font-medium text-primary">
                        {`{{${varName}}}`}
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      <Select
                        value={variableMapping[varName] || ""}
                        onValueChange={(val) => setVariableMapping({ ...variableMapping, [varName]: val })}
                      >
                        <SelectTrigger className="w-44 h-8 text-sm">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {csvHeaders.map((h) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          {/* Launch Bar */}
          {selectedTemplate && csvRows.length > 0 && (
            <Card>
              <CardContent className="py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex gap-6 text-sm">
                    <div>
                      <span className="text-muted-foreground">Recipients:</span>{" "}
                      <span className="font-semibold">{csvRows.length.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Subject:</span>{" "}
                      <span className="font-semibold truncate max-w-[200px] inline-block align-bottom">{subject || "—"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scheduleMode}
                        onChange={(e) => setScheduleMode(e.target.checked)}
                        className="rounded"
                      />
                      Schedule
                    </label>
                    {scheduleMode && (
                      <input
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                      />
                    )}
                    <Button
                      onClick={launch}
                      disabled={!canLaunch || launching || (scheduleMode && !scheduledAt)}
                      className="gap-2 px-6"
                    >
                      {launching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                      {launching ? "Uploading..." : scheduleMode ? "Schedule Campaign" : "Launch Campaign"}
                    </Button>
                  </div>
                </div>
                {uploadProgress && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Uploading contacts...</span>
                      <span>
                        {uploadProgress.done.toLocaleString()} / {uploadProgress.total.toLocaleString()}
                        {uploadProgress.failed > 0 && (
                          <span className="text-destructive ml-2">({uploadProgress.failed} failed)</span>
                        )}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${Math.round((uploadProgress.done / uploadProgress.total) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ─── Right: Email Preview ─── */}
        {selectedTemplate && (
          <Card className="w-80 shrink-0 sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Email Preview</CardTitle>
              {csvRows.length > 0 && (
                <CardDescription className="text-xs">Using first row data</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-white overflow-hidden">
                {/* Email header */}
                <div className="border-b px-3 py-2 bg-muted/30 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-muted-foreground font-medium">Subject:</span>
                    <span className="text-foreground font-semibold truncate">{subject || "No subject"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-muted-foreground font-medium">To:</span>
                    <span className="text-muted-foreground truncate">
                      {csvRows.length > 0 && emailColumn ? csvRows[0][emailColumn] : "recipient@example.com"}
                    </span>
                  </div>
                </div>
                {/* Email body */}
                <div className="px-3 py-3">
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-gray-900">
                    {previewMessage || "Select a template to preview"}
                  </p>
                </div>
              </div>

              {/* Variable mapping summary */}
              {Object.keys(variableMapping).length > 0 && csvRows.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Variable Mapping</p>
                  {Object.entries(variableMapping).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2 text-xs">
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-primary">{`{{${k}}}`}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───

export default function Campaigns() {
  const [creating, setCreating] = useState(false);

  return (
    <DashboardLayout>
      {creating ? (
        <CampaignCreator onBack={() => setCreating(false)} />
      ) : (
        <CampaignList onNew={() => setCreating(true)} />
      )}
    </DashboardLayout>
  );
}
