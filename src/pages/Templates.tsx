import { useEffect, useState, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Loader2, ArrowLeft, FileText, Copy, Eye, Pencil,
} from "lucide-react";

// ─── Types ───

interface TemplateRow {
  id: string;
  name: string;
  content: string;
  subject: string | null;
  html_content: string | null;
  preview_text: string | null;
  category: string | null;
  language: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface BuilderForm {
  name: string;
  subject: string;
  bodyText: string;
  htmlContent: string;
  previewText: string;
  sampleValues: Record<string, string>;
}

const emptyForm: BuilderForm = {
  name: "",
  subject: "",
  bodyText: "",
  htmlContent: "",
  previewText: "",
  sampleValues: {},
};

// ─── Helpers ───

function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")))];
}

function resolveText(text: string, sampleMap: Record<string, string>): string {
  let resolved = text;
  for (const [varName, val] of Object.entries(sampleMap)) {
    if (val) resolved = resolved.replaceAll(`{{${varName}}}`, val);
  }
  return resolved;
}

// ─── Email Preview ───

function EmailPreview({ form }: { form: BuilderForm }) {
  const resolvedSubject = resolveText(form.subject, form.sampleValues);
  const resolvedBody = resolveText(form.bodyText, form.sampleValues);
  const resolvedHtml = resolveText(form.htmlContent, form.sampleValues);

  return (
    <div className="flex flex-col items-center">
      <div className="w-[320px] rounded-lg border bg-white shadow-lg overflow-hidden">
        {/* Email client chrome */}
        <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-2 border-b">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-blue-400" />
          <span className="ml-2 text-[10px] text-muted-foreground">Inbox</span>
        </div>

        {/* Email header */}
        <div className="border-b px-3 py-2.5 space-y-1">
          <p className="text-sm font-semibold text-foreground truncate">
            {resolvedSubject || "No subject"}
          </p>
          {form.previewText && (
            <p className="text-xs text-muted-foreground truncate">{form.previewText}</p>
          )}
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>From: Your Business</span>
          </div>
        </div>

        {/* Email body */}
        <div className="min-h-[200px] max-h-[350px] overflow-y-auto px-3 py-3">
          {resolvedHtml ? (
            <div
              className="text-[13px] leading-relaxed text-gray-900 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: resolvedHtml }}
            />
          ) : resolvedBody ? (
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-gray-900">
              {resolvedBody}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">Start typing to see a preview...</p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-3 py-2 bg-muted/20">
          <p className="text-[10px] text-muted-foreground text-center">
            Unsubscribe | Manage preferences
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs font-medium text-muted-foreground">Live Preview</p>
    </div>
  );
}

// ─── Template Builder ───

function TemplateBuilder({
  onBack,
  onCreated,
  editTemplate,
}: {
  onBack: () => void;
  onCreated: () => void;
  editTemplate?: TemplateRow | null;
}) {
  const { user } = useAuth();
  const { currentOrg } = useOrg();
  const { toast } = useToast();

  const [form, setForm] = useState<BuilderForm>(() => {
    if (editTemplate) {
      return {
        name: editTemplate.name,
        subject: editTemplate.subject || "",
        bodyText: editTemplate.content || "",
        htmlContent: editTemplate.html_content || "",
        previewText: editTemplate.preview_text || "",
        sampleValues: {},
      };
    }
    return { ...emptyForm };
  });
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(editTemplate?.html_content ? "html" : "text");
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const allContent = `${form.subject} ${form.bodyText} ${form.htmlContent}`;
  const allVariables = useMemo(() => extractVariables(allContent), [allContent]);

  const updateForm = (patch: Partial<BuilderForm>) => setForm((prev) => ({ ...prev, ...patch }));

  const [newVarName, setNewVarName] = useState("");

  const insertVariable = () => {
    const varTag = newVarName.trim() ? `{{${newVarName.trim().replace(/\s+/g, "_")}}}` : "";
    if (!varTag) return;
    const textarea = bodyRef.current;
    if (textarea && activeTab === "text") {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = form.bodyText;
      const newText = text.slice(0, start) + varTag + text.slice(end);
      updateForm({ bodyText: newText });
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + varTag.length;
      }, 0);
    } else if (activeTab === "text") {
      updateForm({ bodyText: form.bodyText + varTag });
    } else {
      updateForm({ htmlContent: form.htmlContent + varTag });
    }
    setNewVarName("");
  };

  const handleSubmit = async () => {
    if (!user || !currentOrg) return;

    if (!form.name.trim()) {
      toast({ variant: "destructive", title: "Validation", description: "Template name is required." });
      return;
    }
    if (!form.subject.trim()) {
      toast({ variant: "destructive", title: "Validation", description: "Subject line is required." });
      return;
    }
    if (!form.bodyText.trim() && !form.htmlContent.trim()) {
      toast({ variant: "destructive", title: "Validation", description: "Email body is required (text or HTML)." });
      return;
    }

    setSubmitting(true);
    try {
      const templateData = {
        user_id: user.id,
        org_id: currentOrg.id,
        name: form.name,
        subject: form.subject,
        content: form.bodyText,
        html_content: form.htmlContent || null,
        preview_text: form.previewText || null,
        status: "approved",
        category: "marketing",
        language: "en",
      };

      if (editTemplate) {
        const { error } = await supabase
          .from("templates")
          .update(templateData as any)
          .eq("id", editTemplate.id);
        if (error) throw error;
        toast({ title: "Template updated" });
      } else {
        const { error } = await supabase
          .from("templates")
          .insert(templateData as any);
        if (error) throw error;
        toast({ title: "Template created" });
      }

      onCreated();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Save failed", description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top bar */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {editTemplate ? "Edit Template" : "Create Template"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Build your email template with subject, body text, and optional HTML
          </p>
        </div>
        <Button onClick={handleSubmit} disabled={submitting} className="gap-2 px-6">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {editTemplate ? "Save Changes" : "Create Template"}
        </Button>
      </div>

      <div className="flex gap-6 items-start">
        {/* ── Left: Form ── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Basic Info */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Template Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Template Name *</Label>
                <Input
                  placeholder="e.g., Monthly Newsletter"
                  value={form.name}
                  onChange={(e) => updateForm({ name: e.target.value })}
                />
              </div>
              <div>
                <Label>Subject Line *</Label>
                <Input
                  placeholder="e.g., Your weekly update from {{company}}"
                  value={form.subject}
                  onChange={(e) => updateForm({ subject: e.target.value })}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Use {"{{name}}"}, {"{{company}}"}, etc. for personalization variables
                </p>
              </div>
              <div>
                <Label>Preview Text</Label>
                <Input
                  placeholder="Brief text shown in inbox alongside the subject"
                  value={form.previewText}
                  onChange={(e) => updateForm({ previewText: e.target.value })}
                  maxLength={150}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {form.previewText.length}/150 characters
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Email Body */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Email Body *</CardTitle>
              <CardDescription>Write your email content. Use the Text tab for plain text or HTML tab for rich formatting.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex items-center justify-between">
                  <TabsList>
                    <TabsTrigger value="text">Plain Text</TabsTrigger>
                    <TabsTrigger value="html">HTML</TabsTrigger>
                  </TabsList>
                  <div className="flex items-center gap-1">
                    <Input
                      placeholder="variable name"
                      value={newVarName}
                      onChange={(e) => setNewVarName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), insertVariable())}
                      className="h-7 w-32 text-xs"
                    />
                    <Button type="button" variant="ghost" size="sm" className="gap-1 text-xs" onClick={insertVariable}>
                      <Plus className="h-3 w-3" /> Insert
                    </Button>
                  </div>
                </div>

                <TabsContent value="text" className="mt-3">
                  <Textarea
                    ref={bodyRef}
                    placeholder="Hi {{name}},&#10;&#10;We're excited to share our latest updates with you..."
                    rows={10}
                    value={form.bodyText}
                    onChange={(e) => updateForm({ bodyText: e.target.value })}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {form.bodyText.length} characters
                  </p>
                </TabsContent>

                <TabsContent value="html" className="mt-3">
                  <Textarea
                    placeholder='<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">&#10;  <h1>Hello {{name}}</h1>&#10;  <p>Your content here...</p>&#10;</div>'
                    rows={14}
                    value={form.htmlContent}
                    onChange={(e) => updateForm({ htmlContent: e.target.value })}
                    className="font-mono text-xs"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {form.htmlContent.length} characters — HTML is used as the email body when provided
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Sample Values */}
          {allVariables.length > 0 && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Sample Values</CardTitle>
                <CardDescription>
                  Provide example values for each variable to preview personalization.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {allVariables.map((varName) => (
                    <div key={varName} className="flex items-center gap-2">
                      <Badge variant="secondary" className="shrink-0 font-mono text-xs">{`{{${varName}}}`}</Badge>
                      <Input
                        placeholder={`e.g., sample ${varName}`}
                        value={form.sampleValues[varName] || ""}
                        onChange={(e) => {
                          updateForm({ sampleValues: { ...form.sampleValues, [varName]: e.target.value } });
                        }}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bottom actions */}
          <div className="flex gap-3 pb-8">
            <Button variant="outline" onClick={onBack}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2 flex-1 max-w-xs">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editTemplate ? "Save Changes" : "Create Template"}
            </Button>
          </div>
        </div>

        {/* ── Right: Preview ── */}
        <div className="hidden lg:block sticky top-6 shrink-0">
          <EmailPreview form={form} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Templates Page ───

export default function Templates() {
  const { user } = useAuth();
  const { currentOrg } = useOrg();
  const { toast } = useToast();

  const [view, setView] = useState<"list" | "builder">("list");
  const [editTemplate, setEditTemplate] = useState<TemplateRow | null>(null);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = async () => {
    if (!currentOrg) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("templates")
      .select("*")
      .eq("org_id", currentOrg.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      setTemplates((data as unknown as TemplateRow[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!currentOrg) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("templates")
        .select("*")
        .eq("org_id", currentOrg.id)
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setTemplates((data as unknown as TemplateRow[]) || []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [currentOrg]);

  const handleDelete = async (id: string) => {
    if (!currentOrg) return;
    try {
      const { error } = await supabase
        .from("templates")
        .delete()
        .eq("id", id)
        .eq("org_id", currentOrg.id);
      if (error) throw error;
      toast({ title: "Template deleted" });
      fetchTemplates();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Delete failed", description: err.message });
    }
  };

  if (view === "builder") {
    return (
      <DashboardLayout>
        <TemplateBuilder
          onBack={() => { setView("list"); setEditTemplate(null); }}
          onCreated={() => {
            setView("list");
            setEditTemplate(null);
            fetchTemplates();
          }}
          editTemplate={editTemplate}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Templates</h1>
          <p className="text-muted-foreground">Create and manage your email templates</p>
        </div>
        <Button className="gap-2" onClick={() => { setEditTemplate(null); setView("builder"); }}>
          <Plus className="h-4 w-4" /> New Template
        </Button>
      </div>

      {/* Template Cards */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array(3).fill(0).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-24 bg-muted/20" />
              <CardContent className="h-20" />
            </Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-lg font-medium text-muted-foreground">No templates yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first email template to get started with campaigns.
            </p>
            <Button className="mt-4 gap-2" onClick={() => setView("builder")}>
              <Plus className="h-4 w-4" /> Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id} className="group relative overflow-hidden transition-all hover:border-primary/30">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => { setEditTemplate(t); setView("builder"); }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(t.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {t.subject && (
                  <CardDescription className="text-xs font-medium">
                    Subject: {t.subject}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <p className="line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">
                  {t.content || t.html_content?.replace(/<[^>]*>/g, "").slice(0, 200) || "No content"}
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{new Date(t.created_at).toLocaleDateString()}</span>
                  {t.html_content && (
                    <>
                      <span>-</span>
                      <Badge variant="secondary" className="text-[10px]">HTML</Badge>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
