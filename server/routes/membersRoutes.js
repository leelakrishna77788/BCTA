const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const membersController = require('../controllers/membersController');

// All member routes require a valid token
router.use(verifyToken);

// GET /api/members
router.get('/', membersController.getAllMembers);

// POST /api/members (Admin only)
router.post('/', requireAdmin, membersController.createMember);

// PATCH /api/members/:id/status (Admin only)
router.patch('/:id/status', requireAdmin, membersController.toggleMemberStatus);

module.exports = router;
