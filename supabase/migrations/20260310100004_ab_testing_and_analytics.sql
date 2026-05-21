-- A/B Testing: campaign variants
CREATE TABLE campaign_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Variant A',
  template_id UUID REFERENCES templates(id),
  template_message TEXT,
  media_url TEXT,
  weight INT NOT NULL DEFAULT 50, -- percentage allocation
  sent_count INT NOT NULL DEFAULT 0,
  delivered_count INT NOT NULL DEFAULT 0,
  read_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_variants_campaign ON campaign_variants(campaign_id);

ALTER TABLE campaign_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage campaign variants" ON campaign_variants FOR ALL
USING (EXISTS (SELECT 1 FROM campaigns c WHERE c.id = campaign_id AND is_org_member(auth.uid(), c.org_id)));

-- Analytics: daily aggregates for fast dashboard queries
CREATE TABLE daily_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  messages_sent INT NOT NULL DEFAULT 0,
  messages_delivered INT NOT NULL DEFAULT 0,
  messages_read INT NOT NULL DEFAULT 0,
  messages_failed INT NOT NULL DEFAULT 0,
  messages_inbound INT NOT NULL DEFAULT 0,
  conversations_created INT NOT NULL DEFAULT 0,
  contacts_created INT NOT NULL DEFAULT 0,
  avg_response_time_min NUMERIC,
  UNIQUE(org_id, date)
);

CREATE INDEX idx_daily_analytics_org_date ON daily_analytics(org_id, date DESC);

ALTER TABLE daily_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view analytics" ON daily_analytics FOR ALL
USING (is_org_member(auth.uid(), org_id));

-- Function to aggregate daily analytics (called by pg_cron)
CREATE OR REPLACE FUNCTION aggregate_daily_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_date DATE := CURRENT_DATE - INTERVAL '1 day';
  org RECORD;
BEGIN
  FOR org IN SELECT id FROM organizations LOOP
    INSERT INTO daily_analytics (org_id, date, messages_sent, messages_delivered, messages_read, messages_failed, messages_inbound, conversations_created, contacts_created)
    SELECT
      org.id,
      target_date,
      COALESCE(SUM(CASE WHEN direction = 'outbound' AND status IN ('sent', 'delivered', 'read') THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN direction = 'outbound' AND status IN ('delivered', 'read') THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN direction = 'outbound' AND status = 'read' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN direction = 'outbound' AND status = 'failed' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END), 0),
      0,
      0
    FROM messages
    WHERE org_id = org.id AND created_at::date = target_date
    ON CONFLICT (org_id, date) DO UPDATE SET
      messages_sent = EXCLUDED.messages_sent,
      messages_delivered = EXCLUDED.messages_delivered,
      messages_read = EXCLUDED.messages_read,
      messages_failed = EXCLUDED.messages_failed,
      messages_inbound = EXCLUDED.messages_inbound;

    -- Count conversations and contacts created on that date
    UPDATE daily_analytics SET
      conversations_created = (SELECT COUNT(*) FROM conversations WHERE org_id = org.id AND created_at::date = target_date),
      contacts_created = (SELECT COUNT(*) FROM contacts WHERE org_id = org.id AND created_at::date = target_date)
    WHERE org_id = org.id AND date = target_date;
  END LOOP;
END;
$$;

-- Schedule daily analytics aggregation at 1 AM
SELECT cron.schedule(
  'aggregate-daily-analytics',
  '0 1 * * *',
  'SELECT aggregate_daily_analytics()'
);
