// unsubscribe edge function — handles email unsubscribe requests (GET for link clicks)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const siteUrl = Deno.env.get("SITE_URL") || "https://email.in-sync.co.in";

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(htmlPage("Invalid Link", "This unsubscribe link is invalid or expired."), {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    let payload: { org_id: string; email: string };
    try {
      payload = JSON.parse(atob(token));
    } catch {
      return new Response(htmlPage("Invalid Link", "This unsubscribe link is invalid or expired."), {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    const { org_id, email } = payload;
    if (!org_id || !email) {
      return new Response(htmlPage("Invalid Link", "This unsubscribe link is missing required data."), {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    // Insert into unsubscribes (ignore if already unsubscribed)
    await supabase
      .from("unsubscribes")
      .upsert(
        { org_id, email: email.toLowerCase(), unsubscribed_at: new Date().toISOString() },
        { onConflict: "org_id,email" }
      );

    // Also update contact record if exists
    await supabase
      .from("contacts")
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("org_id", org_id)
      .eq("email", email.toLowerCase());

    return new Response(
      htmlPage(
        "Unsubscribed",
        "You have been successfully unsubscribed and will no longer receive emails from this sender."
      ),
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  } catch (err) {
    console.error("Unsubscribe error:", (err as Error).message);
    return new Response(
      htmlPage("Error", "Something went wrong. Please try again later."),
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }
});

function htmlPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — In-Sync</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:60px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#18181b;padding:28px 32px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">In-Sync</h1>
        </td></tr>
        <tr><td style="padding:40px 32px;text-align:center;">
          <h2 style="margin:0 0 16px;color:#18181b;font-size:24px;">${title}</h2>
          <p style="color:#52525b;font-size:16px;line-height:1.6;margin:0;">${message}</p>
        </td></tr>
        <tr><td style="padding:20px 32px;background:#fafafa;border-top:1px solid #f0f0f0;">
          <p style="margin:0;color:#a1a1aa;font-size:12px;text-align:center;">In-Sync — Email Broadcast Platform</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
