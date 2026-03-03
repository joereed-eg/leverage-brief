/**
 * n8n Function Node: Generate PDF (Node 05)
 *
 * Calls the Vercel /api/pdf endpoint with the synthesized brief
 * to produce a branded Leverage Brief PDF.
 *
 * Returns the PDF as base64 for downstream storage (05b)
 * and attachment to the prospect email (08).
 *
 * Input:  Pipeline data with synthesized_brief from Claude
 * Output: Same data + pdf_base64
 */

const data = $input.first().json;

const synthesizedBrief = data.synthesized_brief || '';
const firstName = data.first_name || '';
const lastName = data.last_name || '';
const name = [firstName, lastName].filter(Boolean).join(' ') || data.name || 'Leader';
const companyName = data.company_name || 'Your Company';
const gatekeeperPath = data.gatekeeper_path || 'LITE';
const strategicGapScore = data.strategic_gap_score || 0;

if (!synthesizedBrief) {
  console.log('No synthesized brief — skipping PDF generation');
  return [{
    json: {
      ...data,
      pdf_base64: '',
      pdf_error: 'No synthesized brief available',
    }
  }];
}

const appBaseUrl = $env.APP_URL || 'https://leverage.fulcrumcollective.io';

try {
  // Call the Vercel PDF generation endpoint
  const response = await this.helpers.httpRequest({
    method: 'POST',
    url: `${appBaseUrl}/api/pdf`,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      company_name: companyName,
      gatekeeper_path: gatekeeperPath,
      strategic_gap_score: strategicGapScore,
      synthesized_brief: synthesizedBrief,
    }),
    encoding: 'arraybuffer',
    returnFullResponse: true,
    timeout: 60000,
  });

  // Convert binary PDF to base64
  let pdfBase64 = '';

  if (response.body) {
    // response.body is a Buffer when encoding is arraybuffer
    const buf = Buffer.isBuffer(response.body)
      ? response.body
      : Buffer.from(response.body);
    pdfBase64 = buf.toString('base64');
  }

  if (!pdfBase64) {
    throw new Error('PDF response was empty');
  }

  console.log(`PDF generated: ${Math.round(pdfBase64.length * 0.75 / 1024)} KB`);

  return [{
    json: {
      ...data,
      pdf_base64: pdfBase64,
    }
  }];

} catch (err) {
  console.log('PDF generation failed:', err.message);

  // Continue pipeline without PDF — downstream nodes handle missing pdf_base64
  return [{
    json: {
      ...data,
      pdf_base64: '',
      pdf_error: err.message,
    }
  }];
}
