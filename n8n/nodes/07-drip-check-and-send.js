/**
 * n8n Function Node: Drip Email Check + Send (Branch A — Resume Nurture)
 *
 * Called by n8n Schedule Trigger (runs every hour).
 * Iterates partial_records and checks if drip emails need sending.
 *
 * HALT CONDITION: Before sending T+24h or T+72h emails, queries Zoho CRM
 * to check live partial_status. If 'completed', skips email and updates
 * local record to prevent future checks.
 *
 * Email sequence:
 *   Email 1 — Immediate (sent by 05-partial-save, NOT this node)
 *   Email 2 — T+24h
 *   Email 3 — T+72h (final)
 *
 * Input:  Triggered by schedule. Receives zoho_access_token from upstream auth node.
 * Output: Array of Postmark email payloads to send
 */

const staticData = $getWorkflowStaticData('global');
const partialRecords = staticData.partial_records || {};
const now = Date.now();
const HOUR = 3600000;
const zohoToken = $input.first().json.zoho_access_token || null;

const emailsToSend = [];
const zohoCheckErrors = [];

for (const [resumeId, record] of Object.entries(partialRecords)) {
  // Skip completed or abandoned
  if (record.partial_status !== 'in_progress') continue;

  const createdAt = new Date(record.created_at).getTime();
  const emailsSent = record.drip_emails_sent || 0;
  const hoursSinceCreated = (now - createdAt) / HOUR;

  // Mark as abandoned after 30 days (720 hours)
  if (hoursSinceCreated > 720) {
    partialRecords[resumeId].partial_status = 'abandoned';
    partialRecords[resumeId].abandoned_at = new Date().toISOString();
    continue;
  }

  // Only check for Email 2 or Email 3 timing
  const shouldSendEmail2 = emailsSent === 1 && hoursSinceCreated >= 24;
  const shouldSendEmail3 = emailsSent === 2 && hoursSinceCreated >= 72;

  if (!shouldSendEmail2 && !shouldSendEmail3) continue;

  // --- HALT CONDITION: Check Zoho partial_status before sending ---
  if (zohoToken) {
    try {
      const zohoResponse = await this.helpers.httpRequest({
        method: 'GET',
        url: `https://www.zohoapis.com/crm/v2/Leads/search?email=${encodeURIComponent(record.email)}`,
        headers: {
          'Authorization': `Zoho-oauthtoken ${zohoToken}`,
        },
        timeout: 10000,
      });

      const lead = zohoResponse?.data?.[0];
      if (lead && lead.partial_status === 'completed') {
        // Lead completed the assessment — halt drip
        partialRecords[resumeId].partial_status = 'completed';
        partialRecords[resumeId].completed_at = new Date().toISOString();
        partialRecords[resumeId].completed_source = 'zoho_drip_check';
        continue;
      }

      // Also check Fulcrum_Stop_Auto kill switch
      if (lead && lead.Fulcrum_Stop_Auto === true) {
        partialRecords[resumeId].partial_status = 'abandoned';
        partialRecords[resumeId].abandoned_at = new Date().toISOString();
        partialRecords[resumeId].abandoned_reason = 'fulcrum_stop_auto';
        continue;
      }
    } catch (zohoErr) {
      // Zoho check failed — log but still send email (fail-open for drip)
      zohoCheckErrors.push({
        resume_id: resumeId,
        email: record.email,
        error: zohoErr.message,
      });
    }
  }

  // --- Build email payload ---
  const firstName = (record.name || '').split(' ')[0] || 'there';
  const companyName = record.company_name || 'your company';
  const resumeUrl = `https://fulcrum.com/diagnostic?resume_id=${resumeId}`;

  if (shouldSendEmail2) {
    emailsToSend.push({
      resume_id: resumeId,
      email: record.email,
      drip_number: 2,
      postmark_payload: {
        From: 'assessments@mail.fulcrum.com',
        To: record.email,
        Subject: `Still thinking it over, ${firstName}?`,
        HtmlBody: buildEmail2Html(firstName, companyName, resumeUrl),
        TextBody: buildEmail2Text(firstName, companyName, resumeUrl),
        MessageStream: 'outbound',
      },
    });
    partialRecords[resumeId].drip_emails_sent = 2;
    partialRecords[resumeId].drip_2_sent_at = new Date().toISOString();
  }

  if (shouldSendEmail3) {
    emailsToSend.push({
      resume_id: resumeId,
      email: record.email,
      drip_number: 3,
      postmark_payload: {
        From: 'assessments@mail.fulcrum.com',
        To: record.email,
        Subject: `Last chance: Your Fulcrum Assessment is expiring, ${firstName}`,
        HtmlBody: buildEmail3Html(firstName, companyName, resumeUrl),
        TextBody: buildEmail3Text(firstName, companyName, resumeUrl),
        MessageStream: 'outbound',
      },
    });
    partialRecords[resumeId].drip_emails_sent = 3;
    partialRecords[resumeId].drip_3_sent_at = new Date().toISOString();
  }
}

// Persist updates
staticData.partial_records = partialRecords;

// Return emails to send (downstream Postmark HTTP node will iterate)
if (emailsToSend.length === 0) {
  return [{ json: {
    no_emails: true,
    zoho_check_errors: zohoCheckErrors,
    records_scanned: Object.keys(partialRecords).length,
  }}];
}

return emailsToSend.map(e => ({ json: e }));

// ═══════════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════════

function buildEmail2Html(name, company, url) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Satoshi', Arial, sans-serif; background: #F7F5F2; color: #000; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto;">
    <h2 style="font-size: 22px; margin-bottom: 16px;">Still thinking it over, ${name}?</h2>
    <p style="font-size: 16px; line-height: 1.6; color: #333;">
      We saved your progress on the Fulcrum Assessment for <strong>${company}</strong>.
      It only takes a few more minutes to complete.
    </p>
    <p style="font-size: 16px; line-height: 1.6; color: #333;">
      Your personalized Leverage Brief is waiting — pick up right where you left off.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${url}" style="display: inline-block; background: #27E7FE; color: #000; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px;">
        Resume My Assessment &rarr;
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
</html>`;
}

function buildEmail2Text(name, company, url) {
  return `Still thinking it over, ${name}?

We saved your progress on the Fulcrum Assessment for ${company}. It only takes a few more minutes to complete.

Your personalized Leverage Brief is waiting — pick up right where you left off.

Resume My Assessment: ${url}

Need help? Reply to this email and our team will assist you.

—
Fulcrum Collective`;
}

function buildEmail3Html(name, company, url) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Satoshi', Arial, sans-serif; background: #F7F5F2; color: #000; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto;">
    <h2 style="font-size: 22px; margin-bottom: 16px;">Last chance, ${name}</h2>
    <p style="font-size: 16px; line-height: 1.6; color: #333;">
      We know you're busy — that's exactly why the Fulcrum Assessment exists. In just a few more minutes,
      you'll have a clear set of priorities for <strong>${company}</strong>.
    </p>
    <p style="font-size: 16px; line-height: 1.6; color: #333;">
      Your saved progress will expire soon. This is our final reminder.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${url}" style="display: inline-block; background: #27E7FE; color: #000; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px;">
        Complete My Assessment &rarr;
      </a>
    </div>
    <hr style="border: none; border-top: 1px solid #e0ddd8; margin: 32px 0;" />
    <p style="font-size: 14px; color: #666;">
      <strong>Questions?</strong> Reply to this email — our team reads every response.
    </p>
    <p style="font-size: 13px; color: #999; margin-top: 24px;">
      Fulcrum Collective &middot; <a href="#" style="color: #999;">Unsubscribe</a>
    </p>
  </div>
</body>
</html>`;
}

function buildEmail3Text(name, company, url) {
  return `Last chance, ${name}

We know you're busy — that's exactly why the Fulcrum Assessment exists. In just a few more minutes, you'll have a clear set of priorities for ${company}.

Your saved progress will expire soon. This is our final reminder.

Complete My Assessment: ${url}

Questions? Reply to this email — our team reads every response.

—
Fulcrum Collective`;
}
