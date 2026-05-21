-- Store per-number logos as {"+919876543210": "https://...logo.png"}
alter table org_credentials
  add column if not exists phone_logos jsonb default '{}';
