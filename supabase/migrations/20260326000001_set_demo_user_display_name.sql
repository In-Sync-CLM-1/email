-- Set display name for demo user demo@in-sync.co.in
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"full_name": "In-Sync Demo"}'::jsonb
WHERE email = 'demo@in-sync.co.in';
