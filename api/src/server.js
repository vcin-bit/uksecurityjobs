require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const candidateRoutes = require('./routes/candidates');
const siaRoutes = require('./routes/sia');
const profileRoutes = require('./routes/profile');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');
const employerRoutes = require('./routes/employers');
const { requireAuth } = require('./middleware/auth');
const { requireAdmin } = require('./middleware/admin');

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers
app.use(helmet());

// CORS — only allow your React app
app.use(cors({
  origin: [
    'https://app.uksecurityjobs.co.uk',
    'https://www.uksecurityjobs.co.uk',
    'https://uksecurityjobs.co.uk',
    'http://localhost:3000',
    'http://localhost:5500'
  ],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key']
}));

// Rate limiting — 100 requests per 15 minutes per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
}));

app.use(express.json({ limit: '10mb' }));

// Health check — no auth required
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public contact form — no auth required
const sgMailContact = require('@sendgrid/mail');
const escapeHtml = (str) => String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email: fromEmail, type, subject, message } = req.body;
    if (!name || !fromEmail || !message) return res.status(400).json({ error: 'Name, email and message are required' });
    sgMailContact.setApiKey(process.env.SENDGRID_API_KEY);
    await sgMailContact.send({
      from: { email: 'admin@uksecurityjobs.co.uk', name: 'UKSecurityJobs' },
      to: 'admin@uksecurityjobs.co.uk',
      replyTo: fromEmail,
      subject: `Contact Form — ${escapeHtml(subject || 'General Enquiry')}`,
      html: `<p><strong>From:</strong> ${escapeHtml(name)} (${escapeHtml(fromEmail)})</p><p><strong>Type:</strong> ${escapeHtml(type || 'Not specified')}</p><p><strong>Subject:</strong> ${escapeHtml(subject || 'Not specified')}</p><p><strong>Message:</strong></p><p>${escapeHtml(message).replace(/\n/g,'<br>')}</p>`
    });
    res.json({ success: true });
  } catch(err) {
    console.error('Contact form error:', err?.response?.body || err.message);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Public waitlist signup — no auth required
const sgMailWaitlist = require('@sendgrid/mail');
app.post('/api/waitlist', async (req, res) => {
  try {
    const { first_name, last_name, email, licence_type, region } = req.body;
    if (!first_name || !last_name || !email || !licence_type || !region) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Store in Supabase
    const { createClient } = require('@supabase/supabase-js');
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    // Upsert — prevent duplicate emails
    const { error } = await sb.from('waitlist').upsert({
      first_name,
      last_name,
      email: email.toLowerCase().trim(),
      licence_type,
      region,
      created_at: new Date().toISOString()
    }, { onConflict: 'email' });

    if (error) throw error;

    // Get total count for confirmation
    const { count } = await sb.from('waitlist').select('*', { count: 'exact', head: true });

    // Send confirmation email
    sgMailWaitlist.setApiKey(process.env.SENDGRID_API_KEY);
    await sgMailWaitlist.send({
      from: { email: 'admin@uksecurityjobs.co.uk', name: 'UKSecurityJobs' },
      to: email,
      subject: "You're on the list — UKSecurityJobs",
      html: `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f9fafb;margin:0;padding:0;">
<div style="max-width:560px;margin:0 auto;padding:2rem 1rem;">
  <div style="text-align:center;padding:1.5rem 0;">
    <a href="https://www.uksecurityjobs.co.uk" style="font-size:1.25rem;font-weight:800;text-decoration:none;">
      <span style="color:#1a52a8;">UK</span><span style="color:#0b1222;">Security</span><span style="color:#1a52a8;">Jobs</span>
    </a>
  </div>
  <div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:2rem;">
    <h1 style="font-size:1.25rem;font-weight:800;color:#0b1222;margin:0 0 0.75rem;">You're on the list, ${first_name}.</h1>
    <p style="font-size:0.92rem;color:#4a5568;line-height:1.75;margin:0 0 1rem;">
      When UKSecurityJobs launches, you'll be among the first to know. We'll verify your SIA licence before launch so you're ready to apply from day one — no delays.
    </p>
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:1rem;margin:1.25rem 0;font-size:0.88rem;color:#0369a1;">
      <strong>What happens next:</strong><br/>
      We're building the UK's first platform where every candidate is SIA verified and BS7858 ready before they apply. No agencies. No unverified candidates. Employers get quality. Officers get respect.
    </div>
    <p style="font-size:0.85rem;color:#94a3b8;margin:0;">
      Questions? Reply to this email or contact <a href="mailto:admin@uksecurityjobs.co.uk" style="color:#1a52a8;">admin@uksecurityjobs.co.uk</a>
    </p>
  </div>
  <div style="text-align:center;padding:1.5rem 0;font-size:0.75rem;color:#94a3b8;">
    &copy; 2026 UKSecurityJobs.co.uk &mdash; Digital Software Group Ltd
  </div>
</div>
</body></html>`
    });

    res.json({ success: true, position: count || 1 });
  } catch(err) {
    console.error('Waitlist error:', err?.response?.body || err.message);
    res.status(500).json({ error: 'Failed to join waitlist' });
  }
});

// Admin routes — require admin secret key only, no Clerk token needed
app.use('/admin/api', requireAdmin);
app.use('/admin/api', adminRoutes);

// Public job listings — no auth required
app.get('/api/jobs/public', async (req, res) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const now = new Date().toISOString();
    const { data, error } = await sb.from('jobs')
      .select('*, employers(company_name, logo_url, sia_acs)')
      .eq('status', 'active')
      .or(`expires_at.gt.${now},expires_at.is.null`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ jobs: data || [] });
  } catch(err) {
    console.error('Public jobs error:', err.message);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// All candidate routes require a valid Clerk token
// NOTE: app.use('/api', requireAuth) catches ALL /api/* routes.
// Public routes must be registered BEFORE this line.
app.use('/api/candidates', requireAuth, candidateRoutes);
app.use('/api/sia', requireAuth, siaRoutes);
app.use('/api/profile', requireAuth, profileRoutes);
app.use('/api/ai', requireAuth, aiRoutes);
app.use('/api', requireAuth);
app.use('/api/employers', requireAuth, employerRoutes);
app.use('/api/jobs', requireAuth, employerRoutes);
const messagingRoutes = require('./routes/messaging');
app.use('/api/messages', requireAuth, messagingRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`UKSecurityJobs API running on port ${PORT}`);
});




