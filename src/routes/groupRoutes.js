const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', groupController.myGroups);
router.post('/', groupController.createGroup);
router.put('/:id', groupController.updateGroup);
router.delete('/:id', groupController.deleteGroup);

router.post('/:id/members', groupController.addMembers);
router.delete('/:id/members/:userId', groupController.removeMember);

router.put('/:id/mute', groupController.toggleMute);
router.post('/:id/leave', groupController.leaveGroup);

module.exports = router;
