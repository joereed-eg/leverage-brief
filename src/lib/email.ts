import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM_EMAIL || "leads@fulcrumcollective.io";

export async function sendConfirmationEmail(
  to: string,
  firstName: string,
  companyName: string
) {
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background: #F7F5F2;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #F7F5F2;">
<tr><td align="center" style="padding: 40px 24px;">
<table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; width: 100%; font-family: Arial, Helvetica, sans-serif; color: #000000;">
<tr><td style="padding: 0 20px;">

    <div style="margin-bottom: 28px;">
      <a href="https://www.fulcrumcollective.io" style="display: inline-block;">
        <img src="https://fulcrumcollective.io/wp-content/uploads/2026/03/Fulcrum-Logo.png" alt="Fulcrum Collective" width="150" style="width: 150px; height: auto; display: block;" />
      </a>
    </div>

    <div style="border-bottom: 3px solid #27E7FE; padding-bottom: 16px; margin-bottom: 28px;">
      <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 4px;">Thanks for Your Submission</h1>
      <p style="font-size: 14px; color: #666; margin: 0;">${companyName}</p>
    </div>

    <p style="font-size: 16px; line-height: 1.6;">${firstName || "Hi there"},</p>

    <p style="font-size: 16px; line-height: 1.6;">
      Thank you for completing the Leverage Brief assessment for <strong>${companyName}</strong>.
      Our team is currently reviewing your information and compiling your personalized brief.
    </p>

    <div style="border-left: 4px solid #27E7FE; padding: 12px 16px; margin: 24px 0; background: rgba(39,231,254,0.05); border-radius: 0 6px 6px 0;">
      <p style="margin: 0; font-size: 14px; line-height: 1.6;">
        <strong>What happens next:</strong> Watch your inbox — your Leverage Brief will be
        delivered via email once it's ready. This typically takes less than 24 hours.
      </p>
    </div>

    <p style="font-size: 16px; line-height: 1.6;">
      In the meantime, if you have any questions, just reply to this email.
    </p>

    <p style="font-size: 16px; line-height: 1.6; margin-top: 24px;">
      — The Fulcrum Collective Team
    </p>

    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e0ddd8;">
      <p style="font-size: 11px; color: #aaa; margin: 0;">
        Fulcrum Collective &middot; Exponent Group
      </p>
    </div>

</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Your Leverage Brief for ${companyName} Is Being Built`,
    html,
  });
}
