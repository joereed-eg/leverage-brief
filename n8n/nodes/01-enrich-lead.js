/**
 * n8n Function Node: Lead Enrichment via Instantly
 *
 * Enriches incoming leads using Instantly's API.
 * Uses company domain first, falls back to email-based lookup.
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

// Extract clean domain from company URL
const domain = companyUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

function env(key, fallback) {
  try { return $env[key] || fallback; } catch { return fallback; }
}

// --- Instantly Enrichment (Company Lookup) ---
try {
  const response = await this.helpers.httpRequest({
    method: 'POST',
    url: 'https://api.instantly.ai/api/v2/leads/enrich',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env('INSTANTLY_API_KEY', '')}`,
    },
    body: {
      email: email,
      company_domain: domain || undefined,
    },
    timeout: 15000,
  });

  if (response) {
    enrichment.headcount = response.company_headcount || response.company_size || 0;
    enrichment.annual_revenue = response.company_revenue || response.annual_revenue || 0;
    enrichment.industry = response.company_industry || response.industry || 'Unknown';
    enrichment.linkedin_url = response.linkedin_url || response.company_linkedin || '';
    enrichment.enrichment_source = 'instantly';
  }
} catch (err) {
  console.log('Instantly enrichment failed:', err.message);

  // --- Fallback: Try v1 endpoint ---
  try {
    const fallbackResponse = await this.helpers.httpRequest({
      method: 'GET',
      url: 'https://api.instantly.ai/api/v1/lead/data',
      qs: {
        api_key: env('INSTANTLY_API_KEY', ''),
        email: email,
      },
      timeout: 15000,
    });

    if (fallbackResponse) {
      enrichment.headcount = fallbackResponse.company_headcount || 0;
      enrichment.annual_revenue = fallbackResponse.company_revenue || 0;
      enrichment.industry = fallbackResponse.company_industry || 'Unknown';
      enrichment.linkedin_url = fallbackResponse.linkedin_url || '';
      enrichment.enrichment_source = 'instantly_v1';
    }
  } catch (fallbackErr) {
    console.log('Instantly v1 fallback also failed:', fallbackErr.message);
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
