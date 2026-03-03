/**
 * n8n Function Node: Store PDF + Get Download URL
 *
 * Runs AFTER PDF generation (05 — Generate PDF).
 * Takes the generated PDF base64, stores it via the /api/pdf/store endpoint,
 * and outputs the permanent download URL for Zoho.
 *
 * Input:  Pipeline data + pdf_base64 from PDF generation
 * Output: Pipeline data + pdf_download_url, pdf_generated_at
 */

const data = $input.first().json;
const pdfBase64 = data.pdf_base64 || '';
const companyName = data.company_name || 'report';
const email = data.email || '';

if (!pdfBase64) {
  console.log('No PDF base64 found — skipping storage');
  return [{
    json: {
      ...data,
      pdf_download_url: '',
      pdf_generated_at: new Date().toISOString(),
      pdf_store_error: 'No PDF data available',
    }
  }];
}

try {
  const appBaseUrl = $env.APP_BASE_URL || 'https://leverage-brief.vercel.app';

  const response = await this.helpers.httpRequest({
    method: 'POST',
    url: `${appBaseUrl}/api/pdf/store`,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pdf_base64: pdfBase64,
      company_name: companyName,
      email: email,
    }),
    timeout: 30000,
  });

  const pdfDownloadUrl = response.pdf_download_url || '';

  return [{
    json: {
      ...data,
      pdf_download_url: pdfDownloadUrl,
      pdf_generated_at: new Date().toISOString(),
    }
  }];

} catch (err) {
  console.log('PDF storage failed:', err.message);

  // Continue pipeline — Zoho will just have an empty PDF_Download_URL
  return [{
    json: {
      ...data,
      pdf_download_url: '',
      pdf_generated_at: new Date().toISOString(),
      pdf_store_error: err.message,
    }
  }];
}
