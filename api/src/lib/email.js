const sgMail = require('@sendgrid/mail');

const FROM = {
  email: 'admin@uksecurityjobs.co.uk',
  name: 'UKSecurityJobs'
};

// ── BASE TEMPLATE ──
function baseTemplate(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f9fafb;color:#0b1222;}
.wrap{max-width:580px;margin:0 auto;padding:2rem 1rem;}
.logo{text-align:center;padding:1.5rem 0;}
.logo a{font-size:1.25rem;font-weight:800;text-decoration:none;}
.logo .uk{color:#1a52a8;}.logo .sec{color:#0b1222;}.logo .job{color:#1a52a8;}
.card{background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:2rem;}
h1{font-size:1.25rem;font-weight:800;color:#0b1222;margin-bottom:0.75rem;line-height:1.3;}
p{font-size:0.92rem;color:#4a5568;line-height:1.75;margin-bottom:1rem;}
p:last-child{margin-bottom:0;}
.btn{display:inline-block;background:#1a52a8;color:#fff;font-size:0.92rem;font-weight:700;padding:0.75rem 2rem;border-radius:8px;text-decoration:none;margin:1.25rem 0;}
.divider{border:none;border-top:1px solid #e2e8f0;margin:1.5rem 0;}
.detail-row{display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid #f1f5f9;font-size:0.85rem;}
.detail-row:last-child{border-bottom:none;}
.detail-label{color:#94a3b8;font-weight:600;}
.detail-value{color:#0b1222;font-weight:500;text-align:right;}
.notice{background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:1rem;margin-top:1.25rem;font-size:0.82rem;color:#0369a1;line-height:1.65;}
.footer{text-align:center;padding:1.5rem 0;font-size:0.75rem;color:#94a3b8;line-height:1.7;}
.footer a{color:#94a3b8;}
</style>
</head>
<body>
<div class="wrap">
  <div class="logo"><a href="https://www.uksecurityjobs.co.uk"><span class="uk">UK</span><span class="sec">Security</span><span class="job">Jobs</span></a></div>
  <div class="card">${content}</div>
  <div class="footer">
    &copy; 2026 UKSecurityJobs.co.uk &mdash; Digital Software Group Ltd<br>
    Registered in England &amp; Wales<br>
    <a href="https://www.uksecurityjobs.co.uk/privacy">Privacy Policy</a> &middot; <a href="https://www.uksecurityjobs.co.uk/terms">Terms</a>
  </div>
</div>
</body>
</html>`;
}

// ── SEND HELPER ──
async function send(to, subject, html) {
  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    await sgMail.send({ from: FROM, to, subject, html });
    console.log(`Email sent: ${subject} → ${to}`);
    return true;
  } catch (err) {
    console.error(`Email failed: ${subject} → ${to}`, err?.response?.body || err.message);
    return false;
  }
}

// ── 1. SIA LICENCE VERIFIED ──
async function sendSiaVerified({ toEmail, firstName, licenceType }) {
  const html = baseTemplate(`
    <h1>Your SIA Licence Has Been Verified</h1>
    <p>Hi ${firstName},</p>
    <p>Your <strong>${licenceType}</strong> SIA licence has been verified by our team and your profile is now live to verified security employers on UKSecurityJobs.</p>
    <p>You can now apply for any matching role on the platform with a single click — no more filling in application forms.</p>
    <a href="https://app.uksecurityjobs.co.uk/jobs" class="btn">View Security Jobs →</a>
    <hr class="divider"/>
    <p>Make sure your profile is 100% complete to unlock the best roles. A complete profile with full employment history and references is what employers are looking for.</p>
    <a href="https://app.uksecurityjobs.co.uk/dashboard" class="btn" style="background:#0b1222;">Complete My Profile →</a>
  `);
  return send(toEmail, 'Your SIA licence has been verified — UKSecurityJobs', html);
}

// ── 2. APPLICATION SUBMITTED (CANDIDATE) ──
async function sendApplicationConfirmation({ toEmail, firstName, jobTitle, companyName, location }) {
  const html = baseTemplate(`
    <h1>Application Submitted</h1>
    <p>Hi ${firstName},</p>
    <p>Your application for the following role has been submitted successfully:</p>
    <div style="background:#f8fafc;border-radius:8px;padding:1rem;margin:1rem 0;">
      <div class="detail-row"><span class="detail-label">Role</span><span class="detail-value">${jobTitle}</span></div>
      <div class="detail-row"><span class="detail-label">Company</span><span class="detail-value">${companyName}</span></div>
      <div class="detail-row"><span class="detail-label">Location</span><span class="detail-value">${location}</span></div>
    </div>
    <p>Your full profile — including employment history, licence details and references — has been shared with the employer. You will hear back if you are shortlisted.</p>
    <a href="https://app.uksecurityjobs.co.uk/dashboard" class="btn">View My Applications →</a>
    <div class="notice"><strong>Interview reminder:</strong> If you are invited to interview and cannot attend, you must notify the employer in advance. No-shows without prior notice result in a platform ban.</div>
  `);
  return send(toEmail, `Application submitted — ${jobTitle} at ${companyName}`, html);
}

// ── 3. INTERVIEW SCHEDULED (CANDIDATE) ──
async function sendInterviewScheduled({ toEmail, firstName, jobTitle, companyName, interviewDate, interviewLocation, interviewFormat, interviewNotes }) {
  const dateStr = interviewDate ? new Date(interviewDate).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' }) : 'To be confirmed';
  const formatLabel = { in_person: 'In person', video: 'Video call', phone: 'Phone call' }[interviewFormat] || interviewFormat || 'To be confirmed';
  const html = baseTemplate(`
    <h1>Interview Confirmed</h1>
    <p>Hi ${firstName},</p>
    <p>An interview has been arranged for your application:</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:1rem;margin:1rem 0;">
      <div class="detail-row"><span class="detail-label">Role</span><span class="detail-value">${jobTitle}</span></div>
      <div class="detail-row"><span class="detail-label">Company</span><span class="detail-value">${companyName}</span></div>
      <div class="detail-row"><span class="detail-label">Date &amp; Time</span><span class="detail-value">${dateStr}</span></div>
      <div class="detail-row"><span class="detail-label">Format</span><span class="detail-value">${formatLabel}</span></div>
      ${interviewLocation ? `<div class="detail-row"><span class="detail-label">Location</span><span class="detail-value">${interviewLocation}</span></div>` : ''}
    </div>
    ${interviewNotes ? `<p style="font-size:0.88rem;color:#4a5568;background:#f8fafc;border-radius:8px;padding:1rem;border:1px solid #e2e8f0;"><strong>Notes from employer:</strong> ${interviewNotes}</p>` : ''}
    <p>Please bring the following documents to your interview:</p>
    <ul style="font-size:0.88rem;color:#4a5568;line-height:1.8;margin:0.5rem 0 1rem 1.25rem;">
      <li>Your SIA licence card</li>
      <li>Proof of right to work (passport or share code)</li>
      <li>Proof of address (bank statement or utility bill)</li>
      <li>Any relevant certificates (first aid, qualifications)</li>
    </ul>
    <div class="notice"><strong>Important:</strong> If you cannot attend, contact the employer immediately and update your application on UKSecurityJobs. Failure to attend without notice will result in a platform ban.</div>
  `);
  return send(toEmail, `Interview confirmed — ${jobTitle} at ${companyName}`, html);
}

// ── 4a. SHORTLISTED (CANDIDATE) ──
async function sendShortlisted({ toEmail, firstName, jobTitle, companyName, profileGaps = [], licencePending = false, rtwStatus = '' }) {
  const gapWarnings = profileGaps.length > 0
    ? `<div class="notice" style="border-left-color:#f59e0b;background:#fefce8;">
        <strong>Before your interview — items to prepare:</strong><br/>
        ${profileGaps.map(g => `&bull; ${g}`).join('<br/>')}
      </div>` : '';

  const licenceNote = licencePending
    ? `<div class="notice" style="border-left-color:#f59e0b;background:#fefce8;"><strong>SIA Licence pending verification:</strong> Bring your physical SIA licence card to the interview. The employer will verify it.</div>` : '';

  const rtwNote = rtwStatus && rtwStatus !== 'uk_irish_citizen'
    ? `<div class="notice" style="border-left-color:#1a52a8;background:#eff6ff;"><strong>Right to work:</strong> Bring your original right to work documents to the interview. Employers are legally required to check them before you start work.</div>` : '';

  const html = baseTemplate(`
    <h1>You have been shortlisted</h1>
    <p>Hi ${firstName},</p>
    <p>Good news — <strong>${companyName}</strong> has shortlisted you for <strong>${jobTitle}</strong>.</p>
    <p>They will be in touch shortly to arrange an interview. When they do, you will receive time slot options by email — select your preferred time immediately. Do not leave it.</p>

    <div style="background:#f8fafc;border-radius:8px;padding:1rem 1.25rem;margin:1.25rem 0;font-size:14px;color:#334155;line-height:1.75;">
      <strong style="color:#0b1222;display:block;margin-bottom:0.5rem;">Standard documents to bring:</strong>
      &bull; Valid SIA licence card (physical card, not a photo)<br/>
      &bull; Passport or birth certificate (right to work)<br/>
      &bull; National Insurance number<br/>
      &bull; Proof of address documents you declared on your profile
    </div>

    ${gapWarnings}
    ${licenceNote}
    ${rtwNote}

    <div class="notice"><strong>Professional conduct:</strong> Once you confirm an interview slot, you are making a firm commitment to attend. Failure to attend without at least 24 hours notice will result in a no-show recorded against your profile and may lead to suspension.</div>

    <a href="https://app.uksecurityjobs.co.uk/dashboard" class="btn">View My Applications →</a>
  `);
  return send(toEmail, `You have been shortlisted — ${jobTitle} at ${companyName}`, html);
}

// ── 4. APPLICATION UNSUCCESSFUL (CANDIDATE) ──
async function sendApplicationUnsuccessful({ toEmail, firstName, jobTitle, companyName }) {
  const html = baseTemplate(`
    <h1>Application Update</h1>
    <p>Hi ${firstName},</p>
    <p>Thank you for applying for <strong>${jobTitle}</strong> at <strong>${companyName}</strong>.</p>
    <p>On this occasion your application has not been taken forward. This is not a reflection of your suitability for security work — employers have specific requirements for each role and it is often simply a question of availability, location or experience.</p>
    <p>Your profile remains live and active. New security vacancies are added regularly — keep your availability status up to date and you will continue to be matched with suitable roles.</p>
    <a href="https://app.uksecurityjobs.co.uk/jobs" class="btn">Browse Current Vacancies →</a>
  `);
  return send(toEmail, `Application update — ${jobTitle} at ${companyName}`, html);
}

// ── 5. NEW APPLICANT (EMPLOYER) ──
async function sendNewApplicant({ toEmail, companyName, jobTitle, candidateFirstName, applicationId }) {
  const html = baseTemplate(`
    <h1>New Application Received</h1>
    <p>Hi ${companyName},</p>
    <p>A new application has been received for <strong>${jobTitle}</strong>.</p>
    <p>The candidate has a verified SIA licence and a complete BS7858-ready profile — employment history, address history and reference contacts are all included.</p>
    <a href="https://app.uksecurityjobs.co.uk/employer" class="btn">View Application →</a>
    <div class="notice"><strong>Right to Work reminder:</strong> You must verify original right to work documents before this candidate starts work. UKSecurityJobs candidate declarations do not constitute a statutory right to work check.</div>
  `);
  return send(toEmail, `New application for ${jobTitle} — UKSecurityJobs`, html);
}

// ── 6. COMPANY REGISTRATION CONFIRMED (EMPLOYER) ──
async function sendEmployerWelcome({ toEmail, companyName, contactName }) {
  const html = baseTemplate(`
    <h1>Company Registration Confirmed</h1>
    <p>Hi ${contactName},</p>
    <p><strong>${companyName}</strong> has been registered on UKSecurityJobs. You can now post security vacancies to our verified pool of SIA-licensed, BS7858-ready candidates.</p>
    <p>Every candidate who applies has a verified SIA licence and a complete profile — no unsuitable applicants, no unlicensed candidates, no time wasters.</p>
    <a href="https://app.uksecurityjobs.co.uk/employer" class="btn">Post Your First Vacancy →</a>
    <div class="notice"><strong>Right to Work:</strong> You remain legally responsible for verifying right to work for every candidate before they start work. Use the <a href="https://www.gov.uk/check-job-applicant-right-to-work" style="color:#0369a1;">Home Office online service</a> for share code verifications.</div>
  `);
  return send(toEmail, 'Company registration confirmed — UKSecurityJobs', html);
}

// ── 7. ADMIN — NEW SIA VERIFICATION REQUEST ──
async function sendAdminSiaRequest({ candidateName, licenceType, licenceNumber }) {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@uksecurityjobs.co.uk';
  const html = baseTemplate(`
    <h1>New SIA Verification Request</h1>
    <div style="background:#f8fafc;border-radius:8px;padding:1rem;margin:1rem 0;">
      <div class="detail-row"><span class="detail-label">Candidate</span><span class="detail-value">${candidateName}</span></div>
      <div class="detail-row"><span class="detail-label">Licence Type</span><span class="detail-value">${licenceType}</span></div>
      <div class="detail-row"><span class="detail-label">Licence Number</span><span class="detail-value">${licenceNumber}</span></div>
    </div>
    <a href="https://www.uksecurityjobs.co.uk/admin.html" class="btn">Go to Admin Panel →</a>
  `);
  return send(adminEmail, `SIA verification required — ${candidateName}`, html);
}

module.exports = {
  sendSiaVerified,
  sendApplicationConfirmation,
  sendInterviewScheduled,
  sendShortlisted,
  sendApplicationUnsuccessful,
  sendNewApplicant,
  sendEmployerWelcome,
  sendAdminSiaRequest,
};
