-- ══════════════════════════════════════════════════════════════
-- Trial & Subscription model for organizations
-- Replaces wallet-based billing with subscription-based billing
-- ══════════════════════════════════════════════════════════════

-- 1. Org status enum
CREATE TYPE org_status AS ENUM ('trial', 'active', 'suspended');

-- 2. Add trial + subscription columns to organizations
ALTER TABLE organizations
  ADD COLUMN org_status org_status NOT NULL DEFAULT 'trial',
  ADD COLUMN trial_started_at TIMESTAMPTZ,
  ADD COLUMN trial_emails_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN subscription_plan TEXT CHECK (subscription_plan IN ('starter', 'growth', 'scale')),
  ADD COLUMN subscription_id TEXT,
  ADD COLUMN subscription_status TEXT CHECK (subscription_status IN ('active', 'cancelled', 'paused', 'past_due')),
  ADD COLUMN suspended_at TIMESTAMPTZ;

-- 3. Backfill: existing orgs are active (they predate the trial model)
UPDATE organizations SET org_status = 'active';

-- 4. Set trial_started_at for new orgs via trigger
CREATE OR REPLACE FUNCTION set_trial_defaults()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trial_started_at IS NULL THEN
    NEW.trial_started_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_trial_defaults
  BEFORE INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_trial_defaults();

-- 5. Atomic trial email increment — returns new count, or -1 if limit exceeded
CREATE OR REPLACE FUNCTION increment_trial_emails(_org_id UUID, _count INTEGER DEFAULT 1)
RETURNS INTEGER AS $$
DECLARE
  _new_count INTEGER;
BEGIN
  UPDATE organizations
    SET trial_emails_used = trial_emails_used + _count
    WHERE id = _org_id
      AND org_status = 'trial'
      AND trial_emails_used + _count <= 100
    RETURNING trial_emails_used INTO _new_count;

  IF _new_count IS NULL THEN
    RETURN -1; -- limit would be exceeded
  END IF;

  RETURN _new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Subscription payments table
CREATE TABLE subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  razorpay_subscription_id TEXT,
  razorpay_payment_id TEXT,
  plan TEXT NOT NULL CHECK (plan IN ('starter', 'growth', 'scale')),
  amount INTEGER NOT NULL, -- paise
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sub_payments_org ON subscription_payments(org_id, created_at DESC);

ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their subscription payments"
  ON subscription_payments FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "Service role manages subscription payments"
  ON subscription_payments FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 7. Helper: activate subscription (called after payment verified)
CREATE OR REPLACE FUNCTION activate_subscription(
  _org_id UUID,
  _plan TEXT,
  _subscription_id TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE organizations
    SET org_status = 'active',
        subscription_plan = _plan,
        subscription_id = _subscription_id,
        subscription_status = 'active',
        suspended_at = NULL,
        updated_at = now()
    WHERE id = _org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Helper: suspend org
CREATE OR REPLACE FUNCTION suspend_org(_org_id UUID) RETURNS VOID AS $$
BEGIN
  UPDATE organizations
    SET org_status = 'suspended',
        suspended_at = now(),
        updated_at = now()
    WHERE id = _org_id AND org_status = 'trial';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
