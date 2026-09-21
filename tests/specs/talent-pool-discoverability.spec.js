/**
 * Talent pool — discoverability integration tests
 *
 * These tests hit the live Supabase database directly using the service key.
 * They do NOT test the HTTP API layer (no Clerk tokens available in this
 * environment). They verify:
 *   - DB trigger behaviour (guard against profile_complete=false)
 *   - opt-in / opt-out / re-opt-in cycle
 *   - mode switching
 *   - replace_candidate_visibility_rules RPC (round-trip + validation)
 *   - RLS: anon client returns 0 rows for candidate_employer_visibility
 *   - Public HTTP endpoint shape (/api/pool/employers/public)
 *
 * Env vars required (loaded from api/.env if present):
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY
 *
 * Cleanup: afterAll deletes the test candidate and verifies row count = 0.
 * clerk_user_id starts with 'test_pool_' so records are easily identified
 * if a test run is interrupted.
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

// Load env from api/.env when running locally (graceful: no-op if dotenv unavailable)
try {
  require(path.join(__dirname, '../../api/node_modules/dotenv')).config({
    path: path.join(__dirname, '../../api/.env'),
  });
} catch (_) { /* env vars expected from shell or CI */ }

const { createClient } = require(path.join(__dirname, '../../api/node_modules/@supabase/supabase-js'));

// Never point at production. Set TEST_API_URL=http://localhost:3001 (or whatever
// port the local API is on) before running these tests.
const API = process.env.TEST_API_URL || 'http://localhost:3001';

// Clients are initialised in beforeAll so a missing .env produces a clear
// error message rather than crashing at module-load time.
let sb;
let anonSb;

const TEST_CLERK_ID = `test_pool_${Date.now()}`;
let testCandidateId;

test.describe('Talent pool — discoverability', () => {

  test.beforeAll(async () => {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY || !process.env.SUPABASE_ANON_KEY) {
      throw new Error(
        'Missing env vars. Create api/.env with SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY. ' +
        'See api/.env.example for key names.'
      );
    }
    sb     = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    anonSb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

    const { data, error } = await sb
      .from('candidates')
      .insert({
        clerk_user_id: TEST_CLERK_ID,
        email:         `${TEST_CLERK_ID}@test.invalid`,
        gdpr_consent:  true,
        profile_complete: false,
        discoverable:  false,
      })
      .select('id')
      .single();

    if (error) throw new Error(`beforeAll: failed to create test candidate — ${error.message}`);
    testCandidateId = data.id;
  });

  test.afterAll(async () => {
    if (!testCandidateId) return;
    // Remove any leftover visibility rules first (FK cascade handles this, but
    // being explicit makes failures clearer).
    await sb.from('candidate_employer_visibility').delete().eq('candidate_id', testCandidateId);
    await sb.from('candidates').delete().eq('id', testCandidateId);

    const { count } = await sb
      .from('candidates')
      .select('id', { count: 'exact', head: true })
      .eq('id', testCandidateId);

    if (count !== 0) {
      console.error(`[cleanup] WARN: test candidate ${testCandidateId} was not deleted (count=${count})`);
    }
  });

  test('1. guard trigger blocks discoverable=true when profile_complete=false', async () => {
    const { error } = await sb
      .from('candidates')
      .update({ discoverable: true })
      .eq('id', testCandidateId);

    expect(error).not.toBeNull();
    expect(error.message).toContain('profile_complete is not true');
  });

  test('2. guard trigger allows discoverable=false regardless of profile_complete', async () => {
    // Should never throw — turning off is always allowed
    const { error } = await sb
      .from('candidates')
      .update({ discoverable: false })
      .eq('id', testCandidateId);

    expect(error).toBeNull();
  });

  test('3. opt-in succeeds after profile_complete=true', async () => {
    await sb.from('candidates').update({ profile_complete: true }).eq('id', testCandidateId);

    const { error } = await sb
      .from('candidates')
      .update({ discoverable: true, discoverable_at: new Date().toISOString() })
      .eq('id', testCandidateId);

    expect(error).toBeNull();

    const { data } = await sb.from('candidates').select('discoverable').eq('id', testCandidateId).single();
    expect(data.discoverable).toBe(true);
  });

  test('4. opt-out succeeds (profile_complete=true, discoverable was true)', async () => {
    const { error } = await sb
      .from('candidates')
      .update({ discoverable: false })
      .eq('id', testCandidateId);

    expect(error).toBeNull();

    const { data } = await sb.from('candidates').select('discoverable').eq('id', testCandidateId).single();
    expect(data.discoverable).toBe(false);
  });

  test('5. toggle back on succeeds (profile_complete still true)', async () => {
    const { error } = await sb
      .from('candidates')
      .update({ discoverable: true })
      .eq('id', testCandidateId);

    expect(error).toBeNull();
  });

  test('6. mode switch: all → selected', async () => {
    const { error } = await sb
      .from('candidates')
      .update({ discoverable_mode: 'selected' })
      .eq('id', testCandidateId);

    expect(error).toBeNull();

    const { data } = await sb.from('candidates').select('discoverable_mode').eq('id', testCandidateId).single();
    expect(data.discoverable_mode).toBe('selected');
  });

  test('7. visibility rules RPC — allow round-trip', async () => {
    const { data: employers } = await sb
      .from('employers')
      .select('id')
      .eq('talent_pool_enabled', true)
      .limit(1);

    if (!employers || employers.length === 0) {
      console.log('[skip] No talent_pool_enabled employers — skipping visibility rules round-trip');
      return;
    }

    const empId = employers[0].id;

    // Insert allow rule
    const { error: rpcErr } = await sb.rpc('replace_candidate_visibility_rules', {
      p_candidate_id: testCandidateId,
      p_rules:        [{ employer_id: empId, rule: 'allow' }],
    });
    expect(rpcErr).toBeNull();

    const { data: rules } = await sb
      .from('candidate_employer_visibility')
      .select('employer_id, rule')
      .eq('candidate_id', testCandidateId);

    expect(rules).toHaveLength(1);
    expect(rules[0].employer_id).toBe(empId);
    expect(rules[0].rule).toBe('allow');

    // Clear rules via empty array
    const { error: clearErr } = await sb.rpc('replace_candidate_visibility_rules', {
      p_candidate_id: testCandidateId,
      p_rules:        [],
    });
    expect(clearErr).toBeNull();

    const { data: cleared } = await sb
      .from('candidate_employer_visibility')
      .select('id')
      .eq('candidate_id', testCandidateId);

    expect((cleared || []).length).toBe(0);
  });

  test('8. RPC rejects non-talent-pool employer_id', async () => {
    const { error } = await sb.rpc('replace_candidate_visibility_rules', {
      p_candidate_id: testCandidateId,
      p_rules:        [{ employer_id: '00000000-0000-0000-0000-000000000000', rule: 'allow' }],
    });

    expect(error).not.toBeNull();
    expect(error.message).toContain('not a talent pool employer');
  });

  test('9. RLS: anon client cannot read candidate_employer_visibility', async () => {
    // Seed one row as service key so there is something to (not) see.
    const { data: employers } = await sb
      .from('employers')
      .select('id')
      .eq('talent_pool_enabled', true)
      .limit(1);

    if (employers && employers.length > 0) {
      await sb.from('candidate_employer_visibility')
        .upsert({ candidate_id: testCandidateId, employer_id: employers[0].id, rule: 'block' },
                 { onConflict: 'candidate_id,employer_id' });
    }

    const { data: rows } = await anonSb
      .from('candidate_employer_visibility')
      .select('id')
      .eq('candidate_id', testCandidateId);

    expect((rows || []).length).toBe(0);

    // Cleanup
    await sb.from('candidate_employer_visibility').delete().eq('candidate_id', testCandidateId);
  });

  test('10. GET /api/pool/employers/public — shape check', async ({ request }) => {
    const res = await request.get(`${API}/api/pool/employers/public`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);

    if (body.length > 0) {
      expect(typeof body[0].id).toBe('string');
      expect(typeof body[0].company_name).toBe('string');
      // Sorted a-z by company_name
      for (let i = 1; i < body.length; i++) {
        expect(body[i - 1].company_name.toLowerCase() <= body[i].company_name.toLowerCase()).toBe(true);
      }
    }
  });

});
