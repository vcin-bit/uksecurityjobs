/**
 * Talent pool — invites integration tests
 *
 * These tests hit the live Supabase database directly using the service key.
 * They do NOT test the HTTP API layer (no Clerk tokens available in this
 * environment). They verify:
 *   - sendPoolInvite returns false with blank SENDGRID_API_KEY (no throw)
 *   - Partial unique index blocks duplicate open invite
 *   - New invite allowed after previous invite was declined
 *   - Accept: correct fields written (status, responded_at, consent_at, consent_wording_version)
 *   - Decline: correct fields written (status, responded_at)
 *   - Re-invite blocked when accepted invite exists (partial unique index)
 *   - RLS: anon client returns 0 rows for talent_pool_invites
 *
 * Env vars required (loaded from api/.env if present):
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY
 *
 * Cleanup: afterAll deletes the test candidate and all related invites.
 * clerk_user_id starts with 'test_pool_' so records are easily identified
 * if a test run is interrupted.
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
const { sendPoolInvite } = require(path.join(__dirname, '../../api/src/lib/email'));

const TEST_CLERK_ID = `test_pool_${Date.now()}`;
let sb;
let anonSb;
let testCandidateId;
let riskSecuredId;

test.describe('Talent pool — invites', () => {

  test.beforeAll(async () => {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY || !process.env.SUPABASE_ANON_KEY) {
      throw new Error(
        'Missing env vars. Create api/.env with SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY. ' +
        'See api/.env.example for key names.'
      );
    }
    sb     = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    anonSb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

    // Create a complete test candidate (profile_complete=true, discoverable=true).
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

    if (error) throw new Error(`beforeAll: failed to create test candidate — ${error.message}`);
    testCandidateId = data.id;

    // Get Risk Secured Ltd employer id — required for FK in talent_pool_invites.
    const { data: emp, error: eErr } = await sb
      .from('employers')
      .select('id')
      .eq('company_name', 'Risk Secured Ltd')
      .eq('talent_pool_enabled', true)
      .single();
    if (eErr || !emp) throw new Error('Risk Secured Ltd not found or talent_pool_enabled=false. Apply 0020 migration first.');
    riskSecuredId = emp.id;
  });

  test.afterAll(async () => {
    if (!testCandidateId) return;
    await sb.from('talent_pool_invites').delete().eq('candidate_id', testCandidateId);
    await sb.from('candidates').delete().eq('id', testCandidateId);

    const { count } = await sb
      .from('candidates')
      .select('id', { count: 'exact', head: true })
      .eq('id', testCandidateId);

    if (count !== 0) {
      console.error(`[cleanup] WARN: test candidate ${testCandidateId} was not deleted (count=${count})`);
    }
  });

  test('1. sendPoolInvite returns false with blank SENDGRID_API_KEY (no throw)', async () => {
    const orig = process.env.SENDGRID_API_KEY;
    delete process.env.SENDGRID_API_KEY;

    const result = await sendPoolInvite({
      toEmail:            `${TEST_CLERK_ID}@test.invalid`,
      candidateFirstName: 'Test',
      employerName:       'Risk Secured Ltd',
      token:              crypto.randomBytes(16).toString('hex'),
    });

    expect(result).toBe(false);

    // Restore original value (may be undefined — that is fine).
    if (orig !== undefined) process.env.SENDGRID_API_KEY = orig;
  });

  test('2. partial unique index blocks duplicate open invite (status=invited)', async () => {
    const token1 = crypto.randomBytes(32).toString('hex');
    const { error: e1 } = await sb.from('talent_pool_invites').insert({
      employer_id:   riskSecuredId,
      candidate_id:  testCandidateId,
      token:         token1,
      token_expires: new Date(Date.now() + 86400000).toISOString(),
      status:        'invited',
    });
    expect(e1).toBeNull();

    const token2 = crypto.randomBytes(32).toString('hex');
    const { error: e2 } = await sb.from('talent_pool_invites').insert({
      employer_id:   riskSecuredId,
      candidate_id:  testCandidateId,
      token:         token2,
      token_expires: new Date(Date.now() + 86400000).toISOString(),
      status:        'invited',
    });
    expect(e2).not.toBeNull();

    // Clean up so later tests start with a clean slate.
    await sb.from('talent_pool_invites').delete().eq('token', token1);
  });

  test('3. new invite allowed after previous invite was declined', async () => {
    // Insert a declined invite — this must NOT be blocked by the partial unique index
    // (index only covers invited / accepted / call_booked).
    const token1 = crypto.randomBytes(32).toString('hex');
    const { error: e1 } = await sb.from('talent_pool_invites').insert({
      employer_id:   riskSecuredId,
      candidate_id:  testCandidateId,
      token:         token1,
      token_expires: new Date(Date.now() + 86400000).toISOString(),
      status:        'declined',
    });
    expect(e1).toBeNull();

    const token2 = crypto.randomBytes(32).toString('hex');
    const { error: e2 } = await sb.from('talent_pool_invites').insert({
      employer_id:   riskSecuredId,
      candidate_id:  testCandidateId,
      token:         token2,
      token_expires: new Date(Date.now() + 86400000).toISOString(),
      status:        'invited',
    });
    expect(e2).toBeNull();

    await sb.from('talent_pool_invites').delete().eq('token', token1);
    await sb.from('talent_pool_invites').delete().eq('token', token2);
  });

  test('4. accept writes status, responded_at, consent_at, consent_wording_version', async () => {
    const token = crypto.randomBytes(32).toString('hex');
    const { data: inv } = await sb.from('talent_pool_invites').insert({
      employer_id:   riskSecuredId,
      candidate_id:  testCandidateId,
      token,
      token_expires: new Date(Date.now() + 86400000).toISOString(),
      status:        'invited',
    }).select('id').single();

    const now = new Date().toISOString();
    const { error: uErr } = await sb.from('talent_pool_invites').update({
      status:                  'accepted',
      responded_at:            now,
      consent_at:              now,
      consent_wording_version: 'v1-invite-2026-09',
    }).eq('id', inv.id);
    expect(uErr).toBeNull();

    const { data: row } = await sb
      .from('talent_pool_invites')
      .select('status, responded_at, consent_at, consent_wording_version')
      .eq('id', inv.id)
      .single();

    expect(row.status).toBe('accepted');
    expect(row.responded_at).not.toBeNull();
    expect(row.consent_at).not.toBeNull();
    expect(row.consent_wording_version).toBe('v1-invite-2026-09');

    await sb.from('talent_pool_invites').delete().eq('id', inv.id);
  });

  test('5. decline writes status and responded_at', async () => {
    const token = crypto.randomBytes(32).toString('hex');
    const { data: inv } = await sb.from('talent_pool_invites').insert({
      employer_id:   riskSecuredId,
      candidate_id:  testCandidateId,
      token,
      token_expires: new Date(Date.now() + 86400000).toISOString(),
      status:        'invited',
    }).select('id').single();

    const { error: uErr } = await sb.from('talent_pool_invites').update({
      status:       'declined',
      responded_at: new Date().toISOString(),
    }).eq('id', inv.id);
    expect(uErr).toBeNull();

    const { data: row } = await sb
      .from('talent_pool_invites')
      .select('status, responded_at')
      .eq('id', inv.id)
      .single();

    expect(row.status).toBe('declined');
    expect(row.responded_at).not.toBeNull();

    await sb.from('talent_pool_invites').delete().eq('id', inv.id);
  });

  test('6. partial unique index blocks new invite when accepted invite exists', async () => {
    const token1 = crypto.randomBytes(32).toString('hex');
    const { error: e1 } = await sb.from('talent_pool_invites').insert({
      employer_id:   riskSecuredId,
      candidate_id:  testCandidateId,
      token:         token1,
      token_expires: new Date(Date.now() + 86400000).toISOString(),
      status:        'accepted',
    });
    expect(e1).toBeNull();

    // A new 'invited' row while an 'accepted' row exists must be blocked.
    const token2 = crypto.randomBytes(32).toString('hex');
    const { error: e2 } = await sb.from('talent_pool_invites').insert({
      employer_id:   riskSecuredId,
      candidate_id:  testCandidateId,
      token:         token2,
      token_expires: new Date(Date.now() + 86400000).toISOString(),
      status:        'invited',
    });
    expect(e2).not.toBeNull();

    await sb.from('talent_pool_invites').delete().eq('token', token1);
  });

  test('7. RLS: anon client cannot read talent_pool_invites', async () => {
    const token = crypto.randomBytes(32).toString('hex');
    const { data: inv } = await sb.from('talent_pool_invites').insert({
      employer_id:   riskSecuredId,
      candidate_id:  testCandidateId,
      token,
      token_expires: new Date(Date.now() + 86400000).toISOString(),
      status:        'invited',
    }).select('id').single();

    const { data: rows } = await anonSb
      .from('talent_pool_invites')
      .select('id')
      .eq('id', inv.id);

    expect((rows || []).length).toBe(0);

    await sb.from('talent_pool_invites').delete().eq('id', inv.id);
  });

});
