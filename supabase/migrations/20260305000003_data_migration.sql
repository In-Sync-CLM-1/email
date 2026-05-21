-- Migration 3: Backward-compatible data migration
-- Creates default org, assigns all existing data, migrates user_roles to org_memberships

-- Create default organization for existing data
INSERT INTO organizations (id, name, slug, onboarding_completed, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Organization',
  'default',
  true,
  now()
);

-- Create org_credentials placeholder for default org
INSERT INTO org_credentials (org_id, is_configured)
VALUES ('00000000-0000-0000-0000-000000000001', false);

-- Assign all existing rows to default org
UPDATE campaigns SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE contacts SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE campaign_contacts SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE messages SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE templates SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;

-- Migrate user_roles to org_memberships
-- admin and super_admin in user_roles → admin in default org membership
-- user in user_roles → member in default org membership
INSERT INTO org_memberships (org_id, user_id, role)
SELECT
  '00000000-0000-0000-0000-000000000001',
  ur.user_id,
  CASE WHEN ur.role IN ('admin', 'super_admin') THEN 'admin'::org_role ELSE 'member'::org_role END
FROM user_roles ur
ON CONFLICT (org_id, user_id) DO NOTHING;

-- Make org_id NOT NULL now that all rows have values
ALTER TABLE campaigns ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE contacts ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE campaign_contacts ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE messages ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE templates ALTER COLUMN org_id SET NOT NULL;
