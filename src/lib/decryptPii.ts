import { supabase } from "@/integrations/supabase/client";

/**
 * Batch-decrypt PII fields for contacts that have pii_encrypted = true.
 *
 * Takes an array of contact-like objects (must have id, org_id, pii_encrypted,
 * name, email) and returns the same array with decrypted values merged in.
 *
 * Uses the `decrypt_contacts_batch` RPC which decrypts server-side and logs
 * PII access for each contact.
 *
 * For contacts with pii_encrypted !== true the original values pass through.
 */
export async function decryptContacts<
  T extends { id: string; org_id?: string; pii_encrypted?: boolean | null; name?: string | null; email?: string | null; custom_fields?: Record<string, unknown> | null },
>(contacts: T[], orgId: string): Promise<T[]> {
  if (!contacts || contacts.length === 0) return contacts;

  const encrypted = contacts.filter((c) => c.pii_encrypted === true);
  if (encrypted.length === 0) return contacts;

  const ids = encrypted.map((c) => c.id);

  const { data, error } = await supabase.rpc("decrypt_contacts_batch", {
    p_org_id: orgId,
    p_contact_ids: ids,
  });

  if (error || !data) {
    console.warn("PII batch decrypt failed, showing masked values:", error?.message);
    return contacts;
  }

  // Build a lookup map from the RPC result
  const decryptedMap = new Map<string, { name: string | null; email: string | null; custom_fields: Record<string, unknown> | null }>();
  for (const row of data as Array<{ contact_id: string; decrypted_name: string | null; decrypted_email: string | null; decrypted_custom_fields: string | null }>) {
    decryptedMap.set(row.contact_id, {
      name: row.decrypted_name,
      email: row.decrypted_email,
      custom_fields: row.decrypted_custom_fields ? tryParseJson(row.decrypted_custom_fields) : null,
    });
  }

  // Merge decrypted values back onto original objects
  return contacts.map((c) => {
    const dec = decryptedMap.get(c.id);
    if (!dec) return c;
    return {
      ...c,
      name: dec.name ?? c.name,
      email: dec.email ?? c.email,
      custom_fields: dec.custom_fields ?? c.custom_fields,
    };
  });
}

/**
 * Decrypt PII for contacts nested inside another object (e.g., conversation.contacts).
 *
 * Takes an array of parent objects that have a `contacts` relation with
 * { name, phone_number } and a `contact_id` field, and decrypts the nested
 * contact names.
 *
 * Because the join only returns name + phone_number (no id/pii_encrypted),
 * we fetch the encryption status separately and decrypt.
 */
export async function decryptNestedContacts<
  T extends { contact_id: string; contacts: { name: string | null; phone_number: string } | null },
>(items: T[], orgId: string): Promise<T[]> {
  if (!items || items.length === 0) return items;

  // Get contact IDs that need checking
  const contactIds = [...new Set(items.map((i) => i.contact_id).filter(Boolean))];
  if (contactIds.length === 0) return items;

  // Check which contacts are encrypted
  const { data: encStatus } = await supabase
    .from("contacts")
    .select("id, pii_encrypted")
    .eq("org_id", orgId)
    .in("id", contactIds)
    .eq("pii_encrypted", true);

  if (!encStatus || encStatus.length === 0) return items;

  const encryptedIds = encStatus.map((c) => c.id);

  const { data, error } = await supabase.rpc("decrypt_contacts_batch", {
    p_org_id: orgId,
    p_contact_ids: encryptedIds,
  });

  if (error || !data) {
    console.warn("Nested PII decrypt failed:", error?.message);
    return items;
  }

  const decryptedMap = new Map<string, string | null>();
  for (const row of data as Array<{ contact_id: string; decrypted_name: string | null }>) {
    decryptedMap.set(row.contact_id, row.decrypted_name);
  }

  return items.map((item) => {
    const decName = decryptedMap.get(item.contact_id);
    if (decName === undefined || !item.contacts) return item;
    return {
      ...item,
      contacts: { ...item.contacts, name: decName ?? item.contacts.name },
    };
  });
}

function tryParseJson(str: string): Record<string, unknown> | null {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}
