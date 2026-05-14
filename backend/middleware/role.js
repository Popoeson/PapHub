/**
 * Role-based authorization middleware.
 * Must be used AFTER the protect middleware which sets req.admin.
 *
 * Usage:
 *   router.delete('/:id', protect, requireRole('superadmin'), deleteProduct);
 */

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({
        message: 'Access denied. You do not have permission to perform this action.',
        code: 'INSUFFICIENT_ROLE',
      });
    }

    next();
  };
};

module.exports = { requireRole };
