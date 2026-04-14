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
    'http://localhost:5500',
    'null'
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
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email: fromEmail, type, subject, message } = req.body;
    if (!name || !fromEmail || !message) return res.status(400).json({ error: 'Name, email and message are required' });
    sgMailContact.setApiKey(process.env.SENDGRID_API_KEY);
    await sgMailContact.send({
      from: { email: 'admin@uksecurityjobs.co.uk', name: 'UKSecurityJobs' },
      to: 'admin@uksecurityjobs.co.uk',
      replyTo: fromEmail,
      subject: `Contact Form — ${subject || 'General Enquiry'}`,
      html: `<p><strong>From:</strong> ${name} (${fromEmail})</p><p><strong>Type:</strong> ${type || 'Not specified'}</p><p><strong>Subject:</strong> ${subject || 'Not specified'}</p><p><strong>Message:</strong></p><p>${message.replace(/\n/g,'<br>')}</p>`
    });
    res.json({ success: true });
  } catch(err) {
    console.error('Contact form error:', err?.response?.body || err.message);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Admin routes — require admin secret key only, no Clerk token needed
app.use('/admin/api', requireAdmin);
app.use('/admin/api', adminRoutes);

// All candidate routes require a valid Clerk token
app.use('/api', requireAuth);
app.use('/api/candidates', candidateRoutes);
app.use('/api/sia', siaRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/employers', requireAuth, employerRoutes);
app.use('/api/jobs/public', employerRoutes); // no auth needed
app.use('/api/jobs', requireAuth, employerRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`UKSecurityJobs API running on port ${PORT}`);
});


