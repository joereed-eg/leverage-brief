import { NextResponse } from "next/server";
import crypto from "crypto";
import { verifyRequest } from "@/lib/verify-hmac";
import { sendConfirmationEmail, sendAdminNotification } from "@/lib/email";

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_ASSESS_FULL;
const HMAC_SECRET = process.env.HMAC_SECRET || "fulcrum-dev-secret";

export async function POST(request: Request) {
  try {
    const body = await verifyRequest(request);

    // Honeypot check — silent drop
    if (body.confirm_email_address) {
      return NextResponse.json({ ok: true });
    }

    // Send immediate confirmation email via Resend (fire-and-forget)
    const email = body.email as string;
    const firstName = (body.first_name as string) || "";
    const companyName = (body.company_name as string) || "your company";

    sendConfirmationEmail(email, firstName, companyName).catch((err) =>
      console.error("Confirmation email failed:", err)
    );

    // Send admin notification with all lead details (fire-and-forget)
    sendAdminNotification(body as Record<string, unknown>).catch((err) =>
      console.error("Admin notification failed:", err)
    );

    // Forward to n8n webhook
    if (!N8N_WEBHOOK_URL) {
      console.error("N8N_WEBHOOK_ASSESS_FULL not configured");
      return NextResponse.json(
        { error: "Service temporarily unavailable" },
        { status: 503 }
      );
    }

    // Pre-compute unsubscribe token so n8n nodes don't need crypto
    const unsubscribeToken = crypto
      .createHmac("sha256", HMAC_SECRET)
      .update(email.toLowerCase())
      .digest("hex")
      .substring(0, 16);

    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        client_ip: request.headers.get("x-forwarded-for") || "unknown",
        received_at: new Date().toISOString(),
        unsubscribe_token: unsubscribeToken,
      }),
    });

    if (!n8nResponse.ok) {
      console.error("n8n webhook failed:", n8nResponse.status);
      return NextResponse.json(
        { error: "Processing failed" },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Assess endpoint error:", message);

    if (message.includes("HMAC") || message.includes("Timestamp") || message.includes("Signature")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
