const express = require('express');
const router = express.Router();
const { supabase, getClientForUser, encrypt, decrypt, auditLog } = require('../lib/supabase');
const email = require('../lib/email');

router.get('/_debug_jwt', async (req, res) => {
  try {
    const db = getClientForUser(req.token);
    const { data, error } = await db.rpc('debug_jwt');
    res.json({ rpc_data: data, rpc_error: error, userId: req.userId });
  } catch (e) {
    res.json({ caught: e.message, userId: req.userId });
  }
});

router.get('/_debug_select', async (req, res) => {
  const db = getClientForUser(req.token);
  const { data, error } = await db.from('sia_licences')
    .select('id, candidate_id, licence_number_encrypted');
  res.json({
    count: (data||[]).length,
    error,
    enc_present: (data||[]).map(r => ({
      id: r.id,
      enc_is_null: r.licence_number_encrypted == null,
      enc_len: (r.licence_number_encrypted||'').length
    }))
  });
});

// GET /api/sia
router.get('/', async (req, res) => {
  try {
    const db = getClientForUser(req.token);
    const { data: candidate } = await db
      .from('candidates').select('id').eq('clerk_user_id', req.userId).single();
    if (!candidate) return res.json({ licences: [] });

    const { data: licences, error } = await db
      .from('sia_licences').select('*').eq('candidate_id', candidate.id);
    if (error) throw error;

    const decrypted = await Promise.all((licences||[]).map(async (lic) => {
      let licence_number = '';
      try { licence_number = await decrypt(lic.licence_number_encrypted); }
      catch (e) { console.error('SIA decrypt error:', e.message, '| encrypted value:', JSON.stringify(lic.licence_number_encrypted)); }
      const { licence_number_encrypted, ...rest } = lic;
      return { ...rest, licence_number };
    }));

    res.json({ licences: decrypted });
  } catch (err) {
    console.error('GET /sia error:', err);
    res.status(500).json({ error: 'Failed to fetch licences' });
  }
});

// PUT /api/sia — upsert all licences for this candidate (replaces POST)
router.put('/', async (req, res) => {
  try {
    const db = getClientForUser(req.token);
    const { data: candidate } = await db
      .from('candidates').select('id').eq('clerk_user_id', req.userId).single();
    if (!candidate) return res.status(404).json({ error: 'Profile not found' });

    const { licences } = req.body;
    if (!Array.isArray(licences)) return res.status(400).json({ error: 'licences must be array' });

    // Delete existing licences and re-insert (simplest upsert for small arrays)
    await db.from('sia_licences').delete().eq('candidate_id', candidate.id);

    for (const lic of licences) {
      if (!lic.licence_number && !lic.number) continue;
      const num = lic.licence_number || lic.number;
      const type = lic.licence_type || lic.type;
      const expiry = lic.expiry_date || lic.expiry;
      if (!num || !type) continue;

      const licence_number_encrypted = await encrypt(num);
      await db.from('sia_licences').insert({
        candidate_id: candidate.id,
        licence_number_encrypted,
        licence_type: type,
        expiry_date: expiry || null,
        verified: false
      });
    }

    await auditLog({ tableName: 'sia_licences', recordId: candidate.id, action: 'UPDATE', performedBy: req.userId, ipAddress: req.ip });

    // Notify admin of new verification requests
    if (licences.length > 0) {
      const { data: personal } = await db.from('personal_details').select('first_name, last_name').eq('candidate_id', candidate.id).single();
      const candidateName = personal ? `${personal.first_name || ''} ${personal.last_name || ''}`.trim() : 'Unknown';
      const firstLicence = licences[0];
      email.sendAdminSiaRequest({
        candidateName,
        licenceType: firstLicence.licence_type || firstLicence.type || 'Unknown',
        licenceNumber: firstLicence.licence_number || firstLicence.number || 'Not provided',
      }).catch(e => console.error('Admin SIA email failed:', e));
    }

    res.json({ success: true });
  } catch (err) {
    console.error('PUT /sia error:', err);
    res.status(500).json({ error: 'Failed to save licences' });
  }
});

// Keep POST for backward compatibility
router.post('/', async (req, res) => {
  try {
    const db = getClientForUser(req.token);
    const { data: candidate } = await db
      .from('candidates').select('id').eq('clerk_user_id', req.userId).single();
    if (!candidate) return res.status(404).json({ error: 'Profile not found' });

    const { licence_number, licence_type, expiry_date } = req.body;
    if (!licence_number || !licence_type) return res.status(400).json({ error: 'licence_number and licence_type required' });

    const licence_number_encrypted = await encrypt(licence_number);
    const { data: licence, error } = await db.from('sia_licences').insert({
      candidate_id: candidate.id, licence_number_encrypted, licence_type, expiry_date: expiry_date || null, verified: false
    }).select().single();

    if (error) throw error;
    res.status(201).json({ success: true, id: licence.id });
  } catch (err) {
    console.error('POST /sia error:', err);
    res.status(500).json({ error: 'Failed to add licence' });
  }
});

module.exports = router;
