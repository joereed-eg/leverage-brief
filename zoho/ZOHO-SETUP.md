# Zoho CRM Setup — Leverage Brief (Fulcrum Engine)

## Overview

All leads enter as **Leads** and stay there until you manually convert to Contacts.
Email sending happens from Zoho CRM directly (not Postmark).
n8n handles: assessment processing, Claude synthesis, PDF generation, and pushes data into Zoho via API.

---

## Step 1: Custom Fields on Leads Module

Create these under **Settings → Modules and Fields → Leads → Layout**.

### Assessment Fields

| Field Name              | API Name                | Type         | Values / Notes                              |
|-------------------------|-------------------------|--------------|---------------------------------------------|
| Strategic Gap Score     | Strategic_Gap_Score     | Decimal      | 0.0–10.0                                    |
| Gatekeeper Path         | Gatekeeper_Path        | Picklist     | `PREMIUM`, `LITE`                           |
| Strategic Path          | Strategic_Path         | Picklist     | `VALIDATE`, `CLARIFY`, `BUILD`              |
| Lead Interest Summary   | Lead_Interest_Summary  | Multi-line   | Their biggest strategic bet                 |
| Sunday Dread            | Sunday_Dread           | Single-line  | e.g. "4 — Significant anxiety"             |
| Fulcrum Priorities      | Fulcrum_Priorities     | Multi-line   | Top 3 quarterly priorities                  |

### Partial Capture Fields

| Field Name              | API Name                | Type         | Values / Notes                              |
|-------------------------|-------------------------|--------------|---------------------------------------------|
| Partial Status          | partial_status          | Picklist     | `in_progress`, `completed`, `abandoned`     |
| Resume ID               | resume_id               | Single-line  | UUID for resume link                        |
| Resume URL              | Resume_URL              | URL          | Full resume link (auto-built by n8n)        |
| Partial Data Blob       | Partial_Data_Blob       | Multi-line   | Stringified JSON of form state              |

### PDF & Delivery Fields

| Field Name              | API Name                | Type         | Values / Notes                              |
|-------------------------|-------------------------|--------------|---------------------------------------------|
| PDF Download URL        | PDF_Download_URL        | URL          | Permanent link to their generated PDF       |
| PDF Generated At        | PDF_Generated_At        | DateTime     | When the PDF was created                    |

### Automation Control Fields

| Field Name              | API Name                | Type         | Values / Notes                              |
|-------------------------|-------------------------|--------------|---------------------------------------------|
| Stop Auto Emails        | Fulcrum_Stop_Auto       | Checkbox     | Kills all automated sequences when checked  |

### Consent Fields

| Field Name              | API Name                | Type         | Values / Notes                              |
|-------------------------|-------------------------|--------------|---------------------------------------------|
| Consent Timestamp       | consent_timestamp       | DateTime     | When they checked the consent box           |
| Consent IP              | consent_ip_address      | Single-line  | IP at time of consent                       |
| Consent Version         | consent_version         | Single-line  | e.g. "2026.01"                              |

---

## Step 2: Tags

These are applied automatically by n8n via the API:

| Tag                           | Applied When                        |
|-------------------------------|-------------------------------------|
| `Fulcrum`                     | All Fulcrum Engine leads            |
| `Fulcrum_Partial_Submissio`  | Lead saved partial progress         |
| `Fulcrum_Completed_Assessm`| Lead completed full assessment      |

---

## Step 3: Workflow Rules (for automated emails)

### Workflow Rule A: "Completion Email — Deliver PDF"

- **Module:** Leads
- **Trigger:** Field update → `partial_status` changed to `completed`
- **Condition:** `PDF_Download_URL` is not empty
- **Action:** Send email using template "Leverage Brief Delivery"
- **Email Template:** See `zoho/templates/email-completion.html`

### Workflow Rule B: "Resume Nudge — In Progress"

- **Module:** Leads
- **Trigger:** Field update → `partial_status` set to `in_progress` (on create/edit)
- **Condition:** `Fulcrum_Stop_Auto` is false
- **Scheduled Action:** Send email 24 hours after trigger
- **Email Template:** See `zoho/templates/email-resume-nudge.html`
- **Note:** Use Zoho's scheduled actions to also send a second nudge at 72 hours

### Workflow Rule C: "Resume Final Nudge — 72h"

- **Module:** Leads
- **Trigger:** Same as Rule B
- **Condition:** `partial_status` is still `in_progress` AND `Fulcrum_Stop_Auto` is false
- **Scheduled Action:** Send email 72 hours after trigger
- **Email Template:** See `zoho/templates/email-resume-final.html`

---

## Step 4: Cadences (for nurture sequences)

Cadences auto-stop when the lead replies. Set these up under **SalesInbox → Cadences**.

### Cadence A: "Fulcrum Implementation Nurture — PREMIUM"

- **Enrollment Trigger:** Manual or via workflow rule when `partial_status = 'completed'` AND `Gatekeeper_Path = 'PREMIUM'`
- **Emails:** 5 emails, 3–7 day spacing
- **Exit:** Lead replies OR `Fulcrum_Stop_Auto` checked
- **Templates:** See `zoho/templates/nurture-premium-*.html`

### Cadence B: "Fulcrum Implementation Nurture — LITE"

- **Enrollment Trigger:** `partial_status = 'completed'` AND `Gatekeeper_Path = 'LITE'`
- **Emails:** 3 emails, 5–7 day spacing
- **Exit:** Lead replies OR `Fulcrum_Stop_Auto` checked
- **Templates:** See `zoho/templates/nurture-lite-*.html`

---

## Step 5: Lead Source & Defaults

- **Lead Source:** `Fulcrum_Tool` (set on all Fulcrum Engine leads)
- **Default Layout:** Use your standard Lead layout with the custom fields above added

---

## Brand Guardrails

- NEVER use: EOS, Pinnacle, V/TO, Rocks, L10, Traction
- ALWAYS use: Fulcrum Priorities, Fulcrum North Star, Monday Morning Actions, Strategic Gap Score
