const { createClerkClient } = require('@clerk/backend');

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY
});

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Verify the Clerk session token
    const payload = await clerk.verifyToken(token);

    if (!payload || !payload.sub) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Attach the Clerk user ID to the request
    req.userId = payload.sub;
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    return res.status(401).json({ error: 'Unauthorised' });
  }
}

module.exports = { requireAuth };
