const { verifyAccessToken } = require('../utils/token');
const User = require('../models/User');

async function socketAuthMiddleware(socket, next) {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Authentication token missing'));

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.userId);
    if (!user) return next(new Error('User not found'));

    socket.userId = user._id.toString();
    next();
  } catch (err) {
    next(new Error('Invalid or expired token'));
  }
}

module.exports = socketAuthMiddleware;
