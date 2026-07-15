import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import checkAuth from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.middleware.js';

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

const adminOrSuperAdmin = requireRole(['admin', 'superadmin', 'super admin', '2']);

// ==========================================
// USER ROUTES
// ==========================================

// CHANGE PASSWORD (self)
router.post(
  '/change-password',
  userController.changePassword
);

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
  '/create',
  adminOrSuperAdmin,
  upload.single('profileImage'),
  userController.createUser
);
router.post(
  '/',
  adminOrSuperAdmin,
  upload.single('profileImage'),
  userController.createUser
);

// UPDATE USER
router.put(
  '/update/:id',
  adminOrSuperAdmin,
  upload.single('profileImage'),
  userController.updateUser
);
router.post(
  '/update/:id',
  adminOrSuperAdmin,
  upload.single('profileImage'),
  userController.updateUser
);
router.put(
  '/:id',
  adminOrSuperAdmin,
  upload.single('profileImage'),
  userController.updateUser
);
router.put(
  '/update',
  adminOrSuperAdmin,
  upload.single('profileImage'),
  (req, res, next) => {
    req.params.id = req.body.id || req.body._id;
    next();
  },
  userController.updateUser
);
router.post(
  '/update',
  adminOrSuperAdmin,
  upload.single('profileImage'),
  (req, res, next) => {
    req.params.id = req.body.id || req.body._id;
    next();
  },
  userController.updateUser
);

// CHANGE ROLE
router.patch(
  '/:id/role',
  adminOrSuperAdmin,
  userController.changeUserRole
);

// DEACTIVATE USER
router.patch(
  '/:id/deactivate',
  adminOrSuperAdmin,
  userController.deactivateUser
);

// DELETE USER
router.delete(
  '/delete/:id',
  adminOrSuperAdmin,
  userController.deleteUser
);
router.post(
  '/delete/:id',
  adminOrSuperAdmin,
  userController.deleteUser
);
router.delete(
  '/:id',
  adminOrSuperAdmin,
  userController.deleteUser
);
router.delete(
  '/delete',
  adminOrSuperAdmin,
  (req, res, next) => {
    req.params.id = req.body.id || req.body._id;
    next();
  },
  userController.deleteUser
);
router.post(
  '/delete',
  adminOrSuperAdmin,
  (req, res, next) => {
    req.params.id = req.body.id || req.body._id;
    next();
  },
  userController.deleteUser
);

// BULK IMPORT
router.post(
  '/import',
  adminOrSuperAdmin,
  userController.bulkImport
);

// RESET PASSWORD (admin initiated)
router.post(
  '/:id/reset-password',
  adminOrSuperAdmin,
  userController.resetPassword
);

export default router;