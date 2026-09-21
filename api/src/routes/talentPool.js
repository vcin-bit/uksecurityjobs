const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { supabase, auditLog } = require('../lib/supabase');
const { sendPoolInvite } = require('../lib/email');

// GET /api/talent-pool/shortlist
// Returns all discoverable, eligible candidates visible to this employer.
// Visibility rules (mode + allow/block list) applied in JS after DB fetch.
// Optional ?licence_type=X filter applied post-visibility.
// Uses service key — talent_pool_shortlist view is REVOKE'd from authed roles.
router.get('/shortlist', async (req, res) => {
  try {
    const { licence_type, city } = req.query;

    const { data: candidates, error: vErr } = await supabase
      .from('talent_pool_shortlist')
      .select('*');
    if (vErr) throw vErr;

    if (!candidates || candidates.length === 0) {
      return res.json({ candidates: [] });
    }

    const candidateIds = candidates.map(c => c.candidate_id);

    // Fetch visibility rules for this employer across all candidates in the result set.
    const { data: rules } = await supabase
      .from('candidate_employer_visibility')
      .select('candidate_id, rule')
      .eq('employer_id', req.employerId)
      .in('candidate_id', candidateIds);

    const ruleMap = {};
    (rules || []).forEach(r => { ruleMap[r.candidate_id] = r.rule; });

    // Apply visibility rules:
    //   mode='selected' → visible only if employer has an 'allow' rule.
    //   mode='all'      → visible unless employer has a 'block' rule.
    let visible = candidates.filter(c => {
      if (c.discoverable_mode === 'selected') {
        return ruleMap[c.candidate_id] === 'allow';
      }
      return ruleMap[c.candidate_id] !== 'block';
    });

    // Optional filters applied after visibility so counts reflect what the
    // employer can actually see.
    if (licence_type) {
      visible = visible.filter(c => (c.licence_types || []).includes(licence_type));
    }
    if (city) {
      const lc = city.toLowerCase();
      visible = visible.filter(c => (c.city || '').toLowerCase().includes(lc));
    }

    if (visible.length === 0) {
      return res.json({ candidates: [] });
    }

    const visibleIds = visible.map(c => c.candidate_id);

    // Bulk-fetch invite status — keep the most-recent entry per candidate.
    const { data: invites } = await supabase
      .from('talent_pool_invites')
      .select('candidate_id, status, id')
      .eq('employer_id', req.employerId)
      .in('candidate_id', visibleIds)
      .order('invited_at', { ascending: false });

    const inviteMap = {};
    (invites || []).forEach(inv => {
      if (!inviteMap[inv.candidate_id]) {
        inviteMap[inv.candidate_id] = { status: inv.status, id: inv.id };
      }
    });

    // Bulk-fetch pool membership.
    const { data: members } = await supabase
      .from('talent_pool_members')
      .select('candidate_id')
      .eq('employer_id', req.employerId)
      .in('candidate_id', visibleIds);

    const memberSet = new Set((members || []).map(m => m.candidate_id));

    const result = visible.map(c => ({
      candidate_id:        c.candidate_id,
      first_name:          c.first_name,
      last_name:           c.last_name,
      city:                c.city,
      availability_status: c.availability_status,
      photo_url:           c.photo_url,
      licence_types:       c.licence_types,
      address_gap:         c.address_gap,
      employment_gap:      c.employment_gap,
      updated_at:          c.updated_at,
      invite_status:       inviteMap[c.candidate_id]?.status || null,
      invite_id:           inviteMap[c.candidate_id]?.id || null,
      is_member:           memberSet.has(c.candidate_id),
    }));

    res.json({ candidates: result });
  } catch (err) {
    console.error('GET /talent-pool/shortlist error:', err);
    res.status(500).json({ error: 'Failed to fetch shortlist' });
  }
});

// POST /api/talent-pool/invites
// Eligibility checks run in order:
//   discoverable → profile_complete → not suspended → in-date SIA →
//   visibility rules → already_member (422) → duplicate open invite (409)
//   → create invite → fire-and-forget email.
router.post('/invites', async (req, res) => {
  try {
    const { candidate_id } = req.body;
    if (!candidate_id) return res.status(400).json({ error: 'candidate_id is required' });

    const { data: candidate, error: cErr } = await supabase
      .from('candidates')
      .select('id, discoverable, profile_complete, suspended, discoverable_mode')
      .eq('id', candidate_id)
      .maybeSingle();

    if (cErr) throw cErr;
    if (!candidate)            return res.status(404).json({ error: 'Candidate not found' });
    if (!candidate.discoverable)    return res.status(422).json({ error: 'Candidate is not discoverable', code: 'not_discoverable' });
    if (!candidate.profile_complete) return res.status(422).json({ error: 'Candidate profile is not complete', code: 'profile_incomplete' });
    if (candidate.suspended)        return res.status(422).json({ error: 'Candidate account is suspended', code: 'suspended' });

    // In-date verified SIA licence required.
    const today = new Date().toISOString().split('T')[0];
    const { data: licences } = await supabase
      .from('sia_licences')
      .select('id')
      .eq('candidate_id', candidate_id)
      .eq('verified', true)
      .not('expiry_date', 'is', null)
      .gte('expiry_date', today)
      .limit(1);

    if (!licences || licences.length === 0) {
      return res.status(422).json({ error: 'Candidate has no in-date verified SIA licence', code: 'no_valid_licence' });
    }

    // Visibility rules check.
    const { data: visRule } = await supabase
      .from('candidate_employer_visibility')
      .select('rule')
      .eq('candidate_id', candidate_id)
      .eq('employer_id', req.employerId)
      .maybeSingle();

    if (candidate.discoverable_mode === 'selected') {
      if (!visRule || visRule.rule !== 'allow') {
        return res.status(422).json({ error: 'Candidate has not allowed this employer', code: 'not_allowed' });
      }
    } else {
      if (visRule && visRule.rule === 'block') {
        return res.status(422).json({ error: 'Candidate has blocked this employer', code: 'blocked' });
      }
    }

    // Already a pool member?
    const { data: existingMember } = await supabase
      .from('talent_pool_members')
      .select('id')
      .eq('candidate_id', candidate_id)
      .eq('employer_id', req.employerId)
      .maybeSingle();

    if (existingMember) {
      return res.status(422).json({ error: 'Candidate is already a pool member', code: 'already_member' });
    }

    // Duplicate open invite? (partial unique index enforces at DB level too).
    const { data: openInvite } = await supabase
      .from('talent_pool_invites')
      .select('id')
      .eq('candidate_id', candidate_id)
      .eq('employer_id', req.employerId)
      .in('status', ['invited', 'accepted', 'call_booked'])
      .maybeSingle();

    if (openInvite) {
      return res.status(409).json({ error: 'An open invite already exists for this candidate', code: 'duplicate_invite' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const token_expires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(); // 14 days

    const { data: invite, error: iErr } = await supabase
      .from('talent_pool_invites')
      .insert({
        employer_id:   req.employerId,
        candidate_id,
        token,
        token_expires,
        status:     'invited',
        invited_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (iErr) throw iErr;

    await auditLog({
      tableName:   'talent_pool_invites',
      recordId:    invite.id,
      action:      'INSERT',
      performedBy: req.userId,
      ipAddress:   req.ip,
    });

    // Fetch candidate email, first name, and employer name for the invite email.
    const [{ data: cData }, { data: empData }, { data: pData }] = await Promise.all([
      supabase.from('candidates').select('email').eq('id', candidate_id).single(),
      supabase.from('employers').select('company_name').eq('id', req.employerId).single(),
      supabase.from('personal_details').select('first_name').eq('candidate_id', candidate_id).maybeSingle(),
    ]);

    // Fire-and-forget — email failure must never block invite creation.
    sendPoolInvite({
      toEmail:            cData?.email,
      candidateFirstName: pData?.first_name || 'there',
      employerName:       empData?.company_name || 'an employer',
      token,
    }).catch(e => console.error('[sendPoolInvite]', e.message));

    res.status(201).json({ id: invite.id });
  } catch (err) {
    console.error('POST /talent-pool/invites error:', err);
    res.status(500).json({ error: 'Failed to create invite' });
  }
});

module.exports = router;
