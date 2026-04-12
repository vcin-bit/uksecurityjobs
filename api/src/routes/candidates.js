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

// GET /api/candidates/me/personal — get personal details (decrypts NI)
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

    // Decrypt NI number before sending
    if (personal.ni_number_encrypted) {
      personal.ni_number = await decrypt(personal.ni_number_encrypted);
      delete personal.ni_number_encrypted;
    }

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

// PUT /api/candidates/me/personal — save personal details (encrypts NI)
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
      ni_number,
      bs7858_5yr_eligible, sia_address_match, dvla_address_match
    } = req.body;

    // Encrypt the NI number
    const ni_number_encrypted = ni_number ? await encrypt(ni_number) : undefined;

    const payload = {
      candidate_id: candidate.id,
      first_name, last_name, date_of_birth, phone,
      address_line1, address_line2, city, county, postcode, move_in_date,
      bs7858_5yr_eligible, sia_address_match, dvla_address_match,
      ...(ni_number_encrypted && { ni_number_encrypted })
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

module.exports = router;
