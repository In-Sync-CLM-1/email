-- Batch decrypt PII for multiple contacts at once.
-- Returns a table of (contact_id, decrypted_name, decrypted_email, decrypted_custom_fields).
-- Logs PII access for each contact.

CREATE OR REPLACE FUNCTION decrypt_contacts_batch(p_org_id UUID, p_contact_ids UUID[])
RETURNS TABLE (
  contact_id UUID,
  decrypted_name TEXT,
  decrypted_email TEXT,
  decrypted_custom_fields TEXT
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
DECLARE
  cid UUID;
  c RECORD;
  d_name TEXT;
  d_email TEXT;
  d_custom TEXT;
BEGIN
  -- Verify caller is a member of the org
  IF NOT is_org_member(auth.uid(), p_org_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  FOREACH cid IN ARRAY p_contact_ids
  LOOP
    SELECT id, org_id, name, email, name_encrypted, email_encrypted, custom_fields_encrypted, custom_fields, pii_encrypted
    INTO c
    FROM contacts
    WHERE id = cid AND org_id = p_org_id;

    IF c IS NULL THEN CONTINUE; END IF;
    IF NOT COALESCE(c.pii_encrypted, false) THEN
      -- Not encrypted, return plaintext
      contact_id := c.id;
      decrypted_name := c.name;
      decrypted_email := c.email;
      decrypted_custom_fields := c.custom_fields::text;
      RETURN NEXT;
      CONTINUE;
    END IF;

    -- Decrypt name
    BEGIN
      d_name := decrypt_pii_value(p_org_id, c.name_encrypted);
    EXCEPTION WHEN OTHERS THEN
      d_name := c.name; -- fallback to masked value
    END;

    -- Decrypt email
    BEGIN
      d_email := decrypt_pii_value(p_org_id, c.email_encrypted);
    EXCEPTION WHEN OTHERS THEN
      d_email := c.email;
    END;

    -- Decrypt custom_fields
    BEGIN
      d_custom := decrypt_pii_value(p_org_id, c.custom_fields_encrypted);
    EXCEPTION WHEN OTHERS THEN
      d_custom := COALESCE(c.custom_fields::text, '{}');
    END;

    -- Log PII access (batch: one row per contact covering all fields)
    INSERT INTO pii_access_log (org_id, user_id, contact_id, table_name, column_name, purpose)
    VALUES
      (p_org_id, auth.uid(), cid, 'contacts', 'name,email,custom_fields', 'batch_display');

    contact_id := c.id;
    decrypted_name := d_name;
    decrypted_email := d_email;
    decrypted_custom_fields := d_custom;
    RETURN NEXT;
  END LOOP;
END;
$$;
