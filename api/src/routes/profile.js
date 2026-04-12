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

    const { data, error } = await supabase
      .from('driving_details')
      .upsert({ ...req.body, candidate_id: candidateId }, { onConflict: 'candidate_id' })
      .select().single();

    if (error) throw error;
    await auditLog({ tableName: 'driving_details', recordId: data.id, action: 'UPDATE', performedBy: req.userId, ipAddress: req.ip });
    res.json({ success: true });
  } catch (err) {
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

    const { data, error } = await supabase
      .from('preferred_sectors')
      .upsert({ ...req.body, candidate_id: candidateId }, { onConflict: 'candidate_id' })
      .select().single();

    if (error) throw error;
    await auditLog({ tableName: 'preferred_sectors', recordId: data.id, action: 'UPDATE', performedBy: req.userId, ipAddress: req.ip });
    res.json({ success: true });
  } catch (err) {
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

    const { data, error } = await supabase
      .from('qualifications')
      .upsert({ ...req.body, candidate_id: candidateId }, { onConflict: 'candidate_id' })
      .select().single();

    if (error) throw error;
    await auditLog({ tableName: 'qualifications', recordId: data.id, action: 'UPDATE', performedBy: req.userId, ipAddress: req.ip });
    res.json({ success: true });
  } catch (err) {
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

    const { criminal_record, ...rest } = req.body;

    const criminal_record_encrypted = criminal_record
      ? await encrypt(criminal_record)
      : undefined;

    const payload = {
      ...rest,
      candidate_id: candidateId,
      ...(criminal_record_encrypted && { criminal_record_encrypted })
    };

    const { data, error } = await supabase
      .from('professional_background')
      .upsert(payload, { onConflict: 'candidate_id' })
      .select().single();

    if (error) throw error;
    await auditLog({ tableName: 'professional_background', recordId: data.id, action: 'UPDATE', performedBy: req.userId, ipAddress: req.ip });
    res.json({ success: true });
  } catch (err) {
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
