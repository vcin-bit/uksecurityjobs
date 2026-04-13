const express = require('express');
const router = express.Router();
const { supabase, auditLog } = require('../lib/supabase');

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
    const { data, error } = await supabase.from('jobs').select('*').eq('status', 'active').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ jobs: data || [] });
  } catch(err) { res.status(500).json({ error: 'Failed to fetch jobs' }); }
});

module.exports = router;
