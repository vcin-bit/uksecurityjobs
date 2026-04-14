const express = require('express');
const router = express.Router();
const { supabase, auditLog } = require('../lib/supabase');
const email = require('../lib/email');

// Helper
async function getEmployerId(userId) {
  const { data } = await supabase.from('employers').select('id').eq('clerk_user_id', userId).single();
  return data?.id || null;
}

// GET /api/employers/me
router.get('/me', async (req, res) => {
  try {
    const { data, error } = await supabase.from('employers').select('*').eq('clerk_user_id', req.userId).single();
    if (error && error.code === 'PGRST116') return res.json({ employer: null });
    if (error) throw error;
    res.json({ employer: data });
  } catch(err) { res.status(500).json({ error: 'Failed to fetch employer' }); }
});

// POST /api/employers/me — register as employer
router.post('/me', async (req, res) => {
  try {
    const { company_name, company_number, contact_name, contact_position, contact_email, contact_mobile, contact_office, contact_dd, website, address, postcode, sia_acs } = req.body;
    const { data, error } = await supabase.from('employers').upsert({
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

// GET /api/employers/jobs — get employer's jobs
router.get('/jobs', async (req, res) => {
  try {
    const employerId = await getEmployerId(req.userId);
    if (!employerId) return res.json({ jobs: [] });
    const { data, error } = await supabase.from('jobs').select('*').eq('employer_id', employerId).order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ jobs: data });
  } catch(err) { res.status(500).json({ error: 'Failed to fetch jobs' }); }
});

// POST /api/employers/jobs — post a job
router.post('/jobs', async (req, res) => {
  try {
    const employerId = await getEmployerId(req.userId);
    if (!employerId) return res.status(404).json({ error: 'Employer profile not found' });
    const { data, error } = await supabase.from('jobs').insert({ ...req.body, employer_id: employerId }).select().single();
    if (error) throw error;
    res.json({ success: true, job: data });
  } catch(err) { console.error('POST /employers/jobs error:', err); res.status(500).json({ error: 'Failed to post job' }); }
});

// PUT /api/employers/jobs/:id — update a job
router.put('/jobs/:id', async (req, res) => {
  try {
    const employerId = await getEmployerId(req.userId);
    if (!employerId) return res.status(404).json({ error: 'Not found' });
    const { data, error } = await supabase.from('jobs').update({ ...req.body, updated_at: new Date() })
      .eq('id', req.params.id).eq('employer_id', employerId).select().single();
    if (error) throw error;
    res.json({ success: true, job: data });
  } catch(err) { res.status(500).json({ error: 'Failed to update job' }); }
});

// GET /api/jobs/public — public job listings
router.get('/public', async (req, res) => {
  try {
    const { data, error } = await supabase.from('jobs').select('*, employers(logo_url)').eq('status', 'active').order('created_at', { ascending: false });
    if (error) throw error;
    const jobs = (data || []).map(j => ({ ...j, logo_url: j.employers?.logo_url || null }));
    res.json({ jobs });
  } catch(err) { res.status(500).json({ error: 'Failed to fetch jobs' }); }
});

// GET /api/employers/jobs/:id/applicants — get applicants for a job
router.get('/jobs/:id/applicants', async (req, res) => {
  try {
    const employerId = await getEmployerId(req.userId);
    if (!employerId) return res.status(403).json({ error: 'Not authorised' });

    // Verify job belongs to this employer
    const { data: job } = await supabase.from('jobs').select('id').eq('id', req.params.id).eq('employer_id', employerId).single();
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const { data, error } = await supabase
      .from('job_applications')
      .select(`
        id, status, created_at, interview_date, employer_feedback,
        candidates(id, sia_verified, profile_complete,
          candidate_personal(first_name, last_name, phone, right_to_work_status, visa_expiry),
          candidate_licences(licence_type, expiry_date, verified)
        )
      `)
      .eq('job_id', req.params.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ applicants: data || [] });
  } catch(err) {
    console.error('GET /employers/jobs/:id/applicants error:', err);
    res.status(500).json({ error: 'Failed to fetch applicants' });
  }
});

// PATCH /api/employers/applications/:id — update application status
router.patch('/applications/:id', async (req, res) => {
  try {
    const employerId = await getEmployerId(req.userId);
    if (!employerId) return res.status(403).json({ error: 'Not authorised' });

    const { status, interview_date, employer_feedback, no_show } = req.body;

    // Build update object
    const update = { updated_at: new Date() };
    if (status) update.status = status;
    if (interview_date) update.interview_date = interview_date;
    if (employer_feedback) update.employer_feedback = employer_feedback;

    // Handle no-show — increment candidate strike count
    if (no_show) {
      update.status = 'no_show';
      // Get candidate id from application
      const { data: app } = await supabase.from('job_applications').select('candidate_id').eq('id', req.params.id).single();
      if (app?.candidate_id) {
        const { data: cand } = await supabase.from('candidates').select('no_show_count').eq('id', app.candidate_id).single();
        const newCount = (cand?.no_show_count || 0) + 1;
        const bannedUntil = newCount >= 3 ? '2099-12-31' : newCount === 2 ? new Date(Date.now() + 90*24*60*60*1000).toISOString() : new Date(Date.now() + 30*24*60*60*1000).toISOString();
        await supabase.from('candidates').update({ no_show_count: newCount, banned_until: bannedUntil }).eq('id', app.candidate_id);
      }
    }

    const { data, error } = await supabase.from('job_applications').update(update).eq('id', req.params.id).select().single();
    if (error) throw error;

    // Send status emails
    if (status && data) {
      const { data: job } = await supabase.from('jobs').select('title, employers(company_name)').eq('id', data.job_id).single();
      const { data: cand } = await supabase.from('candidates').select('email, candidate_personal(first_name)').eq('id', data.candidate_id).single();
      if (cand?.email && job) {
        const firstName = cand.candidate_personal?.[0]?.first_name || cand.candidate_personal?.first_name || 'Officer';
        const jobTitle = job.title;
        const companyName = job.employers?.company_name || 'Employer';
        if (status === 'interview_scheduled') {
          email.sendInterviewScheduled({ toEmail: cand.email, firstName, jobTitle, companyName, interviewDate: interview_date }).catch(e => console.error('Interview email failed:', e));
        } else if (status === 'rejected') {
          email.sendApplicationUnsuccessful({ toEmail: cand.email, firstName, jobTitle, companyName }).catch(e => console.error('Rejection email failed:', e));
        }
      }
    }

    res.json({ success: true, application: data });
  } catch(err) {
    console.error('PATCH /employers/applications/:id error:', err);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// GET /api/employers/candidate/:id — get candidate profile for employer (data minimised)
router.get('/candidate/:id', async (req, res) => {
  try {
    const employerId = await getEmployerId(req.userId);
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
      // Personal — no DOB, no full address, no email, no gender, no health
      supabase.from('candidate_personal').select(
        'first_name, last_name, phone, right_to_work_status, visa_expiry'
      ).eq('candidate_id', req.params.id).single(),

      // Licences — type, expiry and verified status only. No licence number.
      supabase.from('candidate_licences').select(
        'licence_type, expiry_date, verified'
      ).eq('candidate_id', req.params.id),

      // Employment — full history for BS7858. Reference contacts included.
      supabase.from('candidate_employment').select(
        'job_title, company_name, start_date, end_date, employment_type, reference_name, reference_phone, reference_email, reason_for_leaving'
      ).eq('candidate_id', req.params.id).order('start_date', { ascending: false }),

      // Addresses — town and county only. No full street address.
      supabase.from('candidate_addresses').select(
        'city, county, moved_in_date, moved_out_date'
      ).eq('candidate_id', req.params.id).order('moved_in_date', { ascending: false }),

      // Qualifications — all relevant
      supabase.from('candidate_qualifications').select(
        'first_aid_level, languages, sia_trainer, security_clearance, additional_certs'
      ).eq('candidate_id', req.params.id).single(),

      // Sectors and availability
      supabase.from('candidate_sectors').select(
        'sectors, preferred_shift, travel_radius, available_from'
      ).eq('candidate_id', req.params.id).single(),

      // Driving — type and vehicle access only
      supabase.from('candidate_driving').select(
        'licence_type, own_vehicle, travel_radius'
      ).eq('candidate_id', req.params.id).single(),

      // Candidate meta — verified status and score only
      supabase.from('candidates').select(
        'id, sia_verified, profile_complete, vettability_score, created_at'
      ).eq('id', req.params.id).single(),
    ]);

    await auditLog(req.userId, 'employer_view_candidate', {
      candidate_id: req.params.id,
      employer_id: employerId,
      fields_accessed: 'data_minimised_employer_view'
    });

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

// POST /api/jobs/apply — candidate applies for a job
router.post('/apply', async (req, res) => {
  try {
    const { job_id } = req.body;
    if (!job_id) return res.status(400).json({ error: 'job_id required' });

    // Get candidate id
    const { data: candidate } = await supabase
      .from('candidates').select('id').eq('clerk_user_id', req.userId).single();
    if (!candidate) return res.status(404).json({ error: 'Candidate profile not found' });

    const { data, error } = await supabase.from('job_applications').insert({
      job_id, candidate_id: candidate.id, status: 'applied'
    }).select().single();

    if (error && error.code === '23505') return res.status(400).json({ error: 'Already applied' });
    if (error) throw error;

    // Get job and employer details for emails
    const { data: job } = await supabase.from('jobs').select('title, location, employer_id, employers(contact_email, company_name)').eq('id', job_id).single();
    const { data: candPersonal } = await supabase.from('candidate_personal').select('first_name, last_name').eq('candidate_id', candidate.id).single();
    const { data: candMain } = await supabase.from('candidates').select('email').eq('id', candidate.id).single();

    if (job && candMain?.email) {
      // Email candidate confirmation
      email.sendApplicationConfirmation({
        toEmail: candMain.email,
        firstName: candPersonal?.first_name || 'Officer',
        jobTitle: job.title,
        companyName: job.employers?.company_name || 'Employer',
        location: job.location || '',
      }).catch(e => console.error('Application email failed:', e));

      // Email employer new applicant
      if (job.employers?.contact_email) {
        email.sendNewApplicant({
          toEmail: job.employers.contact_email,
          companyName: job.employers.company_name,
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

// POST /api/employers/logo — upload employer logo
router.post('/logo', async (req, res) => {
  try {
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
    const { error: updateError } = await supabase
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
