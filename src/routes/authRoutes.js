const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { otpVerifyLimiter } = require('../middleware/rateLimiter');

// Firebase handles OTP send + verify on the frontend directly.
// This endpoint just exchanges a verified Firebase ID token for our own JWTs.
router.post('/verify-firebase-token', otpVerifyLimiter, authController.verifyFirebaseToken);

router.post('/refresh-token', authController.refreshToken);
router.post('/logout', requireAuth, authController.logoutCurrentDevice);
router.post('/logout-all', requireAuth, authController.logoutAllDevices);

module.exports = router;
