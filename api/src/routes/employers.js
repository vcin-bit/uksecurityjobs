const express = require('express');
const router = express.Router();
const { supabase, getClientForUser, auditLog } = require('../lib/supabase');
const email = require('../lib/email');

// Helper
async function getEmployerId(client, userId) {
  const { data } = await client.from('employers').select('id').eq('clerk_user_id', userId).single();
  return data?.id || null;
}

// GET /api/employers/me
router.get('/me', async (req, res) => {
  try {
    const db = getClientForUser(req.token);
    const { data, error } = await db.from('employers').select('*').eq('clerk_user_id', req.userId).single();
    if (error && error.code === 'PGRST116') return res.json({ employer: null });
    if (error) throw error;
    res.json({ employer: data });
  } catch(err) { res.status(500).json({ error: 'Failed to fetch employer' }); }
});

// POST /api/employers/me — register as employer
router.post('/me', async (req, res) => {
  try {
    const db = getClientForUser(req.token);
    const { company_name, company_number, contact_name, contact_position, contact_email, contact_mobile, contact_office, contact_dd, website, address, postcode, sia_acs } = req.body;
    const { data, error } = await db.from('employers').upsert({
      clerk_user_id: req.userId, company_name, company_number, contact_name, contact_position, contact_email, contact_mobile, contact_office, contact_dd, website, address, postcode, sia_acs
    }, { onConflict: 'clerk_user_id' }).select().single();
    if (error) throw error;
    // Send welcome email
    if (data) {
      email.sendEmployerWelcome({
        toEmail: data.contact_email,
        companyName: data.company_name,
        contactName: data.contact_name,
      }).catch(err => console.error('Welcome email failed:', err));
    }
    res.json({ success: true, employer: data });
  } catch(err) { console.error('POST /employers/me error:', err); res.status(500).json({ error: 'Failed to save employer' }); }
});

// GET /api/employers/jobs — get employer's jobs with applicant counts
router.get('/jobs', async (req, res) => {
  try {
    const db = getClientForUser(req.token);
    const employerId = await getEmployerId(db, req.userId);
    if (!employerId) return res.json({ jobs: [] });
    const { data, error } = await db
      .from('jobs')
      .select('*, job_applications(count)')
      .eq('employer_id', employerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ jobs: data });
  } catch(err) { res.status(500).json({ error: 'Failed to fetch jobs' }); }
});

// POST /api/employers/jobs — post a job (first job free, subsequent require payment)
router.post('/jobs', async (req, res) => {
  try {
    const db = getClientForUser(req.token);
    const employerId = await getEmployerId(db, req.userId);
    if (!employerId) return res.status(404).json({ error: 'Employer profile not found' });

    // Check how many jobs this employer has posted
    const { count } = await db
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('employer_id', employerId);

    // Gate: first job free, subsequent jobs require payment
    if (count > 0) {
      return res.status(402).json({
        error: 'payment_required',
        message: 'Your free job posting has been used. Contact us to post additional jobs.',
        jobs_posted: count,
      });
    }

    const expires_at = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await db.from('jobs').insert({
      ...req.body,
      employer_id: employerId,
      status: 'active',
      expires_at,
      created_at: new Date().toISOString()
    }).select().single();
    if (error) throw error;
    await auditLog({ tableName: 'jobs', recordId: data.id, action: 'INSERT', performedBy: req.userId, ipAddress: req.ip, changes: { title: data.title } });
    res.json({ success: true, job: data, free_job_used: true });
  } catch(err) { console.error('POST /employers/jobs error:', err); res.status(500).json({ error: 'Failed to post job' }); }
});

// PUT /api/employers/jobs/:id — update a job
router.put('/jobs/:id', async (req, res) => {
  try {
    const db = getClientForUser(req.token);
    const employerId = await getEmployerId(db, req.userId);
    if (!employerId) return res.status(404).json({ error: 'Not found' });
    const { data, error } = await db.from('jobs')
      .update({ ...req.body, updated_at: new Date() })
      .eq('id', req.params.id).eq('employer_id', employerId).select().single();
    if (error) throw error;
    res.json({ success: true, job: data });
  } catch(err) { res.status(500).json({ error: 'Failed to update job' }); }
});

// PATCH /api/employers/jobs/:id/status — change job status
router.patch('/jobs/:id/status', async (req, res) => {
  try {
    const db = getClientForUser(req.token);
    const employerId = await getEmployerId(db, req.userId);
    if (!employerId) return res.status(403).json({ error: 'Not authorised' });
    const { status, pause_reason, pause_notes } = req.body;
    const validStatuses = ['active', 'paused', 'ended'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const validPauseReasons = ['Role filled externally','Role filled via UKSecurityJobs','Budget freeze','Role requirements changed','On hold — internal review','Other'];
    if (status === 'paused' && !pause_reason) return res.status(400).json({ error: 'pause_reason required' });
    if (status === 'paused' && !validPauseReasons.includes(pause_reason)) return res.status(400).json({ error: 'Invalid pause reason' });
    const update = {
      status, updated_at: new Date().toISOString(),
      ...(status === 'paused' && { pause_reason, pause_notes: pause_notes||null, paused_at: new Date().toISOString() }),
      ...(status === 'ended' && { ended_at: new Date().toISOString() }),
      ...(status === 'active' && { pause_reason: null, pause_notes: null, paused_at: null }),
    };
    const { data, error } = await db.from('jobs').update(update).eq('id', req.params.id).eq('employer_id', employerId).select().single();
    if (error) throw error;
    await auditLog({ tableName: 'jobs', recordId: req.params.id, action: 'UPDATE', performedBy: req.userId, ipAddress: req.ip, changes: { status, pause_reason: pause_reason || null } });
    res.json({ success: true, job: data });
  } catch(err) { console.error('PATCH /employers/jobs/:id/status error:', err); res.status(500).json({ error: 'Failed to update job status' }); }
});

// GET /api/jobs/public — public listing, no user session — service client
router.get('/public', async (req, res) => {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('jobs')
      .select('*, employers(company_name, logo_url, sia_acs)')
      .eq('status', 'active')
      .or(`expires_at.gt.${now},expires_at.is.null`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ jobs: data || [] });
  } catch(err) { res.status(500).json({ error: 'Failed to fetch jobs' }); }
});

// GET /api/employers/jobs/:id/applicants — cross-user candidate read, ownership checked in code — service client
router.get('/jobs/:id/applicants', async (req, res) => {
  try {
    const employerId = await getEmployerId(supabase, req.userId);
    if (!employerId) return res.status(403).json({ error: 'Not authorised' });

    // Verify job belongs to this employer
    const { data: job } = await supabase.from('jobs').select('id').eq('id', req.params.id).eq('employer_id', employerId).single();
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const { data, error } = await supabase
      .from('job_applications')
      .select(`
        id, status, applied_at,
        candidates(id, profile_complete,
          personal_details(first_name, last_name, phone),
          sia_licences(licence_type, expiry_date, verified)
        )
      `)
      .eq('job_id', req.params.id)
      .order('applied_at', { ascending: false });

    if (error) throw error;
    const applicants = (data || []).map(a => ({ ...a, created_at: a.applied_at }));
    res.json({ applicants });
  } catch(err) {
    console.error('GET /employers/jobs/:id/applicants error:', err);
    res.status(500).json({ error: 'Failed to fetch applicants' });
  }
});

// PATCH /api/employers/applications/:id — cross-user candidate read/write, ownership checked in code — service client
router.patch('/applications/:id', async (req, res) => {
  try {
    const employerId = await getEmployerId(supabase, req.userId);
    if (!employerId) return res.status(403).json({ error: 'Not authorised' });

    // Verify this application belongs to a job owned by this employer
    const { data: appCheck } = await supabase
      .from('job_applications')
      .select('id, jobs!inner(employer_id)')
      .eq('id', req.params.id)
      .single();
    if (!appCheck || appCheck.jobs?.employer_id !== employerId) {
      return res.status(403).json({ error: 'Not authorised' });
    }

    const {
      status,
      interview_date,
      interview_location,
      interview_format,       // in_person | video | phone
      interview_notes,        // notes for candidate
      employer_feedback,
      interview_score,        // 1-100 composite score
      interview_scores,       // JSON object with criteria scores
      no_show
    } = req.body;

    const validStatuses = ['applied','shortlisted','interview_proposed','interview_confirmed','interview_completed','offered','rejected','no_show','withdrawn'];
    if (status && !validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const update = { updated_at: new Date() };
    if (status) update.status = status;
    if (interview_date) update.interview_date = interview_date;
    if (interview_location) update.interview_location = interview_location;
    if (interview_format) update.interview_format = interview_format;
    if (interview_notes) update.interview_notes = interview_notes;
    if (employer_feedback) update.employer_feedback = employer_feedback;
    if (interview_score) update.interview_score = interview_score;
    if (interview_scores) update.interview_scores = interview_scores;

    // No-show — increment strike count and apply ban
    if (no_show) {
      update.status = 'no_show';
      const { data: app } = await supabase.from('job_applications').select('candidate_id').eq('id', req.params.id).single();
      if (app?.candidate_id) {
        const { data: cand } = await supabase.from('candidates').select('no_show_count').eq('id', app.candidate_id).single();
        const newCount = (cand?.no_show_count || 0) + 1;
        const bannedUntil = newCount >= 3
          ? '2099-12-31'
          : newCount === 2
            ? new Date(Date.now() + 90*24*60*60*1000).toISOString()
            : new Date(Date.now() + 30*24*60*60*1000).toISOString();
        await supabase.from('candidates').update({ no_show_count: newCount, banned_until: bannedUntil }).eq('id', app.candidate_id);
      }
    }

    const { data, error } = await supabase.from('job_applications').update(update).eq('id', req.params.id).select().single();
    if (error) throw error;

    // Send status emails
    if ((status || no_show) && data) {
      const { data: job } = await supabase.from('jobs').select('title, employers(company_name)').eq('id', data.job_id).single();
      const { data: cand } = await supabase.from('candidates').select('email, personal_details(first_name)').eq('id', data.candidate_id).single();
      if (cand?.email && job) {
        const firstName = cand.personal_details?.[0]?.first_name || cand.personal_details?.first_name || 'Officer';
        const jobTitle = job.title;
        const companyName = job.employers?.company_name || 'Employer';
        const effectiveStatus = no_show ? 'no_show' : status;
        if (effectiveStatus === 'interview_proposed' || effectiveStatus === 'interview_confirmed') {
          email.sendInterviewScheduled({ toEmail: cand.email, firstName, jobTitle, companyName, interviewDate: interview_date, interviewLocation: interview_location, interviewFormat: interview_format, interviewNotes: interview_notes }).catch(e => console.error('Interview email failed:', e));
        } else if (effectiveStatus === 'rejected') {
          email.sendApplicationUnsuccessful({ toEmail: cand.email, firstName, jobTitle, companyName }).catch(e => console.error('Rejection email failed:', e));
        } else if (effectiveStatus === 'shortlisted') {
          // Build profile gap warnings for personalised shortlist email
          const profileGaps = [];
          const { data: licences } = await supabase.from('sia_licences').select('verified').eq('candidate_id', cand.id);
          const licencePending = licences?.some(l => !l.verified);
          if (licencePending) profileGaps.push('Your SIA licence is pending platform verification — bring your physical licence card');
          const { data: addrs } = await supabase.from('address_history').select('proof_types,electoral_roll').eq('candidate_id', cand.id);
          if (addrs?.some(a => !a.proof_types?.length)) profileGaps.push('Some addresses have no evidence declared — bring additional proof of address documents');
          if (addrs?.some(a => a.electoral_roll === false)) profileGaps.push('One or more addresses not on electoral roll — bring alternative proof (bank statement, utility bill)');
          email.sendShortlisted({
            toEmail: cand.email, firstName, jobTitle, companyName,
            profileGaps,
            licencePending: !!licencePending,
            rtwStatus: '',
          }).catch(e => console.error('Shortlist email failed:', e));
        }
      }
    }

    await auditLog({ tableName: 'job_applications', recordId: req.params.id, action: 'UPDATE', performedBy: req.userId, ipAddress: req.ip, changes: { status: status || (no_show ? 'no_show' : null) } });
    res.json({ success: true, application: data });
  } catch(err) {
    console.error('PATCH /employers/applications/:id error:', err);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// GET /api/employers/candidate/:id — cross-user candidate profile read, ownership checked in code — service client
router.get('/candidate/:id', async (req, res) => {
  try {
    const employerId = await getEmployerId(supabase, req.userId);
    if (!employerId) return res.status(403).json({ error: 'Not authorised' });

    // Verify this candidate has applied for one of their jobs
    const { data: application } = await supabase
      .from('job_applications')
      .select('id, job_id, jobs!inner(employer_id)')
      .eq('candidate_id', req.params.id)
      .eq('jobs.employer_id', employerId)
      .limit(1)
      .single();

    if (!application) return res.status(403).json({ error: 'Not authorised to view this candidate' });

    // Fetch each table with explicit field selection — data minimisation per GDPR Article 5(1)(c)
    const [
      { data: personal },
      { data: licences },
      { data: employment },
      { data: addresses },
      { data: qualifications },
      { data: sectors },
      { data: driving },
      { data: candidate }
    ] = await Promise.all([
      // Personal — no DOB, no full address, no email
      supabase.from('personal_details').select(
        'first_name, last_name, phone'
      ).eq('candidate_id', req.params.id).single(),

      // Licences — type, expiry and verified status only. No licence number.
      supabase.from('sia_licences').select(
        'licence_type, expiry_date, verified'
      ).eq('candidate_id', req.params.id),

      // Employment — full history for BS7858. Reference contacts included.
      supabase.from('employment_history').select(
        'job_title, employer_name, start_date, end_date, is_current, reference_name, reference_phone, reference_email, reason_for_leaving'
      ).eq('candidate_id', req.params.id).order('start_date', { ascending: false }),

      // Addresses — include proof declarations for vetting summary
      supabase.from('address_history').select(
        'address_line1, address_line2, city, county, postcode, country, moved_in_date, moved_out_date, is_current, occupancy_type, proof_types, electoral_roll'
      ).eq('candidate_id', req.params.id).order('moved_in_date', { ascending: false }),

      // Qualifications — all relevant
      supabase.from('qualifications').select(
        'frec_level, has_efaw, has_faw, first_aid_expiry, languages, is_sia_trainer, security_clearance, other_qualifications'
      ).eq('candidate_id', req.params.id).single(),

      // Sectors and availability
      supabase.from('preferred_sectors').select(
        'sectors, preferred_shift, available_from, min_hourly_rate'
      ).eq('candidate_id', req.params.id).single(),

      // Driving — type and vehicle access only
      supabase.from('driving_details').select(
        'licence_type, has_own_vehicle, travel_radius_miles'
      ).eq('candidate_id', req.params.id).single(),

      // Candidate meta — verified status and score only
      supabase.from('candidates').select(
        'id, profile_complete, created_at'
      ).eq('id', req.params.id).single(),
    ]);

    await auditLog({ tableName: 'candidates', recordId: req.params.id, action: 'READ', performedBy: req.userId, ipAddress: req.ip, changes: { employer_id: employerId, fields_accessed: 'data_minimised_employer_view' } });

    res.json({
      candidate: {
        ...candidate,
        personal,
        licences: licences || [],
        employment: employment || [],
        addresses: addresses || [],
        qualifications,
        sectors,
        driving,
      }
    });
  } catch(err) {
    console.error('GET /employers/candidate/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch candidate' });
  }
});

module.exports = router;

// POST /api/jobs/apply — candidate applies for a job (candidate's own data)
router.post('/apply', async (req, res) => {
  try {
    const db = getClientForUser(req.token);
    const { job_id, cover_note } = req.body;
    if (!job_id) return res.status(400).json({ error: 'job_id required' });

    // Get candidate id
    const { data: candidate } = await db
      .from('candidates').select('id').eq('clerk_user_id', req.userId).single();
    if (!candidate) return res.status(404).json({ error: 'Candidate profile not found' });

    const { data, error } = await db.from('job_applications').insert({
      job_id,
      candidate_id: candidate.id,
      status: 'applied',
      cover_note: cover_note || null,
    }).select().single();

    if (error && error.code === '23505') return res.status(400).json({ error: 'Already applied' });
    if (error) throw error;

    // Get job and employer details for emails
    const { data: job } = await db.from('jobs').select('title, location, employer_id').eq('id', job_id).maybeSingle();
    const { data: candPersonal } = await db.from('personal_details').select('first_name, last_name').eq('candidate_id', candidate.id).single();
    const { data: candMain } = await db.from('candidates').select('email').eq('id', candidate.id).single();
    const candidateEmail = candMain?.email || req.userEmail || '';

    // Server-side employer lookup for notification emails — never returned to client
    const { data: emp } = job?.employer_id
      ? await supabase.from('employers').select('contact_email, company_name').eq('id', job.employer_id).maybeSingle()
      : { data: null };

    if (job) {
      // Email candidate confirmation
      email.sendApplicationConfirmation({
        toEmail: candidateEmail,
        firstName: candPersonal?.first_name || 'Officer',
        jobTitle: job.title,
        companyName: emp?.company_name || 'Employer',
        location: job.location || '',
      }).catch(e => console.error('Application email failed:', e));

      // Email employer new applicant
      if (emp?.contact_email) {
        email.sendNewApplicant({
          toEmail: emp.contact_email,
          companyName: emp.company_name || 'Employer',
          jobTitle: job.title,
          candidateFirstName: candPersonal?.first_name || 'Candidate',
        }).catch(e => console.error('New applicant email failed:', e));
      }
    }

    res.json({ success: true, application: data });
  } catch(err) {
    console.error('POST /jobs/apply error:', err);
    res.status(500).json({ error: 'Failed to apply' });
  }
});

// POST /api/employers/logo — employer's own data (storage stays on service client)
router.post('/logo', async (req, res) => {
  try {
    const db = getClientForUser(req.token);
    const { base64, mimeType, fileName } = req.body;
    if (!base64 || !mimeType) return res.status(400).json({ error: 'No file provided' });

    // Decode base64
    const buffer = Buffer.from(base64, 'base64');
    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    const path = `${req.userId}.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('employer-logos')
      .upload(path, buffer, { contentType: mimeType, upsert: true });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('employer-logos')
      .getPublicUrl(path);

    // Save URL to employers table
    const { error: updateError } = await db
      .from('employers')
      .update({ logo_url: publicUrl })
      .eq('clerk_user_id', req.userId);

    if (updateError) throw updateError;

    res.json({ success: true, logo_url: publicUrl });
  } catch (err) {
    console.error('POST /employers/logo error:', err);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

// ── INTERVIEW SLOT SYSTEM ──────────────────────────────────────────────

// POST /api/employers/jobs/:jobId/interview-slots — cross-user candidate data via joins, ownership checked in code — service client
router.post('/jobs/:jobId/interview-slots', async (req, res) => {
  try {
    const employerId = await getEmployerId(supabase, req.userId);
    if (!employerId) return res.status(403).json({ error: 'Not authorised' });

    const { slots, interviewer_name, interviewer_phone, interviewer_email, location, format, notes_for_candidate, application_ids } = req.body;

    if (!slots?.length) return res.status(400).json({ error: 'At least one slot required' });
    if (!interviewer_name || !interviewer_phone) return res.status(400).json({ error: 'Interviewer name and phone required' });
    if (!application_ids?.length) return res.status(400).json({ error: 'Select at least one candidate' });

    // Verify job belongs to employer
    const { data: job } = await supabase.from('jobs').select('id, title, employer_id').eq('id', req.params.jobId).eq('employer_id', employerId).single();
    if (!job) return res.status(403).json({ error: 'Not authorised' });

    // Create slots in DB
    const slotRows = slots.map(s => ({
      job_id: req.params.jobId,
      employer_id: employerId,
      slot_datetime: s.datetime,
      status: 'available',
      interviewer_name,
      interviewer_phone,
      interviewer_email: interviewer_email || null,
      location: location || null,
      format: format || 'in_person',
      notes_for_candidate: notes_for_candidate || null,
    }));

    const { data: createdSlots, error: slotErr } = await supabase.from('interview_slots').insert(slotRows).select();
    if (slotErr) throw slotErr;

    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    // Get employer company name
    const { data: employer } = await supabase.from('employers').select('company_name').eq('id', employerId).single();

    let emailsSent = 0;

    // Send email to each candidate
    for (const appId of application_ids) {
      const { data: app } = await supabase
        .from('job_applications')
        .select('id, candidate_id, candidates(email, personal_details(first_name, last_name))')
        .eq('id', appId)
        .single();

      if (!app) continue;

      const firstName = app.candidates?.personal_details?.[0]?.first_name || app.candidates?.personal_details?.first_name || 'Officer';
      const candidateEmail = app.candidates?.email;
      if (!candidateEmail) continue;

      // Generate secure token for this candidate
      const crypto = require('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      // Store token against application
      await supabase.from('job_applications').update({
        interview_token: token,
        interview_token_expires: tokenExpiry,
        status: 'interview_proposed'
      }).eq('id', appId);

      // Build slot buttons for email
      const slotButtons = createdSlots.map((slot, i) => {
        const dt = new Date(slot.slot_datetime);
        const label = dt.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' }) + ' at ' + dt.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
        const confirmUrl = `https://uksecurityjobs-api.onrender.com/api/employers/confirm-slot/${slot.id}?token=${token}&app=${appId}`;
        return `<div style="margin-bottom:10px;">
          <a href="${confirmUrl}" style="display:inline-block;background:#1a52a8;color:#fff;font-weight:700;font-size:14px;padding:10px 20px;border-radius:8px;text-decoration:none;">
            Option ${i+1}: ${label}
          </a>
        </div>`;
      }).join('');

      await sgMail.send({
        from: { email: 'admin@uksecurityjobs.co.uk', name: 'UKSecurityJobs' },
        to: candidateEmail,
        subject: `Interview Invitation — ${job.title} at ${employer?.company_name || 'Employer'}`,
        html: `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f9fafb;margin:0;padding:0;">
<div style="max-width:600px;margin:0 auto;padding:2rem 1rem;">
  <div style="text-align:center;padding:1.25rem 0 1rem;">
    <a href="https://www.uksecurityjobs.co.uk" style="font-size:1.2rem;font-weight:800;text-decoration:none;">
      <span style="color:#1a52a8;">UK</span><span style="color:#0b1222;">Security</span><span style="color:#1a52a8;">Jobs</span>
    </a>
  </div>
  <div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:2rem;">
    <h1 style="font-size:1.2rem;font-weight:800;color:#0b1222;margin:0 0 0.5rem;">Interview Invitation, ${firstName}</h1>
    <p style="font-size:0.92rem;color:#4a5568;margin:0 0 1.5rem;line-height:1.75;">
      <strong>${employer?.company_name || 'The employer'}</strong> would like to invite you to interview for the role of <strong>${job.title}</strong>. Please select one of the available times below.
    </p>

    <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:1rem 1.25rem;margin-bottom:1.5rem;font-size:0.85rem;color:#854d0e;line-height:1.75;">
      <strong>Professional conduct — please read before confirming:</strong><br/>
      By selecting an interview slot you are making a firm commitment to attend at that time. Failure to attend without at least 24 hours notice will result in a formal no-show recorded against your profile and may result in suspension from the platform. This platform operates to professional standards. If you cannot attend, click the decline link below — do not simply fail to show up.
    </div>

    <p style="font-size:0.9rem;font-weight:700;color:#0b1222;margin:0 0 1rem;">Select your preferred time:</p>
    ${slotButtons}

    <div style="margin-top:1.5rem;padding-top:1.25rem;border-top:1px solid #e2e8f0;">
      <p style="font-size:0.85rem;color:#4a5568;margin:0 0 0.5rem;"><strong>Format:</strong> ${format === 'video' ? 'Video call' : format === 'phone' ? 'Phone call' : 'In person'}</p>
      ${location ? `<p style="font-size:0.85rem;color:#4a5568;margin:0 0 0.5rem;"><strong>Location / Link:</strong> ${location}</p>` : ''}
      ${notes_for_candidate ? `<p style="font-size:0.85rem;color:#4a5568;margin:0 0 0.5rem;"><strong>Notes:</strong> ${notes_for_candidate}</p>` : ''}
    </div>

    <div style="margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid #e2e8f0;">
      <p style="font-size:0.85rem;color:#4a5568;margin:0 0 0.5rem;">Cannot attend any of these times?</p>
      <a href="https://uksecurityjobs-api.onrender.com/api/employers/decline-interview?token=${token}&app=${appId}" style="font-size:0.85rem;color:#dc2626;font-weight:600;">Decline interview →</a>
    </div>
  </div>
  <div style="text-align:center;padding:1.25rem 0;font-size:0.75rem;color:#94a3b8;">
    &copy; 2026 UKSecurityJobs.co.uk &mdash; Digital Software Group Ltd
  </div>
</div>
</body></html>`
      });

      emailsSent++;
    }

    res.json({ success: true, slots_created: createdSlots.length, emails_sent: emailsSent });
  } catch(err) {
    console.error('POST /interview-slots error:', err);
    res.status(500).json({ error: 'Failed to create interview slots' });
  }
});

// POST /api/employers/applications/:id/no-show — cross-user write to candidates, ownership checked in code — service client
router.post('/applications/:id/no-show', async (req, res) => {
  try {
    const employerId = await getEmployerId(supabase, req.userId);
    if (!employerId) return res.status(403).json({ error: 'Not authorised' });

    const { data: app } = await supabase
      .from('job_applications')
      .select('id, candidate_id, jobs(employer_id, title), candidates(email, personal_details(first_name))')
      .eq('id', req.params.id).single();

    if (!app || app.jobs?.employer_id !== employerId) return res.status(403).json({ error: 'Not authorised' });

    // Record no-show
    await supabase.from('job_applications').update({ status: 'no_show', no_show_reported_at: new Date().toISOString() }).eq('id', req.params.id);

    // Check existing no-shows for this candidate
    const { count: noShowCount } = await supabase
      .from('job_applications')
      .select('*', { count: 'exact', head: true })
      .eq('candidate_id', app.candidate_id)
      .eq('status', 'no_show');

    const suspended = noShowCount >= 2;
    if (suspended) {
      await supabase.from('candidates').update({ suspended: true, suspension_reason: 'multiple_no_shows', suspended_at: new Date().toISOString() }).eq('id', app.candidate_id);
    }

    // Email the candidate
    const firstName = app.candidates?.personal_details?.first_name || app.candidates?.personal_details?.[0]?.first_name || 'Officer';
    const candidateEmail = app.candidates?.email;
    if (candidateEmail) {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      await sgMail.send({
        from: { email: 'admin@uksecurityjobs.co.uk', name: 'UKSecurityJobs' },
        to: candidateEmail,
        subject: suspended ? 'Your account has been suspended — UKSecurityJobs' : 'No-show recorded on your profile — UKSecurityJobs',
        html: `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f9fafb;margin:0;padding:0;">
<div style="max-width:580px;margin:0 auto;padding:2rem 1rem;">
  <div style="background:#fff;border-radius:12px;border:1px solid #fecaca;padding:2rem;">
    <h1 style="font-size:1.1rem;font-weight:800;color:#dc2626;margin:0 0 1rem;">${suspended ? 'Account Suspended' : 'No-Show Recorded'}</h1>
    <p style="font-size:0.92rem;color:#4a5568;line-height:1.8;margin:0 0 1rem;">
      ${firstName}, a no-show has been recorded against your profile for your interview for <strong>${app.jobs?.title}</strong>.
    </p>
    ${suspended
      ? `<p style="font-size:0.92rem;color:#dc2626;line-height:1.8;margin:0 0 1rem;font-weight:700;">This is your second no-show. Your account has been suspended. To appeal, contact admin@uksecurityjobs.co.uk.</p>`
      : `<p style="font-size:0.92rem;color:#854d0e;line-height:1.8;margin:0 0 1rem;background:#fef9c3;padding:1rem;border-radius:8px;">This is your first recorded no-show. A second no-show will result in automatic suspension from the platform. If this was recorded in error, contact admin@uksecurityjobs.co.uk immediately.</p>`
    }
    <p style="font-size:0.85rem;color:#94a3b8;margin:0;">UKSecurityJobs operates to professional standards. All candidates are expected to honour confirmed interview commitments.</p>
  </div>
</div>
</body></html>`
      }).catch(() => {});
    }

    res.json({ success: true, no_show_count: noShowCount, suspended });
  } catch(err) {
    console.error('no-show error:', err);
    res.status(500).json({ error: 'Failed to record no-show' });
  }
});

// POST /api/employers/applications/:id/feedback — cross-user, ownership checked in code — service client
router.post('/applications/:id/feedback', async (req, res) => {
  try {
    const employerId = await getEmployerId(supabase, req.userId);
    if (!employerId) return res.status(403).json({ error: 'Not authorised' });

    const { attended, punctual, professional_presentation, would_proceed, notes, overall_rating } = req.body;

    const { data: app } = await supabase
      .from('job_applications')
      .select('id, candidate_id, jobs(employer_id, title)')
      .eq('id', req.params.id).single();

    if (!app || app.jobs?.employer_id !== employerId) return res.status(403).json({ error: 'Not authorised' });

    const { error } = await supabase.from('interview_feedback').insert({
      application_id: req.params.id,
      candidate_id: app.candidate_id,
      employer_id: employerId,
      attended: attended !== false,
      punctual: punctual || null,
      professional_presentation: professional_presentation || null,
      would_proceed: would_proceed || null,
      notes: notes || null,
      overall_rating: overall_rating || null,
      created_at: new Date().toISOString(),
    });

    if (error) throw error;

    await supabase.from('job_applications').update({
      status: attended === false ? 'no_show' : would_proceed ? 'interview_completed' : 'rejected',
      employer_feedback: notes || null,
    }).eq('id', req.params.id);

    res.json({ success: true });
  } catch(err) {
    console.error('feedback error:', err);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});
