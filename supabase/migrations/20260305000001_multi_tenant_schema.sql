-- Migration 1: Multi-tenant schema — new tables
-- Creates organizations, org_memberships, org_credentials, achievement_definitions, org_achievements

-- Org role enum
CREATE TYPE org_role AS ENUM ('admin', 'member');

-- Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  website TEXT,
  industry TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Org memberships (user <-> org with role)
CREATE TABLE org_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

CREATE INDEX idx_org_memberships_user_id ON org_memberships(user_id);
CREATE INDEX idx_org_memberships_org_user ON org_memberships(user_id, org_id);

-- Org-specific Exotel credentials (optional per-org override)
CREATE TABLE org_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  exotel_api_key TEXT,
  exotel_api_token TEXT,
  exotel_subdomain TEXT,
  exotel_waba_id TEXT,
  exotel_account_sid TEXT,
  exotel_sender_number TEXT,
  is_configured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Achievement definitions (platform-wide, seeded)
CREATE TABLE achievement_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL,
  threshold INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Org achievements (which org unlocked which achievement)
CREATE TABLE org_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievement_definitions(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, achievement_id)
);

-- Seed 13 achievement definitions
INSERT INTO achievement_definitions (id, name, description, icon, category, threshold, sort_order) VALUES
  ('first_contact',      'First Contact',       'Add your first contact',                        'UserPlus',      'contacts',   1,   1),
  ('contact_10',         'Growing Network',      'Reach 10 contacts',                             'Users',         'contacts',   10,  2),
  ('contact_100',        'Century Club',         'Reach 100 contacts',                            'Users',         'contacts',   100, 3),
  ('contact_1000',       'Thousand Strong',      'Reach 1,000 contacts',                          'Users',         'contacts',   1000, 4),
  ('first_campaign',     'Campaign Creator',     'Create your first campaign',                    'Megaphone',     'campaigns',  1,   5),
  ('campaign_10',        'Campaign Pro',         'Create 10 campaigns',                           'Megaphone',     'campaigns',  10,  6),
  ('first_message',      'Message Sent',         'Send your first message',                       'Send',          'messages',   1,   7),
  ('message_100',        'Centurion Sender',     'Send 100 messages',                             'Send',          'messages',   100, 8),
  ('message_1000',       'Thousand Delivered',   'Send 1,000 messages',                           'Send',          'messages',   1000, 9),
  ('first_template',     'Template Master',      'Submit your first template',                    'FileText',      'templates',  1,   10),
  ('template_approved',  'Approved!',            'Get a template approved by WhatsApp',           'CheckCircle',   'templates',  1,   11),
  ('team_player',        'Team Player',          'Invite a team member to your organization',     'UserPlus',      'team',       1,   12),
  ('onboarding_done',    'Getting Started',      'Complete the onboarding wizard',                'Rocket',        'onboarding', 1,   13);

-- Enable RLS on new tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_achievements ENABLE ROW LEVEL SECURITY;

-- achievement_definitions are readable by all authenticated users
CREATE POLICY "Anyone can read achievement definitions"
  ON achievement_definitions FOR SELECT
  TO authenticated
  USING (true);
