-- Migration 4: New helper functions + RLS policy rewrite for multi-tenant

-- ══════════════════════════════════════════════
-- Helper functions
-- ══════════════════════════════════════════════

-- Check if user is super_admin (platform-level)
CREATE OR REPLACE FUNCTION is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  );
$$;

-- Check if user has a specific org role (admin inherits member; super_admin bypasses)
CREATE OR REPLACE FUNCTION has_org_role(_user_id UUID, _org_id UUID, _role org_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    is_super_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM org_memberships
      WHERE user_id = _user_id
        AND org_id = _org_id
        AND (
          role = _role
          OR (_role = 'member' AND role = 'admin')  -- admin inherits member
        )
    );
$$;

-- Check if user is any member of org (or super_admin)
CREATE OR REPLACE FUNCTION is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    is_super_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM org_memberships
      WHERE user_id = _user_id AND org_id = _org_id
    );
$$;

-- Get all org IDs a user belongs to
CREATE OR REPLACE FUNCTION get_user_org_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT org_id FROM org_memberships WHERE user_id = _user_id;
$$;

-- ══════════════════════════════════════════════
-- Drop ALL old RLS policies
-- ══════════════════════════════════════════════

-- campaigns
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'campaigns') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON campaigns', r.policyname);
  END LOOP;
END $$;

-- contacts
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'contacts') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON contacts', r.policyname);
  END LOOP;
END $$;

-- campaign_contacts
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'campaign_contacts') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON campaign_contacts', r.policyname);
  END LOOP;
END $$;

-- messages
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'messages') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON messages', r.policyname);
  END LOOP;
END $$;

-- templates
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'templates') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON templates', r.policyname);
  END LOOP;
END $$;

-- user_roles
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_roles') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON user_roles', r.policyname);
  END LOOP;
END $$;

-- ══════════════════════════════════════════════
-- New RLS policies: organizations
-- ══════════════════════════════════════════════

CREATE POLICY "Members can view their orgs"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR id IN (SELECT get_user_org_ids(auth.uid()))
  );

CREATE POLICY "Authenticated users can create orgs"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Org admins can update their org"
  ON organizations FOR UPDATE
  TO authenticated
  USING (has_org_role(auth.uid(), id, 'admin'));

-- ══════════════════════════════════════════════
-- New RLS policies: org_memberships
-- ══════════════════════════════════════════════

CREATE POLICY "Members can view org memberships"
  ON org_memberships FOR SELECT
  TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR org_id IN (SELECT get_user_org_ids(auth.uid()))
  );

CREATE POLICY "Org admins can manage memberships"
  ON org_memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    has_org_role(auth.uid(), org_id, 'admin')
  );

CREATE POLICY "Org admins can update memberships"
  ON org_memberships FOR UPDATE
  TO authenticated
  USING (has_org_role(auth.uid(), org_id, 'admin'));

CREATE POLICY "Org admins can delete memberships"
  ON org_memberships FOR DELETE
  TO authenticated
  USING (has_org_role(auth.uid(), org_id, 'admin'));

-- ══════════════════════════════════════════════
-- New RLS policies: org_credentials
-- ══════════════════════════════════════════════

CREATE POLICY "Org admins can view credentials"
  ON org_credentials FOR SELECT
  TO authenticated
  USING (has_org_role(auth.uid(), org_id, 'admin'));

CREATE POLICY "Org admins can insert credentials"
  ON org_credentials FOR INSERT
  TO authenticated
  WITH CHECK (has_org_role(auth.uid(), org_id, 'admin'));

CREATE POLICY "Org admins can update credentials"
  ON org_credentials FOR UPDATE
  TO authenticated
  USING (has_org_role(auth.uid(), org_id, 'admin'));

-- ══════════════════════════════════════════════
-- New RLS policies: campaigns
-- ══════════════════════════════════════════════

CREATE POLICY "Org members can view campaigns"
  ON campaigns FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "Org admins can insert campaigns"
  ON campaigns FOR INSERT
  TO authenticated
  WITH CHECK (has_org_role(auth.uid(), org_id, 'admin'));

CREATE POLICY "Org admins can update campaigns"
  ON campaigns FOR UPDATE
  TO authenticated
  USING (has_org_role(auth.uid(), org_id, 'admin'));

CREATE POLICY "Org admins can delete campaigns"
  ON campaigns FOR DELETE
  TO authenticated
  USING (has_org_role(auth.uid(), org_id, 'admin'));

-- ══════════════════════════════════════════════
-- New RLS policies: contacts
-- ══════════════════════════════════════════════

CREATE POLICY "Org members can view contacts"
  ON contacts FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "Org admins can insert contacts"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (has_org_role(auth.uid(), org_id, 'admin'));

CREATE POLICY "Org admins can update contacts"
  ON contacts FOR UPDATE
  TO authenticated
  USING (has_org_role(auth.uid(), org_id, 'admin'));

CREATE POLICY "Org admins can delete contacts"
  ON contacts FOR DELETE
  TO authenticated
  USING (has_org_role(auth.uid(), org_id, 'admin'));

-- ══════════════════════════════════════════════
-- New RLS policies: campaign_contacts
-- ══════════════════════════════════════════════

CREATE POLICY "Org members can view campaign_contacts"
  ON campaign_contacts FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "Org admins can insert campaign_contacts"
  ON campaign_contacts FOR INSERT
  TO authenticated
  WITH CHECK (has_org_role(auth.uid(), org_id, 'admin'));

CREATE POLICY "Org admins can delete campaign_contacts"
  ON campaign_contacts FOR DELETE
  TO authenticated
  USING (has_org_role(auth.uid(), org_id, 'admin'));

-- ══════════════════════════════════════════════
-- New RLS policies: messages
-- ══════════════════════════════════════════════

CREATE POLICY "Org members can view messages"
  ON messages FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "Org admins can insert messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (has_org_role(auth.uid(), org_id, 'admin'));

CREATE POLICY "Org admins can update messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (has_org_role(auth.uid(), org_id, 'admin'));

-- ══════════════════════════════════════════════
-- New RLS policies: templates
-- ══════════════════════════════════════════════

CREATE POLICY "Org members can view templates"
  ON templates FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "Org admins can insert templates"
  ON templates FOR INSERT
  TO authenticated
  WITH CHECK (has_org_role(auth.uid(), org_id, 'admin'));

CREATE POLICY "Org admins can update templates"
  ON templates FOR UPDATE
  TO authenticated
  USING (has_org_role(auth.uid(), org_id, 'admin'));

CREATE POLICY "Org admins can delete templates"
  ON templates FOR DELETE
  TO authenticated
  USING (has_org_role(auth.uid(), org_id, 'admin'));

-- ══════════════════════════════════════════════
-- New RLS policies: org_achievements
-- ══════════════════════════════════════════════

CREATE POLICY "Org members can view achievements"
  ON org_achievements FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "Org admins can insert achievements"
  ON org_achievements FOR INSERT
  TO authenticated
  WITH CHECK (has_org_role(auth.uid(), org_id, 'admin'));

-- ══════════════════════════════════════════════
-- user_roles: keep for super_admin checks, read-only for auth users
-- ══════════════════════════════════════════════

CREATE POLICY "Users can read own role"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_super_admin(auth.uid()));

-- ══════════════════════════════════════════════
-- Update handle_new_user trigger to be a no-op
-- (org creation flow handles roles now)
-- ══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- No-op: org creation flow handles memberships now
  RETURN NEW;
END;
$$;
