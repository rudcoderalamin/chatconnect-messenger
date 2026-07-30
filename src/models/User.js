const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: { type: String, trim: true, default: '' },
    photo: { type: String, default: '' }, // Cloudinary URL
    about: { type: String, default: 'Hey there! I am using ChatConnect.' },

    lastSeen: { type: Date, default: Date.now },
    online: { type: Boolean, default: false },

    // Privacy settings
    privacy: {
      hideLastSeen: { type: Boolean, default: false },
      hideOnline: { type: Boolean, default: false },
      hideProfilePhoto: { type: Boolean, default: false },
      hideAbout: { type: Boolean, default: false },
    },

    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Security
    twoStepEnabled: { type: Boolean, default: false },
    twoStepPin: { type: String, select: false }, // hashed

    // Registration status
    isProfileComplete: { type: Boolean, default: false },

    // Multi-device support
    devices: [
      {
        deviceId: String,
        fcmToken: String,
        platform: { type: String, enum: ['android', 'ios', 'web'] },
        lastActiveAt: Date,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
