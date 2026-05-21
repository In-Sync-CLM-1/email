export async function invokeErrorMessage(err: unknown): Promise<string> {
  const e = err as { context?: { json?: () => Promise<unknown> }; message?: string };
  const fallback = e?.message ?? "Unknown error";
  const resp = e?.context;
  if (resp && typeof resp.json === "function") {
    try {
      const body = (await resp.json()) as { error?: string; details?: string; message?: string };
      return body?.error || body?.message || body?.details || fallback;
    } catch {
      // body wasn't JSON
    }
  }
  return fallback;
}
