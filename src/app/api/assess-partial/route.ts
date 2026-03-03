import { NextResponse } from "next/server";
import { verifyRequest } from "@/lib/verify-hmac";
import { sendPartialNotification } from "@/lib/email";

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_ASSESS_PARTIAL;

export async function POST(request: Request) {
  try {
    const body = await verifyRequest(request);

    // Honeypot check — silent drop
    if (body.confirm_email_address) {
      return NextResponse.json({ ok: true });
    }

    // Validate minimum fields for partial save
    if (!body.email || typeof body.email !== "string") {
      return NextResponse.json(
        { error: "Email is required for Save for Later" },
        { status: 400 }
      );
    }

    // Notify admin on Step 1 auto-capture (fire-and-forget)
    if (body.capture_type === "step1_auto") {
      sendPartialNotification({
        first_name: body.first_name as string,
        last_name: body.last_name as string,
        email: body.email as string,
        company_name: body.company_name as string,
        company_url: body.company_url as string,
      }).catch((err) =>
        console.error("Partial admin notification failed:", err)
      );
    }

    if (!N8N_WEBHOOK_URL) {
      console.error("N8N_WEBHOOK_ASSESS_PARTIAL not configured");
      return NextResponse.json(
        { error: "Service temporarily unavailable" },
        { status: 503 }
      );
    }

    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        client_ip: request.headers.get("x-forwarded-for") || "unknown",
        received_at: new Date().toISOString(),
      }),
    });

    if (!n8nResponse.ok) {
      console.error("n8n partial webhook failed:", n8nResponse.status);
      return NextResponse.json(
        { error: "Processing failed" },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Assess-partial endpoint error:", message);

    if (message.includes("HMAC") || message.includes("Timestamp") || message.includes("Signature")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
