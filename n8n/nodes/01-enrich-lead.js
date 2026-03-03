/**
 * n8n Function Node: Lead Enrichment via Apollo/Instantly
 *
 * Input:  Webhook payload with company_url, email, company_name
 * Output: Enriched lead with headcount, annual_revenue, industry, linkedin_url
 *
 * Paste this into an n8n Function node.
 */

const companyUrl = $input.first().json.company_url || '';
const email = $input.first().json.email || '';
const companyName = $input.first().json.company_name || '';

let enrichment = {
  headcount: 0,
  annual_revenue: 0,
  industry: 'Unknown',
  linkedin_url: '',
  enrichment_source: 'none',
  enrichment_failed: false,
};

// --- Apollo Enrichment ---
try {
  const apolloResponse = await this.helpers.httpRequest({
    method: 'POST',
    url: 'https://api.apollo.io/v1/organizations/enrich',
    headers: { 'Content-Type': 'application/json' },
    body: {
      api_key: $env.APOLLO_API_KEY,
      domain: companyUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
    },
    timeout: 15000,
  });

  if (apolloResponse.organization) {
    const org = apolloResponse.organization;
    enrichment.headcount = org.estimated_num_employees || 0;
    enrichment.annual_revenue = org.annual_revenue || 0;
    enrichment.industry = org.industry || 'Unknown';
    enrichment.linkedin_url = org.linkedin_url || '';
    enrichment.enrichment_source = 'apollo';
  }
} catch (apolloErr) {
  console.log('Apollo enrichment failed, trying Instantly fallback:', apolloErr.message);
}

// --- Instantly Fallback (if Apollo missed revenue/headcount) ---
if (enrichment.headcount === 0 && enrichment.annual_revenue === 0) {
  try {
    const instantlyResponse = await this.helpers.httpRequest({
      method: 'GET',
      url: 'https://api.instantly.ai/api/v1/lead/data',
      qs: {
        api_key: $env.INSTANTLY_API_KEY,
        email: email,
      },
      timeout: 15000,
    });

    if (instantlyResponse) {
      enrichment.headcount = instantlyResponse.company_headcount || enrichment.headcount;
      enrichment.annual_revenue = instantlyResponse.company_revenue || enrichment.annual_revenue;
      enrichment.industry = instantlyResponse.company_industry || enrichment.industry;
      enrichment.linkedin_url = instantlyResponse.linkedin_url || enrichment.linkedin_url;
      enrichment.enrichment_source = enrichment.enrichment_source === 'apollo'
        ? 'apollo+instantly'
        : 'instantly';
    }
  } catch (instantlyErr) {
    console.log('Instantly enrichment also failed:', instantlyErr.message);
    enrichment.enrichment_failed = true;
  }
}

// Pass through all original data + enrichment
return [{
  json: {
    ...$input.first().json,
    enrichment,
  }
}];
