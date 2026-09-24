const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { supabase, auditLog } = require('../lib/supabase');
const { sendPoolInvite, sendPoolCallout, formatShiftRange } = require('../lib/email');

// ── Timezone helpers ──────────────────────────────────────────────────────────

// londonToUtc: takes "YYYY-MM-DDTHH:MM" (UK local time, no tz suffix)
// and returns a UTC Date. Works for both BST (UTC+1) and GMT (UTC+0).
function londonToUtc(localStr) {
  // Parse as UTC+0, then check what London thinks that moment is.
  const asGmt = new Date(localStr + ':00+00:00');
  const londonAtGmt = asGmt
    .toLocaleString('sv-SE', { timeZone: 'Europe/London' })
    .slice(0, 16)
    .replace(' ', 'T');
  // If London time matches input we're in GMT; otherwise BST (UTC+1).
  return londonAtGmt === localStr.slice(0, 16)
    ? asGmt
    : new Date(localStr + ':00+01:00');
}

// validateCalloutTimes: returns error code string or null.
// startDate and endDate are UTC Date objects (already converted via londonToUtc).
function validateCalloutTimes(startDate, endDate) {
  if (startDate <= new Date()) return 'shift_start_past';
  if (endDate   <= startDate)  return 'shift_end_before_start';
  return null;
}

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
      .select('candidate_id, status, id, outcome_at')
      .eq('employer_id', req.employerId)
      .in('candidate_id', visibleIds)
      .order('invited_at', { ascending: false });

    const inviteMap = {};
    (invites || []).forEach(inv => {
      if (!inviteMap[inv.candidate_id]) {
        inviteMap[inv.candidate_id] = { status: inv.status, id: inv.id, outcome_at: inv.outcome_at };
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
      invite_status:       inviteMap[c.candidate_id]?.status     || null,
      invite_id:           inviteMap[c.candidate_id]?.id         || null,
      invite_outcome_at:   inviteMap[c.candidate_id]?.outcome_at || null,
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

// GET /api/talent-pool/accepted
// Returns accepted invites for this employer with candidate contact details.
// Phone is plain text — never logged.
router.get('/accepted', async (req, res) => {
  try {
    const { data: invites, error: iErr } = await supabase
      .from('talent_pool_invites')
      .select('id, candidate_id, invited_at, responded_at')
      .eq('employer_id', req.employerId)
      .eq('status', 'accepted')
      .order('responded_at', { ascending: false });

    if (iErr) throw iErr;
    if (!invites || invites.length === 0) return res.json({ accepted: [] });

    const candidateIds = invites.map(i => i.candidate_id);

    const [{ data: candidates }, { data: personalDetails }, { data: licences }] = await Promise.all([
      supabase.from('candidates').select('id, email').in('id', candidateIds),
      supabase.from('personal_details').select('candidate_id, first_name, last_name, phone, city').in('candidate_id', candidateIds),
      supabase.from('sia_licences').select('candidate_id, licence_type').eq('verified', true).in('candidate_id', candidateIds),
    ]);

    const candidateMap  = Object.fromEntries((candidates     || []).map(c => [c.id, c]));
    const personalMap   = Object.fromEntries((personalDetails|| []).map(p => [p.candidate_id, p]));
    const licenceMap    = {};
    (licences || []).forEach(l => {
      if (!licenceMap[l.candidate_id]) licenceMap[l.candidate_id] = [];
      if (!licenceMap[l.candidate_id].includes(l.licence_type)) licenceMap[l.candidate_id].push(l.licence_type);
    });

    const result = invites.map(inv => {
      const cand = candidateMap[inv.candidate_id] || {};
      const pd   = personalMap [inv.candidate_id] || {};
      return {
        invite_id:     inv.id,
        candidate_id:  inv.candidate_id,
        invited_at:    inv.invited_at,
        responded_at:  inv.responded_at,
        first_name:    pd.first_name    || null,
        last_name:     pd.last_name     || null,
        city:          pd.city          || null,
        email:         cand.email       || null,
        phone:         pd.phone         || null,  // plain text — do not log
        licence_types: licenceMap[inv.candidate_id] || [],
      };
    });

    res.json({ accepted: result });
  } catch (err) {
    console.error('GET /talent-pool/accepted error:', err);
    res.status(500).json({ error: 'Failed to fetch accepted invites' });
  }
});

// POST /api/talent-pool/invites/:id/outcome
// outcome: 'passed' (atomic via RPC) or 'not_for_us' (direct update).
// Filters by id AND employer_id AND status='accepted' — never touches another employer's invite.
router.post('/invites/:id/outcome', async (req, res) => {
  try {
    const { outcome, outcome_notes } = req.body;
    if (!['passed', 'not_for_us'].includes(outcome)) {
      return res.status(400).json({ error: 'outcome must be passed or not_for_us' });
    }

    const inviteId = req.params.id;

    if (outcome === 'passed') {
      const { error: rpcErr } = await supabase.rpc('record_pool_pass', {
        p_invite_id:     inviteId,
        p_employer_id:   req.employerId,
        p_performed_by:  req.userId,
        p_ip:            req.ip,
        p_outcome_notes: outcome_notes || null,
      });

      if (rpcErr) {
        if (rpcErr.message.includes('invite_not_found'))      return res.status(404).json({ error: 'Invite not found',                  code: 'invite_not_found' });
        if (rpcErr.message.includes('invite_wrong_employer')) return res.status(403).json({ error: 'Not authorised',                     code: 'invite_wrong_employer' });
        if (rpcErr.message.includes('invite_wrong_status'))   return res.status(409).json({ error: 'Invite is not in accepted status',   code: 'invite_wrong_status' });
        throw rpcErr;
      }
    } else {
      // not_for_us: filter by id AND employer_id AND status='accepted' to prevent touching other employers' invites.
      const { data, error: uErr } = await supabase
        .from('talent_pool_invites')
        .update({
          status:        'not_for_us',
          outcome_at:    new Date().toISOString(),
          outcome_notes: outcome_notes || null,
        })
        .eq('id', inviteId)
        .eq('employer_id', req.employerId)
        .eq('status', 'accepted')
        .select('id')
        .maybeSingle();

      if (uErr) throw uErr;
      if (!data) return res.status(409).json({ error: 'Invite not found or not in accepted status', code: 'not_updated' });

      await auditLog({
        tableName:   'talent_pool_invites',
        recordId:    inviteId,
        action:      'UPDATE',
        performedBy: req.userId,
        ipAddress:   req.ip,
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('POST /talent-pool/invites/:id/outcome error:', err);
    res.status(500).json({ error: 'Failed to record outcome' });
  }
});

// GET /api/talent-pool/members
// Returns active pool members for this employer with candidate contact details.
// Optional ?licence_type=X and ?city=Y filters applied post-join.
router.get('/members', async (req, res) => {
  try {
    const { licence_type, city } = req.query;

    const { data: members, error: mErr } = await supabase
      .from('talent_pool_members')
      .select('id, candidate_id, joined_at, status')
      .eq('employer_id', req.employerId)
      .eq('status', 'active')
      .order('joined_at', { ascending: false });

    if (mErr) throw mErr;
    if (!members || members.length === 0) return res.json({ members: [] });

    const candidateIds = members.map(m => m.candidate_id);

    const [{ data: candidates }, { data: personalDetails }, { data: licences }] = await Promise.all([
      supabase.from('candidates').select('id, email').in('id', candidateIds),
      supabase.from('personal_details').select('candidate_id, first_name, last_name, city, phone').in('candidate_id', candidateIds),
      supabase.from('sia_licences').select('candidate_id, licence_type').eq('verified', true).in('candidate_id', candidateIds),
    ]);

    const candidateMap = Object.fromEntries((candidates     || []).map(c => [c.id, c]));
    const personalMap  = Object.fromEntries((personalDetails|| []).map(p => [p.candidate_id, p]));
    const licenceMap   = {};
    (licences || []).forEach(l => {
      if (!licenceMap[l.candidate_id]) licenceMap[l.candidate_id] = [];
      if (!licenceMap[l.candidate_id].includes(l.licence_type)) licenceMap[l.candidate_id].push(l.licence_type);
    });

    let result = members.map(m => {
      const pd   = personalMap [m.candidate_id] || {};
      const cand = candidateMap[m.candidate_id] || {};
      return {
        member_id:     m.id,
        candidate_id:  m.candidate_id,
        first_name:    pd.first_name || null,
        last_name:     pd.last_name  || null,
        city:          pd.city       || null,
        email:         cand.email    || null,
        phone:         pd.phone      || null,
        licence_types: licenceMap[m.candidate_id] || [],
        joined_at:     m.joined_at,
      };
    });

    if (licence_type) {
      result = result.filter(m => (m.licence_types || []).includes(licence_type));
    }
    if (city) {
      const lc = city.toLowerCase();
      result = result.filter(m => (m.city || '').toLowerCase().includes(lc));
    }

    res.json({ members: result });
  } catch (err) {
    console.error('GET /talent-pool/members error:', err);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// POST /api/talent-pool/callouts
// Creates a callout and inserts one recipient row (with unique token) per candidate.
// shift_start and shift_end are "YYYY-MM-DDTHH:MM" UK local — converted server-side.
// Token per recipient expires at shift_start UTC.
// Emails sent fire-and-forget.
router.post('/callouts', async (req, res) => {
  try {
    const { shift_start, shift_end, job_summary, site_town, rate, candidate_ids } = req.body;

    if (!shift_start || !shift_end || !job_summary || !site_town) {
      return res.status(400).json({ error: 'shift_start, shift_end, job_summary and site_town are required' });
    }
    if (!Array.isArray(candidate_ids) || candidate_ids.length === 0) {
      return res.status(400).json({ error: 'candidate_ids must be a non-empty array' });
    }

    const startUtc = londonToUtc(shift_start);
    const endUtc   = londonToUtc(shift_end);

    const validErr = validateCalloutTimes(startUtc, endUtc);
    if (validErr === 'shift_start_past')       return res.status(422).json({ error: 'Shift start must be in the future',   code: validErr });
    if (validErr === 'shift_end_before_start') return res.status(422).json({ error: 'Shift end must be after shift start', code: validErr });

    // All candidate_ids must be active members of this employer.
    const { data: members, error: mErr } = await supabase
      .from('talent_pool_members')
      .select('id, candidate_id')
      .eq('employer_id', req.employerId)
      .eq('status', 'active')
      .in('candidate_id', candidate_ids);

    if (mErr) throw mErr;

    const memberMap = Object.fromEntries((members || []).map(m => [m.candidate_id, m.id]));
    const invalid   = candidate_ids.filter(id => !memberMap[id]);
    if (invalid.length > 0) {
      return res.status(422).json({ error: 'One or more candidates are not active pool members', code: 'not_active_members', invalid });
    }

    const { data: callout, error: cErr } = await supabase
      .from('talent_pool_callouts')
      .insert({
        employer_id: req.employerId,
        shift_start: startUtc.toISOString(),
        shift_end:   endUtc.toISOString(),
        job_summary,
        site_town,
        rate:        rate || null,
        created_by:  req.userId,
        sent_at:     new Date().toISOString(),
      })
      .select('id')
      .single();

    if (cErr) throw cErr;

    // One token per recipient — expires at shift_start UTC.
    const recipientRows = candidate_ids.map(cid => ({
      callout_id:    callout.id,
      member_id:     memberMap[cid],
      candidate_id:  cid,
      employer_id:   req.employerId,
      token:         crypto.randomBytes(32).toString('hex'),
      token_expires: startUtc.toISOString(),
      response:      'none',
    }));

    const { data: recipients, error: rErr } = await supabase
      .from('talent_pool_callout_recipients')
      .insert(recipientRows)
      .select('candidate_id, token');

    if (rErr) throw rErr;

    // Fire-and-forget emails.
    Promise.all([
      supabase.from('employers').select('company_name').eq('id', req.employerId).single(),
      supabase.from('candidates').select('id, email').in('id', candidate_ids),
      supabase.from('personal_details').select('candidate_id, first_name').in('candidate_id', candidate_ids),
    ]).then(([empRes, candRes, pdRes]) => {
      const employerName = empRes.data?.company_name || 'Your employer';
      const emailMap     = Object.fromEntries((candRes.data || []).map(c => [c.id, c.email]));
      const nameMap      = Object.fromEntries((pdRes.data  || []).map(p => [p.candidate_id, p.first_name]));
      const shiftRange   = formatShiftRange(startUtc.toISOString(), endUtc.toISOString());

      (recipients || []).forEach(r => {
        const toEmail = emailMap[r.candidate_id];
        if (!toEmail) return;
        sendPoolCallout({
          toEmail,
          candidateFirstName: nameMap[r.candidate_id] || 'there',
          employerName,
          shiftRange,
          siteTown:   site_town,
          jobSummary: job_summary,
          rate:       rate || null,
          respondUrl: `https://app.uksecurityjobs.co.uk/callout/${r.token}`,
        }).catch(e => console.error('[sendPoolCallout]', e.message));
      });
    }).catch(e => console.error('[callout emails]', e.message));

    res.status(201).json({ id: callout.id, recipient_count: (recipients || []).length });
  } catch (err) {
    console.error('POST /talent-pool/callouts error:', err);
    res.status(500).json({ error: 'Failed to create callout' });
  }
});

// GET /api/talent-pool/callouts
// Lists callouts for this employer, newest first, with response counts.
router.get('/callouts', async (req, res) => {
  try {
    const { data: callouts, error } = await supabase
      .from('talent_pool_callouts')
      .select('id, shift_start, shift_end, job_summary, site_town, rate, status, closed_at, created_at, sent_at')
      .eq('employer_id', req.employerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const calloutIds = (callouts || []).map(c => c.id);
    const recipientCounts = {};
    if (calloutIds.length > 0) {
      const { data: recs } = await supabase
        .from('talent_pool_callout_recipients')
        .select('callout_id, response')
        .in('callout_id', calloutIds);

      (recs || []).forEach(r => {
        if (!recipientCounts[r.callout_id]) recipientCounts[r.callout_id] = { total: 0, yes: 0, no: 0 };
        recipientCounts[r.callout_id].total++;
        if (r.response === 'yes') recipientCounts[r.callout_id].yes++;
        if (r.response === 'no')  recipientCounts[r.callout_id].no++;
      });
    }

    res.json({
      callouts: (callouts || []).map(c => ({
        ...c,
        recipients: recipientCounts[c.id] || { total: 0, yes: 0, no: 0 },
      })),
    });
  } catch (err) {
    console.error('GET /talent-pool/callouts error:', err);
    res.status(500).json({ error: 'Failed to fetch callouts' });
  }
});

// GET /api/talent-pool/callouts/:id
// Returns callout detail with per-recipient response data.
router.get('/callouts/:id', async (req, res) => {
  try {
    const { data: callout, error: cErr } = await supabase
      .from('talent_pool_callouts')
      .select('id, shift_start, shift_end, job_summary, site_town, rate, status, closed_at, created_at, sent_at')
      .eq('id', req.params.id)
      .eq('employer_id', req.employerId)
      .maybeSingle();

    if (cErr) throw cErr;
    if (!callout) return res.status(404).json({ error: 'Callout not found' });

    const { data: recipients } = await supabase
      .from('talent_pool_callout_recipients')
      .select('candidate_id, response, responded_at')
      .eq('callout_id', callout.id);

    const candidateIds = (recipients || []).map(r => r.candidate_id);
    const { data: personalDetails } = candidateIds.length > 0
      ? await supabase.from('personal_details').select('candidate_id, first_name, last_name, phone').in('candidate_id', candidateIds)
      : { data: [] };

    const nameMap = Object.fromEntries((personalDetails || []).map(p => [p.candidate_id, p]));

    res.json({
      callout,
      recipients: (recipients || []).map(r => ({
        candidate_id: r.candidate_id,
        first_name:   nameMap[r.candidate_id]?.first_name || null,
        last_name:    nameMap[r.candidate_id]?.last_name  || null,
        phone:        r.response === 'yes' ? (nameMap[r.candidate_id]?.phone || null) : null,
        response:     r.response,
        responded_at: r.responded_at,
      })),
    });
  } catch (err) {
    console.error('GET /talent-pool/callouts/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch callout' });
  }
});

// POST /api/talent-pool/callouts/:id/close
// Sets status='closed' and closed_at=now() on an open callout.
router.post('/callouts/:id/close', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('talent_pool_callouts')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('employer_id', req.employerId)
      .eq('status', 'open')
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(409).json({ error: 'Callout not found or already closed', code: 'not_open' });

    res.json({ success: true });
  } catch (err) {
    console.error('POST /talent-pool/callouts/:id/close error:', err);
    res.status(500).json({ error: 'Failed to close callout' });
  }
});

module.exports = router;
module.exports.londonToUtc = londonToUtc;
module.exports.validateCalloutTimes = validateCalloutTimes;
