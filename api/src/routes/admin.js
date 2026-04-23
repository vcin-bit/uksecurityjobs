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
    const { ids } = req.body;

    let query = supabase.from('waitlist').select('*');
    if (ids && ids.length > 0) query = query.in('id', ids);
    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) return res.status(400).json({ error: 'No recipients found' });

    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    let sent = 0, failed = 0;

    for (const person of data) {
      try {
        await sgMail.send({
          from: { email: 'admin@uksecurityjobs.co.uk', name: 'David Foster — UKSecurityJobs' },
          to: person.email,
          subject: `Thank you for registering — an honest update`,
          html: `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f9fafb;margin:0;padding:0;">
<div style="max-width:580px;margin:0 auto;padding:2rem 1rem;">

  <div style="text-align:center;padding:1.5rem 0 1rem;">
    <a href="https://www.uksecurityjobs.co.uk" style="font-size:1.25rem;font-weight:800;text-decoration:none;">
      <span style="color:#1a52a8;">UK</span><span style="color:#0b1222;">Security</span><span style="color:#1a52a8;">Jobs</span>
    </a>
  </div>

  <div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:2rem;">

    <h1 style="font-size:1.2rem;font-weight:800;color:#0b1222;margin:0 0 1.25rem;">Thank you, ${person.first_name}.</h1>

    <p style="font-size:0.95rem;color:#4a5568;line-height:1.85;margin:0 0 1rem;">
      You registered your interest in UKSecurityJobs and I wanted to write to you personally to say thank you — and to be straight with you about where we are.
    </p>

    <p style="font-size:0.95rem;color:#4a5568;line-height:1.85;margin:0 0 1rem;">
      The platform is built. The profile system, the SIA licence verification, the BS7858-ready vetting profiles, the employer dashboard, the interview scheduling — it is all there and working.
    </p>

    <p style="font-size:0.95rem;color:#4a5568;line-height:1.85;margin:0 0 1rem;">
      But we have a classic chicken and egg problem. Employers want to see candidates before they post jobs. Candidates want to see jobs before they register. Someone has to move first.
    </p>

    <p style="font-size:0.95rem;color:#4a5568;line-height:1.85;margin:0 0 1.5rem;">
      You already have. You are one of 17 people who registered early — which means you understand what this platform is trying to do and you believe it is worth doing. That matters more than you might think.
    </p>

    <div style="background:#f8fafc;border-left:4px solid #1a52a8;border-radius:0 8px 8px 0;padding:1rem 1.25rem;margin:1.5rem 0;font-size:0.92rem;color:#334155;line-height:1.8;">
      <strong style="color:#0b1222;display:block;margin-bottom:0.5rem;">What UKSecurityJobs is trying to do:</strong>
      The security industry deserves a platform built for it — not a generic job board that treats a security professional the same as any other job seeker. Every candidate on this platform holds a valid SIA licence and has a complete, BS7858-ready profile. Employers get quality. Candidates get treated like the professionals they are.
    </div>

    <p style="font-size:0.95rem;color:#4a5568;line-height:1.85;margin:0 0 1rem;">
      Here is what would genuinely help right now. If you know a security company, a contract manager, an operations director, or anyone who hires SIA-licensed staff — tell them about this platform. We are offering the first job posting free with no commitment. That is the fastest way to break the deadlock.
    </p>

    <p style="font-size:0.95rem;color:#4a5568;line-height:1.85;margin:0 0 1rem;">
      And if you have not yet built your profile — do it now. It takes about 20 minutes, you will never have to fill in a job application form again, and when employers start posting you will be first in line.
    </p>

    <p style="font-size:0.95rem;color:#4a5568;line-height:1.85;margin:0 0 1.5rem;">
      If you know anyone working in security — officers, supervisors, managers, close protection — please share this with them. The more verified professionals we have on the platform, the stronger the case becomes for employers to post their vacancies here. Every person you tell makes a difference.
    </p>

    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:1rem 1.25rem;margin:0 0 1.5rem;font-size:0.88rem;color:#0369a1;line-height:1.7;">
      <strong>Share the early access link:</strong><br/>
      <a href="https://www.uksecurityjobs.co.uk/early-access" style="color:#1a52a8;font-weight:700;">www.uksecurityjobs.co.uk/early-access</a><br/>
      Anyone in the security industry can register. SIA licence holders only.
    </div>

    <div style="text-align:center;margin:1.75rem 0;">
      <a href="https://app.uksecurityjobs.co.uk/sign-up" style="display:inline-block;background:#0b1222;color:#fff;font-weight:700;font-size:0.95rem;padding:0.875rem 2.25rem;border-radius:10px;text-decoration:none;margin-bottom:0.75rem;">
        Build My Profile &rarr;
      </a>
      <br/>
      <a href="https://www.uksecurityjobs.co.uk/employers" style="display:inline-block;background:#fff;color:#1a52a8;font-weight:700;font-size:0.88rem;padding:0.65rem 1.75rem;border-radius:10px;text-decoration:none;border:1px solid #bfdbfe;margin-top:0.5rem;">
        Share with an Employer &rarr;
      </a>
    </div>

    <p style="font-size:0.88rem;color:#64748b;line-height:1.75;margin:1.25rem 0 0;">
      Any questions at all — just reply to this email. I read and respond to every one personally.
    </p>

    <p style="font-size:0.88rem;color:#64748b;margin:0.75rem 0 0;">
      David Foster<br/>
      Founder, UKSecurityJobs.co.uk<br/>
      Digital Software Group Ltd
    </p>

  </div>

  <div style="text-align:center;padding:1.5rem 0;font-size:0.75rem;color:#94a3b8;">
    You registered your interest at uksecurityjobs.co.uk.<br/>
    <a href="https://www.uksecurityjobs.co.uk/unsubscribe?email=${encodeURIComponent(person.email)}" style="color:#94a3b8;">Unsubscribe</a><br/>
    &copy; 2026 UKSecurityJobs.co.uk &mdash; Digital Software Group Ltd
  </div>

</div>
</body></html>`
        });
        sent++;
      } catch(e) {
        console.error(`Failed to send to ${person.email}:`, e.message);
        failed++;
      }
    }

    res.json({ sent, failed, total: data.length });
  } catch(err) {
    console.error('Launch email error:', err);
    res.status(500).json({ error: 'Failed to send launch emails' });
  }
});

module.exports = router;
