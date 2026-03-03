/**
 * n8n Function Node: High-Gap Slack + SMS Alert
 *
 * Fires when Strategic_Gap_Score > 7.0
 * Called from IF node downstream of Admin God-View.
 *
 * Output: Slack message payload (use n8n Slack node downstream)
 *         + optional SMS payload (use n8n Twilio/SMS node downstream)
 *
 * Input:  Pipeline data with strategic_gap_score, name, company_name, sunday_dread
 * Output: Formatted alert payloads
 */

const data = $input.first().json;
const name = data.name || 'Unknown';
const companyName = data.company_name || 'Unknown';
const email = data.email || '';
const strategicGapScore = data.strategic_gap_score || 0;
const sundayDread = data.sunday_dread || 'Not provided';
const gatekeeperPath = data.gatekeeper_path || 'LITE';

// Truncate sunday dread for SMS
const dreadSummary = sundayDread.length > 80
  ? sundayDread.substring(0, 77) + '...'
  : sundayDread;

// --- Slack Message ---
const slackMessage = {
  channel: '#high-value-leads',
  text: [
    `*:rotating_light: HIGH-VALUE LEAD ALERT*`,
    ``,
    `*Name:* ${name}`,
    `*Company:* ${companyName}`,
    `*Email:* ${email}`,
    `*Strategic Gap Score:* *${strategicGapScore}/10*`,
    `*Gatekeeper Path:* ${gatekeeperPath}`,
    `*Sunday Dread:* _"${dreadSummary}"_`,
    ``,
    `> This lead scored above 7.0 — high probability of engagement. Prioritize outreach.`,
  ].join('\n'),
};

// --- SMS Message (optional — for Twilio or similar) ---
const smsMessage = {
  body: `[Fulcrum] HIGH-VALUE LEAD: ${name} at ${companyName}. Gap Score: ${strategicGapScore}/10. Sunday Dread: "${dreadSummary}". Check Slack #high-value-leads.`,
  // To number configured in n8n credentials or env
};

return [{
  json: {
    slack: slackMessage,
    sms: smsMessage,
    // Pass through for any downstream nodes
    name,
    company_name: companyName,
    email,
    strategic_gap_score: strategicGapScore,
  }
}];
