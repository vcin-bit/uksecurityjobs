/**
 * Talent pool — Phase 5 licence expiry check integration tests
 *
 * Tests call runLicenceCheck() directly (no HTTP needed for most tests).
 * A beforeEach resets the shared test member to status='active' with no
 * sia_licences and no expiry fields, so every test starts from a known state.
 *
 * Test candidate clerk_user_id starts with 'test_pool_lc_' — safe to grep
 * for if interrupted.
 *
 * Env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY (loaded from api/.env if present)
 * Cleanup: afterAll deletes test licences, member, and candidate.
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

try {
  require(path.join(__dirname, '../../api/node_modules/dotenv')).config({
    path: path.join(__dirname, '../../api/.env'),
  });
} catch (_) { /* env vars expected from shell or CI */ }

const { createClient } = require(path.join(__dirname, '../../api/node_modules/@supabase/supabase-js'));
const { runLicenceCheck } = require(path.join(__dirname, '../../api/src/lib/poolLicenceCheck'));

const TEST_CLERK_ID = `test_pool_lc_${Date.now()}`;

let sb;
let testCandidateId;
let riskSecuredId;
let testMemberId;

// Returns a date string YYYY-MM-DD offset by `days` from today.
function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Insert a sia_licence for the test candidate and return its id.
async function insertLicence({ expiryDate, verified = true }) {
  const { data, error } = await sb
    .from('sia_licences')
    .insert({
      candidate_id:             testCandidateId,
      licence_type:             'Door Supervisor',
      licence_number_encrypted: `TEST_${Date.now()}`,
      expiry_date:              expiryDate,
      verified,
    })
    .select('id')
    .single();
  if (error) throw new Error(`insertLicence: ${error.message}`);
  return data.id;
}

async function deleteLicence(id) {
  await sb.from('sia_licences').delete().eq('id', id);
}

// Fetch the current state of the test member row.
async function fetchMember() {
  const { data } = await sb
    .from('talent_pool_members')
    .select('status, paused_reason, paused_at, nearest_licence_expiry')
    .eq('id', testMemberId)
    .single();
  return data;
}

test.describe('Talent pool — Phase 5 (licence expiry check)', () => {

  test.beforeAll(async () => {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      throw new Error(
        'Missing env vars: SUPABASE_URL and SUPABASE_SERVICE_KEY required. ' +
        'Add them to api/.env.'
      );
    }
    sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    // Create test candidate.
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

    // Look up Risk Secured Ltd.
    const { data: emp, error: eErr } = await sb
      .from('employers')
      .select('id')
      .eq('company_name', 'Risk Secured Ltd')
      .eq('talent_pool_enabled', true)
      .single();
    if (eErr || !emp) throw new Error('Risk Secured Ltd not found or talent_pool_enabled=false.');
    riskSecuredId = emp.id;

    // Create the shared active member row.
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

  // Reset to clean state before every test.
  test.beforeEach(async () => {
    await sb
      .from('talent_pool_members')
      .update({ status: 'active', paused_reason: null, paused_at: null, nearest_licence_expiry: null })
      .eq('id', testMemberId);
    await sb.from('sia_licences').delete().eq('candidate_id', testCandidateId);
  });

  test.afterAll(async () => {
    if (!testCandidateId) return;
    try {
      await sb.from('sia_licences').delete().eq('candidate_id', testCandidateId);
      await sb.from('talent_pool_members').delete().eq('id', testMemberId);
      await sb.from('candidates').delete().eq('id', testCandidateId);

      const { count } = await sb
        .from('candidates')
        .select('id', { count: 'exact', head: true })
        .ilike('clerk_user_id', 'test_pool_lc_%');
      if (count !== 0) console.error(`[cleanup] WARN: ${count} test_pool_lc_ candidates remain`);
    } catch (e) {
      console.error('[cleanup] error:', e.message);
    }
  });

  // ── 1. Expired licence → paused ──────────────────────────────────────────────

  test('1. Active member + expired licence → paused; audit logged', async () => {
    const licId = await insertLicence({ expiryDate: dateOffset(-1) }); // yesterday

    const result = await runLicenceCheck();
    // >= 1: other specs may have active members with no licences running in parallel.
    expect(result.paused).toBeGreaterThanOrEqual(1);

    const member = await fetchMember();
    expect(member.status).toBe('paused');
    expect(member.paused_reason).toBe('licence_expired');
    expect(member.paused_at).not.toBeNull();
    expect(member.nearest_licence_expiry).toBeNull();

    // Audit log should have a 'system:licence_check' UPDATE entry for our member.
    const { data: logs, error: logErr } = await sb
      .from('audit_log')
      .select('performed_by, changes')
      .eq('table_name', 'talent_pool_members')
      .eq('record_id', testMemberId)
      .eq('performed_by', 'system:licence_check')
      .order('performed_at', { ascending: false })
      .limit(1);
    expect(logErr, `audit_log query error: ${logErr?.message}`).toBeNull();
    expect(logs.length).toBe(1);
    expect(logs[0].changes).toMatchObject({ status: 'paused', paused_reason: 'licence_expired' });

    await deleteLicence(licId);
  });

  // ── 2. Idempotency: run twice on paused member → paused_at unchanged ─────────

  test('2. Idempotent: running job twice on paused member → paused_at unchanged', async () => {
    const licId = await insertLicence({ expiryDate: dateOffset(-1) });

    await runLicenceCheck(); // first run → pauses
    const after1 = await fetchMember();
    expect(after1.status).toBe('paused');
    const pausedAt1 = after1.paused_at;

    await deleteLicence(licId);
    await runLicenceCheck(); // second run → no-op (already paused, no licence)
    const after2 = await fetchMember();
    expect(after2.status).toBe('paused');
    expect(after2.paused_at).toBe(pausedAt1); // paused_at not overwritten
  });

  // ── 3. No licences at all → paused ───────────────────────────────────────────

  test('3. Active member with no sia_licences at all → paused', async () => {
    // No licence inserted.
    const result = await runLicenceCheck();
    expect(result.paused).toBeGreaterThanOrEqual(1);

    const member = await fetchMember();
    expect(member.status).toBe('paused');
    expect(member.paused_reason).toBe('licence_expired');
  });

  // ── 4. Renewed licence → unpaused ────────────────────────────────────────────

  test('4. Paused-by-expiry member + valid licence → unpaused; audit logged', async () => {
    // Set member to paused state.
    await sb.from('talent_pool_members').update({
      status:        'paused',
      paused_reason: 'licence_expired',
      paused_at:     new Date().toISOString(),
    }).eq('id', testMemberId);

    const licId = await insertLicence({ expiryDate: dateOffset(365) }); // 1 year
    const result = await runLicenceCheck();
    expect(result.unpaused).toBeGreaterThanOrEqual(1);

    const member = await fetchMember();
    expect(member.status).toBe('active');
    expect(member.paused_reason).toBeNull();
    expect(member.paused_at).toBeNull();
    expect(member.nearest_licence_expiry).toBe(dateOffset(365));

    // Audit log for unpause.
    const { data: logs, error: logErr } = await sb
      .from('audit_log')
      .select('changes')
      .eq('table_name', 'talent_pool_members')
      .eq('record_id', testMemberId)
      .eq('performed_by', 'system:licence_check')
      .order('performed_at', { ascending: false })
      .limit(1);
    expect(logErr, `audit_log query error: ${logErr?.message}`).toBeNull();
    expect(logs.length).toBe(1);
    expect(logs[0].changes).toMatchObject({ status: 'active', paused_reason: null });

    await deleteLicence(licId);
  });

  // ── 5. Licence expiring in 30 days → nearest_licence_expiry set ──────────────

  test('5. Active member + licence expiring in 30 days → status active, nearest_licence_expiry set', async () => {
    const expiry = dateOffset(30);
    const licId  = await insertLicence({ expiryDate: expiry });

    const result = await runLicenceCheck();
    expect(result.paused).toBe(0);
    expect(result.flagged).toBeGreaterThanOrEqual(1);

    const member = await fetchMember();
    expect(member.status).toBe('active');
    expect(member.nearest_licence_expiry).toBe(expiry);

    await deleteLicence(licId);
  });

  // ── 6. Licence expiring in 90 days → nearest_licence_expiry set ──────────────

  test('6. Active member + licence expiring in 90 days → status active, nearest_licence_expiry set', async () => {
    const expiry = dateOffset(90);
    const licId  = await insertLicence({ expiryDate: expiry });

    await runLicenceCheck();

    const member = await fetchMember();
    expect(member.status).toBe('active');
    expect(member.nearest_licence_expiry).toBe(expiry);

    await deleteLicence(licId);
  });

  // ── 7. do_not_use member → not touched ───────────────────────────────────────

  test('7. do_not_use member with expired licence → not touched by job', async () => {
    await sb.from('talent_pool_members')
      .update({ status: 'do_not_use', paused_reason: null })
      .eq('id', testMemberId);

    const licId = await insertLicence({ expiryDate: dateOffset(-1) });
    await runLicenceCheck();

    const { data: member } = await sb
      .from('talent_pool_members')
      .select('status')
      .eq('id', testMemberId)
      .single();
    expect(member.status).toBe('do_not_use'); // unchanged

    await deleteLicence(licId);
    // Reset is handled by beforeEach for the next test.
  });

  // ── 8. left member → not touched ─────────────────────────────────────────────

  test('8. left member with expired licence → not touched by job', async () => {
    await sb.from('talent_pool_members')
      .update({ status: 'left', paused_reason: null })
      .eq('id', testMemberId);

    const licId = await insertLicence({ expiryDate: dateOffset(-1) });
    await runLicenceCheck();

    const { data: member } = await sb
      .from('talent_pool_members')
      .select('status')
      .eq('id', testMemberId)
      .single();
    expect(member.status).toBe('left'); // unchanged

    await deleteLicence(licId);
  });

  // ── 9. Manual pause → not cleared by job ─────────────────────────────────────

  test('9. Manually paused member (paused_reason != licence_expired) + valid licence → not unpaused', async () => {
    await sb.from('talent_pool_members').update({
      status:        'paused',
      paused_reason: 'employer_request', // not 'licence_expired'
      paused_at:     new Date().toISOString(),
    }).eq('id', testMemberId);

    const licId = await insertLicence({ expiryDate: dateOffset(365) });
    await runLicenceCheck();

    const { data: member } = await sb
      .from('talent_pool_members')
      .select('status, paused_reason')
      .eq('id', testMemberId)
      .single();
    expect(member.status).toBe('paused');         // unchanged
    expect(member.paused_reason).toBe('employer_request'); // unchanged

    await deleteLicence(licId);
  });

  // ── 10. Callout guard: paused member excluded by active-only filter ───────────

  test('10. Callout guard: paused member is absent from .eq(status, active) query', async () => {
    // Pause the member (simulates what the job does).
    await sb.from('talent_pool_members').update({
      status: 'paused', paused_reason: 'licence_expired',
    }).eq('id', testMemberId);

    // This mirrors the exact filter POST /callouts uses to validate candidate_ids.
    const { data: activeRows } = await sb
      .from('talent_pool_members')
      .select('id')
      .eq('employer_id', riskSecuredId)
      .eq('status', 'active')
      .eq('candidate_id', testCandidateId);

    expect((activeRows || []).length).toBe(0); // paused member not included
  });

  // ── 11. Idempotency for expiry flag: nearest_licence_expiry same on re-run ───

  test('11. Idempotent: running job twice on active member → nearest_licence_expiry unchanged', async () => {
    const expiry = dateOffset(45);
    const licId  = await insertLicence({ expiryDate: expiry });

    await runLicenceCheck();
    const after1 = await fetchMember();
    expect(after1.nearest_licence_expiry).toBe(expiry);

    await runLicenceCheck(); // second run
    const after2 = await fetchMember();
    expect(after2.nearest_licence_expiry).toBe(expiry); // same value, still active
    expect(after2.status).toBe('active');

    await deleteLicence(licId);
  });

});
