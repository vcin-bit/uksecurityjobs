const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const sgMail = require('@sendgrid/mail');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Candidate Schema
const candidateSchema = new mongoose.Schema({
  fullname:     { type: String, required: true },
  email:        { type: String, required: true, unique: true },
  licence_type: { type: String, required: true },
  sia_number:   { type: String },
  registered_at:{ type: Date, default: Date.now },
  status:       { type: String, default: 'pending' }
});

const Candidate = mongoose.model('Candidate', candidateSchema);

const licenceLabels = {
  ds:   'Door Supervisor',
  sg:   'Security Guard',
  cctv: 'CCTV Operator',
  cp:   'Close Protection',
  cvit: 'Cash & Valuables in Transit',
  kh:   'Key Holding',
  none: 'Not yet licensed'
};

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'UKSecurityJobs API running' });
});

// Register candidate
app.post('/api/register', async (req, res) => {
  try {
    const { fullname, email, licence_type, sia_number } = req.body;

    if (!fullname || !email || !licence_type) {
      return res.status(400).json({ error: 'Please fill in all required fields' });
    }

    const existing = await Candidate.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'This email is already registered' });
    }

    const candidate = new Candidate({ fullname, email, licence_type, sia_number });
    await candidate.save();

    const licenceLabel = licenceLabels[licence_type] || licence_type;

    const candidateEmail = {
      to: email,
      from: { email: process.env.FROM_EMAIL, name: 'UKSecurityJobs' },
      subject: 'Welcome to UKSecurityJobs — Registration Confirmed',
      html: `
        <!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background:#06080c;font-family:Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#06080c;padding:40px 20px;">
        <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="background:#0c0f15;border:1px solid rgba(100,160,220,0.2);border-bottom:none;padding:30px 40px;">
        <div style="height:3px;background:linear-gradient(90deg,#2b6cb8,#60a5fa,#c8d4df);margin-bottom:25px;"></div>
        <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#60a5fa;">UKSecurityJobs.co.uk</p>
        </td></tr>
        <tr><td style="background:#0c0f15;border:1px solid rgba(100,160,220,0.2);border-top:none;border-bottom:none;padding:40px;">
        <h1 style="margin:0 0 20px;font-size:32px;font-weight:900;text-transform:uppercase;color:#ffffff;">Welcome, ${fullname}.</h1>
        <p style="font-size:15px;color:#8fa3b4;line-height:1.7;">Your registration has been received. You've taken the first step toward joining the UK's only verified security jobs platform.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#161d29;border:1px solid rgba(100,160,220,0.15);margin:25px 0;">
        <tr><td style="padding:20px 25px;">
        <p style="margin:0 0 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#60a5fa;">Your Registration Details</p>
        <p style="margin:0 0 8px;font-size:13px;color:#c8d4df;"><strong style="color:#fff;">Name:</strong> ${fullname}</p>
        <p style="margin:0 0 8px;font-size:13px;color:#c8d4df;"><strong style="color:#fff;">Email:</strong> ${email}</p>
        <p style="margin:0 0 8px;font-size:13px;color:#c8d4df;"><strong style="color:#fff;">Licence Type:</strong> ${licenceLabel}</p>
        ${sia_number ? `<p style="margin:0;font-size:13px;color:#c8d4df;"><strong style="color:#fff;">SIA Number:</strong> ${sia_number}</p>` : ''}
        </td></tr></table>
        <h2 style="margin:25px 0 15px;font-size:18px;font-weight:700;text-transform:uppercase;color:#ffffff;">What Happens Next</h2>
        <p style="font-size:13px;color:#8fa3b4;line-height:1.8;"><span style="color:#60a5fa;font-weight:700;">01 —</span> We will verify your SIA licence against the public register<br>
        <span style="color:#60a5fa;font-weight:700;">02 —</span> You will be invited to complete your professional assessment<br>
        <span style="color:#60a5fa;font-weight:700;">03 —</span> Once verified, your profile goes live and member perks activate<br>
        <span style="color:#60a5fa;font-weight:700;">04 —</span> You will have access to exclusive security jobs and vacancies</p>
        <p style="margin:30px 0 0;font-size:14px;color:#c8d4df;font-style:italic;">"Built by someone who's been every level of this industry. We look after good professional people."</p>
        </td></tr>
        <tr><td style="background:#0a0d12;border:1px solid rgba(100,160,220,0.2);border-top:none;padding:25px 40px;">
        <p style="margin:0;font-size:11px;color:#4a6880;">UKSecurityJobs.co.uk — Digital Software Group Ltd</p>
        </td></tr>
        </table></td></tr></table>
        </body></html>
      `
    };

    const adminEmail = {
      to: 'david@risksecured.co.uk',
      from: { email: process.env.FROM_EMAIL, name: 'UKSecurityJobs' },
      subject: `New Registration — ${fullname} (${licenceLabel})`,
      html: `
        <body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;">
        <div style="background:#fff;padding:25px;max-width:500px;margin:0 auto;border-left:4px solid #60a5fa;">
        <h2 style="margin:0 0 15px;color:#06080c;">New Candidate Registration</h2>
        <p><strong>Name:</strong> ${fullname}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Licence Type:</strong> ${licenceLabel}</p>
        <p><strong>SIA Number:</strong> ${sia_number || 'Not provided'}</p>
        <p><strong>Registered:</strong> ${new Date().toLocaleString('en-GB')}</p>
        </div></body>
      `
    };

    // Send emails — don't fail registration if email fails
    try {
      await Promise.all([sgMail.send(candidateEmail), sgMail.send(adminEmail)]);
    } catch (emailErr) {
      console.error('Email error:', emailErr.message);
    }

    res.status(201).json({ success: true, message: 'Registration successful. Welcome to UKSecurityJobs.' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// Admin — get all candidates
app.post('/api/admin/candidates', async (req, res) => {
  try {
    const { password } = req.body;
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorised' });
    }
    const candidates = await Candidate.find().sort({ registered_at: -1 });
    res.json({ success: true, candidates });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Admin — update candidate status
app.post('/api/admin/update-status', async (req, res) => {
  try {
    const { password, id, status } = req.body;
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorised' });
    }
    await Candidate.findByIdAndUpdate(id, { status });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
