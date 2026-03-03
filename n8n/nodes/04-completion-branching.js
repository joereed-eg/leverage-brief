/**
 * n8n Function Node: Completion Branching
 *
 * Runs AFTER full-submit Zoho upsert in the main pipeline.
 * Handles the state machine transition:
 *
 * 1. Checks if this lead had a prior partial record (by email)
 * 2. If yes: marks partial as 'completed'
 * 3. Determines Implementation Nurture track (PREMIUM vs LITE)
 * 4. Stores nurture lead data in static data for scheduled nurture emailer
 * 5. Builds Zoho API payloads for tag updates
 *
 * All emails sent via Resend — no Zoho Cadences used.
 *
 * Input:  Full submit payload with email, gatekeeper_path, zoho_access_token
 * Output: Payload + branching decisions + Zoho API bodies for downstream HTTP nodes
 */

// --- Retrieve stashed pipeline data ---
// The Zoho HTTP Request node (06c) outputs only the API response,
// so we retrieve the original pipeline data stashed by 06b.
const staticData = $getWorkflowStaticData('global');
const zohoResponse = $input.first().json;

// Extract Zoho lead ID from upsert response
let zohoLeadId = null;
try {
  if (zohoResponse.data && zohoResponse.data[0] && zohoResponse.data[0].details) {
    zohoLeadId = zohoResponse.data[0].details.id;
  }
} catch (e) {
  // Zoho response didn't contain expected structure
}

// Restore pipeline data from stash
const data = staticData._pipeline_stash || {};
delete staticData._pipeline_stash; // Clean up

const email = data.email || '';
const firstName = data.first_name || '';
const gatekeeperPath = data.gatekeeper_path || 'LITE';
const strategicGapScore = data.strategic_gap_score || 0;
const strategicPath = data.strategic_path || 'CLARIFY';
const leadInterestSummary = data.biggest_strategic_bet || '';
const zohoToken = data.zoho_access_token || null;

// --- Check for existing partial record ---
const partialRecords = staticData.partial_records || {};

let hadPartialRecord = false;
let partialResumeId = null;
let previousSaveCount = 0;

const existingPartial = Object.entries(partialRecords).find(
  ([, record]) => record.email === email
);

if (existingPartial) {
  hadPartialRecord = true;
  partialResumeId = existingPartial[0];
  previousSaveCount = existingPartial[1].save_count || 1;

  // Mark partial as completed in static data
  partialRecords[partialResumeId].partial_status = 'completed';
  partialRecords[partialResumeId].completed_at = new Date().toISOString();
  partialRecords[partialResumeId].completed_source = 'full_submit';
  staticData.partial_records = partialRecords;
}

// --- Determine Implementation Nurture track ---
const isPremium = gatekeeperPath === 'PREMIUM';
const nurtureTrack = isPremium ? 'PREMIUM' : 'LITE';

const nurtureConfig = isPremium
  ? { email_count: 5, cadence_days: [0, 3, 5, 7, 10] }
  : { email_count: 3, cadence_days: [0, 5, 7] };

// --- Store nurture state for the scheduled nurture emailer ---
if (!staticData.nurture_leads) staticData.nurture_leads = {};
staticData.nurture_leads[email] = {
  email,
  first_name: firstName,
  last_name: data.last_name || '',
  company_name: data.company_name || '',
  gatekeeper_path: gatekeeperPath,
  strategic_gap_score: strategicGapScore,
  strategic_path: strategicPath,
  biggest_strategic_bet: data.biggest_strategic_bet || '',
  sunday_dread: data.sunday_dread || '',
  fulcrum_priorities: data.fulcrum_priorities || '',
  monthly_focus: data.monthly_focus || '',
  engagement_readiness: data.engagement_readiness || '',
  completed_at: new Date().toISOString(),
  nurture_emails_sent: 0,
  nurture_track: nurtureTrack,
  cadence_days: nurtureConfig.cadence_days,
  nurture_status: 'active',
  unsubscribe_token: data.unsubscribe_token || '',
};

// --- Zoho: Update lead with completion data ---
const zohoCompletionUpdate = {
  data: [{
    Email: email,
    partial_status: 'completed',
    Strategic_Gap_Score: strategicGapScore,
    Gatekeeper_Path: gatekeeperPath,
    Strategic_Path: strategicPath,
    Lead_Interest_Summary: leadInterestSummary,
    Tag: [
      { name: 'Fulcrum' },
      { name: 'Fulcrum_Completed_Assessm' },
    ],
  }],
  duplicate_check_fields: ['Email'],
};

// --- Zoho: Remove Fulcrum_Partial_Submissio tag (if had partial) ---
const zohoTagRemoval = hadPartialRecord ? {
  tags: [{ name: 'Fulcrum_Partial_Submissio' }],
} : null;

return [{
  json: {
    ...data,
    zoho_lead_id: zohoLeadId,
    completion_branching: {
      had_partial_record: hadPartialRecord,
      partial_resume_id: partialResumeId,
      previous_save_count: previousSaveCount,
      nurture_track: nurtureTrack,
      nurture_config: nurtureConfig,
      is_premium: isPremium,
      actions: {
        update_partial_status: hadPartialRecord,
        apply_completed_tag: true,
        remove_partial_tag: hadPartialRecord,
        start_nurture: true,
      },
    },

    // Zoho API bodies for downstream HTTP Request nodes
    zoho_completion_update: zohoCompletionUpdate,
    zoho_tag_removal: zohoTagRemoval,

    // For Implementation Nurture — email 0 sent immediately
    _nurture_email_index: 0,
  }
}];
