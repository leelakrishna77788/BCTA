const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const meetingsController = require('../controllers/meetingsController');

router.use(verifyToken);

// Admin Routes
router.get('/', requireAdmin, meetingsController.getMeetings);
router.post('/', requireAdmin, meetingsController.createMeeting);
router.patch('/:id/start', requireAdmin, meetingsController.startMeetingQR);
router.patch('/:id/stop', requireAdmin, meetingsController.stopMeetingQR);

// Member Routes
router.post('/attend', meetingsController.markAttendance);

module.exports = router;
