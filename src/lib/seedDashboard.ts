import { supabase } from "@/integrations/supabase/client";
import { subDays, addHours } from "date-fns";

const SEED_TAG = "__seed__";

// Deterministic but varied statuses across messages
function pickStatus(i: number): string {
  const pool = ["delivered", "delivered", "delivered", "read", "read", "sent", "failed", "pending"];
  return pool[i % pool.length];
}

export async function seedDashboardData(orgId: string, userId: string) {
  // --- Templates (with subject lines for email platform) ---
  const templateDefs = [
    { name: "welcome_message", category: "marketing", subject: "Welcome to our community, {{1}}!", content: "Hi {{1}}! Welcome to our store. Enjoy 10% off your first order with code WELCOME10.", language: "en" },
    { name: "order_confirmation", category: "utility", subject: "Order #{{2}} confirmed", content: "Hello {{1}}, your order #{{2}} has been confirmed and will be shipped within 2 business days.", language: "en" },
    { name: "shipping_update", category: "utility", subject: "Your order #{{2}} has shipped!", content: "Hi {{1}}, your order #{{2}} has been shipped! Track it here: {{3}}", language: "en" },
    { name: "flash_sale", category: "marketing", subject: "Flash Sale — Up to 50% Off!", content: "Flash Sale! {{1}}, get up to 50% off on all items. Offer ends tonight at midnight. Shop now!", language: "en" },
    { name: "feedback_request", category: "marketing", subject: "How was your experience, {{1}}?", content: "Hi {{1}}, we'd love your feedback on your recent purchase. Reply with a rating from 1-5.", language: "en" },
    { name: "payment_reminder", category: "utility", subject: "Payment reminder — {{2}} due on {{3}}", content: "Hi {{1}}, this is a reminder that your payment of {{2}} is due on {{3}}. Please pay to avoid late fees.", language: "en" },
    { name: "login_alert", category: "authentication", subject: "New login detected on your account", content: "New login detected on your account from {{1}}. If this wasn't you, reset your password immediately.", language: "en" },
  ];

  const { data: templates, error: tErr } = await supabase
    .from("templates")
    .insert(
      templateDefs.map((t) => ({
        ...t,
        org_id: orgId,
        user_id: userId,
        status: "approved",
        preview_text: SEED_TAG,
      }))
    )
    .select("id, category");

  if (tErr || !templates) throw new Error(`Template insert failed: ${tErr?.message}`);

  // --- Contacts (with email addresses) ---
  const contactNames = [
    "Aarav Sharma", "Priya Patel", "Rahul Verma", "Sneha Gupta", "Vikram Singh",
    "Ananya Reddy", "Kiran Desai", "Meera Joshi", "Rohan Kapoor", "Divya Nair",
    "Arjun Mehta", "Pooja Iyer", "Sanjay Kumar", "Neha Bhat", "Amit Tiwari",
    "Kavita Rao", "Deepak Mishra", "Swati Pandey", "Nikhil Agarwal", "Ritu Saxena",
    "Suresh Menon", "Ankita Das", "Manish Choudhary", "Preeti Sinha", "Rajesh Pillai",
    "Bhavna Shah", "Gaurav Yadav", "Simran Kaur", "Tarun Bhatt", "Pallavi Kulkarni",
    "Varun Thakur", "Megha Bansal", "Harsh Jain", "Nandini Hegde", "Ashish Dubey",
    "Rekha Mohan", "Siddharth Nath", "Aditi Chandra", "Mayank Soni", "Tanvi Malik",
  ];

  const toEmail = (name: string, i: number) => {
    const [first, last] = name.toLowerCase().split(" ");
    return `${first}.${last}+demo${i}@example.com`;
  };

  const { data: contacts, error: cErr } = await supabase
    .from("contacts")
    .insert(
      contactNames.map((name, i) => ({
        name,
        email: toEmail(name, i),
        phone_number: null,
        org_id: orgId,
        user_id: userId,
        source: SEED_TAG,
        tags: [SEED_TAG],
        created_at: subDays(new Date(), 30 + Math.floor(Math.random() * 30)).toISOString(),
      }))
    )
    .select("id");

  if (cErr || !contacts) throw new Error(`Contact insert failed: ${cErr?.message}`);

  // --- Campaigns ---
  const now = new Date();
  const campaignDefs = [
    { name: "Summer Sale Blast", templateIdx: 0, status: "completed", daysAgo: 1 },
    { name: "Order Updates - March", templateIdx: 1, status: "completed", daysAgo: 2 },
    { name: "Flash Friday Deal", templateIdx: 4, status: "completed", daysAgo: 3 },
    { name: "Payment Reminders Q1", templateIdx: 5, status: "completed", daysAgo: 4 },
    { name: "Welcome New Users", templateIdx: 0, status: "completed", daysAgo: 5 },
    { name: "Shipping Notifications", templateIdx: 2, status: "running", daysAgo: 0 },
    { name: "Promo Blast", templateIdx: 3, status: "completed", daysAgo: 6 },
    { name: "Feedback Collection", templateIdx: 4, status: "scheduled", daysAgo: -1 },
    { name: "Security Alerts", templateIdx: 6, status: "completed", daysAgo: 8 },
    { name: "Re-engagement Push", templateIdx: 3, status: "draft", daysAgo: 0 },
  ];

  const { data: campaigns, error: campErr } = await supabase
    .from("campaigns")
    .insert(
      campaignDefs.map((c) => ({
        name: c.name,
        description: SEED_TAG,
        org_id: orgId,
        user_id: userId,
        template_id: templates[c.templateIdx].id,
        template_message: templateDefs[c.templateIdx].content,
        subject: templateDefs[c.templateIdx].subject,
        status: c.status,
        message_category: templateDefs[c.templateIdx].category,
        created_at: subDays(now, Math.max(c.daysAgo, 0)).toISOString(),
      }))
    )
    .select("id");

  if (campErr || !campaigns) throw new Error(`Campaign insert failed: ${campErr?.message}`);

  // --- Messages (spread over last 14 days for rich chart data) ---
  const messageRows: {
    campaign_id: string;
    contact_id: string;
    org_id: string;
    status: string;
    content: string | null;
    subject: string;
    created_at: string;
    sent_at: string | null;
    delivered_at: string | null;
    read_at: string | null;
  }[] = [];

  let msgIdx = 0;
  // For each non-draft, non-scheduled campaign, generate messages
  for (let ci = 0; ci < campaigns.length; ci++) {
    const campDef = campaignDefs[ci];
    if (campDef.status === "draft" || campDef.status === "scheduled") continue;

    // Pick a subset of contacts for each campaign (15-35 contacts)
    const numContacts = 15 + (ci * 7) % 20;
    const startIdx = (ci * 5) % contacts.length;

    for (let j = 0; j < numContacts && j < contacts.length; j++) {
      const contactIdx = (startIdx + j) % contacts.length;
      const status = pickStatus(msgIdx);
      const daysAgo = Math.max(campDef.daysAgo, 0);
      const hoursOffset = Math.floor(Math.random() * 12);
      const createdAt = addHours(subDays(now, daysAgo), hoursOffset);

      const sent = status !== "pending" ? addHours(createdAt, 0.01).toISOString() : null;
      const delivered =
        status === "delivered" || status === "read"
          ? addHours(createdAt, 0.05).toISOString()
          : null;
      const readAt = status === "read" ? addHours(createdAt, 0.5 + Math.random() * 4).toISOString() : null;

      messageRows.push({
        campaign_id: campaigns[ci].id,
        contact_id: contacts[contactIdx].id,
        org_id: orgId,
        status,
        content: SEED_TAG,
        subject: templateDefs[campDef.templateIdx].subject,
        created_at: createdAt.toISOString(),
        sent_at: sent,
        delivered_at: delivered,
        read_at: readAt,
      });
      msgIdx++;
    }
  }

  // Insert messages in batches of 50
  for (let i = 0; i < messageRows.length; i += 50) {
    const batch = messageRows.slice(i, i + 50);
    const { error } = await supabase.from("messages").insert(batch);
    if (error) throw new Error(`Message insert batch ${i} failed: ${error.message}`);
  }

  return {
    templates: templates.length,
    contacts: contacts.length,
    campaigns: campaigns.length,
    messages: messageRows.length,
  };
}

export async function unseedDashboardData(orgId: string) {
  // Delete in reverse dependency order: messages → campaigns → contacts → templates
  // Messages: content = __seed__
  await supabase.from("messages").delete().eq("org_id", orgId).eq("content", SEED_TAG);
  // Campaign contacts for seeded campaigns
  const { data: seedCampaigns } = await supabase
    .from("campaigns")
    .select("id")
    .eq("org_id", orgId)
    .eq("description", SEED_TAG);
  if (seedCampaigns) {
    for (const c of seedCampaigns) {
      await supabase.from("campaign_contacts").delete().eq("campaign_id", c.id);
    }
  }
  // Campaigns
  await supabase.from("campaigns").delete().eq("org_id", orgId).eq("description", SEED_TAG);
  // Contacts
  await supabase.from("contacts").delete().eq("org_id", orgId).eq("source", SEED_TAG);
  // Templates (use preview_text as seed marker since templates has no description column)
  await supabase.from("templates").delete().eq("org_id", orgId).eq("preview_text", SEED_TAG);
}
