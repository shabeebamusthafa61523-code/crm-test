import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import checkAuth from '../middleware/auth.middleware.js';

const router = Router();

// ==========================================
// ROLE VALIDATION
// ==========================================

const requireRole = (allowedRoles) => {
  return (req, res, next) => {

    const userRole =
      req.user?.role ||
      req.user?.role_id;

    if (
      !userRole ||
      !allowedRoles.includes(String(userRole))
    ) {
      return res.status(403).json({
        detail:
          'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

// ==========================================
// AUTH MIDDLEWARE
// ==========================================

router.use(checkAuth);

// ==========================================
// USER ROUTES
// ==========================================

// GET ALL USERS
router.get(
  '/',
  userController.getUsers
);

// SIMPLE USER LIST
router.get(
  '/list',
  userController.getUserList
);

// GET USER BY ID
router.get(
  '/:id',
  userController.getUserById
);

// ==========================================
// ADMIN ROUTES
// ==========================================

// CREATE USER
router.post(
  '/',
  requireRole(['1', '2','3']),
  userController.createUser
);

// UPDATE USER
router.put(
  '/:id',
  requireRole(['1', '2']),
  userController.updateUser
);

// CHANGE ROLE
router.patch(
  '/:id/role',
  requireRole(['1']),
  userController.changeUserRole
);

// DEACTIVATE USER
router.patch(
  '/:id/deactivate',
  requireRole(['1']),
  userController.deactivateUser
);

// DELETE USER
router.delete(
  '/:id',
  requireRole(['1']),
  userController.deleteUser
);

export default router;