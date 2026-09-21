'use strict';

const { supabase } = require('../lib/supabase');

// Middleware: verify the authenticated user is an employer with talent_pool_enabled.
// Must run after requireAuth (req.userId already set).
// Sets req.employerId on success; 403 otherwise.
async function requireTalentPoolEmployer(req, res, next) {
  try {
    const { data: employer, error } = await supabase
      .from('employers')
      .select('id, verified, talent_pool_enabled')
      .eq('clerk_user_id', req.userId)
      .maybeSingle();

    if (error) throw error;

    if (!employer || employer.verified !== true || employer.talent_pool_enabled !== true) {
      return res.status(403).json({ error: 'Talent pool access not enabled for this employer.' });
    }

    req.employerId = employer.id;
    next();
  } catch (err) {
    console.error('requireTalentPoolEmployer error:', err.message);
    res.status(500).json({ error: 'Failed to verify employer access.' });
  }
}

module.exports = { requireTalentPoolEmployer };
