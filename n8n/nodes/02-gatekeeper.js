/**
 * n8n Function Node: Gatekeeper 2.5 — Premium vs Lite Routing
 *
 * Input:  Enriched lead with enrichment.headcount + enrichment.annual_revenue
 * Output: Same payload with gatekeeper_path and is_premium flags
 *
 * After this node, use an n8n IF node to branch:
 *   Condition: {{ $json.is_premium === true }}
 *   True  → Premium path (Perplexity research → Premium synthesis)
 *   False → Lite path (skip research → Standard synthesis)
 */

const HEADCOUNT_THRESHOLD = 5;
const REVENUE_THRESHOLD = 250000;

const enrichment = $input.first().json.enrichment || {};
const headcount = enrichment.headcount || 0;
const annualRevenue = enrichment.annual_revenue || 0;

// Lite if BOTH below threshold; Premium otherwise
const isLite = headcount < HEADCOUNT_THRESHOLD && annualRevenue < REVENUE_THRESHOLD;

const gatekeeperPath = isLite ? 'LITE' : 'PREMIUM';
const isPremium = !isLite;

// Compute Strategic Gap Score (0-10 scale)
// Based on sunday_dread (1-5), revenue_goal_gap, team_confidence
const sundayDreadRaw = $input.first().json.sunday_dread || '';
const sundayDreadScore = parseInt(sundayDreadRaw.charAt(0)) || 3;

const revenueGap = $input.first().json.revenue_goal_gap || '';
let revenueGapScore = 5; // default moderate
if (revenueGap.includes('no gap')) revenueGapScore = 1;
else if (revenueGap.includes('Slight')) revenueGapScore = 3;
else if (revenueGap.includes('Moderate')) revenueGapScore = 5;
else if (revenueGap.includes('Significant')) revenueGapScore = 7;
else if (revenueGap.includes('Critical')) revenueGapScore = 9;

const teamConfidence = $input.first().json.team_confidence || '';
const confidenceScore = parseInt(teamConfidence.charAt(0)) || 3;
// Invert confidence: low confidence = high gap
const confidenceGap = 6 - confidenceScore;

// Weighted average: Sunday Dread (30%), Revenue Gap (40%), Confidence Gap (30%)
const strategicGapScore = Math.round(
  ((sundayDreadScore * 2 * 0.3) + (revenueGapScore * 0.4) + (confidenceGap * 2 * 0.3)) * 10
) / 10;

// Strategic path: VALIDATE (gap < 4), CLARIFY (4-7), BUILD (> 7)
let strategicPath = 'CLARIFY';
if (strategicGapScore < 4) strategicPath = 'VALIDATE';
else if (strategicGapScore > 7) strategicPath = 'BUILD';

return [{
  json: {
    ...$input.first().json,
    gatekeeper_path: gatekeeperPath,
    is_premium: isPremium,
    strategic_gap_score: strategicGapScore,
    strategic_path: strategicPath,
  }
}];
