const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const shopsController = require('../controllers/shopsController');

router.use(verifyToken);

// Admin / Shop Owners
router.get('/', requireAdmin, shopsController.getShops);
router.post('/', requireAdmin, shopsController.createShop);

// Product Distribution
router.post('/distribute', requireAdmin, shopsController.distributeProduct);

module.exports = router;
