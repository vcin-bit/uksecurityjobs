const express = require('express');
const router = express.Router();
const { supabase, getClientForUser, encrypt, decrypt, auditLog } = require('../lib/supabase');
const { createClerkClient } = require('@clerk/backend');

// ── Apply gate ───────────────────────────────────────────────────────────────
// Minimum requirement to submit a job application.
// Returns { ok: bool, missing: ('sia' | 'personal')[] }.
async function canApply(db, candidateId) {
  const missing = [];

  const [siaRes, personalRes] = await Promise.all([
    db.from('sia_licences').select('verified').eq('candidate_id', candidateId),
    db.from('personal_details').select('first_name').eq('candidate_id', candidateId).maybeSingle(),
  ]);

  if (!(siaRes.data || []).some(l => l.verified === true)) missing.push('sia');
  if (!personalRes.data?.first_name) missing.push('personal');

  return { ok: missing.length === 0, missing };
}

// ── BS7858 badge ─────────────────────────────────────────────────────────────
// Full profile completeness — all 8 data areas. Used for the badge only;
// does not gate job applications.
// Returns { complete: bool, missing: string[] }.
async function isBS7858Ready(db, candidateId) {
  const missing = [];

  const [siaRes, personalRes, drivingRes, sectorsRes, qualsRes, bgRes, empRes, addrRes] = await Promise.all([
    db.from('sia_licences').select('verified').eq('candidate_id', candidateId),
    db.from('personal_details').select('first_name').eq('candidate_id', candidateId).maybeSingle(),
    db.from('driving_details').select('id').eq('candidate_id', candidateId).maybeSingle(),
    db.from('preferred_sectors').select('id').eq('candidate_id', candidateId).maybeSingle(),
    db.from('qualifications').select('id').eq('candidate_id', candidateId).maybeSingle(),
    db.from('professional_background').select('id').eq('candidate_id', candidateId).maybeSingle(),
    db.from('employment_history').select('id').eq('candidate_id', candidateId),
    db.from('address_history').select('id').eq('candidate_id', candidateId),
  ]);

  const siaVerified = (siaRes.data || []).some(l => l.verified === true);
  if (!siaVerified) missing.push('Verified SIA licence');
  if (!personalRes.data?.first_name) missing.push('Personal details');
  if (!drivingRes.data) missing.push('Driving details');
  if (!sectorsRes.data) missing.push('Preferred sectors');
  if (!qualsRes.data) missing.push('Qualifications');
  if (!bgRes.data) missing.push('Professional background');
  if (!(empRes.data || []).length) missing.push('Employment history');
  if (!(addrRes.data || []).length) missing.push('Address history');

  return { complete: missing.length === 0, missing };
}

// ── Badge refresh helper ──────────────────────────────────────────────────────
// Recomputes isBS7858Ready and persists the result to candidates.profile_complete.
// Call fire-and-forget (.catch()) after any write that touches one of the 8 areas
// so employers always see a current badge without waiting for the candidate to
// reload their dashboard.
async function refreshBadge(db, candidateId) {
  const { complete } = await isBS7858Ready(db, candidateId);
  await db.from('candidates').update({ profile_complete: complete }).eq('id', candidateId);
}


// GET /api/candidates/me — get the current candidate's profile, create if doesn't exist
router.get('/me', async (req, res) => {
  try {
    const db = getClientForUser(req.token);
    let { data: candidate, error } = await db
      .from('candidates')
      .select('*')
      .eq('clerk_user_id', req.userId)
      .single();

    // Auto-create candidate record on first login if it doesn't exist
    if (error && error.code === 'PGRST116') {
      // Fetch email from Clerk API — JWT does not include the email claim
      let candidateEmail = req.userEmail || '';
      try {
        const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
        const clerkUser = await clerk.users.getUser(req.userId);
        candidateEmail = clerkUser.emailAddresses?.[0]?.emailAddress || candidateEmail;
      } catch (e) {
        console.error('Clerk email lookup failed for', req.userId, e.message);
      }

      // Auto-create is a fallback for users whose POST /api/candidates failed
      // during signup. Real consent capture happens on the signup form; null here
      // means consent was never recorded (not the same as declined).
      const { data: newCandidate, error: createError } = await db
        .from('candidates')
        .insert({
          clerk_user_id: req.userId,
          email: candidateEmail,
          gdpr_consent: null,
          profile_step: 0
        })
        .select()
        .single();

      if (createError) throw createError;
      candidate = newCandidate;
    } else if (error) {
      throw error;
    }

    await auditLog({
      tableName: 'candidates',
      recordId: candidate.id,
      action: 'READ',
      performedBy: req.userId,
      ipAddress: req.ip
    });

    res.json({ candidate });
  } catch (err) {
    console.error('GET /candidates/me error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// POST /api/candidates — create candidate record after registration
router.post('/', async (req, res) => {
  try {
    const db = getClientForUser(req.token);
    const { email, gdpr_consent } = req.body;

    if (!gdpr_consent) {
      return res.status(400).json({ error: 'GDPR consent is required' });
    }

    const { data: candidate, error } = await db
      .from('candidates')
      .insert({
        clerk_user_id: req.userId,
        email,
        gdpr_consent: true,
        gdpr_consent_at: new Date().toISOString(),
        profile_step: 0
      })
      .select()
      .single();

    if (error) throw error;

    await auditLog({
      tableName: 'candidates',
      recordId: candidate.id,
      action: 'INSERT',
      performedBy: req.userId,
      ipAddress: req.ip
    });

    res.status(201).json({ candidate });
  } catch (err) {
    console.error('POST /candidates error:', err);
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

// PATCH /api/candidates/me/step — update profile step progress
router.patch('/me/step', async (req, res) => {
  try {
    const db = getClientForUser(req.token);
    const { profile_step } = req.body;

    // Get candidate id for completeness check
    const { data: existing } = await db
      .from('candidates')
      .select('id')
      .eq('clerk_user_id', req.userId)
      .single();

    const update = { profile_step };
    if (existing && typeof profile_step === 'number' && profile_step >= 10) {
      const { complete } = await isBS7858Ready(db, existing.id);
      update.profile_complete = complete;
    }

    const { data: candidate, error } = await db
      .from('candidates')
      .update(update)
      .eq('clerk_user_id', req.userId)
      .select()
      .single();

    if (error) throw error;

    res.json({ candidate });
  } catch (err) {
    console.error('PATCH /candidates/me/step error:', err);
    res.status(500).json({ error: 'Failed to update step' });
  }
});

// GET /api/candidates/me/completeness — check profile completeness
router.get('/me/completeness', async (req, res) => {
  try {
    const db = getClientForUser(req.token);
    const { data: candidate } = await db
      .from('candidates')
      .select('id')
      .eq('clerk_user_id', req.userId)
      .single();

    if (!candidate) return res.status(404).json({ error: 'Profile not found' });

    const result = await isBS7858Ready(db, candidate.id);

    // Keep the profile_complete flag in sync
    await db.from('candidates')
      .update({ profile_complete: result.complete })
      .eq('id', candidate.id);

    res.json(result);
  } catch (err) {
    console.error('GET /candidates/me/completeness error:', err);
    res.status(500).json({ error: 'Failed to check completeness' });
  }
});

// PATCH /api/candidates/me/gdpr — record GDPR consent
router.patch('/me/gdpr', async (req, res) => {
  try {
    const { gdpr_consent } = req.body;
    if (gdpr_consent !== true) {
      return res.status(400).json({ error: 'Only gdpr_consent: true is accepted' });
    }

    const db = getClientForUser(req.token);
    const { data: candidate, error } = await db
      .from('candidates')
      .update({ gdpr_consent: true, gdpr_consent_at: new Date().toISOString() })
      .eq('clerk_user_id', req.userId)
      .select('id')
      .single();

    if (error) throw error;

    await auditLog({
      tableName: 'candidates',
      recordId: candidate.id,
      action: 'gdpr_consent_granted',
      performedBy: req.userId,
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('PATCH /candidates/me/gdpr error:', err);
    res.status(500).json({ error: 'Failed to update consent' });
  }
});

// GET /api/candidates/me/personal — get personal details
router.get('/me/personal', async (req, res) => {
  try {
    const db = getClientForUser(req.token);
    const { data: candidate } = await db
      .from('candidates')
      .select('id')
      .eq('clerk_user_id', req.userId)
      .single();

    if (!candidate) return res.status(404).json({ error: 'Profile not found' });

    const { data: personal, error } = await db
      .from('personal_details')
      .select('*')
      .eq('candidate_id', candidate.id)
      .single();

    if (error && error.code === 'PGRST116') {
      return res.json({ personal: null });
    }
    if (error) throw error;

    await auditLog({
      tableName: 'personal_details',
      recordId: personal.id,
      action: 'READ',
      performedBy: req.userId,
      ipAddress: req.ip
    });

    res.json({ personal });
  } catch (err) {
    console.error('GET /candidates/me/personal error:', err);
    res.status(500).json({ error: 'Failed to fetch personal details' });
  }
});

// PUT /api/candidates/me/personal — save personal details
router.put('/me/personal', async (req, res) => {
  try {
    const db = getClientForUser(req.token);
    const { data: candidate } = await db
      .from('candidates')
      .select('id')
      .eq('clerk_user_id', req.userId)
      .single();

    if (!candidate) return res.status(404).json({ error: 'Profile not found' });

    const {
      first_name, last_name, date_of_birth, phone,
      address_line1, address_line2, city, county, postcode, move_in_date,
      sia_address_match, dvla_address_match
    } = req.body;

    const payload = {
      candidate_id: candidate.id,
      first_name, last_name, date_of_birth, phone,
      address_line1, address_line2, city, county, postcode, move_in_date,
      sia_address_match, dvla_address_match,
    };

    const { data: personal, error } = await db
      .from('personal_details')
      .upsert(payload, { onConflict: 'candidate_id' })
      .select()
      .single();

    if (error) throw error;

    await auditLog({
      tableName: 'personal_details',
      recordId: personal.id,
      action: 'UPDATE',
      performedBy: req.userId,
      ipAddress: req.ip
    });

    refreshBadge(db, candidate.id).catch(e => console.error('refreshBadge /personal:', e));
    res.json({ success: true });
  } catch (err) {
    console.error('PUT /candidates/me/personal error:', err);
    res.status(500).json({ error: 'Failed to save personal details' });
  }
});

// PUT /api/candidates/me/interview
router.put('/me/interview', async (req, res) => {
  try {
    const db = getClientForUser(req.token);
    const { whyHire, proudOf, availability, salary } = req.body;
    const interview_answers = {
      whyHire: whyHire || null,
      proudOf: proudOf || null,
      availability: availability || null,
      salary: salary || null,
    };

    const { data: candidate, error } = await db
      .from('candidates')
      .update({ interview_answers })
      .eq('clerk_user_id', req.userId)
      .select().single();

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('PUT /candidates/me/interview error:', err);
    res.status(500).json({ error: 'Failed to save interview answers' });
  }
});

// GET /api/candidates/me/full — returns all profile data in one call
router.get('/me/full', async (req, res) => {
  try {
    const db = getClientForUser(req.token);
    const { data: candidate } = await db
      .from('candidates')
      .select('*')
      .eq('clerk_user_id', req.userId)
      .single();

    // New user — return empty profile structure instead of 404
    if (!candidate) return res.json({
      candidate: null,
      licences: [],
      personal: null,
      driving: null,
      sectors: null,
      qualifications: null,
      background: null,
      employment: [],
      addresses: [],
    });

    const [siaRes, personalRes, drivingRes, sectorsRes, qualsRes, bgRes, empRes, addrRes] = await Promise.all([
      db.from('sia_licences').select('*').eq('candidate_id', candidate.id),
      db.from('personal_details').select('*').eq('candidate_id', candidate.id).single(),
      db.from('driving_details').select('*').eq('candidate_id', candidate.id).single(),
      db.from('preferred_sectors').select('*').eq('candidate_id', candidate.id).single(),
      db.from('qualifications').select('*').eq('candidate_id', candidate.id).single(),
      db.from('professional_background').select('*').eq('candidate_id', candidate.id).single(),
      db.from('employment_history').select('*').eq('candidate_id', candidate.id).order('start_date', { ascending: false }),
      db.from('address_history').select('*').eq('candidate_id', candidate.id).order('moved_in_date', { ascending: false }),
    ]);

    const licences = await Promise.all((siaRes.data || []).map(async (lic) => {
      const licence_number = await decrypt(lic.licence_number_encrypted).catch(() => '');
      const { licence_number_encrypted, ...rest } = lic;
      return { ...rest, licence_number };
    }));

    res.json({
      candidate,
      licences,
      personal: personalRes.data || null,
      driving: drivingRes.data || null,
      sectors: sectorsRes.data || null,
      qualifications: qualsRes.data || null,
      background: bgRes.data || null,
      employment: empRes.data || [],
      addresses: addrRes.data || [],
    });
  } catch (err) {
    console.error('GET /me/full error:', err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// GET /api/candidates/me/applications — get candidate's job applications
router.get('/me/applications', async (req, res) => {
  try {
    const db = getClientForUser(req.token);
    const { data: candidate } = await db.from('candidates').select('id').eq('clerk_user_id', req.userId).single();
    if (!candidate) return res.json({ applications: [] });

    const { data, error } = await db
      .from('job_applications')
      .select(`id, status, applied_at, interview_slot_id,
        jobs(id, title, location, rate_from, rate_to, rate_type, contract_type, employer_id),
        interview_slots(slot_datetime)`)
      .eq('candidate_id', candidate.id)
      .order('applied_at', { ascending: false });

    if (error) throw error;

    // Safe employer lookup — employers_public exposes only non-sensitive columns
    const empIds = [...new Set((data||[]).map(a => a.jobs?.employer_id).filter(Boolean))];
    const { data: emps } = empIds.length
      ? await db.from('employers_public').select('id, company_name, logo_url').in('id', empIds)
      : { data: [] };
    const empMap = Object.fromEntries((emps||[]).map(e => [e.id, e]));

    const applications = (data || []).map(a => ({
      ...a,
      created_at: a.applied_at,
      interview_date: a.interview_slots?.slot_datetime || null,
      jobs: a.jobs ? { ...a.jobs, employers: empMap[a.jobs.employer_id] || {} } : a.jobs,
    }));
    res.json({ applications });
  } catch(err) {
    console.error('GET /candidates/me/applications error:', err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// PATCH /api/candidates/me/availability
router.patch('/me/availability', async (req, res) => {
  try {
    const db = getClientForUser(req.token);
    const { availability_status, available_from } = req.body;
    const valid = ['available', 'available_from', 'not_available'];
    if (!valid.includes(availability_status)) return res.status(400).json({ error: 'Invalid status' });

    const { data: candidate } = await db.from('candidates').select('id').eq('clerk_user_id', req.userId).single();
    if (!candidate) return res.status(404).json({ error: 'Profile not found' });

    const { error } = await db.from('candidates').update({
      availability_status,
      available_from: availability_status === 'available_from' ? available_from : null,
      updated_at: new Date().toISOString()
    }).eq('id', candidate.id);

    if (error) throw error;
    res.json({ success: true });
  } catch(err) {
    console.error('PATCH /candidates/me/availability error:', err);
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

// DELETE /api/candidates/me — GDPR right to erasure
router.delete('/me', async (req, res) => {
  try {
    const db = getClientForUser(req.token);
    const { data: candidate } = await db.from('candidates').select('id').eq('clerk_user_id', req.userId).single();
    if (!candidate) return res.status(404).json({ error: 'Profile not found' });

    const id = candidate.id;

    // Delete all candidate data in order (child tables first)
    await db.from('job_applications').delete().eq('candidate_id', id);
    await db.from('sia_licences').delete().eq('candidate_id', id);
    await db.from('personal_details').delete().eq('candidate_id', id);
    await db.from('employment_history').delete().eq('candidate_id', id);
    await db.from('address_history').delete().eq('candidate_id', id);
    await db.from('qualifications').delete().eq('candidate_id', id);
    await db.from('preferred_sectors').delete().eq('candidate_id', id);
    await db.from('driving_details').delete().eq('candidate_id', id);
    await db.from('professional_background').delete().eq('candidate_id', id);
    await db.from('candidates').delete().eq('id', id);

    // Log the deletion for GDPR audit trail
    console.log(`GDPR deletion completed for clerk_user_id: ${req.userId} candidate_id: ${id} at ${new Date().toISOString()}`);

    res.json({ success: true });
  } catch(err) {
    console.error('DELETE /candidates/me error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// ── Talent pool: discoverability ─────────────────────────────────────────────

const {
  POOL_WORDING_VERSION, POOL_CONSENT_COPY, POOL_MODE_LABELS,
  POOL_INVITE_WORDING_VERSION, POOL_INVITE_CONSENT_COPY,
  POOL_ACCEPT_CONFIRMATION_TEMPLATE,
} = require('../lib/poolWording');

// Go-live gate for candidate-facing talent pool routes.
//
// TALENT_POOL_CANDIDATE_LIVE=true  → open to all authenticated candidates.
// TALENT_POOL_CANDIDATE_LIVE=false (default) → 404 for everyone except
//   clerk_user_ids listed in TALENT_POOL_CANDIDATE_ALLOWLIST (comma-separated).
//
// Returns { enabled: true } when access is permitted; responds 404 and
// returns false when it is not. The caller must return immediately on false.
//
// Env vars are read per-request so toggling on Render takes effect
// on the next request without a server restart.
function checkTalentPoolGate(req, res) {
  if (process.env.TALENT_POOL_CANDIDATE_LIVE === 'true') return true;
  const allowlist = (process.env.TALENT_POOL_CANDIDATE_ALLOWLIST || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (allowlist.includes(req.userId)) return true;
  res.status(404).json({ error: 'Not found' });
  return false;
}

// GET /me/discoverability — returns candidate opt-in state, visibility rules
// with employer names, current consent copy/wording version, and enabled flag.
router.get('/me/discoverability', async (req, res) => {
  if (!checkTalentPoolGate(req, res)) return;
  try {
    const db = getClientForUser(req.token);

    const { data: candidate, error: cErr } = await db
      .from('candidates')
      .select('id, discoverable, discoverable_mode, discoverable_at, discoverable_wording_version, profile_complete')
      .eq('clerk_user_id', req.userId)
      .single();

    if (cErr) throw cErr;
    if (!candidate) return res.status(404).json({ error: 'Profile not found' });

    // Rules readable by the candidate via RLS.
    const { data: rules, error: rErr } = await db
      .from('candidate_employer_visibility')
      .select('employer_id, rule')
      .eq('candidate_id', candidate.id);

    if (rErr) throw rErr;

    // Employer names require service key (candidates cannot read the employers table).
    let enrichedRules = [];
    if (rules && rules.length > 0) {
      const employerIds = rules.map(r => r.employer_id);
      const { data: employers } = await supabase
        .from('employers')
        .select('id, company_name')
        .in('id', employerIds);

      const nameMap = {};
      (employers || []).forEach(e => { nameMap[e.id] = e.company_name; });
      enrichedRules = rules.map(r => ({
        employer_id:  r.employer_id,
        company_name: nameMap[r.employer_id] || null,
        rule:         r.rule,
      }));
    }

    res.json({
      enabled:                         true,
      discoverable:                    candidate.discoverable,
      discoverable_mode:               candidate.discoverable_mode,
      discoverable_at:                 candidate.discoverable_at,
      discoverable_wording_version:    candidate.discoverable_wording_version,
      profile_complete:                candidate.profile_complete,
      rules:                           enrichedRules,
      consent_copy:                    POOL_CONSENT_COPY,
      mode_labels:                     POOL_MODE_LABELS,
      wording_version:                 POOL_WORDING_VERSION,
    });
  } catch (err) {
    console.error('GET /me/discoverability error:', err);
    res.status(500).json({ error: 'Failed to fetch discoverability settings' });
  }
});

// PUT /me/discoverability — update opt-in state and/or mode.
// false→true: validates profile_complete and wording_version first.
// Stamps discoverable_at + discoverable_wording_version on false→true only.
router.put('/me/discoverability', async (req, res) => {
  if (!checkTalentPoolGate(req, res)) return;
  try {
    const { discoverable, discoverable_mode, wording_version } = req.body;
    const db = getClientForUser(req.token);

    const { data: candidate, error: cErr } = await db
      .from('candidates')
      .select('id, discoverable, profile_complete')
      .eq('clerk_user_id', req.userId)
      .single();

    if (cErr) throw cErr;
    if (!candidate) return res.status(404).json({ error: 'Profile not found' });

    // Gate checks on false→true transition only.
    if (candidate.discoverable === false && discoverable === true) {
      if (!candidate.profile_complete) {
        return res.status(400).json({
          error: 'Profile must be complete before opting in to the talent pool.',
          code:  'badge_missing',
        });
      }
      if (wording_version !== POOL_WORDING_VERSION) {
        return res.status(409).json({
          error:           'Consent wording has been updated. Please reload and re-read before opting in.',
          code:            'wording_version_mismatch',
          current_version: POOL_WORDING_VERSION,
        });
      }
    }

    const updates = {};

    if (discoverable !== undefined) {
      updates.discoverable = discoverable;
      // Stamp only on the false→true transition. Never re-stamp if already opted in.
      if (candidate.discoverable === false && discoverable === true) {
        updates.discoverable_at              = new Date().toISOString();
        updates.discoverable_wording_version = wording_version;
      }
    }

    if (discoverable_mode !== undefined) {
      if (!['all', 'selected'].includes(discoverable_mode)) {
        return res.status(400).json({ error: 'Invalid discoverable_mode. Must be all or selected.' });
      }
      updates.discoverable_mode = discoverable_mode;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nothing to update.' });
    }

    const { error: uErr } = await db
      .from('candidates')
      .update(updates)
      .eq('id', candidate.id);

    if (uErr) {
      // Guard trigger exception — surface as 400 badge_missing.
      if (uErr.message && uErr.message.includes('profile_complete is not true')) {
        return res.status(400).json({
          error: 'Profile must be complete before opting in to the talent pool.',
          code:  'badge_missing',
        });
      }
      throw uErr;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('PUT /me/discoverability error:', err);
    res.status(500).json({ error: 'Failed to update discoverability settings' });
  }
});

// PUT /me/visibility-rules — atomic replace of candidate_employer_visibility rows.
// Uses SECURITY DEFINER RPC to validate talent_pool_enabled on all employer_ids.
router.put('/me/visibility-rules', async (req, res) => {
  if (!checkTalentPoolGate(req, res)) return;
  try {
    const { rules } = req.body;

    if (!Array.isArray(rules)) {
      return res.status(400).json({ error: 'rules must be an array' });
    }

    // Resolve candidate id via user-scoped client (enforces candidate is real).
    const db = getClientForUser(req.token);
    const { data: candidate, error: cErr } = await db
      .from('candidates')
      .select('id')
      .eq('clerk_user_id', req.userId)
      .single();

    if (cErr) throw cErr;
    if (!candidate) return res.status(404).json({ error: 'Profile not found' });

    // RPC runs as service role — validates employers + replaces atomically.
    const { error: rpcErr } = await supabase.rpc('replace_candidate_visibility_rules', {
      p_candidate_id: candidate.id,
      p_rules:        rules,
    });

    if (rpcErr) {
      if (rpcErr.message && rpcErr.message.includes('not a talent pool employer')) {
        return res.status(400).json({ error: rpcErr.message, code: 'invalid_employer' });
      }
      if (rpcErr.message && rpcErr.message.includes('Invalid rule value')) {
        return res.status(400).json({ error: rpcErr.message, code: 'invalid_rule' });
      }
      throw rpcErr;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('PUT /me/visibility-rules error:', err);
    res.status(500).json({ error: 'Failed to update visibility rules' });
  }
});

// ── Talent pool: candidate invites ───────────────────────────────────────────

// GET /me/invites — list all incoming talent pool invites for this candidate.
router.get('/me/invites', async (req, res) => {
  if (!checkTalentPoolGate(req, res)) return;
  try {
    const db = getClientForUser(req.token);
    const { data: candidate } = await db
      .from('candidates').select('id').eq('clerk_user_id', req.userId).single();
    if (!candidate) return res.status(404).json({ error: 'Profile not found' });

    const { data: invites, error: iErr } = await supabase
      .from('talent_pool_invites')
      .select('id, employer_id, status, invited_at, responded_at, token, token_expires')
      .eq('candidate_id', candidate.id)
      .order('invited_at', { ascending: false });

    if (iErr) throw iErr;

    let result = invites || [];
    if (result.length > 0) {
      const empIds = [...new Set(result.map(i => i.employer_id))];
      const { data: employers } = await supabase
        .from('employers').select('id, company_name').in('id', empIds);
      const nameMap = Object.fromEntries((employers || []).map(e => [e.id, e.company_name]));
      result = result.map(i => ({ ...i, employer_name: nameMap[i.employer_id] || null }));
    }

    res.json({ invites: result });
  } catch (err) {
    console.error('GET /me/invites error:', err);
    res.status(500).json({ error: 'Failed to fetch invites' });
  }
});

// GET /me/invites/:token — get a single invite by token (candidate-facing).
router.get('/me/invites/:token', async (req, res) => {
  if (!checkTalentPoolGate(req, res)) return;
  try {
    const { token } = req.params;
    const { data: invite, error: iErr } = await supabase
      .from('talent_pool_invites')
      .select('id, employer_id, candidate_id, status, invited_at, token_expires')
      .eq('token', token)
      .maybeSingle();

    if (iErr) throw iErr;
    if (!invite) return res.status(404).json({ error: 'Invite not found' });

    if (new Date(invite.token_expires) < new Date()) {
      return res.status(410).json({ error: 'This invitation has expired', code: 'invite_expired' });
    }

    // Verify this invite belongs to the signed-in candidate.
    const db = getClientForUser(req.token);
    const { data: candidate } = await db
      .from('candidates').select('id').eq('clerk_user_id', req.userId).single();
    if (!candidate || candidate.id !== invite.candidate_id) {
      return res.status(403).json({ error: 'Not authorised' });
    }

    const { data: employer } = await supabase
      .from('employers').select('company_name').eq('id', invite.employer_id).single();

    const employerName = employer?.company_name || 'the employer';
    res.json({
      id:                    invite.id,
      status:                invite.status,
      invited_at:            invite.invited_at,
      token_expires:         invite.token_expires,
      employer_name:         employerName,
      invite_wording_version: POOL_INVITE_WORDING_VERSION,
      invite_consent_copy:   POOL_INVITE_CONSENT_COPY,
      accept_confirmation:   POOL_ACCEPT_CONFIRMATION_TEMPLATE.replace('{employer_name}', employerName),
    });
  } catch (err) {
    console.error('GET /me/invites/:token error:', err);
    res.status(500).json({ error: 'Failed to fetch invite' });
  }
});

// POST /me/invites/:token/accept — candidate accepts a talent pool invite.
// Validates wording_version before writing; stamps consent_at and
// consent_wording_version. Does NOT create a talent_pool_members row (Phase 3).
router.post('/me/invites/:token/accept', async (req, res) => {
  if (!checkTalentPoolGate(req, res)) return;
  try {
    const { token } = req.params;
    const { wording_version } = req.body;

    const { data: invite, error: iErr } = await supabase
      .from('talent_pool_invites')
      .select('id, candidate_id, status, token_expires')
      .eq('token', token)
      .maybeSingle();

    if (iErr) throw iErr;
    if (!invite) return res.status(404).json({ error: 'Invite not found' });

    if (new Date(invite.token_expires) < new Date()) {
      return res.status(410).json({ error: 'This invitation has expired', code: 'invite_expired' });
    }

    const db = getClientForUser(req.token);
    const { data: candidate } = await db
      .from('candidates').select('id').eq('clerk_user_id', req.userId).single();
    if (!candidate || candidate.id !== invite.candidate_id) {
      return res.status(403).json({ error: 'Not authorised' });
    }

    if (invite.status !== 'invited') {
      return res.status(409).json({ error: 'Invite is not in invited status', code: 'invalid_status' });
    }

    if (wording_version !== POOL_INVITE_WORDING_VERSION) {
      return res.status(409).json({
        error:           'Consent wording has been updated. Please reload and re-read before accepting.',
        code:            'wording_version_mismatch',
        current_version: POOL_INVITE_WORDING_VERSION,
      });
    }

    const now = new Date().toISOString();
    const { error: uErr } = await supabase
      .from('talent_pool_invites')
      .update({
        status:                  'accepted',
        responded_at:            now,
        consent_at:              now,
        consent_wording_version: POOL_INVITE_WORDING_VERSION,
      })
      .eq('id', invite.id);

    if (uErr) throw uErr;

    res.json({ success: true });
  } catch (err) {
    console.error('POST /me/invites/:token/accept error:', err);
    res.status(500).json({ error: 'Failed to accept invite' });
  }
});

// GET /me/pool-memberships — list candidate's active pool memberships with employer names.
router.get('/me/pool-memberships', async (req, res) => {
  if (!checkTalentPoolGate(req, res)) return;
  try {
    const db = getClientForUser(req.token);
    const { data: candidate } = await db
      .from('candidates').select('id').eq('clerk_user_id', req.userId).single();
    if (!candidate) return res.status(404).json({ error: 'Profile not found' });

    const { data: members, error: mErr } = await supabase
      .from('talent_pool_members')
      .select('id, employer_id, joined_at, status')
      .eq('candidate_id', candidate.id)
      .eq('status', 'active');

    if (mErr) throw mErr;
    if (!members || members.length === 0) return res.json({ memberships: [] });

    const empIds = members.map(m => m.employer_id);
    const { data: employers } = await supabase
      .from('employers').select('id, company_name').in('id', empIds);
    const nameMap = Object.fromEntries((employers || []).map(e => [e.id, e.company_name]));

    res.json({
      memberships: members.map(m => ({
        id:            m.id,
        employer_id:   m.employer_id,
        employer_name: nameMap[m.employer_id] || null,
        joined_at:     m.joined_at,
      }))
    });
  } catch (err) {
    console.error('GET /me/pool-memberships error:', err);
    res.status(500).json({ error: 'Failed to fetch memberships' });
  }
});

// POST /me/pool-membership/:employer_id/leave — candidate leaves an employer's talent pool.
// Sets status='left' and left_at. The member row remains so re-invite is blocked.
router.post('/me/pool-membership/:employer_id/leave', async (req, res) => {
  if (!checkTalentPoolGate(req, res)) return;
  try {
    const { employer_id } = req.params;

    const db = getClientForUser(req.token);
    const { data: candidate } = await db
      .from('candidates').select('id').eq('clerk_user_id', req.userId).single();
    if (!candidate) return res.status(404).json({ error: 'Profile not found' });

    const { data, error: uErr } = await supabase
      .from('talent_pool_members')
      .update({ status: 'left', left_at: new Date().toISOString() })
      .eq('candidate_id', candidate.id)
      .eq('employer_id', employer_id)
      .eq('status', 'active')
      .select('id')
      .maybeSingle();

    if (uErr) throw uErr;
    if (!data) return res.status(409).json({ error: 'No active membership found', code: 'not_member' });

    await auditLog({
      tableName:   'talent_pool_members',
      recordId:    data.id,
      action:      'UPDATE',
      performedBy: req.userId,
      ipAddress:   req.ip,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('POST /me/pool-membership/:employer_id/leave error:', err);
    res.status(500).json({ error: 'Failed to leave pool' });
  }
});

// POST /me/invites/:token/decline — candidate declines a talent pool invite.
router.post('/me/invites/:token/decline', async (req, res) => {
  if (!checkTalentPoolGate(req, res)) return;
  try {
    const { token } = req.params;

    const { data: invite, error: iErr } = await supabase
      .from('talent_pool_invites')
      .select('id, candidate_id, status, token_expires')
      .eq('token', token)
      .maybeSingle();

    if (iErr) throw iErr;
    if (!invite) return res.status(404).json({ error: 'Invite not found' });

    if (new Date(invite.token_expires) < new Date()) {
      return res.status(410).json({ error: 'This invitation has expired', code: 'invite_expired' });
    }

    const db = getClientForUser(req.token);
    const { data: candidate } = await db
      .from('candidates').select('id').eq('clerk_user_id', req.userId).single();
    if (!candidate || candidate.id !== invite.candidate_id) {
      return res.status(403).json({ error: 'Not authorised' });
    }

    if (invite.status !== 'invited') {
      return res.status(409).json({ error: 'Invite is not in invited status', code: 'invalid_status' });
    }

    const { error: uErr } = await supabase
      .from('talent_pool_invites')
      .update({ status: 'declined', responded_at: new Date().toISOString() })
      .eq('id', invite.id);

    if (uErr) throw uErr;

    res.json({ success: true });
  } catch (err) {
    console.error('POST /me/invites/:token/decline error:', err);
    res.status(500).json({ error: 'Failed to decline invite' });
  }
});

module.exports = router;
module.exports.canApply = canApply;
module.exports.isBS7858Ready = isBS7858Ready;
module.exports.refreshBadge = refreshBadge;
