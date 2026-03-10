const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

router.use(verifyToken);
router.use(requireAdmin);

router.get('/dashboard-stats', adminController.getDashboardStats);

module.exports = router;
