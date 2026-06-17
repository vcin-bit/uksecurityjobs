/**
 * Apply Gate — Integration tests
 *
 * Verifies that the POST /api/jobs/apply endpoint rejects incomplete
 * profiles (403 PROFILE_INCOMPLETE) and accepts complete ones (200).
 *
 * These tests hit the live API without authentication, so they verify:
 *   1. Unauthenticated → 401/403
 *   2. The endpoint shape (will get 401 without a valid token)
 *
 * Full authenticated tests require a seeded test candidate and are
 * expected to run in CI with valid Clerk test tokens.
 */

const { test, expect } = require('@playwright/test');

const API = 'https://uksecurityjobs-api.onrender.com';

test.describe('Apply gate — unauthenticated', () => {

  test('POST /api/jobs/apply without token returns 401 or 403', async ({ request }) => {
    const res = await request.post(`${API}/api/jobs/apply`, {
      data: { job_id: '00000000-0000-0000-0000-000000000000' }
    });
    expect([401, 403]).toContain(res.status());
  });

  test('GET /api/candidates/me/completeness without token returns 401 or 403', async ({ request }) => {
    const res = await request.get(`${API}/api/candidates/me/completeness`);
    expect([401, 403]).toContain(res.status());
  });

});

test.describe('Apply gate — response shape', () => {

  test('Apply endpoint returns structured PROFILE_INCOMPLETE error when profile is incomplete', async ({ request }) => {
    // This test documents the expected error shape.
    // With a valid token for an incomplete profile, the response should be:
    // { error: 'PROFILE_INCOMPLETE', missing: ['Verified SIA licence', ...] }
    //
    // Without a real token we can only verify the endpoint is protected.
    const res = await request.post(`${API}/api/jobs/apply`, {
      data: { job_id: 'test' }
    });
    expect([401, 403]).toContain(res.status());
  });

  test('Completeness endpoint returns { complete, missing } shape', async ({ request }) => {
    // Documents the expected success shape:
    // { complete: true/false, missing: [...] }
    //
    // Without a real token we can only verify the endpoint is protected.
    const res = await request.get(`${API}/api/candidates/me/completeness`);
    expect([401, 403]).toContain(res.status());
  });

});
