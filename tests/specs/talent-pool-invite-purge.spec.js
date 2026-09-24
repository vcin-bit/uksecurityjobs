/**
 * Talent pool — invite purge integration tests
 *
 * Tests call runInvitePurge() directly (no HTTP needed).
 * A beforeEach resets test state; afterAll cleans up all rows created here.
 *
 * Test invite candidate clerk_user_id starts with 'test_purge_' — safe to grep.
 *
 * Env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY (loaded from api/.env if present)
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

try {
  require(path.join(__dirname, '../../api/node_modules/dotenv')).config({
    path: path.join(__dirname, '../../api/.env'),
  });
} catch (_) { /* env vars expected from shell or CI */ }

const { createClient } = require(path.join(__dirname, '../../api/node_modules/@supabase/supabase-js'));
const { runInvitePurge } = require(path.join(__dirname, '../../api/src/lib/poolLicenceCheck'));

const TEST_CLERK_ID = `test_purge_${Date.now()}`;

let sb;
let testCandidateId;
let riskSecuredId;
let createdInviteIds = [];
let createdMemberIds = [];

// Returns an ISO timestamp offset by `months` relative to today.
function monthsAgo(months) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString();
}

async function insertInvite({ status, outcomeAt = null, respondedAt = null }) {
  const { data, error } = await sb
    .from('talent_pool_invites')
    .insert({
      employer_id:             riskSecuredId,
      candidate_id:            testCandidateId,
      status,
      invited_at:              new Date().toISOString(),
      token:                   `test_purge_tok_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      token_expires:           new Date(Date.now() + 86400000).toISOString(),
      outcome_at:              outcomeAt,
      responded_at:            respondedAt,
      consent_wording_version: null,
    })
    .select('id')
    .single();
  if (error) throw new Error(`insertInvite: ${error.message}`);
  createdInviteIds.push(data.id);
  return data.id;
}

// Insert a talent_pool_members row referencing the invite (to test SET NULL FK).
async function insertMember(inviteId) {
  const { data, error } = await sb
    .from('talent_pool_members')
    .insert({
      employer_id:  riskSecuredId,
      candidate_id: testCandidateId,
      invite_id:    inviteId,
      status:       'active',
      joined_at:    new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error) throw new Error(`insertMember: ${error.message}`);
  createdMemberIds.push(data.id);
  return data.id;
}

test.describe('Talent pool — invite purge', () => {

  test.beforeAll(async () => {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      throw new Error('Missing env vars: SUPABASE_URL and SUPABASE_SERVICE_KEY required.');
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
  });

  // Clean slate before every test — avoids unique-index conflicts between tests.
  test.beforeEach(async () => {
    await sb.from('talent_pool_members').delete().eq('candidate_id', testCandidateId);
    await sb.from('talent_pool_invites').delete().eq('candidate_id', testCandidateId);
    createdInviteIds = [];
    createdMemberIds = [];
  });

  test.afterAll(async () => {
    if (!testCandidateId) return;
    try {
      // Members first (FK → invites); then invites; then candidate.
      if (createdMemberIds.length) {
        await sb.from('talent_pool_members').delete().in('id', createdMemberIds);
      }
      // Any invite rows that weren't purged by the job.
      await sb.from('talent_pool_invites').delete().eq('candidate_id', testCandidateId);
      await sb.from('candidates').delete().eq('id', testCandidateId);

      const { count } = await sb
        .from('candidates')
        .select('id', { count: 'exact', head: true })
        .ilike('clerk_user_id', 'test_purge_%');
      if (count !== 0) console.error(`[cleanup] WARN: ${count} test_purge_ candidates remain`);
    } catch (e) {
      console.error('[cleanup] error:', e.message);
    }
  });

  // ── 1. Eligible row is purged ─────────────────────────────────────────────

  test('1. declined invite with outcome_at >12 months ago → purged', async () => {
    const id = await insertInvite({
      status:    'declined',
      respondedAt: monthsAgo(13),
      outcomeAt:   monthsAgo(13),
    });

    const result = await runInvitePurge();
    expect(result.purged).toBeGreaterThanOrEqual(1);

    const { data } = await sb.from('talent_pool_invites').select('id').eq('id', id);
    expect((data || []).length).toBe(0); // row gone
  });

  // ── 2. 11-month-old row is left alone ────────────────────────────────────

  test('2. declined invite with outcome_at 11 months ago → NOT purged', async () => {
    const id = await insertInvite({
      status:      'declined',
      respondedAt: monthsAgo(11),
    });

    await runInvitePurge();

    const { data } = await sb.from('talent_pool_invites').select('id').eq('id', id);
    expect((data || []).length).toBe(1); // row still present
  });

  // ── 3. not_for_us + no_outcome_at falls back to responded_at ─────────────

  test('3. not_for_us with responded_at >12 months, outcome_at null → purged', async () => {
    const id = await insertInvite({
      status:      'not_for_us',
      respondedAt: monthsAgo(14),
      outcomeAt:   null,
    });

    const result = await runInvitePurge();
    expect(result.purged).toBeGreaterThanOrEqual(1);

    const { data } = await sb.from('talent_pool_invites').select('id').eq('id', id);
    expect((data || []).length).toBe(0);
  });

  // ── 4. 'invited' status → never touched ──────────────────────────────────

  test('4. invited status (even with old responded_at) → NOT purged', async () => {
    const id = await insertInvite({
      status:      'invited',
      respondedAt: monthsAgo(24),
    });

    await runInvitePurge();

    const { data } = await sb.from('talent_pool_invites').select('id').eq('id', id);
    expect((data || []).length).toBe(1);
  });

  // ── 5. 'accepted' / 'passed' status → never touched ──────────────────────

  test('5. accepted/passed invites → NOT purged regardless of age', async () => {
    const acceptedId = await insertInvite({ status: 'accepted', respondedAt: monthsAgo(24) });
    const passedId   = await insertInvite({ status: 'passed',   respondedAt: monthsAgo(24) });

    await runInvitePurge();

    const { data: aRows } = await sb.from('talent_pool_invites').select('id').eq('id', acceptedId);
    const { data: pRows } = await sb.from('talent_pool_invites').select('id').eq('id', passedId);
    expect((aRows || []).length).toBe(1);
    expect((pRows || []).length).toBe(1);
  });

  // ── 6. No outcome date → never touched ───────────────────────────────────

  test('6. declined invite with no outcome_at and no responded_at → NOT purged', async () => {
    const id = await insertInvite({
      status:      'declined',
      respondedAt: null,
      outcomeAt:   null,
    });

    await runInvitePurge();

    const { data } = await sb.from('talent_pool_invites').select('id').eq('id', id);
    expect((data || []).length).toBe(1);
  });

  // ── 7. Audit log written for purged row ──────────────────────────────────

  test('7. purged invite has audit_log DELETE entry', async () => {
    const id = await insertInvite({
      status:      'declined',
      respondedAt: monthsAgo(13),
      outcomeAt:   monthsAgo(13),
    });

    await runInvitePurge();

    const { data: logs, error: logErr } = await sb
      .from('audit_log')
      .select('performed_by, action, changes')
      .eq('table_name', 'talent_pool_invites')
      .eq('record_id', id)
      .eq('performed_by', 'system:invite_purge')
      .order('performed_at', { ascending: false })
      .limit(1);
    expect(logErr, `audit_log query error: ${logErr?.message}`).toBeNull();
    expect(logs.length).toBe(1);
    expect(logs[0].action).toBe('DELETE');
    expect(logs[0].changes).toMatchObject({ status: 'declined', purge_reason: 'stale_>12m' });
  });

  // ── 8. Membership row survives (SET NULL FK) ──────────────────────────────

  test('8. membership row with invite_id survives purge; invite_id set to null', async () => {
    const inviteId = await insertInvite({
      status:      'declined',
      respondedAt: monthsAgo(13),
      outcomeAt:   monthsAgo(13),
    });
    const memberId = await insertMember(inviteId);

    await runInvitePurge();

    // Invite gone.
    const { data: invRows } = await sb.from('talent_pool_invites').select('id').eq('id', inviteId);
    expect((invRows || []).length).toBe(0);

    // Member still present, invite_id nulled.
    const { data: mem } = await sb
      .from('talent_pool_members')
      .select('id, invite_id')
      .eq('id', memberId)
      .single();
    expect(mem).not.toBeNull();
    expect(mem.invite_id).toBeNull();
  });

});
