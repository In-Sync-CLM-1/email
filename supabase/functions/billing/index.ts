import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GST_RATE = 0.18;
const PLATFORM_FEE = 1500;
const RATES: Record<string, number> = {
  marketing: 0.5,
  transactional: 0.2,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action } = body;

    // ── RAZORPAY WEBHOOK (no auth required) ──
    if (action === "razorpay_webhook") {
      const razorpaySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
      const signature = body.razorpay_signature;
      const payload = body.payload;

      if (!signature || !payload) {
        return new Response(JSON.stringify({ error: "Invalid webhook" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify will happen in verify_payment action instead
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // All other actions require auth
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

    const { org_id } = body;
    if (!org_id) {
      return new Response(JSON.stringify({ error: "org_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if platform admin
    const { data: isPlatformAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "platform_admin",
    });

    // ── MANUAL CREDIT (platform_admin only) ──
    if (action === "manual_credit") {
      if (!isPlatformAdmin) {
        return new Response(JSON.stringify({ error: "Platform admin access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { amount, description } = body;
      if (!amount || amount <= 0) {
        return new Response(JSON.stringify({ error: "Amount must be greater than 0" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: newBalance } = await supabase.rpc("credit_wallet", {
        _org_id: org_id,
        _amount: amount,
        _category: "adjustment",
        _description: description || `Manual credit by platform admin`,
        _reference_id: `admin_${user.id}_${Date.now()}`,
      });

      return new Response(JSON.stringify({
        success: true,
        new_balance: newBalance,
        amount_credited: amount,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify org membership (platform admins can bypass)
    const { data: membership } = await supabase
      .from("org_memberships")
      .select("role")
      .eq("org_id", org_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership && !isPlatformAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── GET BALANCE ──
    if (action === "get_balance") {
      const { data: wallet } = await supabase
        .from("org_wallets")
        .select("balance, total_credited, total_debited")
        .eq("org_id", org_id)
        .maybeSingle();

      return new Response(JSON.stringify({
        success: true,
        wallet: wallet || { balance: 0, total_credited: 0, total_debited: 0 },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── GET TRANSACTIONS ──
    if (action === "get_transactions") {
      const { page = 1, per_page = 20 } = body;
      const offset = (page - 1) * per_page;

      const { data: transactions, count } = await supabase
        .from("wallet_transactions")
        .select("*", { count: "exact" })
        .eq("org_id", org_id)
        .order("created_at", { ascending: false })
        .range(offset, offset + per_page - 1);

      return new Response(JSON.stringify({
        success: true,
        transactions: transactions || [],
        total: count || 0,
        page,
        per_page,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── GET USAGE ──
    if (action === "get_usage") {
      const { month } = body; // '2026-03' or null for current
      const targetMonth = month || new Date().toISOString().slice(0, 7);
      const startDate = `${targetMonth}-01T00:00:00Z`;
      const endMonth = new Date(targetMonth + "-01");
      endMonth.setMonth(endMonth.getMonth() + 1);
      const endDate = endMonth.toISOString().slice(0, 10) + "T00:00:00Z";

      // Count sent messages by campaign category
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id, message_category")
        .eq("org_id", org_id);

      const campaignIds = (campaigns || []).map((c: any) => c.id);
      const campaignCategories: Record<string, string> = {};
      for (const c of (campaigns || [])) {
        campaignCategories[c.id] = c.message_category || "marketing";
      }

      let marketing = 0, transactional = 0;

      if (campaignIds.length > 0) {
        const { data: messages } = await supabase
          .from("messages")
          .select("campaign_id")
          .eq("org_id", org_id)
          .eq("status", "sent")
          .gte("sent_at", startDate)
          .lt("sent_at", endDate);

        for (const msg of (messages || [])) {
          const cat = campaignCategories[msg.campaign_id] || "marketing";
          if (cat === "transactional") transactional++;
          else marketing++;
        }
      }

      const marketingCost = marketing * RATES.marketing;
      const transactionalCost = transactional * RATES.transactional;
      const subtotal = marketingCost + transactionalCost + PLATFORM_FEE;
      const gst = Math.round(subtotal * GST_RATE * 100) / 100;

      return new Response(JSON.stringify({
        success: true,
        month: targetMonth,
        usage: {
          marketing: { count: marketing, cost: marketingCost, rate: RATES.marketing },
          transactional: { count: transactional, cost: transactionalCost, rate: RATES.transactional },
        },
        platform_fee: PLATFORM_FEE,
        subtotal,
        gst,
        total: subtotal + gst,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── GET INVOICES ──
    if (action === "get_invoices") {
      const { data: invoices } = await supabase
        .from("monthly_invoices")
        .select("*")
        .eq("org_id", org_id)
        .order("month", { ascending: false });

      return new Response(JSON.stringify({
        success: true,
        invoices: invoices || [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── GET PRICING ──
    if (action === "get_pricing") {
      return new Response(JSON.stringify({
        success: true,
        plans: {
          starter: { name: "Starter", price_quarterly: 299700, emails: 10000, billing: "quarterly" },
          growth: { name: "Growth", price_monthly: 249900, price_quarterly: 674700, emails: 50000, billing: "monthly_or_quarterly" },
          scale: { name: "Scale", price_monthly: 599900, price_quarterly: 1619700, emails: 200000, billing: "monthly_or_quarterly" },
        },
        gst_rate: GST_RATE,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── GET SUBSCRIPTION STATUS ──
    if (action === "get_subscription") {
      const { data: orgData } = await supabase
        .from("organizations")
        .select("org_status, trial_started_at, trial_emails_used, subscription_plan, subscription_id, subscription_status, suspended_at")
        .eq("id", org_id)
        .single();

      const { data: payments } = await supabase
        .from("subscription_payments")
        .select("*")
        .eq("org_id", org_id)
        .order("created_at", { ascending: false })
        .limit(10);

      return new Response(JSON.stringify({
        success: true,
        subscription: orgData,
        payments: payments || [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── CREATE SUBSCRIPTION (Razorpay order for plan payment) ──
    if (action === "create_subscription") {
      if (!membership || membership.role !== "admin") {
        return new Response(JSON.stringify({ error: "Only admins can subscribe" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { plan, billing_cycle } = body; // plan: starter|growth|scale, billing_cycle: monthly|quarterly
      const planPrices: Record<string, Record<string, number>> = {
        starter: { quarterly: 299700 },
        growth: { monthly: 249900, quarterly: 674700 },
        scale: { monthly: 599900, quarterly: 1619700 },
      };

      if (!planPrices[plan]) {
        return new Response(JSON.stringify({ error: "Invalid plan" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const cycle = plan === "starter" ? "quarterly" : (billing_cycle || "monthly");
      const amount = planPrices[plan][cycle];
      if (!amount) {
        return new Response(JSON.stringify({ error: "Invalid billing cycle for this plan" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Add GST
      const amountWithGst = Math.round(amount * (1 + GST_RATE));

      const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID")!;
      const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;

      const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
        },
        body: JSON.stringify({
          amount: amountWithGst,
          currency: "INR",
          receipt: `sub_${plan}_${org_id}_${Date.now()}`,
          notes: { org_id, user_id: user.id, plan, billing_cycle: cycle },
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        return new Response(JSON.stringify({ error: "Failed to create order", details: orderData }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        order: { id: orderData.id, amount: orderData.amount, currency: orderData.currency },
        razorpay_key_id: razorpayKeyId,
        plan,
        billing_cycle: cycle,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── VERIFY SUBSCRIPTION PAYMENT ──
    if (action === "verify_subscription") {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, billing_cycle } = body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan) {
        return new Response(JSON.stringify({ error: "Missing payment details" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
      const expectedSignature = await generateHmac(
        `${razorpay_order_id}|${razorpay_payment_id}`,
        razorpayKeySecret
      );

      if (expectedSignature !== razorpay_signature) {
        return new Response(JSON.stringify({ error: "Payment verification failed" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Activate subscription
      await supabase.rpc("activate_subscription", {
        _org_id: org_id,
        _plan: plan,
        _subscription_id: razorpay_payment_id,
      });

      // Calculate period
      const now = new Date();
      const periodMonths = billing_cycle === "quarterly" ? 3 : 1;
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + periodMonths);

      // Record payment
      const planPrices: Record<string, Record<string, number>> = {
        starter: { quarterly: 299700 },
        growth: { monthly: 249900, quarterly: 674700 },
        scale: { monthly: 599900, quarterly: 1619700 },
      };
      const cycle = plan === "starter" ? "quarterly" : (billing_cycle || "monthly");

      await supabase.from("subscription_payments").insert({
        org_id,
        razorpay_subscription_id: razorpay_order_id,
        razorpay_payment_id,
        plan,
        amount: planPrices[plan]?.[cycle] || 0,
        status: "paid",
        period_start: now.toISOString(),
        period_end: periodEnd.toISOString(),
      });

      return new Response(JSON.stringify({ success: true, plan, status: "active" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      error: "Invalid action. Use: get_balance, get_transactions, get_usage, get_invoices, get_pricing, get_subscription, create_subscription, verify_subscription",
    }), {
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

// HMAC-SHA256 helper
async function generateHmac(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}
