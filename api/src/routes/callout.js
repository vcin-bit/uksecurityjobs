const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');

// GET /api/callout/:token
// Returns shift details for the callout this per-recipient token belongs to.
// No auth — linked from candidate callout email.
router.get('/:token', async (req, res) => {
  try {
    const { data: recipient, error: rErr } = await supabase
      .from('talent_pool_callout_recipients')
      .select('id, callout_id, candidate_id, token_expires, response, responded_at')
      .eq('token', req.params.token)
      .maybeSingle();

    if (rErr) throw rErr;
    if (!recipient) return res.status(404).json({ error: 'Not found' });

    const expired = new Date(recipient.token_expires) <= new Date();

    const { data: callout, error: cErr } = await supabase
      .from('talent_pool_callouts')
      .select('id, shift_start, shift_end, job_summary, site_town, status, employer_id')
      .eq('id', recipient.callout_id)
      .single();

    if (cErr) throw cErr;

    const { data: employer } = await supabase
      .from('employers')
      .select('company_name')
      .eq('id', callout.employer_id)
      .single();

    res.json({
      expired,
      closed:        callout.status === 'closed',
      shift_start:   callout.shift_start,
      shift_end:     callout.shift_end,
      job_summary:   callout.job_summary,
      site_town:     callout.site_town,
      employer_name: employer?.company_name || null,
      response:      recipient.response,
      responded_at:  recipient.responded_at,
    });
  } catch (err) {
    console.error('GET /api/callout/:token error:', err);
    res.status(500).json({ error: 'Failed to fetch callout' });
  }
});

// POST /api/callout/:token/respond
// Records candidate response (yes/no). Repeatable — candidate can change mind.
// 410 if token expired; 409 if callout closed.
router.post('/:token/respond', async (req, res) => {
  try {
    const { response } = req.body;
    if (!['yes', 'no'].includes(response)) {
      return res.status(400).json({ error: 'response must be yes or no' });
    }

    const { data: recipient, error: rErr } = await supabase
      .from('talent_pool_callout_recipients')
      .select('id, callout_id, token_expires')
      .eq('token', req.params.token)
      .maybeSingle();

    if (rErr) throw rErr;
    if (!recipient) return res.status(404).json({ error: 'Not found' });

    if (new Date(recipient.token_expires) <= new Date()) {
      return res.status(410).json({ error: 'This callout has expired', code: 'token_expired' });
    }

    const { data: callout } = await supabase
      .from('talent_pool_callouts')
      .select('status')
      .eq('id', recipient.callout_id)
      .single();

    if (callout?.status === 'closed') {
      return res.status(409).json({ error: 'This callout is closed', code: 'callout_closed' });
    }

    const { error: uErr } = await supabase
      .from('talent_pool_callout_recipients')
      .update({ response, responded_at: new Date().toISOString() })
      .eq('id', recipient.id);

    if (uErr) throw uErr;

    res.json({ success: true, response });
  } catch (err) {
    console.error('POST /api/callout/:token/respond error:', err);
    res.status(500).json({ error: 'Failed to record response' });
  }
});

module.exports = router;
