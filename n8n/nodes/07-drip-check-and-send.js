/**
 * n8n Function Node: Drip Email Check + Send via Resend
 *
 * Called by n8n Schedule Trigger (runs every hour).
 * Iterates partial_records and checks if drip emails need sending.
 *
 * STOP CONDITIONS:
 *   1. Lead completed assessment (partial_status = 'completed' in Zoho)
 *   2. Lead clicked unsubscribe link (drip_stopped = true in static data)
 *   3. Joe manually set Drip_Stopped in Zoho
 *   4. 30 days elapsed → mark abandoned
 *
 * Email sequence (resume nurture for partial submits):
 *   Email 1 — Immediate (sent by 05-partial-save, NOT this node)
 *   Email 2 — T+24h
 *   Email 3 — T+72h (final)
 *
 * All emails sent via Resend HTTP API.
 * Each email includes an unsubscribe link: /api/drip/stop?email=...&token=...
 *
 * Input:  Triggered by schedule. Receives zoho_access_token from upstream auth node.
 * Output: Array of Resend email payloads to send (downstream HTTP Request node)
 */

const staticData = $getWorkflowStaticData('global');
const partialRecords = staticData.partial_records || {};
const stoppedEmails = staticData.stopped_emails || {};
const now = Date.now();
const HOUR = 3600000;
const zohoToken = $input.first().json.zoho_access_token || null;
const HMAC_SECRET = $env.HMAC_SECRET || 'fulcrum-dev-secret';
const APP_URL = $env.APP_URL || 'https://leverage.fulcrumcollective.io';
const FROM_EMAIL = $env.RESEND_FROM_EMAIL || 'joe@fulcrumcollective.io';

const emailsToSend = [];

for (const [resumeId, record] of Object.entries(partialRecords)) {
  // Skip completed or abandoned
  if (record.partial_status !== 'in_progress') continue;

  // Check stop list (unsubscribe clicks)
  if (stoppedEmails[record.email]) {
    partialRecords[resumeId].partial_status = 'unsubscribed';
    partialRecords[resumeId].unsubscribed_at = stoppedEmails[record.email];
    continue;
  }

  const createdAt = new Date(record.created_at).getTime();
  const emailsSent = record.drip_emails_sent || 0;
  const hoursSinceCreated = (now - createdAt) / HOUR;

  // Mark as abandoned after 30 days
  if (hoursSinceCreated > 720) {
    partialRecords[resumeId].partial_status = 'abandoned';
    partialRecords[resumeId].abandoned_at = new Date().toISOString();
    continue;
  }

  // Only check for Email 2 or Email 3 timing
  const shouldSendEmail2 = emailsSent === 1 && hoursSinceCreated >= 24;
  const shouldSendEmail3 = emailsSent === 2 && hoursSinceCreated >= 72;

  if (!shouldSendEmail2 && !shouldSendEmail3) continue;

  // --- HALT CONDITION: Check Zoho before sending ---
  if (zohoToken) {
    try {
      const zohoResponse = await this.helpers.httpRequest({
        method: 'GET',
        url: `https://www.zohoapis.com/crm/v2/Leads/search?email=${encodeURIComponent(record.email)}`,
        headers: { 'Authorization': `Zoho-oauthtoken ${zohoToken}` },
        timeout: 10000,
      });

      const lead = zohoResponse?.data?.[0];
      if (lead) {
        if (lead.partial_status === 'completed') {
          partialRecords[resumeId].partial_status = 'completed';
          continue;
        }
        if (lead.Drip_Stopped === true) {
          partialRecords[resumeId].partial_status = 'unsubscribed';
          continue;
        }
      }
    } catch (zohoErr) {
      // Zoho check failed — fail-open, still send email
      console.log('Zoho check failed:', zohoErr.message);
    }
  }

  // --- Build unsubscribe link (token stored in record by partial-save) ---
  const unsubToken = record.unsubscribe_token || '';
  const unsubUrl = `${APP_URL}/api/drip/stop?email=${encodeURIComponent(record.email)}&token=${unsubToken}`;

  // --- Build email payload ---
  const firstName = record.first_name || (record.name || '').split(' ')[0] || 'there';
  const companyName = record.company_name || 'your company';
  const resumeUrl = `${APP_URL}?resume_id=${resumeId}`;

  if (shouldSendEmail2) {
    emailsToSend.push({
      resume_id: resumeId,
      resend_payload: {
        from: FROM_EMAIL,
        to: record.email,
        reply_to: 'joe@fulcrumcollective.io',
        subject: `Still thinking it over, ${firstName}?`,
        html: buildEmail2Html(firstName, companyName, resumeUrl, unsubUrl),
      },
    });
    partialRecords[resumeId].drip_emails_sent = 2;
    partialRecords[resumeId].drip_2_sent_at = new Date().toISOString();
  }

  if (shouldSendEmail3) {
    emailsToSend.push({
      resume_id: resumeId,
      resend_payload: {
        from: FROM_EMAIL,
        to: record.email,
        reply_to: 'joe@fulcrumcollective.io',
        subject: `Last chance: Your Leverage Brief assessment is expiring, ${firstName}`,
        html: buildEmail3Html(firstName, companyName, resumeUrl, unsubUrl),
      },
    });
    partialRecords[resumeId].drip_emails_sent = 3;
    partialRecords[resumeId].drip_3_sent_at = new Date().toISOString();
  }
}

// Persist updates
staticData.partial_records = partialRecords;
staticData.stopped_emails = stoppedEmails;

if (emailsToSend.length === 0) {
  return [{ json: { no_emails: true, records_scanned: Object.keys(partialRecords).length } }];
}

return emailsToSend.map(e => ({ json: e }));

// ═══════════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════════

function buildEmail2Html(name, company, url, unsubUrl) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, Helvetica, sans-serif; background: #F7F5F2; color: #000; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto;">
    <div style="margin-bottom: 24px;">
      <a href="https://www.fulcrumcollective.io"><img src="https://fulcrumcollective.io/wp-content/uploads/2026/03/Fulcrum-Logo.png" alt="Fulcrum Collective" width="120" style="width: 120px; height: auto;" /></a>
    </div>
    <h2 style="font-size: 22px; margin-bottom: 16px;">Still thinking it over, ${name}?</h2>
    <p style="font-size: 16px; line-height: 1.6; color: #333;">
      We saved your progress on the Leverage Brief assessment for <strong>${company}</strong>.
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
}

function buildEmail3Html(name, company, url, unsubUrl) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, Helvetica, sans-serif; background: #F7F5F2; color: #000; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto;">
    <div style="margin-bottom: 24px;">
      <a href="https://www.fulcrumcollective.io"><img src="https://fulcrumcollective.io/wp-content/uploads/2026/03/Fulcrum-Logo.png" alt="Fulcrum Collective" width="120" style="width: 120px; height: auto;" /></a>
    </div>
    <h2 style="font-size: 22px; margin-bottom: 16px;">Last chance, ${name}</h2>
    <p style="font-size: 16px; line-height: 1.6; color: #333;">
      We know you're busy — that's exactly why the Leverage Brief exists. In just a few more minutes,
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
    <p style="font-size: 14px; color: #666;">
      <strong>Questions?</strong> Reply to this email — our team reads every response.
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
}
