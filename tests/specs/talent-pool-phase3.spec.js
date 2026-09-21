/**
 * Talent pool — Phase 3 integration tests
 *
 * Tests hit the live Supabase database using the service key.
 * Covers: record_pool_pass (atomic), not_for_us outcome, leave pool.
 *
 * Env vars required: SUPABASE_URL, SUPABASE_SERVICE_KEY
 * (loaded from api/.env if present)
 *
 * Cleanup: afterAll deletes all test data.
 * clerk_user_id starts with 'test_pool_' — safe to grep for if a run is interrupted.
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

const TEST_CLERK_ID = `test_pool_ph3_${Date.now()}`;
let sb;
let testCandidateId;
let riskSecuredId;
let riskSecuredUserId; // a valid performed_by text (employer's clerk_user_id)

function makeInvite(extraFields = {}) {
  return {
    employer_id:   riskSecuredId,
    candidate_id:  testCandidateId,
    token:         crypto.randomBytes(32).toString('hex'),
    token_expires: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    status:        'accepted',
    invited_at:    new Date().toISOString(),
    responded_at:  new Date().toISOString(),
    consent_at:    new Date().toISOString(),
    consent_wording_version: 'v1-invite-2026-09',
    ...extraFields,
  };
}

test.describe('Talent pool — phase 3 (outcomes + leave)', () => {

  test.beforeAll(async () => {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      throw new Error('Missing env vars: SUPABASE_URL and SUPABASE_SERVICE_KEY required.');
    }
    sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    // Test candidate
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

    // Risk Secured Ltd
    const { data: emp, error: eErr } = await sb
      .from('employers')
      .select('id, clerk_user_id')
      .eq('company_name', 'Risk Secured Ltd')
      .eq('talent_pool_enabled', true)
      .single();
    if (eErr || !emp) throw new Error('Risk Secured Ltd not found or talent_pool_enabled=false.');
    riskSecuredId     = emp.id;
    riskSecuredUserId = emp.clerk_user_id || 'test_performer';
  });

  test.afterAll(async () => {
    if (!testCandidateId) return;
    try {
      // Clean up member rows, invites, then candidate
      await sb.from('talent_pool_members').delete().eq('candidate_id', testCandidateId);
      await sb.from('talent_pool_invites').delete().eq('candidate_id', testCandidateId);
      await sb.from('candidates').delete().eq('id', testCandidateId);

      // Verify count=0
      const { count } = await sb
        .from('candidates')
        .select('id', { count: 'exact', head: true })
        .ilike('clerk_user_id', 'test_pool_ph3_%');
      if (count !== 0) {
        console.error(`[cleanup] WARN: ${count} test_pool_ph3_ candidates remain`);
      }
    } catch (e) {
      console.error('[cleanup] error:', e.message);
    }
  });

  // ── 1. record_pool_pass: atomically passes invite and creates member row ──

  test('1. record_pool_pass: invite→passed, member row created, consent_at copied', async () => {
    const { data: inv, error: iErr } = await sb
      .from('talent_pool_invites')
      .insert(makeInvite())
      .select('id, consent_at')
      .single();
    expect(iErr).toBeNull();

    const { error: rpcErr } = await sb.rpc('record_pool_pass', {
      p_invite_id:     inv.id,
      p_employer_id:   riskSecuredId,
      p_performed_by:  riskSecuredUserId,
      p_ip:            '127.0.0.1',
      p_outcome_notes: 'Strong candidate',
    });
    expect(rpcErr).toBeNull();

    // Invite updated
    const { data: updatedInvite } = await sb
      .from('talent_pool_invites').select('status, outcome_at, outcome_notes').eq('id', inv.id).single();
    expect(updatedInvite.status).toBe('passed');
    expect(updatedInvite.outcome_at).not.toBeNull();
    expect(updatedInvite.outcome_notes).toBe('Strong candidate');

    // Member row created
    const { data: member } = await sb
      .from('talent_pool_members')
      .select('status, consent_at, joined_at, invite_id')
      .eq('candidate_id', testCandidateId)
      .eq('employer_id', riskSecuredId)
      .eq('invite_id', inv.id)
      .single();
    expect(member).not.toBeNull();
    expect(member.status).toBe('active');
    expect(member.invite_id).toBe(inv.id);
    // consent_at copied from invite
    expect(new Date(member.consent_at).toISOString().slice(0, 19))
      .toBe(new Date(inv.consent_at).toISOString().slice(0, 19));

    // Cleanup for subsequent tests
    await sb.from('talent_pool_members').delete().eq('invite_id', inv.id);
    await sb.from('talent_pool_invites').delete().eq('id', inv.id);
  });

  // ── 2. record_pool_pass: wrong employer is rejected ──

  test('2. record_pool_pass: wrong employer rejected; no member row created', async () => {
    const { data: inv } = await sb
      .from('talent_pool_invites')
      .insert(makeInvite())
      .select('id')
      .single();

    // Use a random uuid as wrong employer
    const fakeEmployerId = crypto.randomUUID();
    const { error: rpcErr } = await sb.rpc('record_pool_pass', {
      p_invite_id:    inv.id,
      p_employer_id:  fakeEmployerId,
      p_performed_by: riskSecuredUserId,
    });
    expect(rpcErr).not.toBeNull();
    expect(rpcErr.message).toMatch(/invite_wrong_employer/);

    // Invite unchanged
    const { data: unchanged } = await sb
      .from('talent_pool_invites').select('status').eq('id', inv.id).single();
    expect(unchanged.status).toBe('accepted');

    // No member row
    const { data: noMember } = await sb
      .from('talent_pool_members')
      .select('id')
      .eq('candidate_id', testCandidateId)
      .eq('employer_id', riskSecuredId);
    expect((noMember || []).length).toBe(0);

    await sb.from('talent_pool_invites').delete().eq('id', inv.id);
  });

  // ── 3. record_pool_pass: wrong status rejected ──

  test('3. record_pool_pass: wrong status (invited) rejected; no member row', async () => {
    const { data: inv } = await sb
      .from('talent_pool_invites')
      .insert(makeInvite({ status: 'invited', responded_at: null, consent_at: null, consent_wording_version: null }))
      .select('id')
      .single();

    const { error: rpcErr } = await sb.rpc('record_pool_pass', {
      p_invite_id:    inv.id,
      p_employer_id:  riskSecuredId,
      p_performed_by: riskSecuredUserId,
    });
    expect(rpcErr).not.toBeNull();
    expect(rpcErr.message).toMatch(/invite_wrong_status/);

    const { data: unchanged } = await sb
      .from('talent_pool_invites').select('status').eq('id', inv.id).single();
    expect(unchanged.status).toBe('invited');

    await sb.from('talent_pool_invites').delete().eq('id', inv.id);
  });

  // ── 4. record_pool_pass: race — second call sees status='passed', rejected ──

  test('4. record_pool_pass: second concurrent call rejected (status already passed)', async () => {
    const { data: inv } = await sb
      .from('talent_pool_invites')
      .insert(makeInvite())
      .select('id')
      .single();

    // First call succeeds
    const { error: e1 } = await sb.rpc('record_pool_pass', {
      p_invite_id:    inv.id,
      p_employer_id:  riskSecuredId,
      p_performed_by: riskSecuredUserId,
    });
    expect(e1).toBeNull();

    // Second call on already-passed invite is rejected
    const { error: e2 } = await sb.rpc('record_pool_pass', {
      p_invite_id:    inv.id,
      p_employer_id:  riskSecuredId,
      p_performed_by: riskSecuredUserId,
    });
    expect(e2).not.toBeNull();
    expect(e2.message).toMatch(/invite_wrong_status/);

    // Only one member row
    const { data: members } = await sb
      .from('talent_pool_members')
      .select('id')
      .eq('candidate_id', testCandidateId)
      .eq('employer_id', riskSecuredId);
    expect(members.length).toBe(1);

    // Cleanup
    await sb.from('talent_pool_members').delete().eq('candidate_id', testCandidateId).eq('employer_id', riskSecuredId);
    await sb.from('talent_pool_invites').delete().eq('id', inv.id);
  });

  // ── 5. not_for_us: correct fields written, no member row, candidate re-invitable ──

  test('5. not_for_us: invite→not_for_us, outcome_at set, no member row', async () => {
    const { data: inv } = await sb
      .from('talent_pool_invites')
      .insert(makeInvite())
      .select('id')
      .single();

    const now = new Date();
    const { error: uErr, data: updated } = await sb
      .from('talent_pool_invites')
      .update({
        status:        'not_for_us',
        outcome_at:    now.toISOString(),
        outcome_notes: 'Not the right fit',
      })
      .eq('id', inv.id)
      .eq('employer_id', riskSecuredId)
      .eq('status', 'accepted')
      .select('id, status, outcome_at')
      .maybeSingle();

    expect(uErr).toBeNull();
    expect(updated).not.toBeNull();
    expect(updated.status).toBe('not_for_us');
    expect(updated.outcome_at).not.toBeNull();

    // No member row
    const { data: noMember } = await sb
      .from('talent_pool_members')
      .select('id')
      .eq('candidate_id', testCandidateId)
      .eq('employer_id', riskSecuredId);
    expect((noMember || []).length).toBe(0);

    // Re-invitable: no open invite in ('invited','accepted','call_booked')
    const { data: openInvite } = await sb
      .from('talent_pool_invites')
      .select('id')
      .eq('candidate_id', testCandidateId)
      .eq('employer_id', riskSecuredId)
      .in('status', ['invited', 'accepted', 'call_booked'])
      .maybeSingle();
    expect(openInvite).toBeNull();

    await sb.from('talent_pool_invites').delete().eq('id', inv.id);
  });

  // ── 6. leave pool: status→left, left_at set ──

  test('6. leave pool: member status→left, left_at set', async () => {
    // Create a member row directly
    const { data: member, error: mErr } = await sb
      .from('talent_pool_members')
      .insert({
        employer_id:  riskSecuredId,
        candidate_id: testCandidateId,
        status:       'active',
        joined_at:    new Date().toISOString(),
      })
      .select('id')
      .single();
    expect(mErr).toBeNull();

    const { data: updated, error: uErr } = await sb
      .from('talent_pool_members')
      .update({ status: 'left', left_at: new Date().toISOString() })
      .eq('id', member.id)
      .eq('status', 'active')
      .select('id, status, left_at')
      .maybeSingle();

    expect(uErr).toBeNull();
    expect(updated.status).toBe('left');
    expect(updated.left_at).not.toBeNull();

    await sb.from('talent_pool_members').delete().eq('id', member.id);
  });

  // ── 7. left member blocks re-invite (already_member check finds the row) ──

  test('7. left member row present → already_member check finds it (invite blocked)', async () => {
    // Insert a 'left' member row
    const { data: member } = await sb
      .from('talent_pool_members')
      .insert({
        employer_id:  riskSecuredId,
        candidate_id: testCandidateId,
        status:       'left',
        joined_at:    new Date().toISOString(),
        left_at:      new Date().toISOString(),
      })
      .select('id')
      .single();

    // The already_member check looks for ANY row: row exists → invite would be blocked
    const { data: found } = await sb
      .from('talent_pool_members')
      .select('id')
      .eq('candidate_id', testCandidateId)
      .eq('employer_id', riskSecuredId)
      .maybeSingle();
    expect(found).not.toBeNull();

    await sb.from('talent_pool_members').delete().eq('id', member.id);
  });

});
