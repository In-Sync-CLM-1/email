-- Migration 2: Add org_id to existing tables
-- Adds nullable org_id first (made NOT NULL in migration 3 after data backfill)

ALTER TABLE campaigns ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE contacts ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE campaign_contacts ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE templates ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Indexes for org-scoped queries
CREATE INDEX idx_campaigns_org_id ON campaigns(org_id);
CREATE INDEX idx_contacts_org_id ON contacts(org_id);
CREATE INDEX idx_campaign_contacts_org_id ON campaign_contacts(org_id);
CREATE INDEX idx_messages_org_id ON messages(org_id);
CREATE INDEX idx_templates_org_id ON templates(org_id);
