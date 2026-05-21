import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/resend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateOtp(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(6, "0");
}

function otpEmailHtml(otpCode: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#18181b;padding:28px 32px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">In-Sync</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 12px;color:#18181b;font-size:20px;">Your verification code</h2>
          <p style="color:#52525b;font-size:15px;line-height:1.6;margin:0 0 24px;">
            Use the code below to verify your email address. This code expires in 10 minutes.
          </p>
          <div style="background:#f4f4f5;border-radius:8px;padding:20px;text-align:center;margin:0 0 24px;">
            <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#18181b;font-family:monospace;">${otpCode}</span>
          </div>
          <p style="color:#a1a1aa;font-size:13px;line-height:1.5;margin:0;">
            If you didn't request this code, you can safely ignore this email.
          </p>
        </td></tr>
        <tr><td style="padding:20px 32px;background:#fafafa;border-top:1px solid #f0f0f0;">
          <p style="margin:0;color:#a1a1aa;font-size:12px;text-align:center;">In-Sync &mdash; Email Broadcast Platform</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, action } = await req.json();

    if (action !== "send") {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use: "send"' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!email) {
      return new Response(
        JSON.stringify({ error: "email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate-limit: no more than 5 OTPs per email in the last 10 minutes
    const { count } = await supabase
      .from("public_otp_verifications")
      .select("id", { count: "exact", head: true })
      .eq("identifier", email)
      .eq("identifier_type", "email")
      .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

    if ((count ?? 0) >= 5) {
      return new Response(
        JSON.stringify({ error: "Too many OTP requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const otpCode = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Insert OTP record
    const { data: otpRow, error: insertErr } = await supabase
      .from("public_otp_verifications")
      .insert({
        identifier: email,
        identifier_type: "email",
        otp_code: otpCode,
        expires_at: expiresAt,
      })
      .select("session_id")
      .single();

    if (insertErr) {
      console.error("OTP insert error:", insertErr.message);
      return new Response(
        JSON.stringify({ error: "Failed to generate OTP" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Send OTP via email
    await sendEmail({
      to: email,
      subject: "Your In-Sync verification code",
      html: otpEmailHtml(otpCode),
    });

    return new Response(
      JSON.stringify({ success: true, session_id: otpRow.session_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
