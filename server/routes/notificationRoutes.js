const express = require('express');
const router = express.Router();
const { getNotifications, markRead } = require('../controllers/notificationController');
const { ensureAuth } = require('../middleware/authMiddleware');

router.get('/', ensureAuth, getNotifications);
router.put('/:id/read', ensureAuth, markRead);

module.exports = router;