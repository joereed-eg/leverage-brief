# Leverage Brief — Fulcrum Engine v5.3

## Project Overview
Lead capture + AI diagnostic pipeline for Fulcrum Collective.
5-step progressive modal → n8n backend → enrichment → AI synthesis → PDF delivery.

## Tech Stack
- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4
- **Font:** Satoshi (embedded Base64 for PDF, web-loaded for UI)
- **PDF:** Puppeteer with embedded Satoshi
- **Backend Automation:** n8n workflows (webhooks)
- **Integrations:** Apollo/Instantly, Perplexity, Claude, Zoho CRM, Postmark, Slack

## Brand Rules (NON-NEGOTIABLE)
- **NEVER use:** EOS, Pinnacle, V/TO, Rocks, L10, Traction
- **ALWAYS use:** Fulcrum Method, Fulcrum Strategic Architecture, Fulcrum Priorities, Fulcrum North Star, Fulcrum Rhythm Meeting, Fulcrum Execution Framework
- **Colors:** Warm White #F7F5F2, Black #000000, Cyan #27E7FE
- **Font:** Satoshi everywhere

## Key Directories
- `src/components/modal/` — 5-step assessment modal
- `src/components/ui/` — Shared UI primitives
- `src/lib/` — Constants, validation, HMAC, utilities
- `src/hooks/` — React hooks (localStorage, form state)
- `src/types/` — TypeScript type definitions
- `src/app/api/` — API routes (assess, partial, pdf)
- `src/assets/fonts/` — Satoshi font files

## Conventions
- All API payloads use snake_case field names
- localStorage keys: `leverage-brief-form-state`, `leverage-brief-form-step`
- Every external API call must have error handling + timeout fallback
- HMAC signature required on all webhook POSTs
