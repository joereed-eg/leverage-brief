#!/usr/bin/env node
/**
 * Bakes all Function node code into the workflow JSON files
 * so they can be imported directly into n8n without manual pasting.
 *
 * Usage: node n8n/build-workflows.js
 */

const fs = require('fs');
const path = require('path');

const N8N_DIR = __dirname;
const NODES_DIR = path.join(N8N_DIR, 'nodes');
const EMAILS_DIR = path.join(N8N_DIR, 'emails');
const WORKFLOWS_DIR = path.join(N8N_DIR, 'workflows');

// Map: node name in workflow → JS file path
const MAIN_WORKFLOW_MAP = {
  '01 — Enrich Lead (Apollo/Instantly)': path.join(NODES_DIR, '01-enrich-lead.js'),
  '02 — Gatekeeper 2.5': path.join(NODES_DIR, '02-gatekeeper.js'),
  '03 — Perplexity Deep Research': path.join(NODES_DIR, '03-perplexity-research.js'),
  '04 — Claude Synthesis': path.join(NODES_DIR, '04-claude-synthesis.js'),
  '05 — Generate PDF': path.join(NODES_DIR, '05-generate-pdf.js'),
  '05b — Store PDF + Get URL': path.join(NODES_DIR, '05b-store-pdf.js'),
  '06a — Zoho Auth Refresh': path.join(NODES_DIR, '00-zoho-auth.js'),
  '06b — Build Zoho Payload': path.join(NODES_DIR, '11-zoho-upsert.js'),
  '07 — Completion Branching': path.join(NODES_DIR, '04-completion-branching.js'),
  '08 — Prospect Email (PDF Delivery)': path.join(NODES_DIR, '08-prospect-email.js'),
  '09 — Admin God-View Email': path.join(NODES_DIR, '09-admin-godview.js'),
  '10 — Slack High-Gap Alert': path.join(NODES_DIR, '10-high-gap-alert.js'),
  '11 — Nurture Email 0 (Immediate)': path.join(EMAILS_DIR, 'implementation-nurture.js'),
  'Nurture Check + Build Emails': path.join(NODES_DIR, '12-nurture-check-and-send.js'),
};

const PARTIAL_WORKFLOW_MAP = {
  '01 — Partial Save + UUID': path.join(NODES_DIR, '05-partial-save.js'),
  '02 — Zoho Auth Refresh': path.join(NODES_DIR, '00-zoho-auth.js'),
  '04 — Build Email 1 (Save Confirmation)': path.join(EMAILS_DIR, 'email1-immediate.js'),
  '05 — Get Partial Data': path.join(NODES_DIR, '06-get-partial-data.js'),
  '06 — Drip Stop Handler': path.join(NODES_DIR, '13-drip-stop-handler.js'),
  '07 — Zoho Auth (Drip)': path.join(NODES_DIR, '00-zoho-auth.js'),
  '08 — Drip Check + Build Emails': path.join(NODES_DIR, '07-drip-check-and-send.js'),
};

function bakeWorkflow(templatePath, codeMap, outputPath) {
  const workflow = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

  let bakedCount = 0;
  for (const node of workflow.nodes) {
    if (codeMap[node.name]) {
      const codePath = codeMap[node.name];
      if (fs.existsSync(codePath)) {
        const code = fs.readFileSync(codePath, 'utf8');

        // Convert Function nodes → Code nodes (compatible with modern n8n)
        if (node.type === 'n8n-nodes-base.function') {
          node.type = 'n8n-nodes-base.code';
          node.typeVersion = 2;
          delete node.parameters.functionCode;
          node.parameters.jsCode = code;
          node.parameters.mode = 'runOnceForAllItems';
        } else {
          node.parameters.functionCode = code;
        }

        bakedCount++;
        console.log(`  ✓ ${node.name} ← ${path.basename(codePath)}`);
      } else {
        console.log(`  ✗ ${node.name} — FILE NOT FOUND: ${codePath}`);
      }
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2));
  console.log(`  → Wrote ${outputPath} (${bakedCount} nodes baked)\n`);
}

console.log('Building n8n workflows with baked-in code...\n');

console.log('Main Pipeline:');
bakeWorkflow(
  path.join(WORKFLOWS_DIR, 'leverage-brief-main.json'),
  MAIN_WORKFLOW_MAP,
  path.join(WORKFLOWS_DIR, 'leverage-brief-main-READY.json')
);

console.log('Partial + Drip Pipeline:');
bakeWorkflow(
  path.join(WORKFLOWS_DIR, 'leverage-brief-partial.json'),
  PARTIAL_WORKFLOW_MAP,
  path.join(WORKFLOWS_DIR, 'leverage-brief-partial-READY.json')
);

console.log('Done! Import the *-READY.json files into n8n.');
