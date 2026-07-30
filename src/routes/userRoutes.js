const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/me', userController.getMe);
router.put('/me', userController.updateProfile);
router.delete('/me', userController.deleteAccount);

router.get('/lookup', userController.lookupByPhone);

router.put('/privacy', userController.updatePrivacy);
router.post('/block', userController.blockUser);
router.post('/unblock', userController.unblockUser);

module.exports = router;
