// Fulcrum Engine v5.3 — Assessment Types

// Step 1: Lead Identity
export interface LeadIdentity {
  name: string;
  email: string;
  company_name: string;
  company_url: string;
  consent_agreed: boolean;
  consent_timestamp?: string;
  consent_ip_address?: string;
  consent_version?: string;
}

// Step 2: Operational Foundation
export interface OperationalFoundation {
  vacation_test: string;
  interruption_frequency: string;
  sunday_dread: string;
  [key: string]: string;
}

// Step 3: Strategic North Star
export interface StrategicNorthStar {
  three_year_target: string;
  biggest_strategic_bet: string;
  team_confidence: string;
  revenue_goal_gap: string;
}

// Step 4: Market & ICP
export interface MarketICP {
  current_client_base: string;
  icp_description: string;
  top_competitor: string;
}

// Step 5: Execution & Focus
export interface ExecutionFocus {
  fulcrum_priorities: string;
  monthly_focus: string;
  [key: string]: string;
}

// Full assessment payload
export interface AssessmentPayload {
  lead: LeadIdentity;
  operational: OperationalFoundation;
  strategic: StrategicNorthStar;
  market: MarketICP;
  execution: ExecutionFocus;
}

// Partial capture payload (Save for Later)
export interface PartialPayload {
  email: string;
  name: string;
  company_name: string;
  company_url?: string;
  partial_progress_step: number;
  referrer_url: string;
  browser_metadata: {
    userAgent: string;
    timestamp: string;
  };
  form_state: Record<string, unknown>;
}

// Gatekeeper enrichment (Apollo/Instantly)
export interface EnrichmentData {
  headcount: number;
  annual_revenue: number;
  industry: string;
  linkedin_url?: string;
}

// Gatekeeper path
export type GatekeeperPath = "PREMIUM" | "LITE";

// Strategic path
export type StrategicPath = "VALIDATE" | "CLARIFY" | "BUILD";

// Partial status state machine
export type PartialStatus = "in_progress" | "completed" | "abandoned";

// God-View admin notification payload
export interface AdminNotificationPayload {
  lead: LeadIdentity;
  enrichment: EnrichmentData;
  sunday_dread: string;
  biggest_strategic_bet: string;
  strategic_gap_score: number;
  gatekeeper_path: GatekeeperPath;
  strategic_path: StrategicPath;
  zoho_lead_deep_link: string;
  pdf_url?: string;
}

// Form state stored in localStorage
export interface FormState {
  currentStep: number;
  answers: Record<string, unknown>;
  lastUpdated: string;
}

// HMAC webhook signature
export interface WebhookSignature {
  timestamp: string;
  signature: string;
}

// Resume token
export interface ResumeRecord {
  resume_id: string;
  email: string;
  form_state: Record<string, unknown>;
  partial_progress_step: number;
  partial_status: PartialStatus;
  created_at: string;
}
