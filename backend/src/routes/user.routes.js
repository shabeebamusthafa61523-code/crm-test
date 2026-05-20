import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import checkAuth from '../middleware/auth.middleware.js'; // The actual middleware file you have

const router = Router();

// Custom local fallback for role validation to prevent crashes
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role || req.user?.role_id; 
    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ detail: "Access denied. Insufficient permissions." });
    }
    next();
  };
};

// Apply global JWT handshake validation over user directory routes
router.use(checkAuth);

// Directory query endpoints 
router.get('/', requireRole(['MD', 'COO', 'EXECUTIVE_DIRECTOR', 'DEPARTMENT_MANAGER', 'TEAM_LEADER']), userController.getUsers);
router.get('/list', userController.getUserList);
router.get('/:id', userController.getUserById);

// Directory administration endpoints 
router.post('/', requireRole(['MD', 'COO']), userController.createUser);
router.put('/:id', requireRole(['MD', 'COO', 'DEPARTMENT_MANAGER']), userController.updateUser);

router.patch('/:id/role', requireRole(['MD', 'COO']), userController.changeUserRole);
router.patch('/:id/deactivate', requireRole(['MD', 'COO']), userController.deactivateUser);
router.delete('/:id', requireRole(['MD']), userController.deleteUser);

export default router;