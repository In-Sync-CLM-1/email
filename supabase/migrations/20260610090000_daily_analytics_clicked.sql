-- Analytics.tsx reads daily_analytics.messages_clicked for the Click Rate KPI and
-- time-series, but the column was never added. Add it and include click aggregation
-- in aggregate_daily_analytics (invoked daily by the aggregate-daily-analytics worker).

ALTER TABLE public.daily_analytics
  ADD COLUMN IF NOT EXISTS messages_clicked integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.aggregate_daily_analytics()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  target_date DATE := CURRENT_DATE - INTERVAL '1 day';
  org RECORD;
BEGIN
  FOR org IN SELECT id FROM organizations LOOP
    INSERT INTO daily_analytics (org_id, date, messages_sent, messages_delivered, messages_read, messages_failed, messages_inbound, messages_clicked, conversations_created, contacts_created)
    SELECT
      org.id,
      target_date,
      COALESCE(SUM(CASE WHEN direction = 'outbound' AND status IN ('sent', 'delivered', 'read') THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN direction = 'outbound' AND status IN ('delivered', 'read') THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN direction = 'outbound' AND status = 'read' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN direction = 'outbound' AND status = 'failed' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN direction = 'outbound' AND clicked_at IS NOT NULL THEN 1 ELSE 0 END), 0),
      0,
      0
    FROM messages
    WHERE org_id = org.id AND created_at::date = target_date
    ON CONFLICT (org_id, date) DO UPDATE SET
      messages_sent = EXCLUDED.messages_sent,
      messages_delivered = EXCLUDED.messages_delivered,
      messages_read = EXCLUDED.messages_read,
      messages_failed = EXCLUDED.messages_failed,
      messages_inbound = EXCLUDED.messages_inbound,
      messages_clicked = EXCLUDED.messages_clicked;

    -- Count conversations and contacts created on that date
    UPDATE daily_analytics SET
      conversations_created = (SELECT COUNT(*) FROM conversations WHERE org_id = org.id AND created_at::date = target_date),
      contacts_created = (SELECT COUNT(*) FROM contacts WHERE org_id = org.id AND created_at::date = target_date)
    WHERE org_id = org.id AND date = target_date;
  END LOOP;
END;
$function$;
