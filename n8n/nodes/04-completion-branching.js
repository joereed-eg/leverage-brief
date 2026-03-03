/**
 * n8n Function Node: Completion Branching
 *
 * Runs AFTER full-submit Zoho upsert in the main pipeline.
 * Handles the state machine transition and campaign enrollment:
 *
 * 1. Checks if this lead had a prior partial record (by email)
 * 2. If yes: marks partial as 'completed', prepares resume nurture suppression
 * 3. Determines Implementation Nurture track (PREMIUM vs LITE)
 * 4. Builds Zoho API payloads for:
 *    - Tag update (add Fulcrum_Completed_Assessm, remove Fulcrum_Partial_Submissio)
 *    - partial_status update to 'completed'
 *    - Campaign enrollment
 *
 * Input:  Full submit payload with email, gatekeeper_path, zoho_access_token
 * Output: Payload + branching decisions + Zoho API bodies for downstream HTTP nodes
 */

const data = $input.first().json;
const email = data.email || '';
const gatekeeperPath = data.gatekeeper_path || 'LITE';
const strategicGapScore = data.strategic_gap_score || 0;
const strategicPath = data.strategic_path || 'CLARIFY';
const leadInterestSummary = data.biggest_strategic_bet || '';
const zohoToken = data.zoho_access_token || null;

// --- Check for existing partial record ---
const staticData = $getWorkflowStaticData('global');
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
const nurtureTrack = isPremium
  ? 'Fulcrum Implementation Nurture — PREMIUM'
  : 'Fulcrum Implementation Nurture — LITE';

const nurtureConfig = isPremium
  ? { email_count: 5, cadence_days: [0, 3, 5, 7, 10], cadence_label: '3-7 day' }
  : { email_count: 3, cadence_days: [0, 5, 7], cadence_label: '5-7 day' };

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
// Note: Zoho tag removal requires a separate API call
const zohoTagRemoval = hadPartialRecord ? {
  tags: [{ name: 'Fulcrum_Partial_Submissio' }],
} : null;

// --- Zoho: Campaign enrollment ---
// Campaign names must match what's configured in Zoho Campaigns
const zohoCampaignEnrollment = {
  campaign_name: nurtureTrack,
  lead_email: email,
};

// Suppress from Resume Nurture if previously enrolled
const zohoResumeSuppression = hadPartialRecord ? {
  campaign_name: 'Fulcrum Resume Nurture',
  lead_email: email,
  action: 'remove',
} : null;

return [{
  json: {
    ...data,
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
        suppress_resume_nurture: hadPartialRecord,
        enroll_implementation_nurture: true,
      },
    },

    // Zoho API bodies for downstream HTTP Request nodes
    zoho_completion_update: zohoCompletionUpdate,
    zoho_tag_removal: zohoTagRemoval,
    zoho_campaign_enrollment: zohoCampaignEnrollment,
    zoho_resume_suppression: zohoResumeSuppression,

    // For Implementation Nurture email builder
    _nurture_email_index: 0,
  }
}];
