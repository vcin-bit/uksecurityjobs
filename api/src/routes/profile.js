const express = require('express');
const router = express.Router();
const { supabase, encrypt, decrypt, auditLog } = require('../lib/supabase');

// Helper to get candidate ID from Clerk user ID
async function getCandidateId(userId) {
  const { data, error } = await supabase
    .from('candidates')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();
  if (error || !data) return null;
  return data.id;
}

// --- DRIVING DETAILS ---
router.get('/driving', async (req, res) => {
  try {
    const candidateId = await getCandidateId(req.userId);
    if (!candidateId) return res.status(404).json({ error: 'Profile not found' });

    const { data, error } = await supabase
      .from('driving_details')
      .select('*')
      .eq('candidate_id', candidateId)
      .single();

    if (error && error.code === 'PGRST116') return res.json({ driving: null });
    if (error) throw error;

    res.json({ driving: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch driving details' });
  }
});

router.put('/driving', async (req, res) => {
  try {
    const candidateId = await getCandidateId(req.userId);
    if (!candidateId) return res.status(404).json({ error: 'Profile not found' });

    const b = req.body;
    const payload = {
      candidate_id: candidateId,
      has_driving_licence: b.has_driving_licence ?? false,
      licence_type: b.licence_type || null,
      endorsement_codes: b.endorsement_codes || [],
      has_ban_history: b.has_ban_history ?? false,
      has_own_vehicle: b.has_own_vehicle ?? false,
      vehicle_insured: b.vehicle_insured ?? false,
      vehicle_taxed: b.vehicle_taxed ?? false,
      vehicle_mot_valid: b.vehicle_mot_valid ?? false,
      travel_radius_miles: b.travel_radius_miles || null,
      willing_to_relocate: b.willing_to_relocate ?? false,
    };

    const { data, error } = await supabase
      .from('driving_details')
      .upsert(payload, { onConflict: 'candidate_id' })
      .select().single();

    if (error) throw error;
    await auditLog({ tableName: 'driving_details', recordId: data.id, action: 'UPDATE', performedBy: req.userId, ipAddress: req.ip });
    res.json({ success: true });
  } catch (err) {
    console.error('PUT /driving error:', err);
    res.status(500).json({ error: 'Failed to save driving details' });
  }
});

// --- PREFERRED SECTORS ---
router.get('/sectors', async (req, res) => {
  try {
    const candidateId = await getCandidateId(req.userId);
    if (!candidateId) return res.status(404).json({ error: 'Profile not found' });

    const { data, error } = await supabase
      .from('preferred_sectors')
      .select('*')
      .eq('candidate_id', candidateId)
      .single();

    if (error && error.code === 'PGRST116') return res.json({ sectors: null });
    if (error) throw error;
    res.json({ sectors: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sectors' });
  }
});

router.put('/sectors', async (req, res) => {
  try {
    const candidateId = await getCandidateId(req.userId);
    if (!candidateId) return res.status(404).json({ error: 'Profile not found' });

    const b = req.body;
    const payload = {
      candidate_id: candidateId,
      sectors: b.sectors || [],
      preferred_shift: b.preferred_shift || null,
      employment_type: b.employmentType || null,
      availability: Array.isArray(b.availability) ? b.availability : [],
      shift_lengths: b.shiftType || [],
      available_from: b.available_from || null,
      min_hourly_rate: b.min_hourly_rate || null,
    };

    const { data, error } = await supabase
      .from('preferred_sectors')
      .upsert(payload, { onConflict: 'candidate_id' })
      .select().single();

    if (error) throw error;
    await auditLog({ tableName: 'preferred_sectors', recordId: data.id, action: 'UPDATE', performedBy: req.userId, ipAddress: req.ip });
    res.json({ success: true });
  } catch (err) {
    console.error('PUT /sectors error:', err);
    res.status(500).json({ error: 'Failed to save sectors' });
  }
});

// --- QUALIFICATIONS ---
router.get('/qualifications', async (req, res) => {
  try {
    const candidateId = await getCandidateId(req.userId);
    if (!candidateId) return res.status(404).json({ error: 'Profile not found' });

    const { data, error } = await supabase
      .from('qualifications')
      .select('*')
      .eq('candidate_id', candidateId)
      .single();

    if (error && error.code === 'PGRST116') return res.json({ qualifications: null });
    if (error) throw error;
    res.json({ qualifications: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch qualifications' });
  }
});

router.put('/qualifications', async (req, res) => {
  try {
    const candidateId = await getCandidateId(req.userId);
    if (!candidateId) return res.status(404).json({ error: 'Profile not found' });

    const b = req.body;
    const payload = {
      candidate_id: candidateId,
      frec_level: b.frec_level || b.frecLevel || null,
      has_efaw: b.has_efaw ?? b.hasEfaw ?? false,
      has_faw: b.has_faw ?? b.hasFaw ?? false,
      first_aid_expiry: b.first_aid_expiry || null,
      languages: b.languages || [],
      is_sia_trainer: b.is_sia_trainer ?? b.isSIATrainer ?? false,
      security_clearance: b.security_clearance || b.clearanceLevel || null,
      other_qualifications: b.other_qualifications || null,
    };

    const { data, error } = await supabase
      .from('qualifications')
      .upsert(payload, { onConflict: 'candidate_id' })
      .select().single();

    if (error) throw error;
    await auditLog({ tableName: 'qualifications', recordId: data.id, action: 'UPDATE', performedBy: req.userId, ipAddress: req.ip });
    res.json({ success: true });
  } catch (err) {
    console.error('PUT /qualifications error:', err);
    res.status(500).json({ error: 'Failed to save qualifications' });
  }
});

// --- PROFESSIONAL BACKGROUND ---
router.get('/background', async (req, res) => {
  try {
    const candidateId = await getCandidateId(req.userId);
    if (!candidateId) return res.status(404).json({ error: 'Profile not found' });

    const { data, error } = await supabase
      .from('professional_background')
      .select('*')
      .eq('candidate_id', candidateId)
      .single();

    if (error && error.code === 'PGRST116') return res.json({ background: null });
    if (error) throw error;

    // Decrypt criminal record if present
    if (data.criminal_record_encrypted) {
      data.criminal_record = await decrypt(data.criminal_record_encrypted);
      delete data.criminal_record_encrypted;
    }

    res.json({ background: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch professional background' });
  }
});

router.put('/background', async (req, res) => {
  try {
    const candidateId = await getCandidateId(req.userId);
    if (!candidateId) return res.status(404).json({ error: 'Profile not found' });

    const b = req.body;
    const criminal_record_encrypted = b.criminal_record
      ? await encrypt(b.criminal_record) : undefined;

    const payload = {
      candidate_id: candidateId,
      served_in_forces: b.served_in_forces ?? b.hasForces === 'yes' ?? false,
      forces_branch: b.forces_branch || b.forcesBranch || null,
      forces_rank: b.forces_rank || b.forcesRank || null,
      years_served: b.years_served || b.yearsServed || null,
      discharge_type: b.discharge_type || b.dischargeType || null,
      has_criminal_record: b.has_criminal_record ?? b.hasCriminal === 'yes' ?? false,
      ...(criminal_record_encrypted && { criminal_record_encrypted }),
    };

    const { data, error } = await supabase
      .from('professional_background')
      .upsert(payload, { onConflict: 'candidate_id' })
      .select().single();

    if (error) throw error;
    await auditLog({ tableName: 'professional_background', recordId: data.id, action: 'UPDATE', performedBy: req.userId, ipAddress: req.ip });
    res.json({ success: true });
  } catch (err) {
    console.error('PUT /background error:', err);
    res.status(500).json({ error: 'Failed to save professional background' });
  }
});

// --- ADDRESS HISTORY ---
router.get('/addresses', async (req, res) => {
  try {
    const candidateId = await getCandidateId(req.userId);
    if (!candidateId) return res.status(404).json({ error: 'Profile not found' });

    const { data, error } = await supabase
      .from('address_history')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('moved_in_date', { ascending: false });

    if (error) throw error;
    res.json({ addresses: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch address history' });
  }
});

router.post('/addresses', async (req, res) => {
  try {
    const candidateId = await getCandidateId(req.userId);
    if (!candidateId) return res.status(404).json({ error: 'Profile not found' });

    const { data, error } = await supabase
      .from('address_history')
      .insert({ ...req.body, candidate_id: candidateId })
      .select().single();

    if (error) throw error;
    await auditLog({ tableName: 'address_history', recordId: data.id, action: 'INSERT', performedBy: req.userId, ipAddress: req.ip });
    res.status(201).json({ success: true, id: data.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save address' });
  }
});

// --- EMPLOYMENT HISTORY ---
router.get('/employment', async (req, res) => {
  try {
    const candidateId = await getCandidateId(req.userId);
    if (!candidateId) return res.status(404).json({ error: 'Profile not found' });

    const { data, error } = await supabase
      .from('employment_history')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('start_date', { ascending: false });

    if (error) throw error;
    res.json({ employment: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch employment history' });
  }
});

router.post('/employment', async (req, res) => {
  try {
    const candidateId = await getCandidateId(req.userId);
    if (!candidateId) return res.status(404).json({ error: 'Profile not found' });

    const { data, error } = await supabase
      .from('employment_history')
      .insert({ ...req.body, candidate_id: candidateId })
      .select().single();

    if (error) throw error;
    await auditLog({ tableName: 'employment_history', recordId: data.id, action: 'INSERT', performedBy: req.userId, ipAddress: req.ip });
    res.status(201).json({ success: true, id: data.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save employment' });
  }
});

module.exports = router;
