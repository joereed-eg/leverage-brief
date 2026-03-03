/**
 * n8n Function Node: Drip Email 1 — Immediate (sent right after partial save)
 *
 * Input:  Output from 05-partial-save with resume_url, first_name, company_name, step
 * Output: Resend email payload
 */

const crypto = require('crypto');

const data = $input.first().json;
const firstName = data.first_name || (data.name || '').split(' ')[0] || 'there';
const companyName = data.company_name || 'your company';
const resumeUrl = data.resume_url || '';
const step = data.partial_progress_step || 1;
const email = data.email || '';

const FROM_EMAIL = $env.RESEND_FROM_EMAIL || 'joe@fulcrumcollective.io';
const APP_URL = $env.APP_URL || 'https://leverage.fulcrumcollective.io';
const HMAC_SECRET = $env.HMAC_SECRET || 'fulcrum-dev-secret';

// --- Unsubscribe link ---
const unsubToken = crypto
  .createHmac('sha256', HMAC_SECRET)
  .update(email.toLowerCase())
  .digest('hex')
  .substring(0, 16);
const unsubUrl = `${APP_URL}/api/drip/stop?email=${encodeURIComponent(email)}&token=${unsubToken}`;

const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, Helvetica, sans-serif; background: #F7F5F2; color: #000; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto;">
    <div style="margin-bottom: 24px;">
      <a href="https://www.fulcrumcollective.io"><img src="https://fulcrumcollective.io/wp-content/uploads/2026/03/Fulcrum-Logo.png" alt="Fulcrum Collective" width="120" style="width: 120px; height: auto;" /></a>
    </div>
    <h2 style="font-size: 22px; margin-bottom: 16px;">Your progress is saved, ${firstName}</h2>
    <p style="font-size: 16px; line-height: 1.6; color: #333;">
      You made it to <strong>Step ${step} of 5</strong> on the Leverage Brief assessment for
      <strong>${companyName}</strong>. Your answers are saved — pick up right where you left off.
    </p>
    <p style="font-size: 16px; line-height: 1.6; color: #333;">
      Complete the remaining steps to receive your personalized Leverage Brief with
      strategic priorities tailored to your business.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${resumeUrl}" style="display: inline-block; background: #27E7FE; color: #000; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px;">
        Continue My Assessment &rarr;
      </a>
    </div>
    <p style="font-size: 14px; color: #666;">
      <strong>Need help?</strong> Reply to this email and our team will assist you.
    </p>
    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e0ddd8;">
      <p style="font-size: 11px; color: #aaa;">
        Fulcrum Collective &middot;
        <a href="${unsubUrl}" style="color: #aaa;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`;

return [{
  json: {
    resend_payload: {
      from: FROM_EMAIL,
      to: email,
      reply_to: 'joe@fulcrumcollective.io',
      subject: `Your Fulcrum Assessment is saved, ${firstName}`,
      html,
    },
    // Pass through original data
    ...data,
  }
}];
