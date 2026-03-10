const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const notificationsController = require('../controllers/notificationsController');

router.use(verifyToken);
// Admin Routes (Only admins can send notifications)
router.get('/', notificationsController.getNotifications);
router.post('/send', requireAdmin, notificationsController.broadcastNotification);

module.exports = router;
