import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

class ResendError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function resendFetch(path: string, method: string, apiKey: string, body?: unknown) {
  const res = await fetch(`https://api.resend.com${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = data?.message || data?.error || `Resend API error: ${res.status}`;
    throw new ResendError(msg, res.status, data);
  }
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY is not configured on the server" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, org_id } = body;

    if (!org_id) {
      return new Response(JSON.stringify({ error: "org_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is admin of org or platform_admin
    const { data: membership } = await supabase
      .from("org_memberships")
      .select("role")
      .eq("org_id", org_id)
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: isPlatformAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "platform_admin",
    });

    if (!isPlatformAdmin && membership?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ADD DOMAIN ──
    if (action === "add_domain") {
      const { domain } = body;
      if (!domain) {
        return new Response(
          JSON.stringify({ error: "domain is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Block if another org already has this domain registered in our DB
      const { data: existingOrgDomain } = await supabase
        .from("sender_domains")
        .select("id, org_id")
        .eq("domain", domain)
        .neq("org_id", org_id)
        .maybeSingle();
      if (existingOrgDomain) {
        return new Response(
          JSON.stringify({ error: `Domain ${domain} is already registered to another organization` }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // If this org already added the same domain, return the existing record
      const { data: ownDomain } = await supabase
        .from("sender_domains")
        .select("*")
        .eq("domain", domain)
        .eq("org_id", org_id)
        .maybeSingle();
      if (ownDomain) {
        return new Response(
          JSON.stringify({ success: true, domain: ownDomain, reused: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Call Resend API to create domain; if it already exists there (from a
      // stale previous attempt), fetch the existing record and adopt it.
      let resendDomain: any;
      try {
        resendDomain = await resendFetch("/domains", "POST", RESEND_API_KEY, { name: domain });
      } catch (e) {
        const isAlreadyExists =
          e instanceof ResendError &&
          (e.status === 422 || /already\s*exists/i.test(e.message));
        if (!isAlreadyExists) throw e;
        const list = await resendFetch("/domains", "GET", RESEND_API_KEY);
        const items: any[] = Array.isArray(list) ? list : list?.data || [];
        const match = items.find((d) => d?.name?.toLowerCase() === domain.toLowerCase());
        if (!match) throw e;
        resendDomain = await resendFetch(`/domains/${match.id}`, "GET", RESEND_API_KEY);
      }

      // Store domain info in our DB
      const { data: saved, error: dbError } = await supabase
        .from("sender_domains")
        .insert({
          org_id,
          domain,
          resend_domain_id: resendDomain.id,
          status: resendDomain.status || "pending",
          dns_records: resendDomain.records || [],
          created_by: user.id,
        })
        .select()
        .single();

      if (dbError) {
        return new Response(
          JSON.stringify({ error: "Failed to save domain", details: dbError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ success: true, domain: saved, resend: resendDomain }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── VERIFY DOMAIN ──
    if (action === "verify_domain") {
      const { domain_id } = body;
      if (!domain_id) {
        return new Response(
          JSON.stringify({ error: "domain_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Get domain record from DB
      const { data: domainRec, error: fetchErr } = await supabase
        .from("sender_domains")
        .select("*")
        .eq("id", domain_id)
        .eq("org_id", org_id)
        .single();

      if (fetchErr || !domainRec) {
        return new Response(
          JSON.stringify({ error: "Domain not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Call Resend to verify
      const verified = await resendFetch(
        `/domains/${domainRec.resend_domain_id}/verify`,
        "POST",
        RESEND_API_KEY,
      );

      // Fetch updated domain status from Resend
      const updated = await resendFetch(
        `/domains/${domainRec.resend_domain_id}`,
        "GET",
        RESEND_API_KEY,
      );

      // Update our DB
      await supabase
        .from("sender_domains")
        .update({
          status: updated.status || "pending",
          dns_records: updated.records || domainRec.dns_records,
          verified_at: updated.status === "verified" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", domain_id);

      // If verified, auto-set as default from_domain in org_credentials if none set
      if (updated.status === "verified") {
        const { data: creds } = await supabase
          .from("org_credentials")
          .select("from_domain")
          .eq("org_id", org_id)
          .maybeSingle();

        if (!creds?.from_domain) {
          await supabase
            .from("org_credentials")
            .upsert(
              {
                org_id,
                from_domain: domainRec.domain,
                is_configured: true,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "org_id" },
            );
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: updated.status,
          records: updated.records,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── LIST DOMAINS ──
    if (action === "list_domains") {
      const { data: domains, error: listErr } = await supabase
        .from("sender_domains")
        .select("*")
        .eq("org_id", org_id)
        .order("created_at", { ascending: false });

      if (listErr) {
        return new Response(
          JSON.stringify({ error: "Failed to list domains", details: listErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ success: true, domains: domains || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── GET DOMAIN (refresh status from Resend) ──
    if (action === "get_domain") {
      const { domain_id } = body;
      if (!domain_id) {
        return new Response(
          JSON.stringify({ error: "domain_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: domainRec } = await supabase
        .from("sender_domains")
        .select("*")
        .eq("id", domain_id)
        .eq("org_id", org_id)
        .single();

      if (!domainRec) {
        return new Response(
          JSON.stringify({ error: "Domain not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Refresh from Resend
      try {
        const resendData = await resendFetch(
          `/domains/${domainRec.resend_domain_id}`,
          "GET",
          RESEND_API_KEY,
        );

        await supabase
          .from("sender_domains")
          .update({
            status: resendData.status || domainRec.status,
            dns_records: resendData.records || domainRec.dns_records,
            verified_at:
              resendData.status === "verified" && !domainRec.verified_at
                ? new Date().toISOString()
                : domainRec.verified_at,
            updated_at: new Date().toISOString(),
          })
          .eq("id", domain_id);

        return new Response(
          JSON.stringify({
            success: true,
            domain: { ...domainRec, status: resendData.status, dns_records: resendData.records },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } catch {
        // If Resend call fails, return cached data
        return new Response(
          JSON.stringify({ success: true, domain: domainRec }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // ── DELETE DOMAIN ──
    if (action === "delete_domain") {
      const { domain_id } = body;
      if (!domain_id) {
        return new Response(
          JSON.stringify({ error: "domain_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: domainRec } = await supabase
        .from("sender_domains")
        .select("*")
        .eq("id", domain_id)
        .eq("org_id", org_id)
        .single();

      if (!domainRec) {
        return new Response(
          JSON.stringify({ error: "Domain not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Delete from Resend
      try {
        await resendFetch(`/domains/${domainRec.resend_domain_id}`, "DELETE", RESEND_API_KEY);
      } catch (e) {
        console.error("Resend domain delete failed (continuing):", e);
      }

      // Delete from our DB
      await supabase.from("sender_domains").delete().eq("id", domain_id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        error: "Invalid action. Use: add_domain, verify_domain, list_domains, get_domain, delete_domain",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const e = err as Error & { status?: number; body?: unknown };
    console.error("manage-domains error:", {
      message: e?.message,
      status: (e as any)?.status,
      body: (e as any)?.body,
      stack: e?.stack,
    });
    return new Response(
      JSON.stringify({
        error: e?.message || "Internal error",
        ...(e instanceof ResendError ? { resend_status: e.status, resend_body: e.body } : {}),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
