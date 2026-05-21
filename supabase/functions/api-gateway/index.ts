import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

/**
 * REST API Gateway — authenticate via API key and serve CRUD endpoints.
 * Endpoints:
 *   GET    /contacts
 *   POST   /contacts
 *   GET    /messages?contact_id=...
 *   GET    /templates
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── Authenticate via API key ──
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing x-api-key header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hash the key and look up
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(apiKey));
    const keyHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const { data: apiKeyRow } = await supabase
      .from("api_keys")
      .select("*")
      .eq("key_hash", keyHash)
      .maybeSingle();

    if (!apiKeyRow) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiry
    if (apiKeyRow.expires_at && new Date(apiKeyRow.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "API key expired" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = apiKeyRow.org_id;
    const scopes = apiKeyRow.scopes || [];

    // Update last_used_at
    await supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", apiKeyRow.id);

    // ── Route request ──
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    // Path: /api-gateway/<resource>[/<id>]
    const resource = pathParts[1] || "";
    const method = req.method;

    // GET /contacts
    if (resource === "contacts" && method === "GET") {
      if (!scopes.includes("read")) {
        return new Response(JSON.stringify({ error: "Insufficient scope" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const limit = parseInt(url.searchParams.get("limit") || "50");
      const offset = parseInt(url.searchParams.get("offset") || "0");
      const { data, count } = await supabase
        .from("contacts")
        .select("id, name, email, phone_number, tags, source, created_at, custom_fields", { count: "exact" })
        .eq("org_id", orgId)
        .range(offset, offset + limit - 1)
        .order("created_at", { ascending: false });

      return jsonResponse({ data, total: count, limit, offset });
    }

    // POST /contacts
    if (resource === "contacts" && method === "POST") {
      if (!scopes.includes("write")) {
        return new Response(JSON.stringify({ error: "Insufficient scope" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const body = await req.json();
      const { data, error } = await supabase
        .from("contacts")
        .upsert(
          {
            email: body.email,
            name: body.name || null,
            phone_number: body.phone_number || null,
            tags: body.tags || [],
            source: body.source || "api",
            org_id: orgId,
            custom_fields: body.custom_fields || {},
          },
          { onConflict: "phone_number,org_id" }
        )
        .select("*")
        .single();

      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ data });
    }

    // GET /messages
    if (resource === "messages" && method === "GET") {
      if (!scopes.includes("read")) {
        return new Response(JSON.stringify({ error: "Insufficient scope" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const contactId = url.searchParams.get("contact_id");
      const campaignId = url.searchParams.get("campaign_id");
      const limit = parseInt(url.searchParams.get("limit") || "50");

      let query = supabase
        .from("messages")
        .select("id, content, subject, direction, status, sent_at, created_at, opened_at, clicked_at, bounced_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (contactId) query = query.eq("contact_id", contactId);
      if (campaignId) query = query.eq("campaign_id", campaignId);

      const { data } = await query;
      return jsonResponse({ data });
    }

    // GET /templates
    if (resource === "templates" && method === "GET") {
      if (!scopes.includes("read")) {
        return new Response(JSON.stringify({ error: "Insufficient scope" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data } = await supabase
        .from("templates")
        .select("id, name, content, subject, html_content, category, status")
        .eq("org_id", orgId)
        .order("name");

      return jsonResponse({ data });
    }

    return jsonResponse({ error: `Unknown endpoint: ${method} /${resource}` }, 404);
  } catch (err) {
    console.error("api-gateway error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
  });
}
