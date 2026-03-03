/**
 * n8n Function Node: Get Partial Data (Resume Retrieval)
 *
 * Receives GET request with resume_id query param.
 * Looks up stored partial record and returns form_state + step.
 *
 * Input:  Query param resume_id
 * Output: { form_state, partial_progress_step } or 404
 */

const resumeId = $input.first().json.query?.resume_id
  || $input.first().json.resume_id
  || '';

if (!resumeId) {
  return [{
    json: {
      error: 'resume_id is required',
      statusCode: 400,
    }
  }];
}

const staticData = $getWorkflowStaticData('global');
const partialRecords = staticData.partial_records || {};
const record = partialRecords[resumeId];

if (!record) {
  return [{
    json: {
      error: 'Resume session not found or expired',
      statusCode: 404,
    }
  }];
}

// Don't return completed records for resume
if (record.partial_status === 'completed') {
  return [{
    json: {
      error: 'This assessment has already been completed',
      statusCode: 410,
    }
  }];
}

return [{
  json: {
    resume_id: resumeId,
    form_state: record.form_state,
    partial_progress_step: record.partial_progress_step,
    email: record.email,
    name: record.name,
    company_name: record.company_name,
  }
}];
