const firebaseAdmin = require('../config/firebase');
const User = require('../models/User');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../utils/token');

/**
 * POST /api/auth/verify-firebase-token
 * body: { idToken, deviceId, platform, fcmToken }
 *
 * Flow:
 *  1. Frontend runs Firebase Phone Auth directly (sends its own OTP via SMS,
 *     no cost/setup needed on our backend — Firebase handles that entirely).
 *  2. Once the user enters the correct OTP, Firebase gives the frontend an
 *     ID token proving the phone number is verified.
 *  3. Frontend sends that ID token here. We verify it with Firebase Admin,
 *     extract the verified phone number, then find-or-create the user and
 *     issue our OWN JWT access + refresh tokens (same as before) — so the
 *     rest of the backend (auth middleware, sockets, etc.) is unchanged.
 */
async function verifyFirebaseToken(req, res) {
  try {
    const { idToken, deviceId, platform, fcmToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: 'Firebase idToken is required' });
    }

    let decoded;
    try {
      decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired Firebase token' });
    }

    const phone = decoded.phone_number; // e.g. "+8801XXXXXXXXX"
    if (!phone) {
      return res.status(400).json({ message: 'Token does not contain a verified phone number' });
    }

    // Find or create user
    let user = await User.findOne({ phone });
    let isNewUser = false;
    if (!user) {
      user = await User.create({ phone });
      isNewUser = true;
    }

    // Register/refresh this device
    if (deviceId) {
      const existingDevice = user.devices.find((d) => d.deviceId === deviceId);
      if (existingDevice) {
        existingDevice.fcmToken = fcmToken || existingDevice.fcmToken;
        existingDevice.platform = platform || existingDevice.platform;
        existingDevice.lastActiveAt = new Date();
      } else {
        user.devices.push({ deviceId, fcmToken, platform, lastActiveAt: new Date() });
      }
      await user.save();
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id, deviceId);

    return res.status(200).json({
      message: 'Phone verified',
      isNewUser,
      needsProfileSetup: !user.isProfileComplete,
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        photo: user.photo,
        about: user.about,
      },
    });
  } catch (err) {
    console.error('[verifyFirebaseToken]', err);
    return res.status(500).json({ message: 'Failed to verify phone number' });
  }
}

/**
 * POST /api/auth/refresh-token
 * body: { refreshToken }
 */
async function refreshToken(req, res) {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    const payload = verifyRefreshToken(token);
    const user = await User.findById(payload.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const accessToken = generateAccessToken(user._id);
    return res.status(200).json({ accessToken });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
}

/**
 * POST /api/auth/logout
 * body: { deviceId }  -- logs out current device only
 * Auth required
 */
async function logoutCurrentDevice(req, res) {
  try {
    const { deviceId } = req.body;
    const user = req.user;

    if (deviceId) {
      user.devices = user.devices.filter((d) => d.deviceId !== deviceId);
      await user.save();
    }

    return res.status(200).json({ message: 'Logged out from this device' });
  } catch (err) {
    console.error('[logoutCurrentDevice]', err);
    return res.status(500).json({ message: 'Logout failed' });
  }
}

/**
 * POST /api/auth/logout-all
 * Auth required — logs out from ALL devices
 */
async function logoutAllDevices(req, res) {
  try {
    const user = req.user;
    user.devices = [];
    await user.save();
    return res.status(200).json({ message: 'Logged out from all devices' });
  } catch (err) {
    console.error('[logoutAllDevices]', err);
    return res.status(500).json({ message: 'Logout failed' });
  }
}

module.exports = {
  verifyFirebaseToken,
  refreshToken,
  logoutCurrentDevice,
  logoutAllDevices,
};
