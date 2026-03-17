const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const membersController = require('../controllers/membersController');
const { validate, memberValidationRules, toggleStatusValidationRules } = require('../controllers/membersController');

router.use(verifyToken);

// GET /api/members
router.get('/', membersController.getAllMembers);

// POST /api/members (Admin only) - with validation
router.post('/', requireAdmin, memberValidationRules, validate, membersController.createMember);

// PATCH /api/members/:id/status (Admin only) - with validation
router.patch('/:id/status', requireAdmin, toggleStatusValidationRules, validate, membersController.toggleMemberStatus);

// DELETE /api/members/:id (Admin only)
router.delete('/:id', requireAdmin, membersController.deleteMember);

// DELETE /api/members (Admin only)
router.delete('/', requireAdmin, membersController.deleteAllMembers);

module.exports = router;
