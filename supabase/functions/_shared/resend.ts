// Shared module: sends email via Resend HTTP API

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  from?: string;
  reply_to?: string;
  headers?: Record<string, string>;
}

const DEFAULT_FROM = "In-Sync <noreply@in-sync.co.in>";

export async function sendEmail(payload: EmailPayload): Promise<{ id: string }> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

  const body: Record<string, unknown> = {
    from: payload.from || DEFAULT_FROM,
    to: [payload.to],
    subject: payload.subject,
    html: payload.html,
  };
  if (payload.reply_to) body.reply_to = payload.reply_to;
  if (payload.headers) body.headers = payload.headers;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Resend API error: ${JSON.stringify(data)}`);
  }
  return data;
}

export function confirmationEmailHtml(confirmLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#18181b;padding:28px 32px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">In-Sync</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 12px;color:#18181b;font-size:20px;">Confirm your email</h2>
          <p style="color:#52525b;font-size:15px;line-height:1.6;margin:0 0 24px;">
            Thanks for signing up for In-Sync! Click the button below to confirm your email address and get started.
          </p>
          <a href="${confirmLink}" style="display:inline-block;background:#6366f1;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
            Confirm Email
          </a>
          <p style="color:#a1a1aa;font-size:13px;line-height:1.5;margin:24px 0 0;">
            If you didn't create an account on In-Sync, you can safely ignore this email.
          </p>
        </td></tr>
        <tr><td style="padding:20px 32px;background:#fafafa;border-top:1px solid #f0f0f0;">
          <p style="margin:0;color:#a1a1aa;font-size:12px;text-align:center;">In-Sync &mdash; Email Broadcast Platform</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function resetPasswordEmailHtml(resetLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#18181b;padding:28px 32px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">In-Sync</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 12px;color:#18181b;font-size:20px;">Reset your password</h2>
          <p style="color:#52525b;font-size:15px;line-height:1.6;margin:0 0 24px;">
            We received a request to reset your password. Click the button below to choose a new one.
          </p>
          <a href="${resetLink}" style="display:inline-block;background:#6366f1;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
            Reset Password
          </a>
          <p style="color:#a1a1aa;font-size:13px;line-height:1.5;margin:24px 0 0;">
            This link expires in 24 hours. If you didn't request a password reset, you can safely ignore this email.
          </p>
        </td></tr>
        <tr><td style="padding:20px 32px;background:#fafafa;border-top:1px solid #f0f0f0;">
          <p style="margin:0;color:#a1a1aa;font-size:12px;text-align:center;">In-Sync &mdash; Email Broadcast Platform</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function invitationEmailHtml(
  orgName: string,
  email: string,
  tempPassword: string,
  loginUrl: string,
): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#18181b;padding:28px 32px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">In-Sync</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 12px;color:#18181b;font-size:20px;">You've been invited!</h2>
          <p style="color:#52525b;font-size:15px;line-height:1.6;margin:0 0 20px;">
            You've been invited to join <strong>${orgName}</strong> on In-Sync.
            Use the credentials below to sign in.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;border-radius:8px;padding:16px;margin:0 0 24px;">
            <tr><td>
              <p style="margin:0 0 8px;color:#52525b;font-size:13px;"><strong>Email:</strong> ${email}</p>
              <p style="margin:0;color:#52525b;font-size:13px;"><strong>Temporary password:</strong> <code style="background:#e4e4e7;padding:2px 6px;border-radius:4px;">${tempPassword}</code></p>
            </td></tr>
          </table>
          <a href="${loginUrl}" style="display:inline-block;background:#6366f1;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
            Sign In
          </a>
          <p style="color:#a1a1aa;font-size:13px;line-height:1.5;margin:24px 0 0;">
            Please change your password after your first sign in.
          </p>
        </td></tr>
        <tr><td style="padding:20px 32px;background:#fafafa;border-top:1px solid #f0f0f0;">
          <p style="margin:0;color:#a1a1aa;font-size:12px;text-align:center;">In-Sync &mdash; Email Broadcast Platform</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
