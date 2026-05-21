-- Make phone_number optional (email is now the primary identifier)
ALTER TABLE contacts ALTER COLUMN phone_number DROP NOT NULL;

-- Unique index on email + org_id for email-based upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_email_org
  ON contacts(email, org_id) WHERE email IS NOT NULL;
