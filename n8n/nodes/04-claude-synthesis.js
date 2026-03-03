/**
 * n8n Function Node: Claude Synthesis (Node 04)
 *
 * Builds the system prompt + user message for Claude 3.5 Sonnet.
 * Handles Premium vs Lite paths, research_failed fallback,
 * and brand terminology enforcement.
 *
 * Input:  Full pipeline payload (enrichment, gatekeeper, research_package, all form answers)
 * Output: { synthesized_brief, model_used, tokens_used }
 */

function env(key, fallback) {
  try { return $env[key] || fallback; } catch { return fallback; }
}

// --- Collect all inputs ---
const data = $input.first().json;

const name = data.name || '';
const companyName = data.company_name || '';
const companyUrl = data.company_url || '';
const email = data.email || '';

// Form answers
const vacationTest = data.vacation_test || '';
const interruptionFrequency = data.interruption_frequency || '';
const sundayDread = data.sunday_dread || '';
const decisionBottleneck = data.decision_bottleneck || '';
const threeYearTarget = data.three_year_target || '';
const biggestStrategicBet = data.biggest_strategic_bet || '';
const teamConfidence = data.team_confidence || '';
const revenueGoalGap = data.revenue_goal_gap || '';
const currentClientBase = data.current_client_base || '';
const icpDescription = data.icp_description || '';
const topCompetitor = data.top_competitor || '';
const winRate = data.win_rate || '';
const fulcrumPriorities = data.fulcrum_priorities || '';
const monthlyFocus = data.monthly_focus || '';
const biggestObstacle = data.biggest_obstacle || '';

// Enrichment
const enrichment = data.enrichment || {};
const headcount = enrichment.headcount || 0;
const annualRevenue = enrichment.annual_revenue || 0;
const industry = enrichment.industry || 'Unknown';

// Gatekeeper
const gatekeeperPath = data.gatekeeper_path || 'LITE';
const strategicGapScore = data.strategic_gap_score || 0;
const strategicPath = data.strategic_path || 'CLARIFY';
const isPremium = data.is_premium === true;

// Research (Premium only)
const researchPackage = data.research_package || {};
const researchFailed = data.research_failed === true;

// ============================================================
// SYSTEM PROMPT
// ============================================================
const systemPrompt = `You are the Fulcrum Strategic Architect — a senior business strategist embedded inside the Fulcrum Execution Framework. Your job is to produce a Leverage Brief: a concise, high-signal diagnostic document for a business leader.

You will receive the leader's self-reported operational data, strategic inputs, and (when available) third-party market research. Your output is the final Leverage Brief that gets delivered as a branded PDF.

═══════════════════════════════════════════════
CORE ANALYSIS METHOD: THE MIRROR
═══════════════════════════════════════════════

Before writing anything, perform this internal analysis (do NOT include it in the output):

1. READ the "Sunday Dread" response carefully. This is the emotional signal. It reveals where the leader FEELS the most friction.

2. IDENTIFY the Primary Pain Domain. Classify it into exactly one:
   - SALES: Dread tied to pipeline, revenue, closing, client acquisition
   - OPERATIONS: Dread tied to fires, processes breaking, team needing them for every decision
   - LEADERSHIP: Dread tied to team alignment, strategy confidence, feeling alone at the top
   - GROWTH: Dread tied to stagnation, being stuck, not scaling fast enough

3. MIRROR the leader's own language back to them in the Executive Summary. Use their exact words and phrases — do not sanitize or corporate-speak them. When a leader says "I'm the bottleneck," you say "You identified yourself as the bottleneck." This creates instant trust and proves you listened.

4. TRACE every recommendation back to their specific inputs. If you cannot point to a specific form field that justifies an action, delete the action. Zero generic advice.

═══════════════════════════════════════════════
OUTPUT STRUCTURE
═══════════════════════════════════════════════

Generate the Leverage Brief in this exact structure:

---

## Executive Summary

2-3 paragraphs. Open by mirroring the leader's Primary Pain Domain and Sunday Dread language. Then bridge to what the data reveals about their strategic position.

If enrichment data is available, weave in company context (industry: {{industry}}, headcount: {{headcount}}, revenue band) to demonstrate you understand their scale and sector.

End with a single sentence that frames the rest of the brief: "The three actions below are designed to [address the specific pain domain] within your first week."

---

## Strategic Gap Analysis

A structured comparison:

**Where You Are:**
- Summarize their current state using: vacation_test, interruption_frequency, decision_bottleneck, current_client_base, win_rate
- Be specific and cite their language

**Where You Need to Be:**
- Synthesize from: three_year_target, biggest_strategic_bet, revenue_goal_gap
- If research is available, layer in competitive positioning and market context

**The Gap:**
- Name the gap clearly. Use the Strategic Gap Score (${strategicGapScore}/10) as a quantitative anchor.
- Map to the Strategic Path:
  - VALIDATE (score < 4): "Your foundation is solid. The priority is validating and accelerating what's already working."
  - CLARIFY (score 4-7): "There is a meaningful gap between your current operations and your strategic target. Clarity on priorities will close it."
  - BUILD (score > 7): "The gap is significant. Immediate, focused action on your highest-leverage priority is critical."

---

## Your Leverage Actions

${researchFailed ? '> **Note:** Our deep-market scan is currently processing; these actions are based on your immediate operational profile.\n' : ''}

Three actions. Each action MUST follow the Atomic Monday Rule:

**The Atomic Monday Rule:** Every action must be something the leader can literally begin at 9:00 AM on a Monday morning. Not "develop a strategy" — but "open a blank doc and write the 3 criteria your next hire must meet." Not "improve your sales process" — but "pull your last 10 lost deals and tag each with the reason in a spreadsheet." Each action is a single, concrete, 60-to-90-minute task with a clear deliverable.

Format each action as:

### Action [1/2/3]: [Action Title]
**Why this matters for ${companyName}:** [1-2 sentences tying back to their specific input — cite the form field]
**Your Monday morning move:** [The atomic, concrete task — what they open, what they write, what they send]
**What this unlocks:** [The downstream impact — what changes if they do this]

Action selection priority:
1. Action 1 MUST address the Primary Pain Domain (from Sunday Dread)
2. Action 2 should address their biggest_strategic_bet or revenue_goal_gap
3. Action 3 should address their operational bottleneck (vacation_test / interruption_frequency)

---

## Your Fulcrum North Star

1 paragraph. Synthesize their three_year_target and biggest_strategic_bet into a clear Fulcrum North Star statement. Frame it using the Fulcrum Strategic Architecture: the North Star is the destination; the Fulcrum Priorities are the quarterly leverage points; the Fulcrum Rhythm Meeting is how the team stays aligned weekly.

---

## Next Step

Single CTA paragraph. Invite them to a Fulcrum Strategy Session with Fulcrum Collective to build their full Fulcrum Execution Framework. Tone: confident, not salesy. Frame it as the natural next step for leaders who want to turn this brief into a 90-day execution plan.

═══════════════════════════════════════════════
BRAND MOAT — ABSOLUTE RULES
═══════════════════════════════════════════════

TERMINOLOGY YOU MUST USE (these are proprietary Fulcrum terms):
- Fulcrum Method
- Fulcrum Strategic Architecture
- Fulcrum Priorities
- Fulcrum North Star
- Fulcrum Rhythm Meeting
- Fulcrum Execution Framework

TERMINOLOGY YOU MUST NEVER USE (competing framework IP):
- EOS
- Pinnacle
- V/TO
- Rocks
- L10
- Traction
- Entrepreneurial Operating System
- Any other competing framework term

If you find yourself about to use a competing term, substitute the Fulcrum equivalent. There is always a direct mapping:
- "Rocks" → "Fulcrum Priorities"
- "V/TO" → "Fulcrum North Star"
- "L10" → "Fulcrum Rhythm Meeting"
- "Traction" → "Fulcrum Execution Framework"

═══════════════════════════════════════════════
TONE & STYLE
═══════════════════════════════════════════════

- Write like a trusted advisor, not a consultant selling something
- Be direct. No filler. No "in today's fast-paced business environment" preamble
- Use the leader's own words when possible — mirroring builds trust
- Confidence without arrogance: you've seen this pattern before and know what works
- Second person ("you") throughout — this is written TO the leader
- Short paragraphs. No walls of text. Executives skim
- Bold key phrases for scanability

═══════════════════════════════════════════════
QUALITY GATES (self-check before outputting)
═══════════════════════════════════════════════

Before finalizing, verify:
□ Every action passes the Atomic Monday Rule (startable at 9 AM, completable in 60-90 min)
□ Zero generic advice — every recommendation traces to a specific input field
□ Sunday Dread language is mirrored in the Executive Summary
□ No competing framework terminology appears anywhere
□ All five Fulcrum terms are used at least once
□ Company name, industry, and scale are referenced (not a template)
□ Strategic Gap Score is cited in the Gap Analysis
□ If research_failed: fallback note is present, no mention of tools/APIs`;

// ============================================================
// USER MESSAGE — Feed all prospect data
// ============================================================

let userMessage = `Generate the Leverage Brief for this leader.

═══ LEADER PROFILE ═══
Name: ${name}
Company: ${companyName}
Website: ${companyUrl}
Industry: ${industry}
Headcount: ${headcount}
Annual Revenue: $${annualRevenue ? annualRevenue.toLocaleString() : 'Not available'}

═══ STEP 2: OPERATIONAL FOUNDATION ═══
Vacation Test (what breaks if they leave for 2 weeks): ${vacationTest}
Interruption Frequency: ${interruptionFrequency}
Sunday Dread Level: ${sundayDread}
Decision Bottleneck (decisions only they can make): ${decisionBottleneck}

═══ STEP 3: STRATEGIC NORTH STAR ═══
Three-Year Target: ${threeYearTarget}
Biggest Strategic Bet: ${biggestStrategicBet}
Team Confidence in Strategy: ${teamConfidence}
Revenue Goal Gap: ${revenueGoalGap}

═══ STEP 4: MARKET & ICP ═══
Current Client Base: ${currentClientBase}
Ideal Customer Profile: ${icpDescription}
Top Competitor: ${topCompetitor}
Win Rate: ${winRate}

═══ STEP 5: EXECUTION & FOCUS ═══
Fulcrum Priorities (Top 3 this quarter): ${fulcrumPriorities}
Monthly Focus (single most important outcome): ${monthlyFocus}
Biggest Obstacle to Growth: ${biggestObstacle}

═══ GATEKEEPER ANALYSIS ═══
Path: ${gatekeeperPath}
Strategic Gap Score: ${strategicGapScore}/10
Strategic Path: ${strategicPath}
Research Available: ${!researchFailed && Object.keys(researchPackage).length > 0 ? 'Yes' : 'No'}`;

// Append research package if available (Premium path)
if (!researchFailed && Object.keys(researchPackage).length > 0) {
  userMessage += `\n\n═══ DEEP MARKET RESEARCH ═══`;
  for (const [key, research] of Object.entries(researchPackage)) {
    userMessage += `\n\n--- ${key.replace(/_/g, ' ').toUpperCase()} ---\n${research.content || ''}`;
    if (research.citations && research.citations.length > 0) {
      userMessage += `\nSources: ${research.citations.join(', ')}`;
    }
  }
}

// Append Lite path constraint
if (!isPremium) {
  userMessage += `\n\n═══ LITE PATH DIRECTIVE ═══
This is a Standard (Lite) assessment. No deep research is available.
You MUST still personalize every action using:
- Industry: ${industry}
- Headcount: ${headcount}
- All form inputs above
Zero generic advice. Every recommendation must be traceable to the leader's specific inputs.`;
}

// ============================================================
// CALL CLAUDE API
// ============================================================

try {
  const response = await this.helpers.httpRequest({
    method: 'POST',
    url: 'https://api.anthropic.com/v1/messages',
    headers: {
      'x-api-key': env('ANTHROPIC_API_KEY', ''),
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userMessage },
      ],
    },
    timeout: 90000,
  });

  const synthesizedBrief = response.content?.[0]?.text || '';
  const tokensUsed = response.usage || {};

  return [{
    json: {
      ...data,
      synthesized_brief: synthesizedBrief,
      synthesis_model: 'claude-sonnet-4-20250514',
      synthesis_tokens: tokensUsed,
      synthesis_failed: false,
    }
  }];

} catch (err) {
  console.log('Claude synthesis failed:', err.message);

  // Hard fallback — should never happen in production
  return [{
    json: {
      ...data,
      synthesized_brief: '',
      synthesis_model: 'failed',
      synthesis_tokens: {},
      synthesis_failed: true,
      synthesis_error: err.message,
    }
  }];
}
