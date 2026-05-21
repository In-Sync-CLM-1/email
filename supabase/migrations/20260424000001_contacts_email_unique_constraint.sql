-- Replace the partial unique index on (email, org_id) with a regular UNIQUE
-- constraint so supabase-js upsert with `onConflict: "email,org_id"` works.
-- Partial indexes (WHERE email IS NOT NULL) cannot be used as ON CONFLICT
-- targets unless the INSERT's predicate logically implies the index predicate,
-- which it never does in a PostgREST upsert call. NULL emails remain allowed
-- because unique constraints treat NULLs as distinct by default.

DROP INDEX IF EXISTS public.idx_contacts_email_org;

ALTER TABLE public.contacts
  DROP CONSTRAINT IF EXISTS contacts_email_org_id_key;

ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_email_org_id_key UNIQUE (email, org_id);
