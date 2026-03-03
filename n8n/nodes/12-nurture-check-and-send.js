/**
 * n8n Function Node: Implementation Nurture Check + Send via Resend
 *
 * Called by n8n Schedule Trigger (runs every 6 hours).
 * Iterates nurture_leads in static data and checks if nurture emails need sending.
 *
 * PREMIUM cadence: Day 0, 3, 5, 7, 10 (5 emails)
 * LITE cadence:    Day 0, 5, 7 (3 emails)
 *
 * Email 0 is sent immediately by the main pipeline (not this node).
 * This node handles emails 1+ based on timing.
 *
 * STOP CONDITIONS:
 *   1. All emails in cadence sent → mark nurture_status = 'completed'
 *   2. Lead unsubscribed (in stopped_emails)
 *   3. 30 days elapsed → mark nurture_status = 'expired'
 *
 * Input:  Triggered by schedule. No upstream data needed.
 * Output: Array of Resend email payloads to send
 */

const staticData = $getWorkflowStaticData('global');
const nurtureLeads = staticData.nurture_leads || {};
const stoppedEmails = staticData.stopped_emails || {};
const now = Date.now();
const DAY = 86400000;

const APP_URL = $env.APP_URL || 'https://leverage.fulcrumcollective.io';
const FROM_EMAIL = $env.RESEND_FROM_EMAIL || 'joe@fulcrumcollective.io';

const emailsToSend = [];

for (const [email, lead] of Object.entries(nurtureLeads)) {
  if (lead.nurture_status !== 'active') continue;

  // Check stop list
  if (stoppedEmails[email]) {
    nurtureLeads[email].nurture_status = 'unsubscribed';
    continue;
  }

  const completedAt = new Date(lead.completed_at).getTime();
  const daysSinceCompleted = (now - completedAt) / DAY;

  // Expire after 30 days
  if (daysSinceCompleted > 30) {
    nurtureLeads[email].nurture_status = 'expired';
    continue;
  }

  const sent = lead.nurture_emails_sent || 0;
  const cadence = lead.cadence_days || [0, 5, 7];

  // Email 0 is sent by main pipeline, so we look at index = sent
  if (sent >= cadence.length) {
    nurtureLeads[email].nurture_status = 'completed';
    continue;
  }

  // Check if it's time for the next email
  const nextDay = cadence[sent];
  if (daysSinceCompleted < nextDay) continue;

  // --- Build unsubscribe link (token stored in lead by completion-branching) ---
  const unsubToken = lead.unsubscribe_token || '';
  const unsubUrl = `${APP_URL}/api/drip/stop?email=${encodeURIComponent(email)}&token=${unsubToken}`;

  const bookingUrl = 'https://cal.com/fulcrumcollective/discovery-call';

  // --- Build email based on track + index ---
  const emailContent = buildNurtureEmail(lead, sent, unsubUrl, bookingUrl);
  if (!emailContent) continue;

  emailsToSend.push({
    email,
    resend_payload: {
      from: FROM_EMAIL,
      to: email,
      reply_to: 'joe@fulcrumcollective.io',
      subject: emailContent.subject,
      html: emailContent.html,
    },
  });

  nurtureLeads[email].nurture_emails_sent = sent + 1;
  nurtureLeads[email][`nurture_${sent + 1}_sent_at`] = new Date().toISOString();
}

// Persist
staticData.nurture_leads = nurtureLeads;

if (emailsToSend.length === 0) {
  return [{ json: { no_emails: true, leads_scanned: Object.keys(nurtureLeads).length } }];
}

return emailsToSend.map(e => ({ json: e }));

// ═══════════════════════════════════════════════
// NURTURE EMAIL TEMPLATES
// ═══════════════════════════════════════════════

function wrapHtml(bodyHtml, unsubUrl) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, Helvetica, sans-serif; background: #F7F5F2; color: #000; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto;">
    <div style="margin-bottom: 24px;">
      <a href="https://www.fulcrumcollective.io"><img src="https://fulcrumcollective.io/wp-content/uploads/2026/03/Fulcrum-Logo.png" alt="Fulcrum Collective" width="120" style="width: 120px; height: auto;" /></a>
    </div>
    ${bodyHtml}
    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e0ddd8;">
      <p style="font-size: 11px; color: #aaa;">
        Fulcrum Collective &middot;
        <a href="${unsubUrl}" style="color: #aaa;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function buildNurtureEmail(lead, index, unsubUrl, bookingUrl) {
  const name = lead.first_name || 'there';
  const company = lead.company_name || 'your company';
  const track = lead.nurture_track || 'LITE';

  // PREMIUM emails: indices 0-4 (but 0 is sent by pipeline, so this sees 1-4)
  // LITE emails: indices 0-2 (0 sent by pipeline, so 1-2)
  // The index passed here is 0-based from nurture_emails_sent count

  if (track === 'PREMIUM') {
    return buildPremiumEmail(index, name, company, lead, unsubUrl, bookingUrl);
  } else {
    return buildLiteEmail(index, name, company, lead, unsubUrl, bookingUrl);
  }
}

function buildPremiumEmail(index, name, company, lead, unsubUrl, bookingUrl) {
  switch (index) {
    case 0: // Day 0 — Recap (sent by pipeline via implementation-nurture.js)
      return buildRecapEmail(name, company, lead, unsubUrl);
    case 1: // Day 3 — Implementation guidance
      return {
        subject: `Your 3-step action plan, ${name}`,
        html: wrapHtml(`
          <h2 style="font-size: 22px; margin-bottom: 16px;">Turning your Leverage Brief into action</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">${name},</p>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Your Leverage Brief identified key priorities for <strong>${company}</strong>.
            Here's how to start moving on them this week:
          </p>
          <div style="border-left: 4px solid #27E7FE; padding: 12px 16px; margin: 24px 0; background: rgba(39,231,254,0.05); border-radius: 0 6px 6px 0;">
            <p style="margin: 0 0 8px; font-weight: 700;">The Atomic Monday Rule:</p>
            <p style="margin: 0; font-size: 14px; line-height: 1.6;">
              Pick ONE action from your brief. Start it Monday at 9 AM. Have a deliverable by lunch.
              That's it. One compounding action per week beats a quarterly planning retreat every time.
            </p>
          </div>
          ${lead.fulcrum_priorities ? `<p style="font-size: 16px; line-height: 1.6; color: #333;">Your stated priorities — <em>${lead.fulcrum_priorities.substring(0, 120)}</em> — are the right starting point.</p>` : ''}
          <div style="text-align: center; margin: 32px 0;">
            <a href="${bookingUrl}" style="display: inline-block; background: #27E7FE; color: #000; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px;">
              Walk Through My Brief &rarr;
            </a>
          </div>
          <p style="font-size: 14px; color: #666;"><strong>Questions?</strong> Reply to this email — our team reads every response.</p>
        `, unsubUrl),
      };
    case 2: // Day 5 — Strategic depth
      return {
        subject: `The gap between where you are and where you're going, ${name}`,
        html: wrapHtml(`
          <h2 style="font-size: 22px; margin-bottom: 16px;">Closing the strategic gap</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">${name},</p>
          ${lead.sunday_dread ? `<p style="font-size: 16px; line-height: 1.6; color: #333;">You mentioned that your Sunday dread level sits at <strong>${lead.sunday_dread.substring(0, 80)}</strong>. That's a signal worth paying attention to.</p>` : ''}
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            The Fulcrum Method works by finding the single highest-leverage point in your business
            and applying focused pressure there. Your Leverage Brief already identified that point for
            <strong>${company}</strong>.
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Most leaders try to fix everything at once. The ones who break through focus on
            <strong>one fulcrum priority per quarter</strong>.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${bookingUrl}" style="display: inline-block; background: #27E7FE; color: #000; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px;">
              Discuss My Fulcrum Priority &rarr;
            </a>
          </div>
          <p style="font-size: 14px; color: #666;"><strong>Questions?</strong> Reply to this email — we read every response.</p>
        `, unsubUrl),
      };
    case 3: // Day 7 — Social proof + positioning
      return {
        subject: `How leaders like you use the Leverage Brief, ${name}`,
        html: wrapHtml(`
          <h2 style="font-size: 22px; margin-bottom: 16px;">You're not alone in this</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">${name},</p>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Leaders across industries have used the Leverage Brief to cut through noise and focus on
            what actually moves the needle. Here's the pattern we see:
          </p>
          <div style="margin: 24px 0;">
            <p style="font-size: 14px; line-height: 1.8; color: #333;"><strong>Week 1:</strong> Review the brief, pick one Atomic Monday action</p>
            <p style="font-size: 14px; line-height: 1.8; color: #333;"><strong>Week 2:</strong> Book a strategy session to align the team</p>
            <p style="font-size: 14px; line-height: 1.8; color: #333;"><strong>Week 3-4:</strong> See compounding momentum from focused execution</p>
          </div>
          ${lead.biggest_strategic_bet ? `<p style="font-size: 16px; line-height: 1.6; color: #333;">Your biggest bet — <em>${lead.biggest_strategic_bet.substring(0, 120)}</em> — deserves this kind of focused attention.</p>` : ''}
          <div style="text-align: center; margin: 32px 0;">
            <a href="${bookingUrl}" style="display: inline-block; background: #27E7FE; color: #000; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px;">
              Book My Strategy Session &rarr;
            </a>
          </div>
          <p style="font-size: 14px; color: #666;"><strong>Questions?</strong> Reply to this email — we read every response.</p>
        `, unsubUrl),
      };
    case 4: // Day 10 — Final CTA
      return buildFinalCtaEmail(name, company, lead, unsubUrl, bookingUrl);
    default:
      return null;
  }
}

function buildLiteEmail(index, name, company, lead, unsubUrl, bookingUrl) {
  switch (index) {
    case 0: // Day 0 — Recap (sent by pipeline)
      return buildRecapEmail(name, company, lead, unsubUrl);
    case 1: // Day 5 — Quick wins
      return {
        subject: `Quick wins for ${company} this week`,
        html: wrapHtml(`
          <h2 style="font-size: 22px; margin-bottom: 16px;">Start small, compound fast</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">${name},</p>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Your Leverage Brief outlined strategic priorities for <strong>${company}</strong>.
            Here's how to build momentum right now:
          </p>
          <div style="margin: 24px 0;">
            <div style="border-left: 4px solid #27E7FE; padding: 8px 16px; margin-bottom: 8px;">
              <p style="margin: 0; font-size: 14px;"><strong>This week:</strong> Pick one action from your brief and execute it Monday morning</p>
            </div>
            <div style="border-left: 4px solid #27E7FE; padding: 8px 16px; margin-bottom: 8px;">
              <p style="margin: 0; font-size: 14px;"><strong>This month:</strong> ${lead.monthly_focus ? lead.monthly_focus.substring(0, 100) : 'Focus on your top fulcrum priority'}</p>
            </div>
            <div style="border-left: 4px solid #27E7FE; padding: 8px 16px;">
              <p style="margin: 0; font-size: 14px;"><strong>This quarter:</strong> Revisit your brief and measure progress against your 3-year target</p>
            </div>
          </div>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${bookingUrl}" style="display: inline-block; background: #27E7FE; color: #000; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px;">
              Get Expert Guidance &rarr;
            </a>
          </div>
          <p style="font-size: 14px; color: #666;"><strong>Questions?</strong> Reply to this email — we read every response.</p>
        `, unsubUrl),
      };
    case 2: // Day 7 — Final CTA
      return buildFinalCtaEmail(name, company, lead, unsubUrl, bookingUrl);
    default:
      return null;
  }
}

function buildRecapEmail(name, company, lead, unsubUrl) {
  return {
    subject: `Your Leverage Brief key takeaways, ${name}`,
    html: wrapHtml(`
      <h2 style="font-size: 22px; margin-bottom: 16px;">Your Leverage Brief at a glance</h2>
      <p style="font-size: 16px; line-height: 1.6; color: #333;">${name},</p>
      <p style="font-size: 16px; line-height: 1.6; color: #333;">
        Here's a quick recap of what your Leverage Brief revealed about <strong>${company}</strong>:
      </p>
      <div style="margin: 24px 0;">
        ${lead.biggest_strategic_bet ? `<p style="font-size: 14px; line-height: 1.6; color: #333;"><strong>Biggest strategic bet:</strong> ${lead.biggest_strategic_bet.substring(0, 150)}</p>` : ''}
        ${lead.fulcrum_priorities ? `<p style="font-size: 14px; line-height: 1.6; color: #333;"><strong>Fulcrum priorities:</strong> ${lead.fulcrum_priorities.substring(0, 150)}</p>` : ''}
        <p style="font-size: 14px; line-height: 1.6; color: #333;"><strong>Strategic gap score:</strong> ${lead.strategic_gap_score}/10</p>
      </div>
      <p style="font-size: 16px; line-height: 1.6; color: #333;">
        Open your attached Leverage Brief for the full breakdown and recommended actions.
      </p>
      <p style="font-size: 14px; color: #666;"><strong>Questions?</strong> Reply to this email — we read every response.</p>
    `, unsubUrl),
  };
}

function buildFinalCtaEmail(name, company, lead, unsubUrl, bookingUrl) {
  return {
    subject: `Ready to move forward, ${name}?`,
    html: wrapHtml(`
      <h2 style="font-size: 22px; margin-bottom: 16px;">One conversation could change everything</h2>
      <p style="font-size: 16px; line-height: 1.6; color: #333;">${name},</p>
      <p style="font-size: 16px; line-height: 1.6; color: #333;">
        Your Leverage Brief gave you the map. A Fulcrum Strategy Session gives you the guide.
      </p>
      <p style="font-size: 16px; line-height: 1.6; color: #333;">
        In 30 minutes, we'll walk through your brief together, pressure-test your priorities,
        and give you a clear next step for <strong>${company}</strong>.
      </p>
      <div style="border-left: 4px solid #27E7FE; padding: 12px 16px; margin: 24px 0; background: rgba(39,231,254,0.05); border-radius: 0 6px 6px 0;">
        <p style="margin: 0; font-size: 14px; line-height: 1.6;">
          No pitch. No pressure. Just a focused conversation about your business.
        </p>
      </div>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${bookingUrl}" style="display: inline-block; background: #27E7FE; color: #000; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px;">
          Book My Free Strategy Session &rarr;
        </a>
      </div>
      <p style="font-size: 14px; color: #666;">This is our last email in this series. If you'd like to reconnect later, just reply anytime.</p>
    `, unsubUrl),
  };
}
