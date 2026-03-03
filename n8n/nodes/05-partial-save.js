/**
 * n8n Function Node: Partial Save Handler
 *
 * Receives partial payload from /fulcrum-assess-partial webhook.
 * Generates UUID resume_id, stores in workflowStaticData,
 * and prepares Zoho upsert + Postmark resume email payloads.
 *
 * Features:
 *   - UUID v4 generation with collision check
 *   - Dedup by email (updates existing record, preserves resume_id)
 *   - Stores form_state as stringified JSON for Zoho Partial_Data_Blob
 *   - Outputs structured Zoho API body + Postmark trigger flags
 *
 * Input:  Partial payload with email, name, company_name, form_state, partial_progress_step
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

const email = $input.first().json.email || '';
const name = $input.first().json.name || '';
const companyName = $input.first().json.company_name || '';
const companyUrl = $input.first().json.company_url || '';
const partialStep = $input.first().json.partial_progress_step || 1;
const formState = $input.first().json.form_state || {};
const referrerUrl = $input.first().json.referrer_url || '';
const browserMetadata = $input.first().json.browser_metadata || {};
const clientIp = $input.first().json.client_ip || '';

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
    name,
    company_name: companyName,
    company_url: companyUrl,
    form_state: formState,
    partial_progress_step: partialStep,
    updated_at: new Date().toISOString(),
    save_count: (staticData.partial_records[resumeId].save_count || 1) + 1,
  };
} else {
  // Create new record
  resumeId = uuidv4(existingKeys);
  staticData.partial_records[resumeId] = {
    email,
    name,
    company_name: companyName,
    company_url: companyUrl,
    form_state: formState,
    partial_progress_step: partialStep,
    partial_status: 'in_progress',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    drip_emails_sent: 0,
    save_count: 1,
    referrer_url: referrerUrl,
    client_ip: clientIp,
    browser_metadata: browserMetadata,
  };
}

const baseUrl = referrerUrl
  ? (() => { try { return new URL(referrerUrl).origin; } catch { return 'https://fulcrum.com'; } })()
  : 'https://fulcrum.com';
const resumeUrl = `${baseUrl}/diagnostic?resume_id=${resumeId}`;

// --- Name parsing ---
const nameParts = name.split(' ');
const firstName = nameParts[0] || '';
const lastName = nameParts.slice(1).join(' ') || firstName;

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
    name,
    first_name: firstName,
    company_name: companyName,
    company_url: companyUrl,
    partial_progress_step: partialStep,
    form_state: formState,
    form_state_stringified: JSON.stringify(formState),
    partial_status: 'in_progress',
    is_new_record: isNewRecord,

    // Zoho API payload
    zoho_api_body: zohoApiBody,

    // Drip control
    trigger_drip: {
      send_immediate: isNewRecord,
      email_1_subject: `Your Fulcrum Assessment is saved, ${firstName || name}`,
    },
  }
}];
