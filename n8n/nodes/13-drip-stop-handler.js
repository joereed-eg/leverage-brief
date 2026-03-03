/**
 * n8n Function Node: Drip Stop Handler
 *
 * Receives webhook from Next.js /api/drip/stop endpoint
 * when a lead clicks the unsubscribe link in a drip email.
 *
 * Adds the email to the stopped_emails list in static data.
 * Both the drip check (07) and nurture check (12) reference this list.
 *
 * Input:  { email: string, action: 'stop_drip', stopped_at: string }
 * Output: { ok: true, email, stopped: true }
 */

const data = $input.first().json;
const email = (data.email || '').toLowerCase();

if (!email) {
  return [{ json: { error: 'No email provided', statusCode: 400 } }];
}

const staticData = $getWorkflowStaticData('global');

// Add to stopped emails list
if (!staticData.stopped_emails) staticData.stopped_emails = {};
staticData.stopped_emails[email] = data.stopped_at || new Date().toISOString();

// Also mark any active partial record as unsubscribed
if (staticData.partial_records) {
  for (const [resumeId, record] of Object.entries(staticData.partial_records)) {
    if (record.email === email && record.partial_status === 'in_progress') {
      staticData.partial_records[resumeId].partial_status = 'unsubscribed';
      staticData.partial_records[resumeId].unsubscribed_at = new Date().toISOString();
    }
  }
}

// Also mark any active nurture lead as unsubscribed
if (staticData.nurture_leads && staticData.nurture_leads[email]) {
  staticData.nurture_leads[email].nurture_status = 'unsubscribed';
}

return [{ json: { ok: true, email, stopped: true } }];
