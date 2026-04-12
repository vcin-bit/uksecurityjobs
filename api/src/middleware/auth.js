const { createClerkClient } = require('@clerk/backend');

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY
});

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    let payload;
    try {
      // Clerk Backend SDK v1+ - verifyToken is on the client
      payload = await clerkClient.verifyToken(token);
    } catch (e) {
      // Fallback for different SDK versions
      try {
        const { verifyToken } = require('@clerk/backend');
        payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
      } catch (e2) {
        console.error('Token verification failed:', e.message);
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    if (!payload || !payload.sub) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    req.userId = payload.sub;
    req.userEmail = payload.email || '';
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    return res.status(401).json({ error: 'Unauthorised' });
  }
}

module.exports = { requireAuth };
