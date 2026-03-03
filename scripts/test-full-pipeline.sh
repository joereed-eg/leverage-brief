#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Leverage Brief — Full Pipeline Test
# ═══════════════════════════════════════════════════════════
#
# Tests the complete assessment flow end-to-end:
#   1. Partial save (Step 1 auto-capture)
#   2. Full submission
#
# Prerequisites:
#   - App deployed to Vercel with all env vars set
#   - n8n workflows imported and active
#   - HMAC_SECRET set in both Vercel and n8n
#
# Usage:
#   chmod +x scripts/test-full-pipeline.sh
#   ./scripts/test-full-pipeline.sh
#
# ═══════════════════════════════════════════════════════════

set -e

# --- Config ---
APP_URL="${APP_URL:-https://leverage.fulcrumcollective.io}"
HMAC_SECRET="${HMAC_SECRET:-fulcrum-dev-secret}"
TEST_EMAIL="${TEST_EMAIL:-joe+test@fulcrumcollective.io}"

echo "════════════════════════════════════════════"
echo "  Leverage Brief — Full Pipeline Test"
echo "════════════════════════════════════════════"
echo ""
echo "  App URL:    $APP_URL"
echo "  Test Email: $TEST_EMAIL"
echo ""

# --- Helper: Generate HMAC signature ---
generate_signature() {
  local payload="$1"
  local timestamp="$2"
  local message="${timestamp}.${payload}"
  echo -n "$message" | openssl dgst -sha256 -hmac "$HMAC_SECRET" | awk '{print $2}'
}

# ═══════════════════════════════════════════════
# TEST 1: Partial Save (Step 1 Auto-Capture)
# ═══════════════════════════════════════════════
echo "─── TEST 1: Partial Save (Step 1 Auto-Capture) ───"
echo ""

PARTIAL_PAYLOAD=$(cat <<'PAYLOAD_EOF'
{
  "email": "TEST_EMAIL_PLACEHOLDER",
  "first_name": "Test",
  "last_name": "Lead",
  "company_name": "Acme Corp",
  "company_url": "https://acme.com",
  "partial_progress_step": 1,
  "capture_type": "step1_auto",
  "referrer_url": "https://leverage.fulcrumcollective.io",
  "form_state": {
    "first_name": "Test",
    "last_name": "Lead",
    "email": "TEST_EMAIL_PLACEHOLDER",
    "company_name": "Acme Corp",
    "company_url": "https://acme.com"
  }
}
PAYLOAD_EOF
)

# Replace placeholder with actual test email
PARTIAL_PAYLOAD=$(echo "$PARTIAL_PAYLOAD" | sed "s/TEST_EMAIL_PLACEHOLDER/$TEST_EMAIL/g")

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
SIGNATURE=$(generate_signature "$PARTIAL_PAYLOAD" "$TIMESTAMP")

echo "  Sending partial save to $APP_URL/api/assess-partial..."
PARTIAL_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "$APP_URL/api/assess-partial" \
  -H "Content-Type: application/json" \
  -H "X-Fulcrum-Timestamp: $TIMESTAMP" \
  -H "X-Fulcrum-Signature: $SIGNATURE" \
  -d "$PARTIAL_PAYLOAD")

PARTIAL_HTTP_CODE=$(echo "$PARTIAL_RESPONSE" | tail -1)
PARTIAL_BODY=$(echo "$PARTIAL_RESPONSE" | sed '$d')

echo "  HTTP Status: $PARTIAL_HTTP_CODE"
echo "  Response: $PARTIAL_BODY"
echo ""

if [ "$PARTIAL_HTTP_CODE" -eq 200 ]; then
  echo "  ✓ Partial save succeeded"
else
  echo "  ✗ Partial save failed (HTTP $PARTIAL_HTTP_CODE)"
  echo "  Check that the app is deployed and HMAC_SECRET matches."
  exit 1
fi

echo ""
sleep 2

# ═══════════════════════════════════════════════
# TEST 2: Full Submission
# ═══════════════════════════════════════════════
echo "─── TEST 2: Full Submission ───"
echo ""

FULL_PAYLOAD=$(cat <<'PAYLOAD_EOF'
{
  "email": "TEST_EMAIL_PLACEHOLDER",
  "first_name": "Test",
  "last_name": "Lead",
  "company_name": "Acme Corp",
  "company_url": "https://acme.com",
  "vacation_test": "3 - Things slow down but mostly fine",
  "interruption_frequency": "Several times a day",
  "sunday_dread": "3 - Noticeable tension about the week ahead",
  "decision_bottleneck": "Most decisions need my approval before moving forward",
  "three_year_target": "Hit $5M ARR and expand to 3 new markets",
  "biggest_strategic_bet": "Launching an enterprise tier to move upmarket",
  "team_confidence": "3 - Aligned on vision but execution varies",
  "revenue_goal_gap": "Significant gap — we need to close 40%+ more",
  "current_client_base": "200 SMB clients, mostly in SaaS",
  "icp_description": "B2B SaaS companies with 50-200 employees",
  "top_competitor": "https://competitor1.com",
  "competitor_url_2": "https://competitor2.com",
  "client_url_1": "https://bestclient.com",
  "win_rate": "About 35%",
  "fulcrum_priorities": "Improve sales process, build enterprise product, hire senior AE",
  "monthly_focus": "Close 3 enterprise pilots this month",
  "biggest_obstacle": "Team bandwidth — everyone is stretched thin",
  "engagement_readiness": "30_days",
  "consent_timestamp": "2026-03-02T12:00:00.000Z",
  "consent_version": "2026.01"
}
PAYLOAD_EOF
)

FULL_PAYLOAD=$(echo "$FULL_PAYLOAD" | sed "s/TEST_EMAIL_PLACEHOLDER/$TEST_EMAIL/g")

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
SIGNATURE=$(generate_signature "$FULL_PAYLOAD" "$TIMESTAMP")

echo "  Sending full submission to $APP_URL/api/assess-full..."
FULL_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "$APP_URL/api/assess-full" \
  -H "Content-Type: application/json" \
  -H "X-Fulcrum-Timestamp: $TIMESTAMP" \
  -H "X-Fulcrum-Signature: $SIGNATURE" \
  -d "$FULL_PAYLOAD")

FULL_HTTP_CODE=$(echo "$FULL_RESPONSE" | tail -1)
FULL_BODY=$(echo "$FULL_RESPONSE" | sed '$d')

echo "  HTTP Status: $FULL_HTTP_CODE"
echo "  Response: $FULL_BODY"
echo ""

if [ "$FULL_HTTP_CODE" -eq 200 ]; then
  echo "  ✓ Full submission succeeded"
else
  echo "  ✗ Full submission failed (HTTP $FULL_HTTP_CODE)"
  echo "  Check n8n webhook is active and all API keys are set."
  exit 1
fi

echo ""

# ═══════════════════════════════════════════════
# TEST 3: Unsubscribe Link
# ═══════════════════════════════════════════════
echo "─── TEST 3: Unsubscribe Link ───"
echo ""

UNSUB_TOKEN=$(echo -n "$TEST_EMAIL" | tr '[:upper:]' '[:lower:]' | openssl dgst -sha256 -hmac "$HMAC_SECRET" | awk '{print $2}' | cut -c1-16)
UNSUB_URL="$APP_URL/api/drip/stop?email=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$TEST_EMAIL'))")&token=$UNSUB_TOKEN"

echo "  Unsubscribe URL: $UNSUB_URL"
echo "  Testing unsubscribe endpoint..."

UNSUB_RESPONSE=$(curl -s -w "\n%{http_code}" "$UNSUB_URL")
UNSUB_HTTP_CODE=$(echo "$UNSUB_RESPONSE" | tail -1)

echo "  HTTP Status: $UNSUB_HTTP_CODE"

if [ "$UNSUB_HTTP_CODE" -eq 200 ]; then
  echo "  ✓ Unsubscribe succeeded"
else
  echo "  ✗ Unsubscribe failed (HTTP $UNSUB_HTTP_CODE)"
fi

echo ""
echo "════════════════════════════════════════════"
echo "  Test Complete!"
echo "════════════════════════════════════════════"
echo ""
echo "  Check the following:"
echo "  1. joe@fulcrumcollective.io inbox — partial notification + admin god-view"
echo "  2. $TEST_EMAIL inbox — save confirmation + PDF delivery"
echo "  3. Zoho CRM — lead record with all custom fields"
echo "  4. n8n execution logs — both workflows should show successful runs"
echo ""
