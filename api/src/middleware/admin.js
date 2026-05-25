// Admin authentication — transition mode.
// Accepts EITHER a Clerk Bearer token with role=admin in metadata,
// OR the legacy x-admin-key header. The legacy branch will be
// removed once the admin frontend is migrated to Clerk.

const { verifyToken } = require('@clerk/backend');

async function requireAdmin(req, res, next) {
  // Path 1: Clerk token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });

      if (!payload || !payload.sub) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const role = payload?.metadata?.role
        || payload?.public_metadata?.role
        || payload?.publicMetadata?.role;

      if (role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      req.userId = payload.sub;
      req.userEmail = payload.email || '';
      req.isAdmin = true;
      return next();
    } catch (err) {
      console.error('Admin token verification failed:', err.message);
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  // Path 2: Legacy shared secret (transition — remove after admin frontend migration)
  const adminKey = req.headers['x-admin-key'];
  if (adminKey && adminKey === process.env.ADMIN_SECRET) {
    req.isAdmin = true;
    req.userId = 'legacy-admin-key';
    return next();
  }

  // No valid auth
  return res.status(403).json({ error: 'Forbidden' });
}

module.exports = { requireAdmin };
