/**
 * n8n Function Node: Admin God-View Email
 *
 * Multi-part MIME (HTML + plain text) with PDF attachment.
 * Contains full Lead DNA, strategic hooks, scores, and Zoho link.
 *
 * Input:  Full pipeline payload + pdf_base64
 * Output: Postmark email payload (admin notification)
 */

const data = $input.first().json;
const name = data.name || 'Unknown';
const email = data.email || '';
const companyName = data.company_name || 'Unknown';
const companyUrl = data.company_url || '';
const linkedinUrl = data.enrichment?.linkedin_url || 'Not available';
const headcount = data.enrichment?.headcount || 'N/A';
const annualRevenue = data.enrichment?.annual_revenue || 0;
const industry = data.enrichment?.industry || 'Unknown';
const sundayDread = data.sunday_dread || 'Not provided';
const biggestBet = data.biggest_strategic_bet || 'Not provided';
const strategicGapScore = data.strategic_gap_score || 0;
const gatekeeperPath = data.gatekeeper_path || 'LITE';
const strategicPath = data.strategic_path || 'CLARIFY';

const revenueFormatted = annualRevenue
  ? `$${Number(annualRevenue).toLocaleString()}`
  : 'Not available';

// Zoho deep link (placeholder — update with actual Zoho org URL)
const zohoDeepLink = `https://crm.zoho.com/crm/org/tab/Leads?searchText=${encodeURIComponent(email)}`;

const adminEmail = process.env?.ADMIN_EMAIL || 'admin@exponentgroup.com';

const gapColor = strategicGapScore > 7 ? '#e74c3c' : strategicGapScore > 4 ? '#f39c12' : '#27ae60';

// --- HTML Email ---
const HtmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Satoshi', Arial, Helvetica, sans-serif; background: #f8f8f8; color: #000; padding: 20px; margin: 0;">
  <div style="max-width: 640px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #e0e0e0; overflow: hidden;">

    <!-- Header Bar -->
    <div style="background: #000; color: #fff; padding: 16px 24px;">
      <h1 style="margin: 0; font-size: 18px; font-weight: 700;">
        &#128680; NEW HIGH-VALUE LEAD: ${companyName}
      </h1>
    </div>

    <div style="padding: 24px;">

      <!-- Lead DNA -->
      <h2 style="font-size: 14px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;">Lead DNA</h2>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse; margin-bottom: 20px;">
        <tr><td style="padding: 4px 8px; color: #666; width: 140px;">Name</td><td style="padding: 4px 8px; font-weight: 600;">${name}</td></tr>
        <tr><td style="padding: 4px 8px; color: #666;">Email</td><td style="padding: 4px 8px;"><a href="mailto:${email}" style="color: #27E7FE;">${email}</a></td></tr>
        <tr><td style="padding: 4px 8px; color: #666;">Company</td><td style="padding: 4px 8px; font-weight: 600;">${companyName}</td></tr>
        <tr><td style="padding: 4px 8px; color: #666;">Website</td><td style="padding: 4px 8px;"><a href="${companyUrl}" style="color: #27E7FE;">${companyUrl}</a></td></tr>
        <tr><td style="padding: 4px 8px; color: #666;">LinkedIn</td><td style="padding: 4px 8px;"><a href="${linkedinUrl}" style="color: #27E7FE;">${linkedinUrl}</a></td></tr>
        <tr><td style="padding: 4px 8px; color: #666;">Headcount</td><td style="padding: 4px 8px;">${headcount}</td></tr>
        <tr><td style="padding: 4px 8px; color: #666;">ARR</td><td style="padding: 4px 8px;">${revenueFormatted}</td></tr>
        <tr><td style="padding: 4px 8px; color: #666;">Industry</td><td style="padding: 4px 8px;">${industry}</td></tr>
      </table>

      <!-- Strategic Hook -->
      <h2 style="font-size: 14px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;">Strategic Hook</h2>
      <div style="margin-bottom: 20px;">
        <div style="background: #fff5f5; border-left: 4px solid #e74c3c; padding: 12px 16px; margin-bottom: 8px; border-radius: 0 4px 4px 0;">
          <p style="margin: 0; font-size: 12px; color: #888; text-transform: uppercase;">Sunday Dread</p>
          <p style="margin: 4px 0 0; font-size: 14px; font-weight: 700;">${sundayDread}</p>
        </div>
        <div style="background: #f0f8ff; border-left: 4px solid #27E7FE; padding: 12px 16px; border-radius: 0 4px 4px 0;">
          <p style="margin: 0; font-size: 12px; color: #888; text-transform: uppercase;">Biggest Strategic Bet</p>
          <p style="margin: 4px 0 0; font-size: 14px; font-weight: 700;">${biggestBet}</p>
        </div>
      </div>

      <!-- Scores & Path -->
      <h2 style="font-size: 14px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;">Scores & Path</h2>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 6px 8px; color: #666;">Strategic Gap Score</td>
          <td style="padding: 6px 8px;"><span style="font-size: 20px; font-weight: 700; color: ${gapColor};">${strategicGapScore}</span><span style="color: #aaa; font-size: 12px;">/10</span></td>
        </tr>
        <tr>
          <td style="padding: 6px 8px; color: #666;">Gatekeeper Path</td>
          <td style="padding: 6px 8px;"><span style="background: ${gatekeeperPath === 'PREMIUM' ? '#27E7FE' : '#e0ddd8'}; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 12px;">${gatekeeperPath}</span></td>
        </tr>
        <tr>
          <td style="padding: 6px 8px; color: #666;">Strategic Path</td>
          <td style="padding: 6px 8px; font-weight: 600;">${strategicPath}</td>
        </tr>
      </table>

      <!-- CRM Link -->
      <div style="text-align: center; margin: 24px 0 8px;">
        <a href="${zohoDeepLink}" style="display: inline-block; background: #27E7FE; color: #000; font-weight: 700; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 14px;">
          View in Zoho CRM &rarr;
        </a>
      </div>

    </div>
  </div>
</body>
</html>`.trim();

// --- Plain Text ---
const TextBody = `NEW HIGH-VALUE LEAD: ${companyName}

LEAD DNA
Name: ${name}
Email: ${email}
Company: ${companyName}
Website: ${companyUrl}
LinkedIn: ${linkedinUrl}
Headcount: ${headcount}
ARR: ${revenueFormatted}
Industry: ${industry}

STRATEGIC HOOK
Sunday Dread: ${sundayDread}
Biggest Strategic Bet: ${biggestBet}

SCORES & PATH
Strategic Gap Score: ${strategicGapScore}/10
Gatekeeper Path: ${gatekeeperPath}
Strategic Path: ${strategicPath}

Zoho CRM: ${zohoDeepLink}

PDF attached.`;

// --- Attachment ---
const pdfBase64 = data.pdf_base64 || '';
const attachments = pdfBase64 ? [{
  Name: `Leverage-Brief-${companyName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`,
  Content: pdfBase64,
  ContentType: 'application/pdf',
}] : [];

return [{
  json: {
    From: 'system@fulcrum.com',
    To: adminEmail,
    Subject: `\u{1F6A8} NEW HIGH-VALUE LEAD: ${companyName}`,
    HtmlBody,
    TextBody,
    Attachments: attachments,
    MessageStream: 'outbound',
    // Pass through for downstream high-gap check
    strategic_gap_score: strategicGapScore,
    company_name: companyName,
    name,
    email: email,
    sunday_dread: sundayDread,
  }
}];
