import fs from "fs";
import path from "path";

// Load Base64 font strings at module level
const fontsDir = path.join(process.cwd(), "src/assets/fonts");

function loadFont(filename: string): string {
  try {
    return fs.readFileSync(path.join(fontsDir, filename), "utf-8").trim();
  } catch {
    console.error(`Failed to load font: ${filename}`);
    return "";
  }
}

const SATOSHI_REGULAR_B64 = loadFont("satoshi-regular.b64");
const SATOSHI_BOLD_B64 = loadFont("satoshi-bold.b64");

interface PdfData {
  name: string;
  company_name: string;
  gatekeeper_path: "PREMIUM" | "LITE";
  strategic_gap_score: number;
  synthesized_brief: string; // Markdown from Claude
}

/**
 * Convert markdown-ish Claude output to HTML.
 * Handles: ## headings, ### headings, **bold**, > blockquotes,
 * - unordered lists, 1. ordered lists, paragraphs.
 */
function briefToHtml(markdown: string): string {
  const lines = markdown.split("\n");
  const html: string[] = [];
  let inList = false;
  let listType = "";

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Close list if line doesn't continue it
    if (inList && !line.match(/^(\d+\.|[-*])\s/) && line.trim() !== "") {
      html.push(listType === "ol" ? "</ol>" : "</ul>");
      inList = false;
    }

    // Empty line
    if (line.trim() === "") {
      if (inList) {
        html.push(listType === "ol" ? "</ol>" : "</ul>");
        inList = false;
      }
      continue;
    }

    // --- separator
    if (line.match(/^---+$/)) {
      html.push('<hr class="section-divider" />');
      continue;
    }

    // ## H2
    if (line.match(/^## /)) {
      const text = line.replace(/^## /, "");
      html.push(`<h2>${formatInline(text)}</h2>`);
      continue;
    }

    // ### H3 — Action headers get special styling
    if (line.match(/^### /)) {
      const text = line.replace(/^### /, "");
      if (text.match(/^Action \d/)) {
        html.push(`<h3 class="action-header">${formatInline(text)}</h3>`);
      } else {
        html.push(`<h3>${formatInline(text)}</h3>`);
      }
      continue;
    }

    // > Blockquote — used for the research fallback note
    if (line.match(/^>\s?/)) {
      const text = line.replace(/^>\s?/, "");
      html.push(`<div class="callout-note">${formatInline(text)}</div>`);
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\.\s/)) {
      if (!inList || listType !== "ol") {
        if (inList) html.push(listType === "ol" ? "</ol>" : "</ul>");
        html.push("<ol>");
        inList = true;
        listType = "ol";
      }
      const text = line.replace(/^\d+\.\s/, "");
      html.push(`<li>${formatInline(text)}</li>`);
      continue;
    }

    // Unordered list
    if (line.match(/^[-*]\s/)) {
      if (!inList || listType !== "ul") {
        if (inList) html.push(listType === "ol" ? "</ol>" : "</ul>");
        html.push("<ul>");
        inList = true;
        listType = "ul";
      }
      const text = line.replace(/^[-*]\s/, "");
      html.push(`<li>${formatInline(text)}</li>`);
      continue;
    }

    // Regular paragraph
    html.push(`<p>${formatInline(line)}</p>`);
  }

  if (inList) {
    html.push(listType === "ol" ? "</ol>" : "</ul>");
  }

  return html.join("\n");
}

/** Format inline markdown: **bold**, *italic*, `code` */
function formatInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code style="background:#eee;padding:1px 4px;border-radius:3px;font-size:0.9em;">$1</code>');
}

/**
 * Generate the full HTML document for Puppeteer PDF rendering.
 * Satoshi fonts embedded as Base64 — no network requests needed.
 */
export function generatePdfHtml(data: PdfData): string {
  const briefHtml = briefToHtml(data.synthesized_brief);
  const isPremium = data.gatekeeper_path === "PREMIUM";
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Leverage Brief — ${data.company_name}</title>
<style>
  @font-face {
    font-family: 'Satoshi';
    src: url('data:font/woff2;base64,${SATOSHI_REGULAR_B64}') format('woff2');
    font-weight: 400;
    font-style: normal;
  }
  @font-face {
    font-family: 'Satoshi';
    src: url('data:font/woff2;base64,${SATOSHI_BOLD_B64}') format('woff2');
    font-weight: 700;
    font-style: normal;
  }

  /* === RESET & BASE === */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html {
    font-size: 11pt;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  body {
    font-family: 'Satoshi', sans-serif;
    font-weight: 400;
    color: #000000;
    background: #F7F5F2;
    line-height: 1.6;
    padding: 0;
    margin: 0;
  }

  /* === PAGE LAYOUT === */
  .page {
    width: 100%;
    padding: 48px 56px 60px;
    position: relative;
  }

  /* === HEADER === */
  .report-header {
    border-bottom: 3px solid #27E7FE;
    padding-bottom: 20px;
    margin-bottom: 32px;
  }
  .report-header h1 {
    font-size: 28pt;
    font-weight: 700;
    letter-spacing: -0.5px;
    margin-bottom: 4px;
  }
  .report-header .subtitle {
    font-size: 12pt;
    color: #555;
    font-weight: 400;
  }
  .report-header .meta {
    display: flex;
    justify-content: space-between;
    margin-top: 12px;
    font-size: 9pt;
    color: #888;
  }
  .report-header .meta .badge {
    display: inline-block;
    background: ${isPremium ? "#27E7FE" : "#e0ddd8"};
    color: #000;
    font-weight: 700;
    font-size: 8pt;
    padding: 3px 10px;
    border-radius: 4px;
    letter-spacing: 0.5px;
  }

  /* === TYPOGRAPHY === */
  h2 {
    font-size: 16pt;
    font-weight: 700;
    margin-top: 28px;
    margin-bottom: 12px;
    padding-bottom: 6px;
    border-bottom: 1px solid #e0ddd8;
  }
  h3 {
    font-size: 12pt;
    font-weight: 700;
    margin-top: 20px;
    margin-bottom: 8px;
  }
  p {
    margin-bottom: 10px;
    font-size: 10.5pt;
  }
  strong {
    font-weight: 700;
  }
  ul, ol {
    margin-left: 20px;
    margin-bottom: 12px;
  }
  li {
    margin-bottom: 4px;
    font-size: 10.5pt;
  }

  /* === ACTION CALLOUTS (Cyan left-border) === */
  .action-header {
    background: rgba(39, 231, 254, 0.08);
    border-left: 4px solid #27E7FE;
    padding: 10px 16px;
    margin-top: 24px;
    margin-bottom: 10px;
    font-size: 12pt;
    font-weight: 700;
    border-radius: 0 6px 6px 0;
  }
  /* Style paragraphs immediately after action headers */
  .action-header + p,
  .action-header ~ p {
    padding-left: 20px;
  }

  /* === BLOCKQUOTE / NOTE CALLOUT === */
  .callout-note {
    background: rgba(39, 231, 254, 0.06);
    border-left: 3px solid #27E7FE;
    padding: 10px 16px;
    margin: 16px 0;
    font-size: 10pt;
    color: #444;
    font-style: italic;
    border-radius: 0 4px 4px 0;
  }

  /* === STRATEGIC GAP SCORE BADGE === */
  .gap-score {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #fff;
    border: 1px solid #e0ddd8;
    border-radius: 8px;
    padding: 8px 16px;
    margin: 12px 0;
  }
  .gap-score .number {
    font-size: 22pt;
    font-weight: 700;
    color: ${data.strategic_gap_score > 7 ? "#e74c3c" : data.strategic_gap_score > 4 ? "#f39c12" : "#27ae60"};
  }
  .gap-score .label {
    font-size: 9pt;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* === SECTION DIVIDER === */
  hr.section-divider {
    border: none;
    border-top: 1px solid #e0ddd8;
    margin: 24px 0;
  }

  /* === FOOTER (repeating on every printed page) === */
  @page {
    margin-bottom: 48px;
  }
  .report-footer {
    position: fixed;
    bottom: 0;
    left: 56px;
    right: 56px;
    border-top: 1px solid #e0ddd8;
    padding-top: 8px;
    padding-bottom: 12px;
    font-size: 8pt;
    color: #aaa;
    display: flex;
    justify-content: space-between;
    background: #F7F5F2;
  }

  /* === CTA SECTION === */
  .cta-section {
    background: #fff;
    border: 1px solid #e0ddd8;
    border-radius: 8px;
    padding: 24px;
    text-align: center;
    margin-top: 28px;
  }
  .cta-section h3 {
    margin-top: 0;
    font-size: 14pt;
  }
  .cta-section p {
    color: #555;
    margin-bottom: 16px;
  }
  .cta-button {
    display: inline-block;
    background: #27E7FE;
    color: #000;
    font-family: 'Satoshi', sans-serif;
    font-weight: 700;
    font-size: 11pt;
    padding: 12px 32px;
    border-radius: 8px;
    text-decoration: none;
  }

  /* === PRINT TWEAKS === */
  @media print {
    body { background: #F7F5F2; }
    .page { padding: 40px 48px; }
  }
</style>
</head>
<body>

<!-- PAGE 1: Header + Executive Summary + Gap Analysis -->
<div class="page">
  <div class="report-header">
    <h1>Leverage Brief</h1>
    <div class="subtitle">Strategic Assessment for ${data.company_name}</div>
    <div class="meta">
      <span>Prepared for ${data.name} &middot; ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
      <span class="badge">${data.gatekeeper_path} ASSESSMENT</span>
    </div>
  </div>

  <div class="gap-score">
    <span class="number">${data.strategic_gap_score}</span>
    <span class="label">Strategic<br/>Gap Score</span>
  </div>

  ${briefHtml}

  <div class="report-footer">
    <span>Leverage Brief &middot; Fulcrum Collective</span>
    <span>&copy; ${year} Fulcrum Collective. Confidential.</span>
  </div>
</div>

</body>
</html>`;
}
