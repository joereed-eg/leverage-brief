/**
 * n8n Function Node: Zoho CRM Lead Upsert (Full Submit)
 *
 * Maps all assessment data to Zoho CRM Lead fields.
 * Handles both new leads and updates to existing partial records.
 * Resend handles immediate emails; Zoho handles nurture cadences.
 *
 * Input:  Full pipeline payload (after synthesis + PDF storage)
 * Output: Zoho CRM API payload ready for the Zoho HTTP Request node
 */

const data = $input.first().json;

// Name — form now collects first/last separately
const firstName = data.first_name || '';
const lastName = data.last_name || firstName;

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

// Operational (Step 2)
const vacationTest = data.vacation_test || '';
const interruptionFrequency = data.interruption_frequency || '';
const sundayDread = data.sunday_dread || '';
const decisionBottleneck = data.decision_bottleneck || '';

// Strategic (Step 3)
const threeYearTarget = data.three_year_target || '';
const biggestBet = data.biggest_strategic_bet || '';
const teamConfidence = data.team_confidence || '';
const revenueGoalGap = data.revenue_goal_gap || '';

// Market & ICP (Step 4)
const currentClientBase = data.current_client_base || '';
const icpDescription = data.icp_description || '';
const topCompetitor = data.top_competitor || '';
const competitorUrls = [
  data.top_competitor,
  data.competitor_url_2,
  data.competitor_url_3,
  data.competitor_url_4,
  data.competitor_url_5,
].filter(Boolean);
const clientUrls = [
  data.client_url_1,
  data.client_url_2,
  data.client_url_3,
].filter(Boolean);
const winRate = data.win_rate || '';

// Execution (Step 5)
const fulcrumPriorities = data.fulcrum_priorities || '';
const monthlyFocus = data.monthly_focus || '';
const biggestObstacle = data.biggest_obstacle || '';
const engagementReadiness = data.engagement_readiness || '';

// Readiness label for CRM
const readinessMap = {
  now: 'HOT — Needs guidance now',
  '30_days': 'WARM — Within 30 days',
  next_quarter: 'COOL — Next quarter',
  just_looking: 'COLD — Just curious',
};
const readinessLabel = readinessMap[engagementReadiness] || 'Not specified';

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
  Engagement_Readiness: readinessLabel,
  partial_status: 'completed',
  Assessment_Tier: gatekeeperPath,

  // Custom fields — Resume & PDF
  resume_id: resumeId,
  Resume_URL: resumeUrl,
  PDF_Download_URL: pdfDownloadUrl,
  PDF_Generated_At: pdfGeneratedAt,

  // Consent audit trail
  consent_timestamp: consentTimestamp,
  consent_ip_address: consentIp,
  consent_version: consentVersion,

  // Description — full assessment dump for quick CRM scan
  Description: [
    `=== FULCRUM ASSESSMENT COMPLETE ===`,
    `Engagement Readiness: ${readinessLabel}`,
    `Strategic Gap Score: ${strategicGapScore}/10`,
    `Gatekeeper Path: ${gatekeeperPath}`,
    `Strategic Path: ${strategicPath}`,
    ``,
    `--- OPERATIONAL ---`,
    `Vacation Test: ${vacationTest}`,
    `Interruption Frequency: ${interruptionFrequency}`,
    `Sunday Dread: ${sundayDread}`,
    `Decision Bottleneck: ${decisionBottleneck}`,
    ``,
    `--- STRATEGIC ---`,
    `3-Year Target: ${threeYearTarget}`,
    `Biggest Strategic Bet: ${biggestBet}`,
    `Team Confidence: ${teamConfidence}`,
    `Revenue Goal Gap: ${revenueGoalGap}`,
    ``,
    `--- MARKET & ICP ---`,
    `Client Base: ${currentClientBase}`,
    `ICP: ${icpDescription}`,
    `Competitors: ${competitorUrls.join(', ') || 'None provided'}`,
    `Client URLs: ${clientUrls.join(', ') || 'None provided'}`,
    `Win Rate: ${winRate}`,
    ``,
    `--- EXECUTION ---`,
    `Fulcrum Priorities: ${fulcrumPriorities}`,
    `Monthly Focus: ${monthlyFocus}`,
    `Biggest Obstacle: ${biggestObstacle}`,
    ``,
    `--- ENRICHMENT ---`,
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
