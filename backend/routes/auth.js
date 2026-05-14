const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { login, refresh, logout, getMe, createAdmin, getAdmins, deleteAdmin } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const validate = require('../middleware/validate');

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required.').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  validate,
  login
);

// POST /api/auth/refresh
router.post('/refresh', refresh);

// POST /api/auth/logout
router.post('/logout', logout);

// GET /api/auth/me
router.get('/me', protect, getMe);

// ─── Super admin only ──────────────────────────────────────────────────────

// POST /api/auth/create-admin
router.post(
  '/create-admin',
  protect,
  requireRole('superadmin'),
  [
    body('email').isEmail().withMessage('Valid email required.').normalizeEmail(),
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters.'),
    body('role')
      .optional()
      .isIn(['admin', 'superadmin'])
      .withMessage('Role must be admin or superadmin.'),
  ],
  validate,
  createAdmin
);

// GET /api/auth/admins
router.get('/admins', protect, requireRole('superadmin'), getAdmins);

// DELETE /api/auth/admins/:id
router.delete(
  '/admins/:id',
  protect,
  requireRole('superadmin'),
  [param('id').isMongoId().withMessage('Invalid admin ID.')],
  validate,
  deleteAdmin
);

module.exports = router;
