/**
 * n8n Function Node: Zoho OAuth2 Token Refresh
 *
 * Manages Zoho access token lifecycle:
 *   - Checks if current token is still valid (cached in static data)
 *   - If expired or missing, refreshes using ZOHO_REFRESH_TOKEN
 *   - Returns valid access_token for downstream Zoho API calls
 *
 * Usage: Place before any Zoho HTTP Request node.
 *        Downstream nodes reference: {{ $json.zoho_access_token }}
 *
 * Input:  Any (pass-through)
 * Output: Same data + zoho_access_token
 */

const staticData = $getWorkflowStaticData('global');
const now = Date.now();

// Check cached token
const tokenExpiry = staticData.zoho_token_expiry || 0;
const cachedToken = staticData.zoho_access_token || '';

if (cachedToken && now < tokenExpiry) {
  // Token still valid — pass through
  return [{
    json: {
      ...$input.first().json,
      zoho_access_token: cachedToken,
    }
  }];
}

// --- Refresh token ---
try {
  const response = await this.helpers.httpRequest({
    method: 'POST',
    url: 'https://accounts.zoho.com/oauth/v2/token',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: $env.ZOHO_CLIENT_ID,
      client_secret: $env.ZOHO_CLIENT_SECRET,
      refresh_token: $env.ZOHO_REFRESH_TOKEN,
    }).toString(),
    timeout: 10000,
  });

  if (!response.access_token) {
    throw new Error(`Zoho token refresh failed: ${JSON.stringify(response)}`);
  }

  // Cache token — Zoho tokens last 1 hour, refresh 5 min early
  staticData.zoho_access_token = response.access_token;
  staticData.zoho_token_expiry = now + ((response.expires_in || 3600) - 300) * 1000;

  return [{
    json: {
      ...$input.first().json,
      zoho_access_token: response.access_token,
    }
  }];

} catch (err) {
  console.log('Zoho token refresh failed:', err.message);

  // Return error flag — downstream nodes should check this
  return [{
    json: {
      ...$input.first().json,
      zoho_access_token: null,
      zoho_auth_error: err.message,
    }
  }];
}
