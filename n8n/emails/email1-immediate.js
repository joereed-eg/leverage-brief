/**
 * n8n Function Node: Drip Email 1 — Immediate (sent right after partial save)
 *
 * Input:  Output from 05-partial-save with resume_url, name, company_name, step
 * Output: Postmark API payload
 */

const name = $input.first().json.name || '';
const firstName = name.split(' ')[0] || 'there';
const companyName = $input.first().json.company_name || 'your company';
const resumeUrl = $input.first().json.resume_url || '';
const step = $input.first().json.partial_progress_step || 1;

const HtmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Satoshi', Arial, sans-serif; background: #F7F5F2; color: #000; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto;">
    <h2 style="font-size: 22px; margin-bottom: 16px;">Your progress is saved, ${firstName}</h2>
    <p style="font-size: 16px; line-height: 1.6; color: #333;">
      You made it to <strong>Step ${step} of 5</strong> on the Fulcrum Assessment for
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
    <hr style="border: none; border-top: 1px solid #e0ddd8; margin: 32px 0;" />
    <p style="font-size: 14px; color: #666;">
      <strong>Need help?</strong> Reply to this email and our team will assist you.
    </p>
    <p style="font-size: 13px; color: #999; margin-top: 24px;">
      Fulcrum Collective &middot; <a href="#" style="color: #999;">Unsubscribe</a>
    </p>
  </div>
</body>
</html>`.trim();

const TextBody = `Your progress is saved, ${firstName}

You made it to Step ${step} of 5 on the Fulcrum Assessment for ${companyName}. Your answers are saved — pick up right where you left off.

Complete the remaining steps to receive your personalized Leverage Brief with strategic priorities tailored to your business.

Continue My Assessment: ${resumeUrl}

Need help? Reply to this email and our team will assist you.

—
Fulcrum Collective`;

return [{
  json: {
    From: 'team@fulcrum.com',
    To: $input.first().json.email,
    Subject: `Your Fulcrum Assessment is saved, ${firstName}`,
    HtmlBody,
    TextBody,
    MessageStream: 'outbound',
  }
}];
