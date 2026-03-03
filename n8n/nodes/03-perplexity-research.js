/**
 * n8n Function Node: Perplexity Sonar Deep Research (Premium Path Only)
 *
 * Input:  Gatekeeper-routed payload (is_premium === true)
 * Output: Same payload + research_package (or research_failed flag)
 *
 * 60-second timeout enforced. On failure, sets research_failed = true
 * and continues pipeline — Claude will use intake + enrichment only.
 */

const TIMEOUT_MS = 60000;

const companyName = $input.first().json.company_name || '';
const companyUrl = $input.first().json.company_url || '';
const industry = $input.first().json.enrichment?.industry || 'Unknown';
const icpDescription = $input.first().json.icp_description || '';
const topCompetitor = $input.first().json.top_competitor || '';
const allCompetitors = [
  $input.first().json.top_competitor,
  $input.first().json.competitor_url_2,
  $input.first().json.competitor_url_3,
  $input.first().json.competitor_url_4,
  $input.first().json.competitor_url_5,
].filter(Boolean);
const clientUrls = [
  $input.first().json.client_url_1,
  $input.first().json.client_url_2,
  $input.first().json.client_url_3,
].filter(Boolean);
const biggestBet = $input.first().json.biggest_strategic_bet || '';

// Build research queries
const queries = [
  {
    key: 'company_research',
    prompt: `Provide a detailed business analysis of ${companyName} (${companyUrl}). Include their market position, recent news, growth trajectory, and key challenges in the ${industry} industry.`,
  },
  {
    key: 'competitive_landscape',
    prompt: `Analyze the competitive landscape for ${companyName} in the ${industry} industry. Their competitors include: ${allCompetitors.length > 0 ? allCompetitors.join(', ') : 'unknown'}. What are the key differentiators and market dynamics?`,
  },
  {
    key: 'icp_gap_analysis',
    prompt: `For a company in ${industry} whose ideal customer is: "${icpDescription}", identify gaps between their current positioning and optimal ICP targeting. What opportunities are they likely missing?`,
  },
  {
    key: 'industry_trends',
    prompt: `What are the top 3 strategic trends in the ${industry} industry that would impact a company making this bet: "${biggestBet}"? Focus on actionable insights.`,
  },
];

let researchPackage = {};
let researchFailed = false;
let researchModel = 'perplexity_sonar';

try {
  // Race all queries against a 60s timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const results = await Promise.allSettled(
    queries.map(async (q) => {
      const response = await this.helpers.httpRequest({
        method: 'POST',
        url: 'https://api.perplexity.ai/chat/completions',
        headers: {
          'Authorization': `Bearer ${$env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: {
          model: 'sonar',
          messages: [
            { role: 'system', content: 'You are a business research analyst. Provide concise, data-driven insights.' },
            { role: 'user', content: q.prompt },
          ],
          max_tokens: 1024,
        },
        timeout: TIMEOUT_MS,
      });

      return {
        key: q.key,
        content: response.choices?.[0]?.message?.content || '',
        citations: response.citations || [],
      };
    })
  );

  clearTimeout(timeoutId);

  // Collect successful results
  for (const result of results) {
    if (result.status === 'fulfilled') {
      researchPackage[result.value.key] = {
        content: result.value.content,
        citations: result.value.citations,
      };
    }
  }

  // If zero queries succeeded, flag as failed
  if (Object.keys(researchPackage).length === 0) {
    researchFailed = true;
    researchModel = 'fallback_lite';
  }

} catch (err) {
  console.log('Perplexity research failed (timeout or error):', err.message);
  researchFailed = true;
  researchModel = 'fallback_lite';
}

return [{
  json: {
    ...$input.first().json,
    research_package: researchPackage,
    research_failed: researchFailed,
    research_model: researchModel,
  }
}];
