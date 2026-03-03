import { NextResponse } from "next/server";

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_GET_PARTIAL;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const resumeId = searchParams.get("resume_id");

    if (!resumeId || !/^[0-9a-f-]{36}$/i.test(resumeId)) {
      return NextResponse.json(
        { error: "Valid resume_id is required" },
        { status: 400 }
      );
    }

    if (!N8N_WEBHOOK_URL) {
      console.error("N8N_WEBHOOK_GET_PARTIAL not configured");
      return NextResponse.json(
        { error: "Service temporarily unavailable" },
        { status: 503 }
      );
    }

    const n8nResponse = await fetch(
      `${N8N_WEBHOOK_URL}?resume_id=${encodeURIComponent(resumeId)}`,
      { method: "GET" }
    );

    if (!n8nResponse.ok) {
      if (n8nResponse.status === 404) {
        return NextResponse.json(
          { error: "Resume session not found or expired" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Retrieval failed" },
        { status: 502 }
      );
    }

    const data = await n8nResponse.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Get-partial-data error:", err);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
