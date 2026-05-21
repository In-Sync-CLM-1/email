// send-campaign edge function — sends email campaign messages in batches via Resend
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 10;
const SEND_DELAY_MS = 200; // Delay between sends to respect Resend rate limits
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { campaign_id, offset = 0 } = body;

    // Determine if this is an internal/trusted call (from launch-scheduled or self-chaining)
    // by checking if the Bearer token is the service role key.
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "") ?? "";
    const isInternalCall = token === supabaseServiceKey;

    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Fetch campaign ──
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();

    if (!campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Auth: skip user JWT check for internal calls (service role key); require it otherwise ──
    if (!isInternalCall) {
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: membership } = await supabase
        .from("org_memberships")
        .select("role")
        .eq("user_id", user.id)
        .eq("org_id", campaign.org_id)
        .maybeSingle();
      const { data: isPlatformAdmin } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "platform_admin",
      });
      if (!isPlatformAdmin && (!membership || membership.role !== "admin")) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Atomic status check ──
    if (!isInternalCall) {
      const { data: transitioned } = await supabase.rpc("transition_campaign_status", {
        _campaign_id: campaign_id,
        _from_status: "running",
        _to_status: "running",
      });
      if (!transitioned) {
        return new Response(JSON.stringify({ error: "Campaign is not running", status: campaign.status }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (isInternalCall && campaign.status !== "running") {
      return new Response(JSON.stringify({ error: "Campaign is not running", status: campaign.status }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = campaign.org_id;

    // ── Check org status & trial limits ──
    const { data: org } = await supabase
      .from("organizations")
      .select("org_status, trial_emails_used")
      .eq("id", orgId)
      .single();

    if (org?.org_status === "suspended") {
      return new Response(JSON.stringify({ error: "Organization is suspended", suspended: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (org?.org_status === "trial") {
      // Count total contacts in this campaign to check against remaining trial quota
      const { count: totalContacts } = await supabase
        .from("campaign_contacts")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign_id);

      const remaining = 100 - (org.trial_emails_used || 0);
      if ((totalContacts ?? 0) > remaining) {
        await supabase.rpc("transition_campaign_status", {
          _campaign_id: campaign_id,
          _from_status: "running",
          _to_status: "failed",
        });
        return new Response(JSON.stringify({
          error: "Trial email limit reached",
          trial_emails_used: org.trial_emails_used,
          limit: 100,
          remaining,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Get org email config ──
    const { data: creds } = await supabase
      .from("org_credentials")
      .select("from_email, from_name, reply_to, from_domain")
      .eq("org_id", orgId)
      .maybeSingle();

    const fromEmail = campaign.from_email || creds?.from_email || "noreply@in-sync.co.in";
    const fromName = campaign.from_name || creds?.from_name || "In-Sync";
    const replyTo = campaign.reply_to || creds?.reply_to || fromEmail;
    const fromHeader = `${fromName} <${fromEmail}>`;

    // ── Fetch template ──
    let emailSubject = campaign.subject || "";
    let emailHtml = "";
    let tplContent = "";

    if (campaign.template_id) {
      const { data: tpl } = await supabase
        .from("templates")
        .select("name, content, subject, html_content, preview_text")
        .eq("id", campaign.template_id)
        .single();
      if (tpl) {
        emailSubject = emailSubject || tpl.subject || tpl.name;
        emailHtml = tpl.html_content || "";
        tplContent = tpl.content || "";
      }
    }

    if (!emailSubject) {
      await supabase.rpc("transition_campaign_status", { _campaign_id: campaign_id, _from_status: "running", _to_status: "failed" });
      return new Response(JSON.stringify({ error: "Campaign has no subject line" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract named variables from template content
    const allContent = `${emailSubject} ${tplContent} ${emailHtml}`;
    const varMatches = allContent.match(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g);
    const varNames = varMatches
      ? [...new Set(varMatches.map((v) => v.replace(/\{\{|\}\}/g, "")))]
      : [];

    // ── Fetch this batch of contacts ──
    const { data: assignments } = await supabase
      .from("campaign_contacts")
      .select("contact_id, contacts(id, email, name, phone_number, custom_fields)")
      .eq("campaign_id", campaign_id)
      .order("created_at", { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    const contacts = (assignments ?? [])
      .map((a: any) => a.contacts)
      .filter(Boolean);

    // ── No contacts — campaign is done ──
    if (contacts.length === 0) {
      const { count: sentCount } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign_id)
        .eq("status", "sent");

      const { count: failedCount } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign_id)
        .eq("status", "failed");

      const finalStatus = (sentCount ?? 0) === 0 ? "failed" : "completed";
      await supabase.rpc("transition_campaign_status", { _campaign_id: campaign_id, _from_status: "running", _to_status: finalStatus });

      return new Response(JSON.stringify({
        success: true,
        done: true,
        sent: sentCount ?? 0,
        failed: failedCount ?? 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mapping = campaign.variable_mapping as Record<string, string> | null;

    let batchSent = 0;
    let batchFailed = 0;

    // ── Process this batch ──
    for (let ci = 0; ci < contacts.length; ci++) {
      if (ci > 0) await sleep(SEND_DELAY_MS);
      const contact = contacts[ci];

      // Skip contacts without email
      if (!contact.email) {
        const { data: msgRecord } = await supabase
          .from("messages")
          .insert({
            campaign_id,
            contact_id: contact.id,
            content: "No email address",
            status: "failed",
            error_message: "Contact has no email address",
            org_id: orgId,
            subject: emailSubject,
          })
          .select("id")
          .single();
        batchFailed++;
        continue;
      }

      // Check if contact is unsubscribed
      const { data: unsub } = await supabase
        .from("unsubscribes")
        .select("id")
        .eq("org_id", orgId)
        .eq("email", contact.email)
        .maybeSingle();

      if (unsub) {
        await supabase
          .from("messages")
          .insert({
            campaign_id,
            contact_id: contact.id,
            content: "Unsubscribed",
            status: "failed",
            error_message: "Contact is unsubscribed",
            org_id: orgId,
            subject: emailSubject,
          });
        batchFailed++;
        continue;
      }

      const resolveField = (field: string): string => {
        if (field === "name") return contact.name || "there";
        if (field === "email") return contact.email || "";
        if (field === "phone_number") return contact.phone_number || "";
        return (contact.custom_fields as Record<string, string>)?.[field] || "";
      };

      // Resolve variables in subject, content, and HTML
      let personalizedSubject = emailSubject;
      let personalizedContent = tplContent;
      let personalizedHtml = emailHtml;

      if (mapping) {
        for (const [varName, field] of Object.entries(mapping)) {
          const value = resolveField(field);
          personalizedSubject = personalizedSubject.replaceAll(`{{${varName}}}`, value);
          personalizedContent = personalizedContent.replaceAll(`{{${varName}}}`, value);
          personalizedHtml = personalizedHtml.replaceAll(`{{${varName}}}`, value);
        }
      }

      // Build unsubscribe URL
      const siteUrl = Deno.env.get("SITE_URL") || "https://email.in-sync.co.in";
      const unsubToken = btoa(JSON.stringify({ org_id: orgId, email: contact.email }));
      const unsubscribeUrl = `${supabaseUrl}/functions/v1/unsubscribe?token=${encodeURIComponent(unsubToken)}`;

      // Build email body — use HTML template if available, otherwise wrap plain text
      const unsubscribeFooter = `
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e5e5; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #999;">
            <a href="${unsubscribeUrl}" style="color: #999; text-decoration: underline;">Unsubscribe</a> from these emails.
          </p>
        </div>`;
      const bodyHtml = personalizedHtml || `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          ${personalizedContent.split('\n').map((line: string) => `<p style="margin: 0 0 12px; line-height: 1.6; color: #333;">${line}</p>`).join('')}
        </div>`;
      const finalHtml = bodyHtml + unsubscribeFooter;

      // Create message record
      const { data: msgRecord, error: msgInsertErr } = await supabase
        .from("messages")
        .insert({
          campaign_id,
          contact_id: contact.id,
          content: personalizedContent,
          subject: personalizedSubject,
          status: "pending",
          org_id: orgId,
        })
        .select("id")
        .single();

      if (msgInsertErr || !msgRecord) {
        console.error("Failed to create message record:", msgInsertErr?.message);
        batchFailed++;
        continue;
      }

      try {
        // Send via Resend API
        const resendPayload: Record<string, unknown> = {
          from: fromHeader,
          to: [contact.email],
          subject: personalizedSubject,
          html: finalHtml,
          reply_to: replyTo,
          headers: {
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        };

        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify(resendPayload),
        });

        const result = await resendResponse.json();

        if (resendResponse.ok && result.id) {
          await supabase
            .from("messages")
            .update({
              status: "sent",
              resend_message_id: result.id,
              sent_at: new Date().toISOString(),
            })
            .eq("id", msgRecord.id);
          batchSent++;

          // Increment trial email counter (no-op for active orgs)
          if (org?.org_status === "trial") {
            await supabase.rpc("increment_trial_emails", { _org_id: orgId, _count: 1 });
          }
        } else {
          await supabase
            .from("messages")
            .update({
              status: "failed",
              error_message: JSON.stringify(result).slice(0, 500),
            })
            .eq("id", msgRecord.id);
          batchFailed++;
        }
      } catch (err) {
        await supabase
          .from("messages")
          .update({
            status: "failed",
            error_message: (err as Error).message,
          })
          .eq("id", msgRecord.id);
        batchFailed++;
      }
    }

    // ── Self-chain for remaining contacts ──
    if (contacts.length === BATCH_SIZE) {
      const nextOffset = offset + BATCH_SIZE;
      console.log(`Batch done (sent=${batchSent}, failed=${batchFailed}). Chaining to offset ${nextOffset}`);

      fetch(`${supabaseUrl}/functions/v1/send-campaign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ campaign_id, offset: nextOffset }),
      }).catch(async (err) => {
        console.error("Self-chain failed:", err.message);
        await supabase.rpc("transition_campaign_status", { _campaign_id: campaign_id, _from_status: "running", _to_status: "failed" });
      });
    } else {
      console.log(`Final batch done (sent=${batchSent}, failed=${batchFailed}). Finalizing campaign.`);

      const { count: totalSent } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign_id)
        .eq("status", "sent");

      const finalStatus = (totalSent ?? 0) === 0 ? "failed" : "completed";
      await supabase.rpc("transition_campaign_status", { _campaign_id: campaign_id, _from_status: "running", _to_status: finalStatus });
    }

    return new Response(
      JSON.stringify({ success: true, batch_sent: batchSent, batch_failed: batchFailed, offset }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-campaign error:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
