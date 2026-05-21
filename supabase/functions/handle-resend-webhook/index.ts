// handle-resend-webhook — processes Resend webhook events (bounces, opens, clicks, deliveries)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, svix-id, svix-timestamp, svix-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const { type, data } = body;

    // Resend sends: email.sent, email.delivered, email.opened, email.clicked,
    // email.bounced, email.complained, email.delivery_delayed
    if (!type || !data) {
      return new Response(JSON.stringify({ error: "Invalid webhook payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailId = data.email_id; // Resend message ID
    if (!emailId) {
      return new Response(JSON.stringify({ ok: true, skipped: "no email_id" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the message record by resend_message_id
    const { data: message } = await supabase
      .from("messages")
      .select("id, org_id, contact_id")
      .eq("resend_message_id", emailId)
      .maybeSingle();

    if (!message) {
      // Message not found — may be a transactional email (confirmation, reset, etc.)
      return new Response(JSON.stringify({ ok: true, skipped: "message not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();

    switch (type) {
      case "email.delivered": {
        await supabase
          .from("messages")
          .update({ status: "delivered", delivered_at: now })
          .eq("id", message.id);
        break;
      }

      case "email.opened": {
        await supabase
          .from("messages")
          .update({ opened_at: now })
          .eq("id", message.id);
        // Update contact last_opened_at
        if (message.contact_id) {
          await supabase
            .from("contacts")
            .update({ last_opened_at: now })
            .eq("id", message.contact_id);
        }
        break;
      }

      case "email.clicked": {
        await supabase
          .from("messages")
          .update({ clicked_at: now })
          .eq("id", message.id);
        // Update contact last_clicked_at
        if (message.contact_id) {
          await supabase
            .from("contacts")
            .update({ last_clicked_at: now })
            .eq("id", message.contact_id);
        }
        break;
      }

      case "email.bounced": {
        const bounceType = data.bounce?.type || "hard"; // hard or soft
        await supabase
          .from("messages")
          .update({
            status: "failed",
            bounced_at: now,
            bounce_type: bounceType,
            error_message: `Bounced: ${bounceType}`,
          })
          .eq("id", message.id);

        // Update contact bounce_status
        if (message.contact_id) {
          await supabase
            .from("contacts")
            .update({ bounce_status: bounceType })
            .eq("id", message.contact_id);
        }

        // Hard bounces → auto-unsubscribe to protect sender reputation
        if (bounceType === "hard" && message.contact_id) {
          const { data: contact } = await supabase
            .from("contacts")
            .select("email")
            .eq("id", message.contact_id)
            .single();
          if (contact?.email) {
            await supabase
              .from("unsubscribes")
              .upsert(
                { org_id: message.org_id, email: contact.email, reason: "hard_bounce", unsubscribed_at: now },
                { onConflict: "org_id,email" }
              );
          }
        }
        break;
      }

      case "email.complained": {
        // Spam complaint — auto-unsubscribe
        await supabase
          .from("messages")
          .update({ status: "failed", error_message: "Spam complaint" })
          .eq("id", message.id);

        if (message.contact_id) {
          const { data: contact } = await supabase
            .from("contacts")
            .select("email")
            .eq("id", message.contact_id)
            .single();
          if (contact?.email) {
            await supabase
              .from("unsubscribes")
              .upsert(
                { org_id: message.org_id, email: contact.email, reason: "spam_complaint", unsubscribed_at: now },
                { onConflict: "org_id,email" }
              );
          }
        }
        break;
      }

      default:
        // email.sent, email.delivery_delayed — acknowledged but no action needed
        break;
    }

    return new Response(JSON.stringify({ ok: true, type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook handler error:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
