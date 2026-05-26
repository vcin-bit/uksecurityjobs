const { verifyToken } = require('@clerk/backend');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    if (!payload || !payload.sub) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    req.userId = payload.sub;
    req.token = token;
    req.userEmail = payload.email || '';
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    return res.status(401).json({ error: 'Unauthorised' });
  }
}

module.exports = { requireAuth };
