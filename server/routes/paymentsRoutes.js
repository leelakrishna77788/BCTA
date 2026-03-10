const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const paymentsController = require('../controllers/paymentsController');

router.use(verifyToken);
router.use(requireAdmin);

router.get('/', paymentsController.getPayments);

module.exports = router;
