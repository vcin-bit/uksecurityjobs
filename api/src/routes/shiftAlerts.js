'use strict';
/**
 * api/src/routes/shiftAlerts.js
 *
 * Public (no auth) endpoints for the shift-alert email opt-in flow.
 * Supabase client: imported service client (same pattern as callout.js),
 * not req.supabase.
 *
 * GET  /api/shift-alerts/optin/:token
 *   Validates the token. Returns { ok, firstName, alreadyOptedIn } or error.
 *
 * POST /api/shift-alerts/optin/:token
 *   Marks token used_at, sets shift_alerts_opt_in=true on candidates,
 *   writes an audit_log entry. Idempotent: if already opted in returns
 *   { ok: true, alreadyOptedIn: true }.
 */

const express = require('express');
const router  = express.Router();
const { supabase, auditLog } = require('../lib/supabase');

const WORDING_VERSION = 'shift-alerts-v2';

// ── GET /api/shift-alerts/optin/:token ──────────────────────────────────────
router.get('/optin/:token', async (req, res) => {
  const { token } = req.params;

  const { data: row, error } = await supabase
    .from('shift_alert_opt_in_tokens')
    .select('id, candidate_id, expires_at, used_at')
    .eq('token', token)
    .maybeSingle();

  if (error || !row) {
    return res.status(404).json({ ok: false, error: 'invalid_token' });
  }

  if (new Date(row.expires_at) < new Date()) {
    return res.status(410).json({ ok: false, error: 'expired' });
  }

  const [{ data: candidate }, { data: personal }] = await Promise.all([
    supabase.from('candidates').select('shift_alerts_opt_in').eq('id', row.candidate_id).single(),
    supabase.from('personal_details').select('first_name').eq('candidate_id', row.candidate_id).maybeSingle(),
  ]);

  return res.json({
    ok:             true,
    firstName:      personal?.first_name || null,
    alreadyOptedIn: candidate?.shift_alerts_opt_in === true,
    usedAt:         row.used_at || null,
  });
});

// ── POST /api/shift-alerts/optin/:token ─────────────────────────────────────
router.post('/optin/:token', async (req, res) => {
  const { token } = req.params;

  const { data: row, error } = await supabase
    .from('shift_alert_opt_in_tokens')
    .select('id, candidate_id, expires_at, used_at')
    .eq('token', token)
    .maybeSingle();

  if (error || !row) {
    return res.status(404).json({ ok: false, error: 'invalid_token' });
  }

  if (new Date(row.expires_at) < new Date()) {
    return res.status(410).json({ ok: false, error: 'expired' });
  }

  const { data: candidate } = await supabase
    .from('candidates')
    .select('id, shift_alerts_opt_in')
    .eq('id', row.candidate_id)
    .single();

  if (!candidate) {
    return res.status(404).json({ ok: false, error: 'candidate_not_found' });
  }

  // Idempotent — already opted in is still a success.
  if (candidate.shift_alerts_opt_in) {
    return res.json({ ok: true, alreadyOptedIn: true });
  }

  // Mark token used (IS NULL guard prevents double-use in a race).
  await supabase
    .from('shift_alert_opt_in_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', row.id)
    .is('used_at', null);

  // Opt candidate in.
  const now = new Date().toISOString();
  const { error: updateErr } = await supabase
    .from('candidates')
    .update({
      shift_alerts_opt_in:          true,
      shift_alerts_opt_in_at:       now,
      shift_alerts_wording_version: WORDING_VERSION,
    })
    .eq('id', row.candidate_id);

  if (updateErr) {
    console.error('[shiftAlerts] candidates update failed:', updateErr.message);
    return res.status(500).json({ ok: false, error: 'db_error' });
  }

  // Audit log — source: 'email_link', no Clerk user (public endpoint).
  await auditLog({
    tableName:   'candidates',
    recordId:    row.candidate_id,
    action:      'UPDATE',
    performedBy: 'email_link',
    ipAddress:   req.ip,
    changes:     { event: 'shift_alerts_opted_in', source: 'email_link' },
  });

  return res.json({ ok: true, alreadyOptedIn: false });
});

module.exports = router;
