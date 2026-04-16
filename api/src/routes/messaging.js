const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const sgMail = require('@sendgrid/mail');

const MESSAGE_TYPES = ['general','request_info','schedule_update','offer','outcome','shortlist_prep'];

// Verify sender has access to this application
async function verifyAccess(applicationId, userId, senderType) {
  const { data: app } = await supabase
    .from('job_applications')
    .select('id, candidate_id, job_id, jobs(employer_id, title), candidates(clerk_user_id, email, candidate_personal(first_name)), employers(contact_email, company_name)')
    .eq('id', applicationId)
    .single();

  if (!app) return null;

  if (senderType === 'employer') {
    const { data: emp } = await supabase.from('employers').select('id').eq('clerk_user_id', userId).single();
    if (!emp || app.jobs?.employer_id !== emp.id) return null;
  } else {
    if (app.candidates?.clerk_user_id !== userId) return null;
  }
  return app;
}

// GET /api/messages/:applicationId — get thread
router.get('/:applicationId', async (req, res) => {
  try {
    const senderType = req.query.as || 'candidate';
    const app = await verifyAccess(req.params.applicationId, req.userId, senderType);
    if (!app) return res.status(403).json({ error: 'Not authorised' });

    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('application_id', req.params.applicationId)
      .order('created_at', { ascending: true });

    // Mark unread messages as read
    const unread = (messages || []).filter(m => !m.read_at && m.sender_type !== senderType);
    if (unread.length > 0) {
      await supabase.from('messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', unread.map(m => m.id));
    }

    res.json({ messages: messages || [], application: app });
  } catch(err) {
    console.error('GET /messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/messages/:applicationId — send message
router.post('/:applicationId', async (req, res) => {
  try {
    const { content, message_type, sender_type } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Message content required' });
    if (!MESSAGE_TYPES.includes(message_type || 'general')) return res.status(400).json({ error: 'Invalid message type' });

    const app = await verifyAccess(req.params.applicationId, req.userId, sender_type);
    if (!app) return res.status(403).json({ error: 'Not authorised' });

    // Profanity / professional conduct check — basic word filter
    const BANNED = ['bro','innit','wagwan','cuz','fam bro'];
    const lower = content.toLowerCase();
    const flagged = BANNED.some(w => lower.includes(w));

    const { data: msg, error } = await supabase.from('messages').insert({
      application_id: req.params.applicationId,
      candidate_id: app.candidate_id,
      job_id: app.job_id,
      sender_type,
      sender_clerk_id: req.userId,
      message_type: message_type || 'general',
      content: content.trim(),
      flagged_for_review: flagged,
      created_at: new Date().toISOString(),
    }).select().single();

    if (error) throw error;

    // Email notification to recipient
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const jobTitle = app.jobs?.title || 'your application';
    const companyName = app.employers?.company_name || 'the employer';

    if (sender_type === 'employer') {
      const candidateEmail = app.candidates?.email;
      const firstName = app.candidates?.candidate_personal?.first_name || app.candidates?.candidate_personal?.[0]?.first_name || 'Officer';
      if (candidateEmail) {
        await sgMail.send({
          from: { email: 'admin@uksecurityjobs.co.uk', name: 'UKSecurityJobs' },
          to: candidateEmail,
          subject: `Message from ${companyName} — ${jobTitle}`,
          html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:2rem 1rem;">
            <p style="font-size:15px;color:#0b1222;">Hi ${firstName},</p>
            <p style="font-size:15px;color:#4a5568;line-height:1.7;">${companyName} has sent you a message regarding your application for <strong>${jobTitle}</strong>.</p>
            <div style="background:#f8fafc;border-left:4px solid #1a52a8;padding:1rem 1.25rem;margin:1.25rem 0;font-size:14px;color:#334155;line-height:1.7;">${content.trim()}</div>
            <p style="font-size:13px;color:#64748b;">Log in to reply: <a href="https://app.uksecurityjobs.co.uk/dashboard" style="color:#1a52a8;">app.uksecurityjobs.co.uk</a></p>
            <p style="font-size:11px;color:#94a3b8;margin-top:1.5rem;">All messages on UKSecurityJobs are monitored for professional conduct. Unprofessional language or harassment will result in account suspension.</p>
          </div>`
        }).catch(() => {});
      }
    } else {
      const empEmail = app.employers?.contact_email || app.jobs?.employers?.contact_email;
      if (empEmail) {
        const candidateName = `${app.candidates?.candidate_personal?.first_name || app.candidates?.candidate_personal?.[0]?.first_name || 'Candidate'} ${app.candidates?.candidate_personal?.last_name || app.candidates?.candidate_personal?.[0]?.last_name || ''}`.trim();
        await sgMail.send({
          from: { email: 'admin@uksecurityjobs.co.uk', name: 'UKSecurityJobs' },
          to: empEmail,
          subject: `Message from ${candidateName} — ${jobTitle}`,
          html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:2rem 1rem;">
            <p style="font-size:15px;color:#0b1222;">Message from <strong>${candidateName}</strong> regarding <strong>${jobTitle}</strong>:</p>
            <div style="background:#f8fafc;border-left:4px solid #1a52a8;padding:1rem 1.25rem;margin:1.25rem 0;font-size:14px;color:#334155;line-height:1.7;">${content.trim()}</div>
            ${flagged ? '<p style="font-size:12px;color:#dc2626;background:#fef2f2;padding:0.75rem;border-radius:6px;">This message has been flagged for review by our moderation team.</p>' : ''}
            <p style="font-size:13px;color:#64748b;">Log in to reply: <a href="https://app.uksecurityjobs.co.uk/employer" style="color:#1a52a8;">app.uksecurityjobs.co.uk/employer</a></p>
          </div>`
        }).catch(() => {});
      }
    }

    res.json({ success: true, message: msg });
  } catch(err) {
    console.error('POST /messages error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// POST /api/messages/:applicationId/rate-candidate — employer rates candidate
router.post('/:applicationId/rate-candidate', async (req, res) => {
  try {
    const app = await verifyAccess(req.params.applicationId, req.userId, 'employer');
    if (!app) return res.status(403).json({ error: 'Not authorised' });

    const { turned_up, punctual, professional_presentation, profile_accuracy, communication_quality, would_recommend, notes } = req.body;

    // Calculate overall score (1-5)
    const scores = [turned_up?5:1, punctual?5:1, professional_presentation, profile_accuracy, communication_quality].filter(s=>s!=null);
    const overall = scores.length ? Math.round(scores.reduce((a,b)=>a+Number(b),0)/scores.length*10)/10 : null;

    const { error: ratingErr } = await supabase.from('candidate_ratings').upsert({
      application_id: req.params.applicationId,
      candidate_id: app.candidate_id,
      employer_id: app.jobs?.employer_id,
      turned_up: turned_up !== false,
      punctual,
      professional_presentation,
      profile_accuracy,
      communication_quality,
      would_recommend: would_recommend !== false,
      overall,
      notes: notes || null,
      created_at: new Date().toISOString(),
    }, { onConflict: 'application_id' });

    if (ratingErr) throw ratingErr;

    // Recalculate candidate reputation score
    const { data: allRatings } = await supabase
      .from('candidate_ratings')
      .select('overall')
      .eq('candidate_id', app.candidate_id)
      .not('overall', 'is', null);

    if (allRatings?.length) {
      const avg = allRatings.reduce((a,r)=>a+r.overall,0)/allRatings.length;
      await supabase.from('candidates').update({
        reputation_score: Math.round(avg*10)/10,
        reputation_count: allRatings.length,
      }).eq('id', app.candidate_id);
    }

    res.json({ success: true, overall });
  } catch(err) {
    console.error('rate-candidate error:', err);
    res.status(500).json({ error: 'Failed to save rating' });
  }
});

// POST /api/messages/:applicationId/rate-employer — candidate rates employer
router.post('/:applicationId/rate-employer', async (req, res) => {
  try {
    const app = await verifyAccess(req.params.applicationId, req.userId, 'candidate');
    if (!app) return res.status(403).json({ error: 'Not authorised' });

    const { role_as_described, professional_interview, feedback_given, would_recommend, overall, notes } = req.body;

    const { error: ratingErr } = await supabase.from('employer_ratings').upsert({
      application_id: req.params.applicationId,
      candidate_id: app.candidate_id,
      employer_id: app.jobs?.employer_id,
      role_as_described,
      professional_interview,
      feedback_given,
      would_recommend: would_recommend !== false,
      overall,
      notes: notes || null,
      created_at: new Date().toISOString(),
    }, { onConflict: 'application_id' });

    if (ratingErr) throw ratingErr;

    // Recalculate employer reputation score
    const { data: allRatings } = await supabase
      .from('employer_ratings')
      .select('overall')
      .eq('employer_id', app.jobs?.employer_id)
      .not('overall', 'is', null);

    if (allRatings?.length) {
      const avg = allRatings.reduce((a,r)=>a+r.overall,0)/allRatings.length;
      await supabase.from('employers').update({
        reputation_score: Math.round(avg*10)/10,
        reputation_count: allRatings.length,
      }).eq('id', app.jobs?.employer_id);
    }

    res.json({ success: true });
  } catch(err) {
    console.error('rate-employer error:', err);
    res.status(500).json({ error: 'Failed to save rating' });
  }
});

module.exports = router;
