/**
 * n8n Function Node: Partial Save Handler
 *
 * Receives partial payload from /fulcrum-assess-partial webhook.
 * Generates UUID resume_id, stores in workflowStaticData,
 * and prepares Zoho upsert + Resend resume email payloads.
 *
 * Features:
 *   - UUID v4 generation with collision check
 *   - Dedup by email (updates existing record, preserves resume_id)
 *   - Stores form_state as stringified JSON for Zoho Partial_Data_Blob
 *   - Accepts first_name/last_name separately (form sends these)
 *   - Falls back to splitting `name` if needed
 *
 * Input:  Partial payload with email, first_name, last_name, company_name, form_state, partial_progress_step
 * Output: Payload with resume_id, Zoho API body, and email trigger data
 */

// Generate UUID v4 with collision guard
function uuidv4(existingKeys) {
  let id;
  let attempts = 0;
  do {
    id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    attempts++;
  } while (existingKeys.has(id) && attempts < 10);
  return id;
}

const input = $input.first().json;
const email = input.email || '';
const unsubscribeToken = input.unsubscribe_token || '';
const companyName = input.company_name || '';
const companyUrl = input.company_url || '';
const partialStep = input.partial_progress_step || 1;
const formState = input.form_state || {};
const referrerUrl = input.referrer_url || '';
const browserMetadata = input.browser_metadata || {};
const clientIp = input.client_ip || '';

// Name handling — form now sends first_name/last_name separately
let firstName = input.first_name || '';
let lastName = input.last_name || '';

// Fallback: split `name` if first/last not provided
if (!firstName && input.name) {
  const parts = input.name.split(' ');
  firstName = parts[0] || '';
  lastName = parts.slice(1).join(' ') || '';
}
if (!lastName) lastName = firstName;

// Validate email
if (!email || !email.includes('@')) {
  return [{
    json: {
      error: 'Valid email is required for Save for Later',
      statusCode: 400,
    }
  }];
}

// --- Static data store ---
const staticData = $getWorkflowStaticData('global');
if (!staticData.partial_records) {
  staticData.partial_records = {};
}

const existingKeys = new Set(Object.keys(staticData.partial_records));

// --- Dedup: check for existing record by email ---
let resumeId;
let isNewRecord = true;
const existingEntry = Object.entries(staticData.partial_records).find(
  ([, record]) => record.email === email && record.partial_status === 'in_progress'
);

if (existingEntry) {
  // Update existing record — preserve UUID
  isNewRecord = false;
  resumeId = existingEntry[0];
  staticData.partial_records[resumeId] = {
    ...staticData.partial_records[resumeId],
    first_name: firstName,
    last_name: lastName,
    company_name: companyName,
    company_url: companyUrl,
    form_state: formState,
    partial_progress_step: partialStep,
    updated_at: new Date().toISOString(),
    save_count: (staticData.partial_records[resumeId].save_count || 1) + 1,
    unsubscribe_token: unsubscribeToken || staticData.partial_records[resumeId].unsubscribe_token,
  };
} else {
  // Create new record
  resumeId = uuidv4(existingKeys);
  staticData.partial_records[resumeId] = {
    email,
    first_name: firstName,
    last_name: lastName,
    company_name: companyName,
    company_url: companyUrl,
    form_state: formState,
    partial_progress_step: partialStep,
    partial_status: 'in_progress',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    drip_emails_sent: 0,
    save_count: 1,
    unsubscribe_token: unsubscribeToken,
    referrer_url: referrerUrl,
    client_ip: clientIp,
    browser_metadata: browserMetadata,
  };
}

const APP_URL = $env.APP_URL || 'https://leverage.fulcrumcollective.io';
const resumeUrl = `${APP_URL}?resume_id=${resumeId}`;

// --- Zoho CRM API body (for HTTP Request node) ---
const zohoApiBody = {
  data: [{
    Last_Name: lastName,
    First_Name: firstName,
    Email: email,
    Company: companyName,
    Website: companyUrl,
    Lead_Source: 'Fulcrum_Tool',
    Tag: [
      { name: 'Fulcrum' },
      { name: 'Fulcrum_Partial_Submissio' },
    ],
    partial_status: 'in_progress',
    resume_id: resumeId,
    Partial_Data_Blob: JSON.stringify(formState),
  }],
  duplicate_check_fields: ['Email'],
};

return [{
  json: {
    // Core fields
    resume_id: resumeId,
    resume_url: resumeUrl,
    email,
    first_name: firstName,
    last_name: lastName,
    company_name: companyName,
    company_url: companyUrl,
    partial_progress_step: partialStep,
    form_state: formState,
    form_state_stringified: JSON.stringify(formState),
    partial_status: 'in_progress',
    is_new_record: isNewRecord,
    unsubscribe_token: unsubscribeToken,

    // Zoho API payload
    zoho_api_body: zohoApiBody,

    // Drip control — only send immediate email for new records
    trigger_drip: {
      send_immediate: isNewRecord,
      email_1_subject: `Your Fulcrum Assessment is saved, ${firstName || 'there'}`,
    },
  }
}];
