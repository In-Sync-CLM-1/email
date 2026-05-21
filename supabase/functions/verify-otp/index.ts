import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { email, otp_code } = await req.json();

    if (!email || !otp_code) {
      return new Response(
        JSON.stringify({ error: "email and otp_code are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the latest unexpired, unverified OTP for this email
    const { data: otpRow, error: fetchErr } = await supabase
      .from("public_otp_verifications")
      .select("*")
      .eq("identifier", email)
      .eq("identifier_type", "email")
      .is("verified_at", null)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchErr) {
      console.error("OTP fetch error:", fetchErr.message);
      return new Response(
        JSON.stringify({ error: "Verification failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!otpRow) {
      return new Response(
        JSON.stringify({ error: "No valid OTP found. It may have expired. Please request a new one." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check max attempts
    if (otpRow.attempts >= otpRow.max_attempts) {
      return new Response(
        JSON.stringify({ error: "Too many attempts. Please request a new OTP." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Increment attempts
    await supabase
      .from("public_otp_verifications")
      .update({ attempts: otpRow.attempts + 1 })
      .eq("id", otpRow.id);

    // Verify OTP code
    if (otpRow.otp_code !== otp_code) {
      const remaining = otpRow.max_attempts - (otpRow.attempts + 1);
      return new Response(
        JSON.stringify({
          error: remaining > 0
            ? `Invalid OTP. ${remaining} attempt(s) remaining.`
            : "Too many attempts. Please request a new OTP.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Mark as verified
    await supabase
      .from("public_otp_verifications")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", otpRow.id);

    // Confirm the user's email and generate a session token
    const { data: { users } } =
      await supabase.auth.admin.listUsers({ filter: email, page: 1, perPage: 1 });
    const authUser = users?.find((u: any) => u.email === email);

    if (authUser) {
      await supabase.auth.admin.updateUserById(authUser.id, { email_confirm: true });
    }

    const { data: linkData } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    const tokenHash = linkData?.properties?.hashed_token;

    return new Response(
      JSON.stringify({ success: true, session_id: otpRow.session_id, tokenHash, email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
