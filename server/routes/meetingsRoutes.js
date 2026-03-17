const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const meetingsController = require('../controllers/meetingsController');
const { validate, createMeetingValidationRules, markAttendanceValidationRules, markAttendanceByAdminValidationRules, qrTokenValidationRules } = meetingsController;

router.use(verifyToken);

// Admin Routes
router.get('/', requireAdmin, meetingsController.getMeetings);
router.get('/:id', requireAdmin, meetingsController.getMeetingById);
router.post('/', requireAdmin, createMeetingValidationRules, validate, meetingsController.createMeeting);
router.patch('/:id/start', requireAdmin, qrTokenValidationRules, validate, meetingsController.startMeetingQR);
router.post('/:id/refresh-qr', requireAdmin, qrTokenValidationRules, validate, meetingsController.refreshMeetingQR);
router.patch('/:id/stop', requireAdmin, meetingsController.stopMeetingQR);
router.get('/:id/attendance', requireAdmin, meetingsController.getMeetingAttendance);
router.post('/:id/mark-member', requireAdmin, markAttendanceByAdminValidationRules, validate, meetingsController.markAttendanceByAdmin);

// Member Routes
router.post('/attend', markAttendanceValidationRules, validate, meetingsController.markAttendance);

module.exports = router;
