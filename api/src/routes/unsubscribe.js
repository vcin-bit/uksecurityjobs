'use strict';
/**
 * api/src/routes/unsubscribe.js
 *
 * Public (no auth) endpoint for email unsubscribes.
 *
 * POST /api/unsubscribe/:token
 *   Finds the email_optouts row by token and sets opted_out_at = now().
 *   Idempotent: if already opted out, returns { ok: true }.
 *   Called by the UnsubscribePage React component when the user
 *   clicks the "Unsubscribe" button (never on page load).
 */

const express  = require('express');
const router   = express.Router();
const { supabase } = require('../lib/supabase');

router.post('/:token', async (req, res) => {
  const { token } = req.params;

  const { data: row, error } = await supabase
    .from('email_optouts')
    .select('email, opted_out_at')
    .eq('token', token)
    .maybeSingle();

  if (error || !row) {
    return res.status(404).json({ ok: false, error: 'invalid_token' });
  }

  // Idempotent — already opted out is still a success.
  if (row.opted_out_at) {
    return res.json({ ok: true });
  }

  const { error: updateErr } = await supabase
    .from('email_optouts')
    .update({ opted_out_at: new Date().toISOString() })
    .eq('token', token);

  if (updateErr) {
    console.error('[unsubscribe] update failed:', updateErr.message);
    return res.status(500).json({ ok: false, error: 'db_error' });
  }

  return res.json({ ok: true });
});

module.exports = router;
