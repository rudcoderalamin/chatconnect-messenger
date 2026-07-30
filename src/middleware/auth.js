const { verifyAccessToken } = require('../utils/token');
const User = require('../models/User');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'Access token missing' });
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.userId);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired access token' });
  }
}

module.exports = { requireAuth };
