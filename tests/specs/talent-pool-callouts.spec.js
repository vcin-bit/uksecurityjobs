/**
 * Talent pool — Phase 4 callout integration tests
 *
 * Unit tests for londonToUtc and validateCalloutTimes import the helpers
 * directly from talentPool.js (no network needed).
 *
 * Public-endpoint tests (respond, expired, closed) hit the local API
 * at http://localhost:3001 (or API_URL env). Callout and recipient rows
 * are inserted via service key to avoid needing employer Clerk auth.
 *
 * RLS tests verify REVOKE is in effect for the anon role.
 *
 * Env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY
 * (loaded from api/.env if present)
 *
 * Cleanup: afterAll deletes test callouts + recipients + candidate.
 * clerk_user_id starts with 'test_pool_co_' — safe to grep for if interrupted.
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const crypto = require('crypto');

try {
  require(path.join(__dirname, '../../api/node_modules/dotenv')).config({
    path: path.join(__dirname, '../../api/.env'),
  });
} catch (_) { /* env vars expected from shell or CI */ }

const { createClient } = require(path.join(__dirname, '../../api/node_modules/@supabase/supabase-js'));

// Import helpers directly from talentPool route (no HTTP needed).
const { londonToUtc, validateCalloutTimes } = require(path.join(__dirname, '../../api/src/routes/talentPool'));

const API_URL = process.env.API_URL || 'http://localhost:3001';
const TEST_CLERK_ID = `test_pool_co_${Date.now()}`;

let sb;
let sbAnon;
let testCandidateId;
let riskSecuredId;
let testMemberId;

// IDs created during tests — cleaned up in afterAll.
const createdCalloutIds = [];

test.describe('Talent pool — Phase 4 (callouts)', () => {

  test.beforeAll(async () => {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY || !process.env.SUPABASE_ANON_KEY) {
      throw new Error(
        'Missing env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY and SUPABASE_ANON_KEY required. ' +
        'Add them to api/.env.'
      );
    }
    sb     = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    sbAnon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

    // Create test candidate
    const { data, error } = await sb
      .from('candidates')
      .insert({
        clerk_user_id:    TEST_CLERK_ID,
        email:            `${TEST_CLERK_ID}@test.invalid`,
        gdpr_consent:     true,
        profile_complete: true,
        discoverable:     true,
        discoverable_at:  new Date().toISOString(),
      })
      .select('id')
      .single();
    if (error) throw new Error(`beforeAll: failed to create candidate — ${error.message}`);
    testCandidateId = data.id;

    // Look up Risk Secured Ltd
    const { data: emp, error: eErr } = await sb
      .from('employers')
      .select('id')
      .eq('company_name', 'Risk Secured Ltd')
      .eq('talent_pool_enabled', true)
      .single();
    if (eErr || !emp) throw new Error('Risk Secured Ltd not found or talent_pool_enabled=false.');
    riskSecuredId = emp.id;

    // Create an active pool member row for the test candidate
    const { data: mem, error: mErr } = await sb
      .from('talent_pool_members')
      .insert({
        employer_id:  riskSecuredId,
        candidate_id: testCandidateId,
        status:       'active',
        joined_at:    new Date().toISOString(),
      })
      .select('id')
      .single();
    if (mErr) throw new Error(`beforeAll: failed to create member — ${mErr.message}`);
    testMemberId = mem.id;
  });

  test.afterAll(async () => {
    if (!testCandidateId) return;
    try {
      if (createdCalloutIds.length > 0) {
        await sb.from('talent_pool_callout_recipients').delete().in('callout_id', createdCalloutIds);
        await sb.from('talent_pool_callouts').delete().in('id', createdCalloutIds);
      }
      await sb.from('talent_pool_members').delete().eq('id', testMemberId);
      await sb.from('candidates').delete().eq('id', testCandidateId);

      const { count } = await sb
        .from('candidates')
        .select('id', { count: 'exact', head: true })
        .ilike('clerk_user_id', 'test_pool_co_%');
      if (count !== 0) {
        console.error(`[cleanup] WARN: ${count} test_pool_co_ candidates remain`);
      }
    } catch (e) {
      console.error('[cleanup] error:', e.message);
    }
  });

  // ── Unit tests: londonToUtc ──────────────────────────────────────────────────

  test('1. londonToUtc: BST date converts to UTC-1hr (summer)', () => {
    // 2026-08-15 is in BST (UTC+1). 19:00 local → 18:00 UTC.
    const result = londonToUtc('2026-08-15T19:00');
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe('2026-08-15T18:00:00.000Z');
  });

  test('2. londonToUtc: GMT date keeps same hour (winter)', () => {
    // 2026-12-20 is in GMT (UTC+0). 19:00 local → 19:00 UTC.
    const result = londonToUtc('2026-12-20T19:00');
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe('2026-12-20T19:00:00.000Z');
  });

  // ── Unit tests: validateCalloutTimes ─────────────────────────────────────────

  test('3. validateCalloutTimes: past shift_start returns shift_start_past', () => {
    const past = new Date(Date.now() - 60_000); // 1 min ago
    const end  = new Date(Date.now() + 3_600_000);
    expect(validateCalloutTimes(past, end)).toBe('shift_start_past');
  });

  test('4. validateCalloutTimes: end before start returns shift_end_before_start', () => {
    const start = new Date(Date.now() + 7_200_000); // 2 hrs from now
    const end   = new Date(Date.now() + 3_600_000); // 1 hr from now
    expect(validateCalloutTimes(start, end)).toBe('shift_end_before_start');
  });

  test('5. validateCalloutTimes: valid times returns null', () => {
    const start = new Date(Date.now() + 3_600_000);
    const end   = new Date(Date.now() + 14_400_000);
    expect(validateCalloutTimes(start, end)).toBeNull();
  });

  // ── Integration tests: public respond endpoint ───────────────────────────────

  // Helper: creates a callout + recipient row via service key and returns
  // { calloutId, recipientToken } for use in HTTP tests.
  async function createTestCallout({ shiftStartOffset = 3_600_000, closedAt = null } = {}) {
    const shiftStart = new Date(Date.now() + shiftStartOffset).toISOString();
    const shiftEnd   = new Date(Date.now() + shiftStartOffset + 3_600_000).toISOString();

    const { data: callout, error: cErr } = await sb
      .from('talent_pool_callouts')
      .insert({
        employer_id:  riskSecuredId,
        shift_start:  shiftStart,
        shift_end:    shiftEnd,
        job_summary:  'Test door supervisor shift',
        site_town:    'Birmingham',
        status:       closedAt ? 'closed' : 'open',
        closed_at:    closedAt || null,
        sent_at:      new Date().toISOString(),
      })
      .select('id')
      .single();
    if (cErr) throw new Error(`createTestCallout: ${cErr.message}`);
    createdCalloutIds.push(callout.id);

    const token        = crypto.randomBytes(32).toString('hex');
    const tokenExpires = shiftStart; // expires at shift_start

    const { error: rErr } = await sb
      .from('talent_pool_callout_recipients')
      .insert({
        callout_id:    callout.id,
        member_id:     testMemberId,
        candidate_id:  testCandidateId,
        employer_id:   riskSecuredId,
        token,
        token_expires: tokenExpires,
        response:      'none',
      });
    if (rErr) throw new Error(`createTestCallout recipient: ${rErr.message}`);

    return { calloutId: callout.id, recipientToken: token };
  }

  test('6. GET /api/callout/:token returns shift details', async () => {
    const { recipientToken } = await createTestCallout();
    const res = await fetch(`${API_URL}/api/callout/${recipientToken}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.expired).toBe(false);
    expect(body.closed).toBe(false);
    expect(body.job_summary).toBe('Test door supervisor shift');
    expect(body.site_town).toBe('Birmingham');
    expect(body.employer_name).toBe('Risk Secured Ltd');
    expect(body.response).toBe('none');
  });

  test('7. POST /api/callout/:token/respond — yes recorded, responded_at set', async () => {
    const { calloutId, recipientToken } = await createTestCallout();
    const res = await fetch(`${API_URL}/api/callout/${recipientToken}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: 'yes' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.response).toBe('yes');

    // Verify DB row updated
    const { data: rec } = await sb
      .from('talent_pool_callout_recipients')
      .select('response, responded_at')
      .eq('callout_id', calloutId)
      .eq('candidate_id', testCandidateId)
      .single();
    expect(rec.response).toBe('yes');
    expect(rec.responded_at).not.toBeNull();
  });

  test('8. POST /api/callout/:token/respond — response can be changed to no', async () => {
    const { calloutId, recipientToken } = await createTestCallout();

    // First: yes
    await fetch(`${API_URL}/api/callout/${recipientToken}/respond`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: 'yes' }),
    });

    // Second: no (change)
    const res = await fetch(`${API_URL}/api/callout/${recipientToken}/respond`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: 'no' }),
    });
    expect(res.status).toBe(200);

    const { data: rec } = await sb
      .from('talent_pool_callout_recipients')
      .select('response')
      .eq('callout_id', calloutId)
      .eq('candidate_id', testCandidateId)
      .single();
    expect(rec.response).toBe('no');
  });

  test('9. Expired token → 410', async () => {
    // Create callout with shift_start in the past → token_expires in the past
    const { recipientToken } = await createTestCallout({ shiftStartOffset: -3_600_000 });
    const res = await fetch(`${API_URL}/api/callout/${recipientToken}/respond`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: 'yes' }),
    });
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.code).toBe('token_expired');
  });

  test('10. Closed callout → 409', async () => {
    const { recipientToken } = await createTestCallout({ closedAt: new Date().toISOString() });
    const res = await fetch(`${API_URL}/api/callout/${recipientToken}/respond`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: 'yes' }),
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('callout_closed');
  });

  // ── RLS tests: anon role blocked ─────────────────────────────────────────────

  test('11. Anon role cannot SELECT talent_pool_callouts', async () => {
    // Prove the anon key is valid first — briefing_data has an anon SELECT policy.
    const { error: probeErr } = await sbAnon
      .from('briefing_data')
      .select('id')
      .limit(1);
    expect(probeErr, 'anon API key must be valid (briefing_data SELECT failed)').toBeNull();

    const { data, error: rlsErr } = await sbAnon
      .from('talent_pool_callouts')
      .select('id')
      .limit(1);
    // Valid key + REVOKE in place: either a permission error or 0 rows proves access is blocked.
    expect(rlsErr !== null || (data || []).length === 0).toBe(true);
  });

  test('12. Anon role cannot SELECT talent_pool_callout_recipients', async () => {
    // Prove the anon key is valid first — briefing_data has an anon SELECT policy.
    const { error: probeErr } = await sbAnon
      .from('briefing_data')
      .select('id')
      .limit(1);
    expect(probeErr, 'anon API key must be valid (briefing_data SELECT failed)').toBeNull();

    const { data, error: rlsErr } = await sbAnon
      .from('talent_pool_callout_recipients')
      .select('id')
      .limit(1);
    // Valid key + REVOKE in place: either a permission error or 0 rows proves access is blocked.
    expect(rlsErr !== null || (data || []).length === 0).toBe(true);
  });

});
