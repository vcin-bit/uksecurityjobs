const express = require('express');
const router = express.Router();
const { supabase, encrypt, decrypt, auditLog } = require('../lib/supabase');

// GET /api/candidates/me — get the current candidate's profile, create if doesn't exist
router.get('/me', async (req, res) => {
  try {
    let { data: candidate, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('clerk_user_id', req.userId)
      .single();

    // Auto-create candidate record on first login if it doesn't exist
    if (error && error.code === 'PGRST116') {
      const { data: newCandidate, error: createError } = await supabase
        .from('candidates')
        .insert({
          clerk_user_id: req.userId,
          email: req.userEmail || '',
          gdpr_consent: false,
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
    const { email, gdpr_consent } = req.body;

    if (!gdpr_consent) {
      return res.status(400).json({ error: 'GDPR consent is required' });
    }

    const { data: candidate, error } = await supabase
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
    const { profile_step } = req.body;

    const { data: candidate, error } = await supabase
      .from('candidates')
      .update({ profile_step })
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

// GET /api/candidates/me/personal — get personal details
router.get('/me/personal', async (req, res) => {
  try {
    const { data: candidate } = await supabase
      .from('candidates')
      .select('id')
      .eq('clerk_user_id', req.userId)
      .single();

    if (!candidate) return res.status(404).json({ error: 'Profile not found' });

    const { data: personal, error } = await supabase
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
    const { data: candidate } = await supabase
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

    const { data: personal, error } = await supabase
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
    const { whyHire, proudOf, availability, salary } = req.body;
    const interview_answers = {
      whyHire: whyHire || null,
      proudOf: proudOf || null,
      availability: availability || null,
      salary: salary || null,
    };

    const { data: candidate, error } = await supabase
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
    const { data: candidate } = await supabase
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
      supabase.from('sia_licences').select('*').eq('candidate_id', candidate.id),
      supabase.from('personal_details').select('*').eq('candidate_id', candidate.id).single(),
      supabase.from('driving_details').select('*').eq('candidate_id', candidate.id).single(),
      supabase.from('preferred_sectors').select('*').eq('candidate_id', candidate.id).single(),
      supabase.from('qualifications').select('*').eq('candidate_id', candidate.id).single(),
      supabase.from('professional_background').select('*').eq('candidate_id', candidate.id).single(),
      supabase.from('employment_history').select('*').eq('candidate_id', candidate.id).order('start_date', { ascending: false }),
      supabase.from('address_history').select('*').eq('candidate_id', candidate.id).order('moved_in_date', { ascending: false }),
    ]);

    res.json({
      candidate,
      licences: siaRes.data || [],
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
    const { data: candidate } = await supabase.from('candidates').select('id').eq('clerk_user_id', req.userId).single();
    if (!candidate) return res.json({ applications: [] });

    const { data, error } = await supabase
      .from('job_applications')
      .select(`id, status, applied_at, interview_slot_id,
        jobs(id, title, location, rate_from, rate_to, rate_type, contract_type,
          employers(company_name, logo_url)
        ),
        interview_slots(slot_datetime)`)
      .eq('candidate_id', candidate.id)
      .order('applied_at', { ascending: false });

    if (error) throw error;
    const applications = (data || []).map(a => ({
      ...a,
      created_at: a.applied_at,
      interview_date: a.interview_slots?.slot_datetime || null
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
    const { availability_status, available_from } = req.body;
    const valid = ['available', 'available_from', 'not_available'];
    if (!valid.includes(availability_status)) return res.status(400).json({ error: 'Invalid status' });

    const { data: candidate } = await supabase.from('candidates').select('id').eq('clerk_user_id', req.userId).single();
    if (!candidate) return res.status(404).json({ error: 'Profile not found' });

    const { error } = await supabase.from('candidates').update({
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
    const { data: candidate } = await supabase.from('candidates').select('id').eq('clerk_user_id', req.userId).single();
    if (!candidate) return res.status(404).json({ error: 'Profile not found' });

    const id = candidate.id;

    // Delete all candidate data in order (child tables first)
    await supabase.from('job_applications').delete().eq('candidate_id', id);
    await supabase.from('sia_licences').delete().eq('candidate_id', id);
    await supabase.from('personal_details').delete().eq('candidate_id', id);
    await supabase.from('employment_history').delete().eq('candidate_id', id);
    await supabase.from('address_history').delete().eq('candidate_id', id);
    await supabase.from('qualifications').delete().eq('candidate_id', id);
    await supabase.from('preferred_sectors').delete().eq('candidate_id', id);
    await supabase.from('driving_details').delete().eq('candidate_id', id);
    await supabase.from('professional_background').delete().eq('candidate_id', id);
    await supabase.from('candidates').delete().eq('id', id);

    // Log the deletion for GDPR audit trail
    console.log(`GDPR deletion completed for clerk_user_id: ${req.userId} candidate_id: ${id} at ${new Date().toISOString()}`);

    res.json({ success: true });
  } catch(err) {
    console.error('DELETE /candidates/me error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router;
