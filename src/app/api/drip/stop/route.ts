import { NextResponse } from "next/server";
import crypto from "crypto";

const SECRET = process.env.HMAC_SECRET || "fulcrum-dev-secret";
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_DRIP_STOP;

/**
 * GET /api/drip/stop?email=...&token=...
 *
 * Unsubscribe endpoint embedded in drip emails.
 * Token = HMAC-SHA256(email, secret) to prevent abuse.
 * Notifies n8n to stop drip sequence for this email.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const token = searchParams.get("token");

  if (!email || !token) {
    return new NextResponse(unsubPage("Invalid link."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  // Verify token
  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(email.toLowerCase())
    .digest("hex")
    .substring(0, 16);

  if (token !== expected) {
    return new NextResponse(unsubPage("Invalid or expired link."), {
      status: 403,
      headers: { "Content-Type": "text/html" },
    });
  }

  // Notify n8n to stop drips (fire-and-forget)
  if (N8N_WEBHOOK_URL) {
    fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.toLowerCase(),
        action: "stop_drip",
        stopped_at: new Date().toISOString(),
      }),
    }).catch((err) => console.error("Drip stop webhook failed:", err));
  }

  return new NextResponse(
    unsubPage("You've been unsubscribed. You won't receive any more follow-up emails from us."),
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}

function unsubPage(message: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe</title></head>
<body style="margin: 0; padding: 60px 20px; font-family: Arial, sans-serif; background: #F7F5F2; text-align: center;">
  <div style="max-width: 400px; margin: 0 auto;">
    <img src="https://fulcrumcollective.io/wp-content/uploads/2026/03/Fulcrum-Logo.png" alt="Fulcrum Collective" width="120" style="margin-bottom: 24px;" />
    <p style="font-size: 16px; line-height: 1.6; color: #333;">${message}</p>
    <a href="https://www.fulcrumcollective.io" style="display: inline-block; margin-top: 20px; color: #666; font-size: 14px;">Return to Fulcrum Collective</a>
  </div>
</body>
</html>`;
}
