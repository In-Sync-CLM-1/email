// org-lifecycle edge function — runs daily via cron
// Sweep 1: suspend trial orgs after 14 days
// Sweep 2: delete suspended orgs after 30 days (16 days post-suspension)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Sweep 1: Suspend trial orgs older than 14 days
    const { data: suspended, error: suspendErr } = await supabase
      .from("organizations")
      .update({
        org_status: "suspended",
        suspended_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("org_status", "trial")
      .lt("trial_started_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
      .select("id, name");

    const suspendedCount = suspended?.length ?? 0;
    if (suspendErr) console.error("Suspend sweep error:", suspendErr.message);
    else console.log(`Suspended ${suspendedCount} trial orgs`);

    // Sweep 2: Delete suspended orgs older than 16 days after suspension (= 30 days from trial start)
    const { data: deleted, error: deleteErr } = await supabase
      .from("organizations")
      .delete()
      .eq("org_status", "suspended")
      .lt("suspended_at", new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString())
      .select("id, name");

    const deletedCount = deleted?.length ?? 0;
    if (deleteErr) console.error("Delete sweep error:", deleteErr.message);
    else console.log(`Deleted ${deletedCount} expired suspended orgs`);

    return new Response(JSON.stringify({
      success: true,
      suspended: suspendedCount,
      deleted: deletedCount,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("org-lifecycle error:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
