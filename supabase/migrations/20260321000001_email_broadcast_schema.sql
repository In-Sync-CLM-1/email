-- ============================================================
-- Migration: Convert WhatsApp broadcast to Email broadcast
-- ============================================================

-- 1. Create sender_domains table for domain verification
CREATE TABLE IF NOT EXISTS sender_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  resend_domain_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  dns_records JSONB DEFAULT '[]'::jsonb,
  verified_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, domain)
);

-- RLS for sender_domains
ALTER TABLE sender_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org domains"
  ON sender_domains FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Admins can manage org domains"
  ON sender_domains FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships
      WHERE org_memberships.org_id = sender_domains.org_id
        AND org_memberships.user_id = auth.uid()
        AND org_memberships.role = 'admin'
    )
  );

-- 2. Add email-specific columns to org_credentials
ALTER TABLE org_credentials
  ADD COLUMN IF NOT EXISTS from_email TEXT,
  ADD COLUMN IF NOT EXISTS from_name TEXT,
  ADD COLUMN IF NOT EXISTS from_domain TEXT,
  ADD COLUMN IF NOT EXISTS reply_to TEXT;

-- 3. Add email-specific columns to messages
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS resend_message_id TEXT,
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bounce_type TEXT,
  ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ;

-- 4. Add email-specific columns to campaigns
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS from_name TEXT,
  ADD COLUMN IF NOT EXISTS from_email TEXT,
  ADD COLUMN IF NOT EXISTS reply_to TEXT,
  ADD COLUMN IF NOT EXISTS preview_text TEXT;

-- 5. Add email-specific columns to templates
ALTER TABLE templates
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS html_content TEXT,
  ADD COLUMN IF NOT EXISTS preview_text TEXT;

-- 6. Add email + bounce tracking to contacts
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS bounce_status TEXT,
  ADD COLUMN IF NOT EXISTS last_opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_clicked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ;

-- 6b. Make phone_number optional (email is now the primary identifier)
ALTER TABLE contacts ALTER COLUMN phone_number DROP NOT NULL;

-- 6c. Unique index on email + org_id for email-based upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_email_org
  ON contacts(email, org_id) WHERE email IS NOT NULL;

-- 7. Create unsubscribes table
CREATE TABLE IF NOT EXISTS unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  reason TEXT,
  unsubscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, email)
);

ALTER TABLE unsubscribes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org unsubscribes"
  ON unsubscribes FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Admins can manage org unsubscribes"
  ON unsubscribes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships
      WHERE org_memberships.org_id = unsubscribes.org_id
        AND org_memberships.user_id = auth.uid()
        AND org_memberships.role = 'admin'
    )
  );
