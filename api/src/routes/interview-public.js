const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');

// GET /api/employers/confirm-slot/:slotId — token-gated, no user session
router.get('/confirm-slot/:slotId', async (req, res) => {
  try {
    const { token, app: appId } = req.query;
    if (!token || !appId) return res.redirect('https://app.uksecurityjobs.co.uk/slot-error?reason=invalid');

    // Validate token
    const { data: application } = await supabase
      .from('job_applications')
      .select('id, candidate_id, interview_token, interview_token_expires, status, candidates(email, personal_details(first_name, last_name)), jobs(title, employer_id, employers(company_name))')
      .eq('id', appId)
      .single();

    if (!application) return res.redirect('https://app.uksecurityjobs.co.uk/slot-error?reason=notfound');
    if (application.interview_token !== token) return res.redirect('https://app.uksecurityjobs.co.uk/slot-error?reason=invalid');
    if (new Date(application.interview_token_expires) < new Date()) return res.redirect('https://app.uksecurityjobs.co.uk/slot-error?reason=expired');
    if (application.status === 'interview_confirmed') return res.redirect('https://app.uksecurityjobs.co.uk/slot-confirmed?already=true');

    // Try to book the slot atomically
    const { data: slot, error: slotErr } = await supabase
      .from('interview_slots')
      .update({ status: 'booked', candidate_id: application.candidate_id, application_id: appId, booked_at: new Date().toISOString() })
      .eq('id', req.params.slotId)
      .eq('status', 'available') // Only succeeds if still available
      .select().single();

    if (slotErr || !slot) {
      return res.redirect('https://app.uksecurityjobs.co.uk/slot-error?reason=taken');
    }

    // Update application status
    await supabase.from('job_applications').update({
      status: 'interview_confirmed',
      interview_slot_id: slot.id,
    }).eq('id', appId);

    // Send confirmation email to candidate
    const firstName = application.candidates?.personal_details?.[0]?.first_name || application.candidates?.personal_details?.first_name || 'Officer';
    const candidateEmail = application.candidates?.email;
    const jobTitle = application.jobs?.title || 'the role';
    const companyName = application.jobs?.employers?.company_name || 'the employer';
    const dt = new Date(slot.slot_datetime);
    const dateLabel = dt.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    const timeLabel = dt.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });

    if (candidateEmail) {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      await sgMail.send({
        from: { email: 'admin@uksecurityjobs.co.uk', name: 'UKSecurityJobs' },
        to: candidateEmail,
        subject: `Interview Confirmed — ${jobTitle}`,
        html: `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f9fafb;margin:0;padding:0;">
<div style="max-width:600px;margin:0 auto;padding:2rem 1rem;">
  <div style="text-align:center;padding:1.25rem 0 1rem;">
    <a href="https://www.uksecurityjobs.co.uk" style="font-size:1.2rem;font-weight:800;text-decoration:none;">
      <span style="color:#1a52a8;">UK</span><span style="color:#0b1222;">Security</span><span style="color:#1a52a8;">Jobs</span>
    </a>
  </div>
  <div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:2rem;">
    <div style="background:#dcfce7;border-radius:8px;padding:1rem;text-align:center;margin-bottom:1.5rem;">
      <div style="font-size:1.1rem;font-weight:800;color:#15803d;">Interview Confirmed</div>
    </div>
    <h1 style="font-size:1.1rem;font-weight:800;color:#0b1222;margin:0 0 1.25rem;">${firstName}, your interview is confirmed.</h1>
    <table style="width:100%;border-collapse:collapse;font-size:0.9rem;margin-bottom:1.5rem;">
      <tr><td style="padding:8px 0;color:#64748b;width:120px;">Role</td><td style="padding:8px 0;font-weight:700;color:#0b1222;">${jobTitle}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">Company</td><td style="padding:8px 0;font-weight:600;color:#0b1222;">${companyName}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">Date</td><td style="padding:8px 0;font-weight:600;color:#0b1222;">${dateLabel}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">Time</td><td style="padding:8px 0;font-weight:600;color:#0b1222;">${timeLabel}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">Format</td><td style="padding:8px 0;font-weight:600;color:#0b1222;">${slot.format === 'video' ? 'Video call' : slot.format === 'phone' ? 'Phone call' : 'In person'}</td></tr>
      ${slot.location ? `<tr><td style="padding:8px 0;color:#64748b;">Location</td><td style="padding:8px 0;font-weight:600;color:#0b1222;">${slot.location}</td></tr>` : ''}
    </table>

    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:1rem 1.25rem;margin-bottom:1.25rem;">
      <div style="font-weight:700;font-size:0.88rem;color:#0369a1;margin-bottom:0.5rem;">Your interviewer contact details</div>
      <div style="font-size:0.88rem;color:#0369a1;line-height:1.75;">
        <strong>${slot.interviewer_name}</strong><br/>
        ${slot.interviewer_phone}<br/>
        ${slot.interviewer_email ? slot.interviewer_email + '<br/>' : ''}
        <em style="font-size:0.82rem;">Only contact your interviewer if there is a genuine emergency. Do not use this to renegotiate the time.</em>
      </div>
    </div>

    ${slot.notes_for_candidate ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:1rem 1.25rem;margin-bottom:1.25rem;font-size:0.88rem;color:#475569;">${slot.notes_for_candidate}</div>` : ''}

    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:1rem 1.25rem;margin-bottom:1.25rem;font-size:0.85rem;color:#7f1d1d;line-height:1.75;">
      <strong>Professional conduct reminder:</strong><br/>
      Attend on time, in professional dress. If you are unable to attend due to a genuine emergency, contact your interviewer immediately using the details above. Failure to attend without prior notice will result in a no-show recorded against your profile and potential suspension from the platform.
    </div>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:1rem 1.25rem;font-size:0.85rem;color:#475569;line-height:1.75;">
      <strong style="color:#0b1222;">What to bring:</strong><br/>
      Your valid SIA licence card &bull; Passport or birth certificate (right to work) &bull; Any address evidence documents you declared on your profile &bull; Proof of National Insurance number if available
    </div>
  </div>
</div>
</body></html>`
      }).catch(e => console.error('Confirmation email failed:', e));
    }

    // Notify employer
    const { data: empData } = await supabase.from('employers').select('contact_email, contact_name, company_name').eq('id', application.jobs?.employer_id).single();
    if (empData?.contact_email) {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      await sgMail.send({
        from: { email: 'admin@uksecurityjobs.co.uk', name: 'UKSecurityJobs' },
        to: empData.contact_email,
        subject: `Interview Confirmed — ${jobTitle}`,
        html: `<p style="font-family:sans-serif;font-size:15px;color:#0b1222;">${firstName} has confirmed their interview for <strong>${jobTitle}</strong> on <strong>${dateLabel} at ${timeLabel}</strong>.</p>
        <p style="font-family:sans-serif;font-size:14px;color:#64748b;">Log in to your <a href="https://app.uksecurityjobs.co.uk/employer">employer dashboard</a> to view their vetting summary before the interview.</p>`
      }).catch(() => {});
    }

    res.redirect(`https://app.uksecurityjobs.co.uk/slot-confirmed?job=${encodeURIComponent(jobTitle)}&date=${encodeURIComponent(dateLabel)}&time=${encodeURIComponent(timeLabel)}`);
  } catch(err) {
    console.error('confirm-slot error:', err);
    res.redirect('https://app.uksecurityjobs.co.uk/slot-error?reason=error');
  }
});

// GET /api/employers/decline-interview — token-gated, no user session
router.get('/decline-interview', async (req, res) => {
  try {
    const { token, app: appId } = req.query;

    const { data: application } = await supabase
      .from('job_applications')
      .select('id, interview_token, interview_token_expires, candidates(email, personal_details(first_name))')
      .eq('id', appId).single();

    if (!application || application.interview_token !== token) {
      return res.redirect('https://app.uksecurityjobs.co.uk/slot-error?reason=invalid');
    }

    await supabase.from('job_applications').update({ status: 'withdrawn', withdrawal_reason: 'candidate_declined_interview' }).eq('id', appId);

    res.redirect('https://app.uksecurityjobs.co.uk/interview-declined');
  } catch(err) {
    res.redirect('https://app.uksecurityjobs.co.uk/slot-error?reason=error');
  }
});

module.exports = router;
