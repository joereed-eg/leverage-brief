import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

/**
 * POST /api/pdf/store
 *
 * Accepts a generated PDF (base64) and stores it in Vercel Blob.
 * Returns a permanent download URL for Zoho email templates.
 *
 * Body: { pdf_base64: string, company_name: string, email: string }
 * Returns: { pdf_download_url: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pdf_base64, company_name, email } = body;

    if (!pdf_base64) {
      return NextResponse.json(
        { error: "pdf_base64 is required" },
        { status: 400 }
      );
    }

    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(pdf_base64, "base64");

    // Generate a clean filename
    const safeName = (company_name || "report")
      .replace(/[^a-zA-Z0-9]/g, "-")
      .substring(0, 50);
    const timestamp = Date.now();
    const filename = `leverage-briefs/${safeName}-${timestamp}.pdf`;

    // Store in Vercel Blob
    const blob = await put(filename, pdfBuffer, {
      access: "public",
      contentType: "application/pdf",
      addRandomSuffix: false,
    });

    return NextResponse.json({
      pdf_download_url: blob.url,
      stored_at: new Date().toISOString(),
      email,
    });
  } catch (err) {
    console.error("PDF store failed:", err);
    return NextResponse.json(
      { error: "PDF storage failed" },
      { status: 500 }
    );
  }
}
