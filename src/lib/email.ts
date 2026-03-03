import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM_EMAIL || "leads@fulcrumcollective.io";
const ADMIN_EMAIL = "joe@fulcrumcollective.io";

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
        Fulcrum Collective
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

// ── Partial Notification (Step 1 auto-capture) ──

interface PartialLead {
  first_name?: string;
  last_name?: string;
  email?: string;
  company_name?: string;
  company_url?: string;
}

export async function sendPartialNotification(lead: PartialLead) {
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unknown";
  const company = lead.company_name || "Unknown";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background: #f5f5f5;">
<div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 24px; border: 1px solid #e0e0e0;">
  <div style="display: inline-block; background: #FFF3CD; color: #856404; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 4px; margin-bottom: 12px;">STARTED — NOT YET SUBMITTED</div>
  <h2 style="margin: 0 0 4px; font-size: 20px;">New Lead Started Assessment</h2>
  <p style="margin: 0 0 16px; color: #666; font-size: 14px;">${name} at ${company}</p>
  <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
    <tr><td style="padding: 6px 12px 6px 0; font-weight: 600; font-size: 13px; color: #666;">Name</td><td style="padding: 6px 0; font-size: 13px;">${name}</td></tr>
    <tr><td style="padding: 6px 12px 6px 0; font-weight: 600; font-size: 13px; color: #666;">Email</td><td style="padding: 6px 0; font-size: 13px;">${lead.email}</td></tr>
    <tr><td style="padding: 6px 12px 6px 0; font-weight: 600; font-size: 13px; color: #666;">Company</td><td style="padding: 6px 0; font-size: 13px;">${company}</td></tr>
    ${lead.company_url ? `<tr><td style="padding: 6px 12px 6px 0; font-weight: 600; font-size: 13px; color: #666;">Website</td><td style="padding: 6px 0; font-size: 13px;">${lead.company_url}</td></tr>` : ""}
  </table>
  <p style="margin: 16px 0 0; font-size: 12px; color: #999;">They clicked Next on Step 1. You'll get a full notification if they complete the assessment.</p>
</div>
</body>
</html>`;

  await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `Lead Started: ${name} — ${company}`,
    html,
  });
}

// ── Full Submission Notification ──

const READINESS_LABELS: Record<string, { label: string; color: string }> = {
  now: { label: "HOT — Needs guidance now", color: "#dc3545" },
  "30_days": { label: "WARM — Within 30 days", color: "#fd7e14" },
  next_quarter: { label: "COOL — Next quarter", color: "#0dcaf0" },
  just_looking: { label: "COLD — Just curious", color: "#6c757d" },
};

interface LeadDetails {
  first_name?: string;
  last_name?: string;
  email?: string;
  company_name?: string;
  company_url?: string;
  vacation_test?: string;
  interruption_frequency?: string;
  sunday_dread?: string;
  decision_bottleneck?: string;
  three_year_target?: string;
  biggest_strategic_bet?: string;
  team_confidence?: string;
  revenue_goal_gap?: string;
  current_client_base?: string;
  icp_description?: string;
  top_competitor?: string;
  competitor_url_2?: string;
  competitor_url_3?: string;
  competitor_url_4?: string;
  competitor_url_5?: string;
  client_url_1?: string;
  client_url_2?: string;
  client_url_3?: string;
  win_rate?: string;
  fulcrum_priorities?: string;
  monthly_focus?: string;
  biggest_obstacle?: string;
  engagement_readiness?: string;
  [key: string]: unknown;
}

export async function sendAdminNotification(lead: LeadDetails) {
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unknown";
  const company = lead.company_name || "Unknown Company";
  const email = lead.email || "No email";

  const readiness = READINESS_LABELS[lead.engagement_readiness || ""] || {
    label: "Not specified",
    color: "#6c757d",
  };

  const details = [
    ["Name", name],
    ["Email", email],
    ["Company", company],
    ["Website", lead.company_url],
    ["", ""],
    ["--- OPERATIONAL ---", ""],
    ["Vacation Test", lead.vacation_test],
    ["Interruption Frequency", lead.interruption_frequency],
    ["Sunday Dread", lead.sunday_dread],
    ["Decision Bottleneck", lead.decision_bottleneck],
    ["", ""],
    ["--- STRATEGIC ---", ""],
    ["3-Year Target", lead.three_year_target],
    ["Biggest Strategic Bet", lead.biggest_strategic_bet],
    ["Team Confidence", lead.team_confidence],
    ["Revenue Goal Gap", lead.revenue_goal_gap],
    ["", ""],
    ["--- MARKET & ICP ---", ""],
    ["Client Base", lead.current_client_base],
    ["ICP Description", lead.icp_description],
    ["Competitors", [lead.top_competitor, lead.competitor_url_2, lead.competitor_url_3, lead.competitor_url_4, lead.competitor_url_5].filter(Boolean).join(", ") || undefined],
    ["Client URLs", [lead.client_url_1, lead.client_url_2, lead.client_url_3].filter(Boolean).join(", ") || undefined],
    ["Win Rate", lead.win_rate],
    ["", ""],
    ["--- EXECUTION ---", ""],
    ["Fulcrum Priorities", lead.fulcrum_priorities],
    ["Monthly Focus", lead.monthly_focus],
    ["Biggest Obstacle", lead.biggest_obstacle],
  ]
    .filter(([label, value]) => label === "" || value)
    .map(([label = "", value]) => {
      if (label === "") return "";
      if (label.startsWith("---")) return `<tr><td colspan="2" style="padding: 12px 0 4px; font-weight: 700; font-size: 13px; color: #27E7FE; border-bottom: 1px solid #e0ddd8;">${label.replace(/---/g, "").trim()}</td></tr>`;
      return `<tr><td style="padding: 6px 12px 6px 0; font-weight: 600; font-size: 13px; color: #666; vertical-align: top; white-space: nowrap;">${label}</td><td style="padding: 6px 0; font-size: 13px; color: #000;">${value}</td></tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background: #f5f5f5;">
<div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 24px; border: 1px solid #e0e0e0;">
  <div style="display: inline-block; background: ${readiness.color}; color: #fff; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 4px; margin-bottom: 12px;">${readiness.label}</div>
  <h2 style="margin: 0 0 4px; font-size: 20px;">New Leverage Brief Submission</h2>
  <p style="margin: 0 0 20px; color: #666; font-size: 14px;">${name} at ${company}</p>
  <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
    ${details}
  </table>
  <div style="text-align: center; margin: 24px 0 8px;">
    <a href="https://crm.zoho.com/crm/tab/Leads?searchText=${encodeURIComponent(email)}" style="display: inline-block; background: #27E7FE; color: #000; font-weight: 700; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 14px;">View in Zoho CRM &rarr;</a>
  </div>
  <p style="margin: 20px 0 0; font-size: 12px; color: #999;">PDF will be generated by the n8n pipeline and delivered to this lead via email.</p>
</div>
</body>
</html>`;

  await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `[${readiness.label.split(" — ")[0]}] New Leverage Brief: ${name} — ${company}`,
    html,
  });
}
