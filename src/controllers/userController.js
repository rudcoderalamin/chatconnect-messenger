const User = require('../models/User');

/**
 * PUT /api/users/me
 * body: { name, about, photo }
 * Auth required — used both for initial profile setup and later edits
 */
async function updateProfile(req, res) {
  try {
    const { name, about, photo } = req.body;
    const user = req.user;

    if (name !== undefined) user.name = name;
    if (about !== undefined) user.about = about;
    if (photo !== undefined) user.photo = photo;

    if (name && !user.isProfileComplete) {
      user.isProfileComplete = true;
    }

    await user.save();

    return res.status(200).json({
      message: 'Profile updated',
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        photo: user.photo,
        about: user.about,
        isProfileComplete: user.isProfileComplete,
      },
    });
  } catch (err) {
    console.error('[updateProfile]', err);
    return res.status(500).json({ message: 'Failed to update profile' });
  }
}

/**
 * GET /api/users/me
 */
async function getMe(req, res) {
  const user = req.user;
  return res.status(200).json({
    id: user._id,
    phone: user.phone,
    name: user.name,
    photo: user.photo,
    about: user.about,
    privacy: user.privacy,
    twoStepEnabled: user.twoStepEnabled,
  });
}

/**
 * GET /api/users/lookup?phone=+8801xxxxxxxxx
 * Checks if a phone number belongs to a registered user (for "New Chat").
 * Auth required
 */
async function lookupByPhone(req, res) {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const user = await User.findOne({ phone }).select('_id phone name photo about online lastSeen privacy');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.user._id.toString() === user._id.toString()) {
      return res.status(400).json({ message: 'Cannot start a chat with yourself' });
    }

    return res.status(200).json({
      id: user._id,
      phone: user.phone,
      name: user.name,
      photo: user.privacy.hideProfilePhoto ? '' : user.photo,
      about: user.privacy.hideAbout ? '' : user.about,
      online: user.privacy.hideOnline ? undefined : user.online,
      lastSeen: user.privacy.hideLastSeen ? undefined : user.lastSeen,
    });
  } catch (err) {
    console.error('[lookupByPhone]', err);
    return res.status(500).json({ message: 'Lookup failed' });
  }
}

/**
 * PUT /api/users/privacy
 * body: { hideLastSeen, hideOnline, hideProfilePhoto, hideAbout }
 */
async function updatePrivacy(req, res) {
  try {
    const user = req.user;
    const fields = ['hideLastSeen', 'hideOnline', 'hideProfilePhoto', 'hideAbout'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) user.privacy[f] = req.body[f];
    });
    await user.save();
    return res.status(200).json({ message: 'Privacy settings updated', privacy: user.privacy });
  } catch (err) {
    console.error('[updatePrivacy]', err);
    return res.status(500).json({ message: 'Failed to update privacy settings' });
  }
}

/**
 * POST /api/users/block
 * body: { userId }
 */
async function blockUser(req, res) {
  try {
    const { userId } = req.body;
    const user = req.user;
    if (!user.blockedUsers.includes(userId)) {
      user.blockedUsers.push(userId);
      await user.save();
    }
    return res.status(200).json({ message: 'User blocked' });
  } catch (err) {
    console.error('[blockUser]', err);
    return res.status(500).json({ message: 'Failed to block user' });
  }
}

/**
 * POST /api/users/unblock
 * body: { userId }
 */
async function unblockUser(req, res) {
  try {
    const { userId } = req.body;
    const user = req.user;
    user.blockedUsers = user.blockedUsers.filter((id) => id.toString() !== userId);
    await user.save();
    return res.status(200).json({ message: 'User unblocked' });
  } catch (err) {
    console.error('[unblockUser]', err);
    return res.status(500).json({ message: 'Failed to unblock user' });
  }
}

/**
 * DELETE /api/users/me
 * Deletes the current user's account
 */
async function deleteAccount(req, res) {
  try {
    await User.findByIdAndDelete(req.user._id);
    return res.status(200).json({ message: 'Account deleted' });
  } catch (err) {
    console.error('[deleteAccount]', err);
    return res.status(500).json({ message: 'Failed to delete account' });
  }
}

module.exports = {
  updateProfile,
  getMe,
  lookupByPhone,
  updatePrivacy,
  blockUser,
  unblockUser,
  deleteAccount,
};
