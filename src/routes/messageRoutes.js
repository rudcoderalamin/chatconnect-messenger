const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/search', messageController.searchMessages);
router.get('/group/:groupId', messageController.getGroupHistory);
router.get('/:userId', messageController.getOneToOneHistory);

router.put('/:id/delete', messageController.deleteMessage);
router.put('/:id/star', messageController.toggleStar);
router.put('/:id/pin', messageController.togglePin);

module.exports = router;
