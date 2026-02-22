const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const complaintsController = require('../controllers/complaintsController');

router.use(verifyToken);

// Admin Routes
router.get('/', requireAdmin, complaintsController.getComplaints);
router.patch('/:id/resolve', requireAdmin, complaintsController.resolveComplaint);
router.delete('/:id', requireAdmin, complaintsController.deleteComplaint);

// Member Routes
router.post('/', complaintsController.raiseComplaint);

module.exports = router;
