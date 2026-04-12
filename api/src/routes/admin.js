const express = require('express');
const router = express.Router();
const { supabase, decrypt, auditLog } = require('../lib/supabase');

// GET /admin/candidates — list all candidates with profile status
router.get('/candidates', async (req, res) => {
  try {
    const { data: candidates, error } = await supabase
      .from('candidates')
      .select('*, personal_details(first_name, last_name, postcode), sia_licences(id, licence_type, expiry_date, verified, verified_at)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ candidates });
  } catch (err) {
    console.error('Admin GET /candidates error:', err);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

// GET /admin/sia/queue — all unverified SIA licences
router.get('/sia/queue', async (req, res) => {
  try {
    const { data: licences, error } = await supabase
      .from('sia_licences')
      .select('*, candidates(clerk_user_id, email, personal_details(first_name, last_name))')
      .eq('verified', false)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Decrypt licence numbers for admin view
    const decrypted = await Promise.all(licences.map(async (lic) => {
      const licence_number = await decrypt(lic.licence_number_encrypted).catch(() => '[decryption failed]');
      const { licence_number_encrypted, ...rest } = lic;
      return { ...rest, licence_number };
    }));

    res.json({ queue: decrypted });
  } catch (err) {
    console.error('Admin GET /sia/queue error:', err);
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

// POST /admin/sia/:id/verify — mark a licence as verified
router.post('/sia/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const { data, error } = await supabase
      .from('sia_licences')
      .update({
        verified: true,
        verified_at: new Date().toISOString(),
        verified_by: 'admin',
        verification_notes: notes || 'Verified against SIA register'
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await auditLog({
      tableName: 'sia_licences',
      recordId: id,
      action: 'UPDATE',
      performedBy: 'admin',
      ipAddress: req.ip,
      changes: { verified: true }
    });

    res.json({ success: true, licence: data });
  } catch (err) {
    console.error('Admin POST /sia/:id/verify error:', err);
    res.status(500).json({ error: 'Failed to verify licence' });
  }
});

// POST /admin/sia/:id/reject — reject a licence
router.post('/sia/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const { data, error } = await supabase
      .from('sia_licences')
      .update({
        verified: false,
        verified_at: new Date().toISOString(),
        verified_by: 'admin',
        verification_notes: notes || 'Rejected — could not verify against SIA register'
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await auditLog({
      tableName: 'sia_licences',
      recordId: id,
      action: 'UPDATE',
      performedBy: 'admin',
      ipAddress: req.ip,
      changes: { verified: false, rejected: true }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Admin POST /sia/:id/reject error:', err);
    res.status(500).json({ error: 'Failed to reject licence' });
  }
});

// GET /admin/candidate/:id — full candidate detail
router.get('/candidate/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [candidateRes, personalRes, siaRes, drivingRes, sectorsRes, qualsRes, bgRes, empRes, addrRes, auditRes] = await Promise.allSettled([
      supabase.from('candidates').select('*').eq('id', id).single(),
      supabase.from('personal_details').select('*').eq('candidate_id', id).single(),
      supabase.from('sia_licences').select('*').eq('candidate_id', id),
      supabase.from('driving_details').select('*').eq('candidate_id', id).single(),
      supabase.from('preferred_sectors').select('*').eq('candidate_id', id).single(),
      supabase.from('qualifications').select('*').eq('candidate_id', id).single(),
      supabase.from('professional_background').select('*').eq('candidate_id', id).single(),
      supabase.from('employment_history').select('*').eq('candidate_id', id).order('start_date', { ascending: false }),
      supabase.from('address_history').select('*').eq('candidate_id', id).order('moved_in_date', { ascending: false }),
      supabase.from('audit_log').select('*').eq('record_id', id).order('performed_at', { ascending: false }).limit(20),
    ]);

    // Decrypt sensitive fields
    let personal = personalRes.status === 'fulfilled' ? personalRes.value.data : null;
    if (personal?.ni_number_encrypted) {
      personal.ni_number = await decrypt(personal.ni_number_encrypted).catch(() => '[decryption failed]');
      delete personal.ni_number_encrypted;
    }

    let licences = siaRes.status === 'fulfilled' ? siaRes.value.data : [];
    licences = await Promise.all((licences || []).map(async (lic) => {
      const licence_number = await decrypt(lic.licence_number_encrypted).catch(() => '[decryption failed]');
      const { licence_number_encrypted, ...rest } = lic;
      return { ...rest, licence_number };
    }));

    let background = bgRes.status === 'fulfilled' ? bgRes.value.data : null;
    if (background?.criminal_record_encrypted) {
      background.criminal_record = await decrypt(background.criminal_record_encrypted).catch(() => '[decryption failed]');
      delete background.criminal_record_encrypted;
    }

    await auditLog({
      tableName: 'candidates',
      recordId: id,
      action: 'READ',
      performedBy: 'admin',
      ipAddress: req.ip
    });

    res.json({
      candidate: candidateRes.status === 'fulfilled' ? candidateRes.value.data : null,
      personal,
      licences,
      driving: drivingRes.status === 'fulfilled' ? drivingRes.value.data : null,
      sectors: sectorsRes.status === 'fulfilled' ? sectorsRes.value.data : null,
      qualifications: qualsRes.status === 'fulfilled' ? qualsRes.value.data : null,
      background,
      employment: empRes.status === 'fulfilled' ? empRes.value.data : [],
      addresses: addrRes.status === 'fulfilled' ? addrRes.value.data : [],
      audit: auditRes.status === 'fulfilled' ? auditRes.value.data : [],
    });
  } catch (err) {
    console.error('Admin GET /candidate/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch candidate' });
  }
});

// GET /admin/stats — dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const [totalRes, verifiedRes, pendingRes, completeRes] = await Promise.allSettled([
      supabase.from('candidates').select('*', { count: 'exact', head: true }),
      supabase.from('sia_licences').select('*', { count: 'exact', head: true }).eq('verified', true),
      supabase.from('sia_licences').select('*', { count: 'exact', head: true }).eq('verified', false),
      supabase.from('candidates').select('*', { count: 'exact', head: true }).eq('profile_complete', true),
    ]);

    res.json({
      total_candidates: totalRes.status === 'fulfilled' ? totalRes.value.count : 0,
      verified_licences: verifiedRes.status === 'fulfilled' ? verifiedRes.value.count : 0,
      pending_verification: pendingRes.status === 'fulfilled' ? pendingRes.value.count : 0,
      complete_profiles: completeRes.status === 'fulfilled' ? completeRes.value.count : 0,
    });
  } catch (err) {
    console.error('Admin GET /stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
