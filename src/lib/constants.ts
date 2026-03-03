// Fulcrum Engine v5.3 — Constants

// Brand Colors
export const COLORS = {
  WARM_WHITE: "#F7F5F2",
  BLACK: "#000000",
  CYAN: "#27E7FE",
} as const;

// localStorage Keys
export const STORAGE_KEYS = {
  FORM_STATE: "leverage-brief-form-state",
  FORM_STEP: "leverage-brief-form-step",
} as const;

// Modal Steps
export const STEP_LABELS = [
  "Contact Information",
  "Operational Foundation",
  "Strategic North Star",
  "Market & ICP",
  "Execution & Focus",
] as const;

export const TOTAL_STEPS = STEP_LABELS.length;

// Gatekeeper Thresholds
export const GATEKEEPER = {
  MIN_HEADCOUNT: 5,
  MIN_REVENUE: 250_000,
} as const;

// Research Timeout (ms)
export const PERPLEXITY_TIMEOUT_MS = 60_000;

// High-gap alert threshold
export const HIGH_GAP_THRESHOLD = 7.0;

// Consent version
export const CONSENT_VERSION = "2026.01";

// Forbidden terms (EOS/Pinnacle brand moat)
export const FORBIDDEN_TERMS = [
  "EOS",
  "Pinnacle",
  "V/TO",
  "Rocks",
  "L10",
  "Traction",
] as const;

// Fulcrum terminology
export const FULCRUM_TERMS = {
  METHOD: "Fulcrum Method",
  ARCHITECTURE: "Fulcrum Strategic Architecture",
  PRIORITIES: "Fulcrum Priorities",
  NORTH_STAR: "Fulcrum North Star",
  RHYTHM: "Fulcrum Rhythm Meeting",
  FRAMEWORK: "Fulcrum Execution Framework",
} as const;

// API Endpoints (n8n webhooks)
export const ENDPOINTS = {
  ASSESS_FULL: "/api/assess",
  ASSESS_PARTIAL: "/api/assess-partial",
  GET_PARTIAL: "/api/get-partial-data",
  PDF: "/api/pdf",
} as const;
