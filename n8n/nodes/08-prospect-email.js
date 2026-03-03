/**
 * n8n Function Node: Prospect Email — Leverage Brief Delivery (via Resend)
 *
 * Builds the prospect-facing email that delivers the Leverage Brief PDF.
 * Uses "mirrored" language from the lead's Sunday Dread response.
 *
 * Structure:
 *   - Subject mirroring company name
 *   - Body that mirrors Sunday Dread pain domain
 *   - 3-bullet structure: Strategic insight → Mirrored pain → One action
 *   - Single Cyan CTA: "Book a Fulcrum Strategy Session →"
 *   - PDF attached via Resend attachments
 *   - HMAC-signed unsubscribe link
 *
 * Input:  Full pipeline payload + pdf_base64 from PDF generation
 * Output: Resend email payload with attachment
 */

const data = $input.first().json;
const firstName = data.first_name || (data.name || '').split(' ')[0] || 'there';
const companyName = data.company_name || 'your company';
const email = data.email || '';
const sundayDread = data.sunday_dread || '';
const biggestBet = data.biggest_strategic_bet || '';
const monthlyFocus = data.monthly_focus || '';
const gatekeeperPath = data.gatekeeper_path || 'LITE';
const industry = data.enrichment?.industry || '';

function env(key, fallback) {
  try { return $env[key] || fallback; } catch { return fallback; }
}

const FROM_EMAIL = env('RESEND_FROM_EMAIL', 'joe@fulcrumcollective.io');
const APP_URL = env('APP_URL', 'https://leverage.fulcrumcollective.io');
const HMAC_SECRET = env('HMAC_SECRET', 'fulcrum-dev-secret');

// --- Mirror Analysis: Extract Pain Domain from Sunday Dread ---
const dreadLevel = parseInt(sundayDread.charAt(0)) || 3;
let painDomain = 'operational challenges';
let mirrorPhrase = '';

if (dreadLevel >= 4) {
  mirrorPhrase = `We know the weight of what you're carrying — you rated your weekly dread at a ${dreadLevel} out of 5.`;
} else if (dreadLevel >= 3) {
  mirrorPhrase = `You mentioned feeling a noticeable level of dread about the week ahead.`;
} else {
  mirrorPhrase = `Even though your week-to-week pressure is manageable, there are leverage points that can make it even smoother.`;
}

// Derive pain domain from other signals
const vacationTest = (data.vacation_test || '').toLowerCase();
const interruptions = (data.interruption_frequency || '').toLowerCase();

if (interruptions.includes('constantly') || vacationTest.includes('break') || vacationTest.includes('bottleneck')) {
  painDomain = 'being the operational bottleneck';
} else if ((data.revenue_goal_gap || '').includes('Significant') || (data.revenue_goal_gap || '').includes('Critical')) {
  painDomain = 'closing the gap to your revenue target';
} else if ((data.team_confidence || '').includes('1') || (data.team_confidence || '').includes('2')) {
  painDomain = 'aligning your leadership team on strategy';
}

// --- Build 3 Bullets ---
const bullet1 = biggestBet
  ? `Your biggest strategic bet — <strong>${biggestBet.substring(0, 120)}</strong> — is a high-leverage move. Your Leverage Brief breaks down exactly how to de-risk it.`
  : `Your Leverage Brief identifies the single highest-leverage priority for ${companyName} right now.`;

const bullet2 = `${mirrorPhrase} Your brief addresses <strong>${painDomain}</strong> head-on with a concrete action you can take this week.`;

const bullet3 = monthlyFocus
  ? `Your #1 focus this month — <em>${monthlyFocus.substring(0, 100)}</em> — is woven into your recommended actions so everything compounds.`
  : `Each action in your brief follows the Atomic Monday Rule: something you can start at 9 AM with a clear deliverable by lunch.`;

const bookingUrl = 'https://cal.com/fulcrumcollective/discovery-call';

// --- Unsubscribe link (token pre-computed by Vercel) ---
const unsubToken = data.unsubscribe_token || '';
const unsubUrl = `${APP_URL}/api/drip/stop?email=${encodeURIComponent(email)}&token=${unsubToken}`;

// --- HTML Email ---
const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, Helvetica, sans-serif; background: #F7F5F2; color: #000000; padding: 40px 20px; margin: 0;">
  <div style="max-width: 580px; margin: 0 auto; background: #F7F5F2;">

    <!-- Logo -->
    <div style="margin-bottom: 24px;">
      <a href="https://www.fulcrumcollective.io"><img src="https://fulcrumcollective.io/wp-content/uploads/2026/03/Fulcrum-Logo.png" alt="Fulcrum Collective" width="150" style="width: 150px; height: auto; display: block;" /></a>
    </div>

    <!-- Header -->
    <div style="border-bottom: 3px solid #27E7FE; padding-bottom: 16px; margin-bottom: 28px;">
      <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 4px;">Your Leverage Brief is Ready</h1>
      <p style="font-size: 14px; color: #666; margin: 0;">Strategic Assessment for ${companyName}</p>
    </div>

    <!-- Greeting + Mirror -->
    <p style="font-size: 16px; line-height: 1.6;">${firstName},</p>
    <p style="font-size: 16px; line-height: 1.6;">
      Your personalized Leverage Brief is attached. Here's what it reveals about ${companyName}:
    </p>

    <!-- 3-Bullet Structure -->
    <div style="margin: 24px 0;">
      <div style="border-left: 4px solid #27E7FE; padding: 12px 16px; margin-bottom: 12px; background: rgba(39,231,254,0.05); border-radius: 0 6px 6px 0;">
        <p style="margin: 0; font-size: 14px; line-height: 1.6;">${bullet1}</p>
      </div>
      <div style="border-left: 4px solid #27E7FE; padding: 12px 16px; margin-bottom: 12px; background: rgba(39,231,254,0.05); border-radius: 0 6px 6px 0;">
        <p style="margin: 0; font-size: 14px; line-height: 1.6;">${bullet2}</p>
      </div>
      <div style="border-left: 4px solid #27E7FE; padding: 12px 16px; margin-bottom: 12px; background: rgba(39,231,254,0.05); border-radius: 0 6px 6px 0;">
        <p style="margin: 0; font-size: 14px; line-height: 1.6;">${bullet3}</p>
      </div>
    </div>

    <!-- CTA -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="${bookingUrl}" style="display: inline-block; background: #27E7FE; color: #000000; font-weight: 700; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-size: 16px;">
        Book a Fulcrum Strategy Session &rarr;
      </a>
    </div>

    <!-- Fulcrum Support -->
    <div style="background: #fff; border: 1px solid #e0ddd8; border-radius: 8px; padding: 20px; margin-top: 28px;">
      <h3 style="font-size: 14px; font-weight: 700; margin: 0 0 8px;">Fulcrum Support</h3>
      <p style="font-size: 13px; color: #555; line-height: 1.5; margin: 0;">
        Questions about your Leverage Brief? Reply to this email — our team reads every response.
        If you'd like to discuss your strategic priorities in more depth, book a complimentary
        Fulcrum Strategy Session and we'll walk through your brief together.
      </p>
    </div>

    <!-- Footer -->
    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e0ddd8;">
      <p style="font-size: 11px; color: #aaa; margin: 0;">
        Fulcrum Collective &middot;
        <a href="${unsubUrl}" style="color: #aaa;">Unsubscribe</a>
      </p>
    </div>

  </div>
</body>
</html>`;

// --- Build Resend payload with PDF attachment ---
const pdfBase64 = data.pdf_base64 || '';
const attachments = pdfBase64 ? [{
  filename: `Leverage-Brief-${companyName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`,
  content: pdfBase64,
}] : [];

const resendPayload = {
  from: FROM_EMAIL,
  to: email,
  reply_to: 'joe@fulcrumcollective.io',
  subject: `Your Leverage Brief: ${companyName} Roadmap`,
  html,
  attachments,
};

return [{
  json: {
    resend_payload: resendPayload,
    // Pass through for downstream nodes
    ...data,
  }
}];
