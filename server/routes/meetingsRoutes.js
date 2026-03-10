const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const meetingsController = require('../controllers/meetingsController');

router.use(verifyToken);

// Admin Routes
router.get('/', requireAdmin, meetingsController.getMeetings);
router.get('/:id', requireAdmin, meetingsController.getMeetingById);
router.post('/', requireAdmin, meetingsController.createMeeting);
router.patch('/:id/start', requireAdmin, meetingsController.startMeetingQR);
router.post('/:id/refresh-qr', requireAdmin, meetingsController.refreshMeetingQR);
router.patch('/:id/stop', requireAdmin, meetingsController.stopMeetingQR);
router.get('/:id/attendance', requireAdmin, meetingsController.getMeetingAttendance);

// Member Routes
router.post('/attend', meetingsController.markAttendance);

module.exports = router;
