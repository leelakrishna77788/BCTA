const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const notificationsController = require('../controllers/notificationsController');

router.use(verifyToken);
router.use(requireAdmin);

// Admin Routes (Only admins can send/view all notifications for now)
router.get('/', notificationsController.getNotifications);
router.post('/', notificationsController.broadcastNotification);

module.exports = router;
