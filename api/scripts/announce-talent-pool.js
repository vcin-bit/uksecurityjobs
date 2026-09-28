'use strict';

/**
 * One-off announcement email: talent pool launch.
 *
 * Usage:
 *   node scripts/announce-talent-pool.js          → print counts only, no send
 *   node scripts/announce-talent-pool.js --test   → send to TEST_ADDRESS only
 *   node scripts/announce-talent-pool.js --send   → send to all, after typed confirmation
 *
 * SENDGRID_API_KEY must be supplied inline — it is not read from .env:
 *   SENDGRID_API_KEY=SG.xxx node scripts/announce-talent-pool.js --test
 *
 * Resume guard: successfully sent addresses are appended to .announce-sent.log.
 * On re-run any address already in that file is skipped (prevents double-send).
 * .announce-sent.log is covered by api/.gitignore (*.log).
 */

const path     = require('path');
const fs       = require('fs');
const readline = require('readline');

// Load SUPABASE_URL / SUPABASE_SERVICE_KEY from api/.env.
// SENDGRID_API_KEY is intentionally excluded from .env — supply it inline.
require('dotenv').config({ path: path.join(__dirname, '../.env') });

if (!process.env.SENDGRID_API_KEY) {
  console.error('Error: SENDGRID_API_KEY is not set.');
  console.error('Supply it inline: SENDGRID_API_KEY=SG.xxx node scripts/announce-talent-pool.js --test');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');
const { baseTemplate, send, escHtml } = require('../src/lib/email');
const { auditLog } = require('../src/lib/supabase');

// ── Constants ────────────────────────────────────────────────────────────────

const TEST_ADDRESS = 'davidfoster@weshredit.co.uk';
const LOG_FILE     = path.join(__dirname, '.announce-sent.log');
const SUBJECT      = 'Something new on UKSecurityJobs \u2014 let the work come to you';
const DELAY_MS     = 200; // 5 sends/sec — well within SendGrid limits

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function loadSentLog() {
  if (!fs.existsSync(LOG_FILE)) return new Set();
  return new Set(
    fs.readFileSync(LOG_FILE, 'utf8')
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
  );
}

function appendToLog(email) {
  fs.appendFileSync(LOG_FILE, email + '\n', 'utf8');
}

function buildHtml(firstName) {
  const safeName = escHtml(firstName || 'there');
  return baseTemplate(`
    <h1>Something new \u2014 let the work come to you</h1>
    <p>Hi ${safeName},</p>
    <p>We\u2019ve added talent pools to the platform. A talent pool is a security company\u2019s own bench of officers they call first when work comes up \u2014 short-notice cover, ad hoc shifts, permanent roles.</p>
    <p>If you switch on \u201clet employers find me\u201d in your profile, companies can invite you onto their bench. It\u2019s off unless you turn it on, you choose which companies can see you, and you can leave any pool at any time.</p>
    <a href="https://app.uksecurityjobs.co.uk/dashboard" class="btn">Turn it on in your profile \u2192</a>
    <hr class="divider"/>
    <p>If it\u2019s not for you, you don\u2019t need to do anything.</p>
    <p>The UKSecurityJobs team</p>
  `);
}

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, answer => { rl.close(); resolve(answer); }));
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args    = new Set(process.argv.slice(2));
  const isTest  = args.has('--test');
  const isSend  = args.has('--send');

  if (isTest && isSend) {
    console.error('Error: use --test OR --send, not both.');
    process.exit(1);
  }

  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  // Fetch recipients.
  const { data: rows, error } = await sb
    .from('candidates')
    .select('id, email, personal_details(first_name)')
    .eq('profile_complete', true)
    .eq('suspended', false)
    .not('email', 'is', null);

  if (error) { console.error('DB error:', error.message); process.exit(1); }

  const allRecipients = (rows || []).map(r => ({
    id:         r.id,
    email:      r.email,
    firstName:  r.personal_details?.first_name || null,
  }));

  const noFirstName = allRecipients.filter(r => !r.firstName).length;

  console.log(`\nRecipients (profile_complete=true, suspended=false, email not null):`);
  console.log(`  Total:          ${allRecipients.length}`);
  console.log(`  No first name:  ${noFirstName} (will receive "Hi there,")`);

  if (!isTest && !isSend) {
    console.log('\nNo flag supplied — counts only, nothing sent.');
    return;
  }

  // Build send list.
  let recipients;
  if (isTest) {
    recipients = [{ id: null, email: TEST_ADDRESS, firstName: 'David' }];
    console.log(`\n[TEST MODE] Sending only to: ${TEST_ADDRESS}`);
  } else {
    recipients = allRecipients;
    const answer = await prompt(`\nType "yes" to send to all ${recipients.length} recipients: `);
    if (answer.trim() !== 'yes') {
      console.log('Aborted.');
      return;
    }
  }

  // Load resume log.
  const alreadySent = loadSentLog();
  const toSend      = recipients.filter(r => !alreadySent.has(r.email));
  const skipped     = recipients.length - toSend.length;
  if (skipped > 0) {
    console.log(`Skipping ${skipped} address(es) already in .announce-sent.log`);
  }
  console.log(`Sending to ${toSend.length} recipient(s)...\n`);

  // Send loop.
  let sent = 0, failed = 0;
  for (const r of toSend) {
    const html = buildHtml(r.firstName);
    const ok   = await send(r.email, SUBJECT, html);
    if (ok) {
      sent++;
      appendToLog(r.email);
    } else {
      failed++;
    }
    if (toSend.indexOf(r) < toSend.length - 1) await sleep(DELAY_MS);
  }

  // Summary.
  console.log(`\n── Summary ─────────────────────`);
  console.log(`  Sent:    ${sent}`);
  console.log(`  Failed:  ${failed}`);
  console.log(`  Skipped: ${skipped}`);

  // Audit log.
  const mode = isTest ? 'test' : 'send';
  await auditLog({
    tableName:   'candidates',
    recordId:    null,
    action:      'ANNOUNCE',
    performedBy: 'system:announce_talent_pool',
    changes:     { mode, total: recipients.length, sent, failed, skipped },
  });
  console.log('Audit log written.');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
