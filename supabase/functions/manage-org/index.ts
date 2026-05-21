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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // ── CREATE ORG ──
    if (action === "create") {
      const { name, slug, industry } = body;
      if (!name || !slug) {
        return new Response(JSON.stringify({ error: "name and slug are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create org
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name,
          slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
          industry: industry || null,
          created_by: user.id,
          org_status: "trial",
          trial_started_at: new Date().toISOString(),
          trial_emails_used: 0,
        })
        .select()
        .single();

      if (orgError) {
        return new Response(JSON.stringify({ error: "Failed to create org", details: orgError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Add creator as admin
      const { error: memberError } = await supabase
        .from("org_memberships")
        .insert({ org_id: org.id, user_id: user.id, role: "admin" });

      if (memberError) {
        // Rollback org
        await supabase.from("organizations").delete().eq("id", org.id);
        return new Response(JSON.stringify({ error: "Failed to create membership", details: memberError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create empty credentials record
      await supabase.from("org_credentials").insert({ org_id: org.id });

      return new Response(JSON.stringify({ success: true, organization: org }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── UPDATE ORG ──
    if (action === "update") {
      const { org_id, name, logo_url, website, industry } = body;
      if (!org_id) {
        return new Response(JSON.stringify({ error: "org_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify admin
      const { data: membership } = await supabase
        .from("org_memberships")
        .select("role")
        .eq("org_id", org_id)
        .eq("user_id", user.id)
        .maybeSingle();

      const { data: isPlatformAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "platform_admin" });

      if (!isPlatformAdmin && membership?.role !== "admin") {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (name !== undefined) updates.name = name;
      if (logo_url !== undefined) updates.logo_url = logo_url;
      if (website !== undefined) updates.website = website;
      if (industry !== undefined) updates.industry = industry;

      const { data: updated, error: updateError } = await supabase
        .from("organizations")
        .update(updates)
        .eq("id", org_id)
        .select()
        .single();

      if (updateError) {
        return new Response(JSON.stringify({ error: "Update failed", details: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, organization: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── UPDATE CREDENTIALS (Email config) ──
    if (action === "update_credentials") {
      const { org_id, from_name, from_email, reply_to } = body;
      if (!org_id) {
        return new Response(JSON.stringify({ error: "org_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify admin
      const { data: membership } = await supabase
        .from("org_memberships")
        .select("role")
        .eq("org_id", org_id)
        .eq("user_id", user.id)
        .maybeSingle();

      const { data: isPlatformAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "platform_admin" });

      if (!isPlatformAdmin && membership?.role !== "admin") {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const isConfigured = !!(from_email && from_name);

      const { error: credError } = await supabase
        .from("org_credentials")
        .upsert({
          org_id,
          from_name: from_name || null,
          from_email: from_email || null,
          reply_to: reply_to || null,
          is_configured: isConfigured,
          updated_at: new Date().toISOString(),
        }, { onConflict: "org_id" });

      if (credError) {
        return new Response(JSON.stringify({ error: "Failed to update credentials", details: credError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, is_configured: isConfigured }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── GET CREDENTIALS ──
    if (action === "get_credentials") {
      const { org_id } = body;
      if (!org_id) {
        return new Response(JSON.stringify({ error: "org_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: creds } = await supabase
        .from("org_credentials")
        .select("*")
        .eq("org_id", org_id)
        .maybeSingle();

      return new Response(JSON.stringify({ success: true, credentials: creds }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── COMPLETE ONBOARDING ──
    if (action === "complete_onboarding") {
      const { org_id } = body;
      if (!org_id) {
        return new Response(JSON.stringify({ error: "org_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateError } = await supabase
        .from("organizations")
        .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
        .eq("id", org_id);

      if (updateError) {
        return new Response(JSON.stringify({ error: "Failed to complete onboarding", details: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Seed default starter templates (best-effort — don't fail onboarding if this errors)
      try {
        const starterTemplates = [
          {
            user_id: user.id,
            org_id,
            name: "Welcome Email",
            subject: "Welcome to {{1}}, {{2}}!",
            content: "Hi {{2}},\n\nWelcome aboard! We're thrilled to have you join {{1}}.\n\nHere's what you can do next:\n- Explore our features\n- Set up your profile\n- Connect with our community\n\nIf you have any questions, just reply to this email.\n\nCheers,\nThe {{1}} Team",
            html_content: null,
            preview_text: "Welcome aboard — here's how to get started",
            status: "approved",
            category: "marketing",
            language: "en",
          },
          {
            user_id: user.id,
            org_id,
            name: "Monthly Newsletter",
            subject: "{{1}} — Your Monthly Update",
            content: "Hi {{2}},\n\nHere's what's new this month:\n\n{{3}}\n\nThanks for being part of our community!\n\nBest,\nThe {{1}} Team",
            html_content: null,
            preview_text: "This month's highlights and updates",
            status: "approved",
            category: "marketing",
            language: "en",
          },
          {
            user_id: user.id,
            org_id,
            name: "Promotional Offer",
            subject: "Special offer just for you, {{2}}!",
            content: "Hi {{2}},\n\n{{1}}\n\nThis offer is available for a limited time. Don't miss out!\n\nBest regards,\nThe Team",
            html_content: null,
            preview_text: "A special offer you won't want to miss",
            status: "approved",
            category: "marketing",
            language: "en",
          },
        ];
        await supabase.from("templates").insert(starterTemplates);
      } catch (seedErr) {
        console.error("Failed to seed starter templates:", seedErr);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── DELETE ORG ──
    if (action === "delete") {
      const { org_id } = body;
      if (!org_id) {
        return new Response(JSON.stringify({ error: "org_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Only platform_admin can delete organizations
      const { data: canDelete } = await supabase.rpc("has_role", { _user_id: user.id, _role: "platform_admin" });
      if (!canDelete) {
        return new Response(JSON.stringify({ error: "You do not have permission to delete organizations" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete the organization (all related data cascades automatically)
      const { error: deleteError } = await supabase
        .from("organizations")
        .delete()
        .eq("id", org_id);

      if (deleteError) {
        return new Response(JSON.stringify({ error: "Failed to delete organization", details: deleteError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use: create, update, update_credentials, get_credentials, complete_onboarding, delete" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
