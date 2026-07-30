const express = require('express');
const router = express.Router();
const callController = require('../controllers/callController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', callController.getCallHistory);
router.delete('/:id', callController.deleteCallRecord);

module.exports = router;
