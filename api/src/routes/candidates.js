const express = require('express');
const router = express.Router();
const { supabase, getClientForUser, encrypt, decrypt, auditLog } = require('../lib/supabase');
const { createClerkClient } = require('@clerk/backend');

// ── Profile completeness helper ──────────────────────────────────────────────
// Single source of truth: a profile is complete when all 8 data areas exist.
// Returns { complete: bool, missing: string[] }.
async function isProfileComplete(db, candidateId) {
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
      const { complete } = await isProfileComplete(db, existing.id);
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

    const result = await isProfileComplete(db, candidate.id);

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

module.exports = router;
module.exports.isProfileComplete = isProfileComplete;
