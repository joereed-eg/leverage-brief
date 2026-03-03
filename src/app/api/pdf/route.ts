import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { generatePdfHtml } from "@/lib/pdf-template";

export const maxDuration = 60;

export async function POST(request: Request) {
  let browser;
  try {
    const body = await request.json();

    const {
      name,
      company_name,
      gatekeeper_path,
      strategic_gap_score,
      synthesized_brief,
    } = body;

    if (!synthesized_brief) {
      return NextResponse.json(
        { error: "synthesized_brief is required" },
        { status: 400 }
      );
    }

    // Generate HTML with embedded Satoshi fonts
    const html = generatePdfHtml({
      name: name || "Leader",
      company_name: company_name || "Your Company",
      gatekeeper_path: gatekeeper_path || "LITE",
      strategic_gap_score: strategic_gap_score || 0,
      synthesized_brief,
    });

    // Launch Puppeteer with @sparticuz/chromium for serverless
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 720 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    // Wait for embedded fonts to load
    await page.evaluateHandle("document.fonts.ready");

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      preferCSSPageSize: false,
    });

    await browser.close();
    browser = undefined;

    // Return PDF as binary with appropriate headers
    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Leverage-Brief-${(company_name || "Report").replace(/[^a-zA-Z0-9]/g, "-")}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (browser) {
      await browser.close().catch(() => {});
    }
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("PDF generation failed:", message, stack);
    return NextResponse.json(
      { error: "PDF generation failed", detail: message },
      { status: 500 }
    );
  }
}
