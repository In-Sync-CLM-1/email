import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, resetPasswordEmailHtml } from "../_shared/resend.ts";

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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type } = body;

    // ── Registration confirmation ──
    if (type === "register") {
      const { email, password } = body;
      if (!email || !password) {
        return new Response(
          JSON.stringify({ error: "email and password are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Create user with email confirmation deferred
      const { error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
      });

      if (createError) {
        // User already exists — check if confirmed
        const { data: { users } } =
          await supabase.auth.admin.listUsers({ filter: email, page: 1, perPage: 1 });
        const existing = users?.find((u: any) => u.email === email);

        if (existing?.email_confirmed_at) {
          return new Response(
            JSON.stringify({ error: "This email is already registered. Please sign in instead." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        // Unconfirmed — update password so OTP completion uses the right credentials
        if (existing) {
          await supabase.auth.admin.updateUserById(existing.id, { password });
        }
      }

      // Generate and store OTP
      const otpCode = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

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

      await sendEmail({
        to: email,
        subject: "Your In-Sync verification code",
        html: otpEmailHtml(otpCode),
      });

      return new Response(
        JSON.stringify({ success: true, session_id: otpRow.session_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Password reset ──
    if (type === "reset_password") {
      const { email } = body;
      if (!email) {
        return new Response(
          JSON.stringify({ error: "email is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const siteUrl = Deno.env.get("SITE_URL") || "https://email.in-sync.co.in";

      const { data: linkData, error: linkError } =
        await supabase.auth.admin.generateLink({
          type: "recovery",
          email,
          options: { redirectTo: `${siteUrl}/reset-password` },
        });

      if (linkError) {
        // Don't reveal whether the email exists — always return success
        console.error("Password reset link error:", linkError.message);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      let resetLink = linkData?.properties?.action_link;
      if (resetLink) {
        const url = new URL(resetLink);
        url.searchParams.set("redirect_to", `${siteUrl}/reset-password`);
        resetLink = url.toString();
      }
      if (resetLink) {
        await sendEmail({
          to: email,
          subject: "Reset your In-Sync password",
          html: resetPasswordEmailHtml(resetLink),
        });
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid type. Use: register, reset_password" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
