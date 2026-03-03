/**
 * n8n Function Node: Implementation Nurture Email Builder (Branch B — Completed)
 *
 * Generates the correct nurture email based on:
 *   - gatekeeper_path (PREMIUM: 5 emails / LITE: 3 emails)
 *   - email_index (which email in the sequence, 0-based)
 *
 * Input:  Completed lead data + completion_branching config
 * Output: Postmark payload for the current nurture email
 *
 * Downstream: Use n8n Wait nodes to space emails at the correct cadence.
 *   PREMIUM: Day 0, 3, 5, 7, 10
 *   LITE:    Day 0, 5, 7
 */

const lead = $input.first().json;
const email = lead.email || '';
const firstName = lead.first_name || (lead.name || '').split(' ')[0] || 'there';
const companyName = lead.company_name || 'your company';
const gatekeeperPath = lead.gatekeeper_path || 'LITE';
const strategicGapScore = lead.strategic_gap_score || 0;
const leadInterestSummary = lead.biggest_strategic_bet || lead.Lead_Interest_Summary || '';
const sundayDread = lead.sunday_dread || '';
const fulcrumPriorities = lead.fulcrum_priorities || '';
const monthlyFocus = lead.monthly_focus || '';

const emailIndex = lead._nurture_email_index || 0;

const bookingUrl = 'https://cal.com/fulcrumcollective/discovery-call';
function env(key, fallback) {
  try { return $env[key] || fallback; } catch { return fallback; }
}

const FROM_EMAIL = env('RESEND_FROM_EMAIL', 'joe@fulcrumcollective.io');
const APP_URL = env('APP_URL', 'https://leverage.fulcrumcollective.io');
const HMAC_SECRET = env('HMAC_SECRET', 'fulcrum-dev-secret');

// Unsubscribe link (token pre-computed by Vercel)
const unsubToken = lead.unsubscribe_token || '';
const unsubUrl = `${APP_URL}/api/drip/stop?email=${encodeURIComponent(email)}&token=${unsubToken}`;

// --- PREMIUM TRACK: 5 emails ---
const premiumEmails = [
  // Email 1 — Day 0: Recap + key actions
  {
    Subject: `Your Leverage Brief: Key Actions for ${companyName}`,
    buildHtml: () => wrapHtml(`
      <h2 style="font-size: 22px; margin-bottom: 16px;">Your strategic priorities are ready, ${firstName}</h2>
      <p>Based on your Fulcrum Assessment, here are the areas that matter most for <strong>${companyName}</strong> right now:</p>
      <div style="background: #fff; border-left: 4px solid #27E7FE; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; font-weight: 600;">Your Biggest Strategic Bet:</p>
        <p style="margin: 8px 0 0;">${leadInterestSummary || 'See your attached Leverage Brief for details.'}</p>
      </div>
      ${fulcrumPriorities ? `<p><strong>Your Fulcrum Priorities:</strong><br/>${fulcrumPriorities.replace(/\n/g, '<br/>')}</p>` : ''}
      <p>Your Leverage Brief PDF has the full breakdown. Start with your #1 priority this week.</p>
      ${ctaButton('Review Your Full Brief', bookingUrl)}
    `),
    buildText: () => `Your strategic priorities are ready, ${firstName}\n\nYour Biggest Strategic Bet: ${leadInterestSummary}\n\nYour Fulcrum Priorities:\n${fulcrumPriorities}\n\nStart with your #1 priority this week.\n\nBook a Strategy Session: ${bookingUrl}`,
  },
  // Email 2 — Day 3: Implementation guidance
  {
    Subject: `Putting your Leverage Brief into action, ${firstName}`,
    buildHtml: () => wrapHtml(`
      <h2 style="font-size: 22px; margin-bottom: 16px;">From insight to execution</h2>
      <p>${firstName}, your Leverage Brief identified key leverage points for <strong>${companyName}</strong>. Here's how to turn them into action this week:</p>
      <ol style="line-height: 1.8;">
        <li><strong>Block 90 minutes</strong> — review your brief with your leadership team</li>
        <li><strong>Pick one priority</strong> — the one that unlocks the most downstream progress</li>
        <li><strong>Assign an owner and a deadline</strong> — accountability turns plans into outcomes</li>
      </ol>
      ${strategicGapScore > 5 ? '<p>Your strategic gap score suggests there\'s significant room to accelerate. The sooner you act, the faster you close that gap.</p>' : ''}
      ${ctaButton('Book a Fulcrum Strategy Session', bookingUrl)}
    `),
    buildText: () => `From insight to execution\n\n${firstName}, here's how to act on your Leverage Brief this week:\n\n1. Block 90 minutes — review your brief with your leadership team\n2. Pick one priority — the one that unlocks the most downstream progress\n3. Assign an owner and a deadline\n\nBook a Strategy Session: ${bookingUrl}`,
  },
  // Email 3 — Day 5: Strategic depth
  {
    Subject: `The gap between where you are and where you need to be`,
    buildHtml: () => wrapHtml(`
      <h2 style="font-size: 22px; margin-bottom: 16px;">Closing the strategic gap</h2>
      <p>${firstName}, leaders at companies like <strong>${companyName}</strong> often tell us the same thing: they know where they need to go, but the gap between vision and execution is where things stall.</p>
      ${sundayDread ? `<p>You mentioned feeling <em>"${sundayDread}"</em> about the week ahead. That's a signal — not a character flaw. It means your systems aren't carrying the load they should.</p>` : ''}
      <p>The Fulcrum Method is designed to close that gap — not with more meetings, but with sharper priorities and clearer ownership.</p>
      ${ctaButton('Let\'s Talk Strategy', bookingUrl)}
    `),
    buildText: () => `Closing the strategic gap\n\n${firstName}, the gap between vision and execution is where things stall.\n\n${sundayDread ? `You mentioned feeling "${sundayDread}" about the week ahead. That's a signal.\n\n` : ''}The Fulcrum Method closes that gap with sharper priorities and clearer ownership.\n\nBook a Strategy Session: ${bookingUrl}`,
  },
  // Email 4 — Day 7: Social proof / positioning
  {
    Subject: `How leaders like you are using the Fulcrum Method`,
    buildHtml: () => wrapHtml(`
      <h2 style="font-size: 22px; margin-bottom: 16px;">You're not alone in this, ${firstName}</h2>
      <p>Leaders across industries are using the Fulcrum Strategic Architecture to transform how their teams execute. Here's what they have in common:</p>
      <ul style="line-height: 1.8;">
        <li>They stopped trying to fix everything at once</li>
        <li>They identified their single highest-leverage priority</li>
        <li>They built a Fulcrum Rhythm Meeting cadence that keeps the team aligned</li>
      </ul>
      <p>Fulcrum Collective helps leaders like you implement the Fulcrum Method — from your first priority through full strategic architecture.</p>
      ${ctaButton('Book a Fulcrum Strategy Session', bookingUrl)}
    `),
    buildText: () => `You're not alone in this, ${firstName}\n\nLeaders are using the Fulcrum Strategic Architecture to transform execution.\n\nFulcrum Collective helps leaders implement the Fulcrum Method.\n\nBook a Strategy Session: ${bookingUrl}`,
  },
  // Email 5 — Day 10: Final CTA
  {
    Subject: `${firstName}, ready to move forward?`,
    buildHtml: () => wrapHtml(`
      <h2 style="font-size: 22px; margin-bottom: 16px;">The next step is yours</h2>
      <p>${firstName}, your Leverage Brief gave you clarity. The question now is: what will you do with it?</p>
      <p>If you're ready to turn your strategic priorities into a 90-day execution plan, a Fulcrum Strategy Session is the fastest path.</p>
      <p>It's a focused conversation — no pitch, no pressure. Just a clear-eyed look at where <strong>${companyName}</strong> stands and what to do next.</p>
      ${ctaButton('Book Your Strategy Session', bookingUrl)}
    `),
    buildText: () => `The next step is yours\n\n${firstName}, your Leverage Brief gave you clarity. Ready to turn it into a 90-day execution plan?\n\nBook Your Strategy Session: ${bookingUrl}`,
  },
];

// --- LITE TRACK: 3 emails ---
const liteEmails = [
  // Email 1 — Day 0
  premiumEmails[0],
  // Email 2 — Day 5
  {
    Subject: `Quick wins from your Leverage Brief, ${firstName}`,
    buildHtml: () => wrapHtml(`
      <h2 style="font-size: 22px; margin-bottom: 16px;">Start with these quick wins</h2>
      <p>${firstName}, even small moves in the right direction create momentum. Based on your assessment for <strong>${companyName}</strong>:</p>
      <ol style="line-height: 1.8;">
        <li><strong>This week:</strong> Share your #1 Fulcrum Priority with your team</li>
        <li><strong>This month:</strong> ${monthlyFocus || 'Focus on the single outcome that moves the needle most'}</li>
        <li><strong>This quarter:</strong> Revisit your priorities and measure progress</li>
      </ol>
      <p>Want help building a full execution roadmap? We're here.</p>
      ${ctaButton('Book a Fulcrum Strategy Session', bookingUrl)}
    `),
    buildText: () => `Quick wins from your Leverage Brief\n\n1. This week: Share your #1 Fulcrum Priority\n2. This month: ${monthlyFocus || 'Focus on the single most important outcome'}\n3. This quarter: Revisit and measure\n\nBook a Strategy Session: ${bookingUrl}`,
  },
  // Email 3 — Day 7
  premiumEmails[4], // Reuse "ready to move forward" final CTA
];

const track = gatekeeperPath === 'PREMIUM' ? premiumEmails : liteEmails;
const currentEmail = track[emailIndex];

if (!currentEmail) {
  return [{ json: { nurture_complete: true, no_more_emails: true } }];
}

return [{
  json: {
    resend_payload: {
      from: FROM_EMAIL,
      to: email,
      reply_to: 'joe@fulcrumcollective.io',
      subject: currentEmail.Subject,
      html: currentEmail.buildHtml(),
    },
    _nurture_email_index: emailIndex,
    _nurture_track: gatekeeperPath,
  }
}];

// --- Helpers ---

function ctaButton(text, url) {
  return `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${url}" style="display: inline-block; background: #27E7FE; color: #000; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px;">
        ${text} &rarr;
      </a>
    </div>`;
}

function wrapHtml(content) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, Helvetica, sans-serif; background: #F7F5F2; color: #000; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto;">
    <div style="margin-bottom: 24px;">
      <a href="https://www.fulcrumcollective.io"><img src="https://fulcrumcollective.io/wp-content/uploads/2026/03/Fulcrum-Logo.png" alt="Fulcrum Collective" width="120" style="width: 120px; height: auto;" /></a>
    </div>
    ${content}
    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e0ddd8;">
      <p style="font-size: 11px; color: #aaa;">
        Fulcrum Collective &middot;
        <a href="${unsubUrl}" style="color: #aaa;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`.trim();
}
