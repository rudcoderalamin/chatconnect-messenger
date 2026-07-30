const rateLimit = require('express-rate-limit');

// Firebase handles OTP send/verify rate limiting on its own side (per-project
// SMS quota + reCAPTCHA abuse protection). This limiter is a second layer,
// protecting our own token-exchange endpoint from brute-force abuse.
const otpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: { message: 'Too many verification attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { otpVerifyLimiter };
