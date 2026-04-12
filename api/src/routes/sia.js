const express = require('express');
const router = express.Router();
const { supabase, encrypt, decrypt, auditLog } = require('../lib/supabase');

// GET /api/sia — get all SIA licences for current candidate
router.get('/', async (req, res) => {
  try {
    const { data: candidate } = await supabase
      .from('candidates')
      .select('id')
      .eq('clerk_user_id', req.userId)
      .single();

    if (!candidate) return res.status(404).json({ error: 'Profile not found' });

    const { data: licences, error } = await supabase
      .from('sia_licences')
      .select('*')
      .eq('candidate_id', candidate.id);

    if (error) throw error;

    // Decrypt licence numbers
    const decrypted = await Promise.all(licences.map(async (lic) => {
      const licence_number = await decrypt(lic.licence_number_encrypted);
      const { licence_number_encrypted, ...rest } = lic;
      return { ...rest, licence_number };
    }));

    res.json({ licences: decrypted });
  } catch (err) {
    console.error('GET /sia error:', err);
    res.status(500).json({ error: 'Failed to fetch licences' });
  }
});

// POST /api/sia — add a new SIA licence
router.post('/', async (req, res) => {
  try {
    const { data: candidate } = await supabase
      .from('candidates')
      .select('id')
      .eq('clerk_user_id', req.userId)
      .single();

    if (!candidate) return res.status(404).json({ error: 'Profile not found' });

    // Check max 3 licences
    const { count } = await supabase
      .from('sia_licences')
      .select('*', { count: 'exact', head: true })
      .eq('candidate_id', candidate.id);

    if (count >= 3) {
      return res.status(400).json({ error: 'Maximum 3 SIA licences allowed' });
    }

    const { licence_number, licence_type, expiry_date } = req.body;

    const licence_number_encrypted = await encrypt(licence_number);

    const { data: licence, error } = await supabase
      .from('sia_licences')
      .insert({
        candidate_id: candidate.id,
        licence_number_encrypted,
        licence_type,
        expiry_date,
        verified: false
      })
      .select()
      .single();

    if (error) throw error;

    await auditLog({
      tableName: 'sia_licences',
      recordId: licence.id,
      action: 'INSERT',
      performedBy: req.userId,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, id: licence.id });
  } catch (err) {
    console.error('POST /sia error:', err);
    res.status(500).json({ error: 'Failed to add licence' });
  }
});

module.exports = router;
