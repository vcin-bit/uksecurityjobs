const express = require('express');
const router = express.Router();
const email = require('../lib/email');
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
    const [totalRes, verifiedRes, pendingRes, completeRes, waitlistRes] = await Promise.allSettled([
      supabase.from('candidates').select('*', { count: 'exact', head: true }),
      supabase.from('sia_licences').select('*', { count: 'exact', head: true }).eq('verified', true),
      supabase.from('sia_licences').select('*', { count: 'exact', head: true }).eq('verified', false),
      supabase.from('candidates').select('*', { count: 'exact', head: true }).eq('profile_complete', true),
      supabase.from('waitlist').select('*', { count: 'exact', head: true }),
    ]);

    res.json({
      total_candidates: totalRes.status === 'fulfilled' ? totalRes.value.count : 0,
      verified_licences: verifiedRes.status === 'fulfilled' ? verifiedRes.value.count : 0,
      pending_verification: pendingRes.status === 'fulfilled' ? pendingRes.value.count : 0,
      complete_profiles: completeRes.status === 'fulfilled' ? completeRes.value.count : 0,
      waitlist_signups: waitlistRes.status === 'fulfilled' ? waitlistRes.value.count : 0,
    });
  } catch (err) {
    console.error('Admin GET /stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /admin/waitlist — list all waitlist signups
router.get('/waitlist', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('waitlist')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ waitlist: data || [] });
  } catch (err) {
    console.error('Admin GET /waitlist error:', err);
    res.status(500).json({ error: 'Failed to fetch waitlist' });
  }
});

// GET /admin/waitlist/export — CSV export
router.get('/waitlist/export', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('waitlist')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const rows = ['First Name,Last Name,Email,Licence Type,Region,Registered'];
    (data || []).forEach(r => {
      rows.push(`"${r.first_name}","${r.last_name || ''}","${r.email}","${r.licence_type}","${r.region}","${new Date(r.created_at).toLocaleDateString('en-GB')}"`);
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="uksecurityjobs-waitlist.csv"');
    res.send(rows.join('\n'));
  } catch (err) {
    console.error('Admin GET /waitlist/export error:', err);
    res.status(500).json({ error: 'Failed to export waitlist' });
  }
});

// POST /admin/waitlist/launch-email — send launch email to all or selected
router.post('/waitlist/launch-email', async (req, res) => {
  try {
    const { ids } = req.body; // optional array of specific IDs, or empty for all

    let query = supabase.from('waitlist').select('*');
    if (ids && ids.length > 0) {
      query = query.in('id', ids);
    }
    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) return res.status(400).json({ error: 'No recipients found' });

    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    let sent = 0;
    let failed = 0;

    for (const person of data) {
      try {
        await sgMail.send({
          from: { email: 'admin@uksecurityjobs.co.uk', name: 'David at UKSecurityJobs' },
          to: person.email,
          subject: "We're live — you're first",
          html: `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f9fafb;margin:0;padding:0;">
<div style="max-width:580px;margin:0 auto;padding:2rem 1rem;">
  <div style="text-align:center;padding:1.5rem 0 1rem;">
    <a href="https://www.uksecurityjobs.co.uk" style="font-size:1.25rem;font-weight:800;text-decoration:none;">
      <span style="color:#1a52a8;">UK</span><span style="color:#0b1222;">Security</span><span style="color:#1a52a8;">Jobs</span>
    </a>
  </div>
  <div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:2rem;">
    <h1 style="font-size:1.3rem;font-weight:800;color:#0b1222;margin:0 0 1rem;">We're live, ${person.first_name}.</h1>
    <p style="font-size:0.95rem;color:#4a5568;line-height:1.8;margin:0 0 1rem;">
      You registered your interest in UKSecurityJobs a while back. Today we're opening the platform.
    </p>
    <p style="font-size:0.95rem;color:#4a5568;line-height:1.8;margin:0 0 1.5rem;">
      As someone on our early access list, you're first through the door. Register now, build your profile and get your ${person.licence_type} licence verified — so you're ready to apply the moment employers start posting.
    </p>
    <div style="text-align:center;margin:1.75rem 0;">
      <a href="https://app.uksecurityjobs.co.uk/sign-up" style="display:inline-block;background:#0b1222;color:#fff;font-weight:700;font-size:1rem;padding:0.875rem 2.5rem;border-radius:10px;text-decoration:none;">
        Complete Your Profile &rarr;
      </a>
    </div>
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:1rem 1.25rem;margin:1.25rem 0;font-size:0.88rem;color:#0369a1;line-height:1.7;">
      <strong>What happens when you register:</strong><br/>
      1. Build your 11-step verified profile<br/>
      2. Your SIA licence is checked against the SIA register<br/>
      3. Your BS7858 employment history is structured and ready<br/>
      4. Verified employers can find and contact you directly
    </div>
    <p style="font-size:0.85rem;color:#94a3b8;margin:1rem 0 0;line-height:1.65;">
      Questions? Reply to this email or contact <a href="mailto:admin@uksecurityjobs.co.uk" style="color:#1a52a8;">admin@uksecurityjobs.co.uk</a>
    </p>
  </div>
  <div style="text-align:center;padding:1.5rem 0;font-size:0.75rem;color:#94a3b8;">
    You registered your interest at uksecurityjobs.co.uk. 
    <a href="https://www.uksecurityjobs.co.uk/unsubscribe?email=${encodeURIComponent(person.email)}" style="color:#94a3b8;">Unsubscribe</a><br/>
    &copy; 2026 UKSecurityJobs.co.uk &mdash; Digital Software Group Ltd
  </div>
</div>
</body></html>`
        });
        sent++;
      } catch (e) {
        console.error(`Failed to send to ${person.email}:`, e.message);
        failed++;
      }
    }

    res.json({ sent, failed, total: data.length });
  } catch (err) {
    console.error('Launch email error:', err);
    res.status(500).json({ error: 'Failed to send launch emails' });
  }
});

module.exports = router;
