/**
 * n8n Function Node: Zoho CRM Lead Upsert (Full Submit)
 *
 * Maps all assessment data to Zoho CRM Lead fields.
 * Handles both new leads and updates to existing partial records.
 * Zoho handles ALL email sending via Workflow Rules + Cadences.
 *
 * Input:  Full pipeline payload (after synthesis + PDF storage)
 * Output: Zoho CRM API payload ready for the Zoho HTTP Request node
 *
 * Zoho Custom Fields Required:
 *   - Strategic_Gap_Score (Decimal)
 *   - Lead_Interest_Summary (Multi-line)
 *   - Gatekeeper_Path (Picklist: PREMIUM/LITE)
 *   - Strategic_Path (Picklist: VALIDATE/CLARIFY/BUILD)
 *   - partial_status (Picklist: in_progress/completed/abandoned)
 *   - resume_id (Single-line)
 *   - Resume_URL (URL)
 *   - PDF_Download_URL (URL)
 *   - PDF_Generated_At (DateTime)
 *   - Partial_Data_Blob (Multi-line)
 *   - Fulcrum_Stop_Auto (Checkbox)
 *   - Sunday_Dread (Single-line)
 *   - Fulcrum_Priorities (Multi-line)
 *   - consent_timestamp (DateTime)
 *   - consent_ip_address (Single-line)
 *   - consent_version (Single-line)
 */

const data = $input.first().json;

const name = data.name || '';
const nameParts = name.split(' ');
const firstName = nameParts[0] || '';
const lastName = nameParts.slice(1).join(' ') || firstName;

const email = data.email || '';
const companyName = data.company_name || '';
const companyUrl = data.company_url || '';

// Enrichment
const enrichment = data.enrichment || {};
const headcount = enrichment.headcount || 0;
const annualRevenue = enrichment.annual_revenue || 0;
const industry = enrichment.industry || '';
const linkedinUrl = enrichment.linkedin_url || '';

// Scores & paths
const strategicGapScore = data.strategic_gap_score || 0;
const gatekeeperPath = data.gatekeeper_path || 'LITE';
const strategicPath = data.strategic_path || 'CLARIFY';

// Key strategic data
const biggestBet = data.biggest_strategic_bet || '';
const sundayDread = data.sunday_dread || '';
const fulcrumPriorities = data.fulcrum_priorities || '';

// Resume & PDF
const resumeId = data.resume_id || '';
const resumeUrl = data.resume_url || '';
const pdfDownloadUrl = data.pdf_download_url || '';
const pdfGeneratedAt = data.pdf_generated_at || new Date().toISOString();

// Consent
const consentTimestamp = data.consent_timestamp || '';
const consentIp = data.client_ip || '';
const consentVersion = data.consent_version || '2026.01';

// Build Zoho Lead record
const zohoRecord = {
  // Standard fields
  First_Name: firstName,
  Last_Name: lastName,
  Email: email,
  Company: companyName,
  Website: companyUrl,
  Industry: industry,
  No_of_Employees: headcount,
  Annual_Revenue: annualRevenue,
  LinkedIn_URL: linkedinUrl,
  Lead_Source: 'Fulcrum_Tool',

  // Tags
  Tag: [
    { name: 'Fulcrum' },
    { name: 'Fulcrum_Completed_Assessm' },
  ],

  // Custom fields — Assessment
  Strategic_Gap_Score: strategicGapScore,
  Gatekeeper_Path: gatekeeperPath,
  Strategic_Path: strategicPath,
  Lead_Interest_Summary: biggestBet,
  Sunday_Dread: sundayDread,
  Fulcrum_Priorities: fulcrumPriorities,
  partial_status: 'completed',
  Fulcrum_Stop_Auto: false,

  // Custom fields — Resume & PDF
  resume_id: resumeId,
  Resume_URL: resumeUrl,
  PDF_Download_URL: pdfDownloadUrl,
  PDF_Generated_At: pdfGeneratedAt,

  // Consent audit trail
  consent_timestamp: consentTimestamp,
  consent_ip_address: consentIp,
  consent_version: consentVersion,

  // Description — composite summary for quick CRM scan
  Description: [
    `=== FULCRUM ASSESSMENT COMPLETE ===`,
    `Strategic Gap Score: ${strategicGapScore}/10`,
    `Gatekeeper Path: ${gatekeeperPath}`,
    `Strategic Path: ${strategicPath}`,
    ``,
    `Sunday Dread: ${sundayDread}`,
    `Biggest Strategic Bet: ${biggestBet}`,
    `Fulcrum Priorities: ${fulcrumPriorities}`,
    ``,
    `Industry: ${industry}`,
    `Headcount: ${headcount}`,
    `Annual Revenue: $${annualRevenue ? annualRevenue.toLocaleString() : 'N/A'}`,
    ``,
    `PDF: ${pdfDownloadUrl}`,
    `Resume Link: ${resumeUrl}`,
  ].join('\n'),
};

// Upsert criteria — match by email
const upsertCriteria = {
  duplicate_check_fields: ['Email'],
};

return [{
  json: {
    zoho_record: zohoRecord,
    upsert_criteria: upsertCriteria,
    // Pass through full data for downstream nodes
    ...data,
  }
}];
