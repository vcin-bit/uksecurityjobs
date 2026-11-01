'use strict';
/**
 * api/src/routes/shiftResponse.js
 *
 * Public (no auth) guard-facing endpoints.
 * Validated by per-row token in shift_responses.
 *
 * GET  /api/shift-response/:token
 *   Returns shift overview + guard's current response.
 *   Never returns site address.
 *
 * POST /api/shift-response/:token
 *   { response: 'yes' | 'no' }
 *   Changeable while shift is open and no candidate chosen.
 *   410 if token expired; 409 if filled/cancelled/chosen.
 *
 * POST /api/shift-response/:token/stop-alerts
 *   Sets shift_alerts_opt_in = false on candidates row.
 *   Audit log with source 'shift_email'.
 */

const express = require('express');
const router  = express.Router();
const { supabase, auditLog } = require('../lib/supabase');

// ── GET /api/shift-response/:token ────────────────────────────────────────────
router.get('/:token', async (req, res) => {
  try {
    const { data: sr, error: rErr } = await supabase
      .from('shift_responses')
      .select('id, shift_id, candidate_id, token_expires, distance_miles, response, responded_at')
      .eq('token', req.params.token)
      .maybeSingle();

    if (rErr) throw rErr;
    if (!sr) return res.status(404).json({ error: 'Not found' });

    const expired = new Date(sr.token_expires) <= new Date();

    const { data: shift, error: sErr } = await supabase
      .from('shifts')
      .select(
        'id, site_town, shift_start, shift_end, ' +
        'licence_types, rate_per_hour, pay_terms, status, employer_id, ' +
        'chosen_candidate_id'
        // site_address intentionally omitted — never returned to guards here
      )
      .eq('id', sr.shift_id)
      .single();

    if (sErr) throw sErr;

    const { data: employer } = await supabase
      .from('employers')
      .select('company_name')
      .eq('id', shift.employer_id)
      .single();

    res.json({
      expired,
      shift_status:   shift.status,
      site_town:      shift.site_town,
      shift_start:    shift.shift_start,
      shift_end:      shift.shift_end,
      licence_types:  shift.licence_types,
      rate_per_hour:  shift.rate_per_hour,
      pay_terms:      shift.pay_terms,
      employer_name:  employer?.company_name || null,
      distance_miles: sr.distance_miles,
      response:       sr.response,
      responded_at:   sr.responded_at,
      is_chosen:      shift.chosen_candidate_id === sr.candidate_id,
    });
  } catch (err) {
    console.error('GET /api/shift-response/:token error:', err);
    res.status(500).json({ error: 'Failed to fetch shift' });
  }
});

// ── POST /api/shift-response/:token ──────────────────────────────────────────
router.post('/:token', async (req, res) => {
  try {
    const { response } = req.body;
    if (!['yes', 'no'].includes(response)) {
      return res.status(400).json({ error: 'response must be yes or no' });
    }

    const { data: sr, error: rErr } = await supabase
      .from('shift_responses')
      .select('id, shift_id, token_expires')
      .eq('token', req.params.token)
      .maybeSingle();

    if (rErr) throw rErr;
    if (!sr) return res.status(404).json({ error: 'Not found' });

    if (new Date(sr.token_expires) <= new Date()) {
      return res.status(410).json({
        error: 'This shift has started or passed',
        code:  'token_expired',
      });
    }

    const { data: shift } = await supabase
      .from('shifts')
      .select('status, chosen_candidate_id')
      .eq('id', sr.shift_id)
      .single();

    if (shift?.status === 'filled') {
      return res.status(409).json({ error: 'This shift has been filled',     code: 'shift_filled' });
    }
    if (shift?.status === 'cancelled') {
      return res.status(409).json({ error: 'This shift has been cancelled',  code: 'shift_cancelled' });
    }
    if (shift?.chosen_candidate_id) {
      return res.status(409).json({ error: 'A candidate has been chosen for this shift', code: 'shift_chosen' });
    }

    const { error: uErr } = await supabase
      .from('shift_responses')
      .update({ response, responded_at: new Date().toISOString() })
      .eq('id', sr.id);

    if (uErr) throw uErr;

    res.json({ ok: true, response });
  } catch (err) {
    console.error('POST /api/shift-response/:token error:', err);
    res.status(500).json({ error: 'Failed to record response' });
  }
});

// ── POST /api/shift-response/:token/stop-alerts ───────────────────────────────
// Guard opts out of shift alerts via their shift email link.
router.post('/:token/stop-alerts', async (req, res) => {
  try {
    const { data: sr, error: rErr } = await supabase
      .from('shift_responses')
      .select('candidate_id')
      .eq('token', req.params.token)
      .maybeSingle();

    if (rErr) throw rErr;
    if (!sr) return res.status(404).json({ error: 'Not found' });

    const { error: uErr } = await supabase
      .from('candidates')
      .update({
        shift_alerts_opt_in:          false,
        shift_alerts_opt_in_at:       null,
        shift_alerts_wording_version: null,
      })
      .eq('id', sr.candidate_id);

    if (uErr) throw uErr;

    await auditLog({
      tableName:   'candidates',
      recordId:    sr.candidate_id,
      action:      'UPDATE',
      performedBy: 'email_link',
      ipAddress:   req.ip,
      changes:     { event: 'shift_alerts_opted_out', source: 'shift_email' },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/shift-response/:token/stop-alerts error:', err);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

module.exports = router;
