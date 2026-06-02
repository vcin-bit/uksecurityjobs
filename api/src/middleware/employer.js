const { supabase } = require('../lib/supabase');

async function requireVerifiedEmployer(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('employers')
      .select('id, verified')
      .eq('clerk_user_id', req.userId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Employer profile not found' });
    }

    if (!data.verified) {
      return res.status(403).json({
        error: 'employer_not_verified',
        message: 'Your employer account is pending verification. You will be able to access candidates once approved.'
      });
    }

    req.employer = { id: data.id, verified: true };
    next();
  } catch (err) {
    console.error('requireVerifiedEmployer error:', err);
    res.status(500).json({ error: 'Failed to verify employer status' });
  }
}

module.exports = { requireVerifiedEmployer };
