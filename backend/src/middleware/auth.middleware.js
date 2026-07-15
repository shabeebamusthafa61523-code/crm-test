// middleware/auth.middleware.js

import jwt from 'jsonwebtoken';
import { sendError } from '../utils/response.helper.js';
import redis from '../config/redis.js';

/**
 * Standard Token Verification Middleware for Departments Module
 */
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return sendError(res, 'No authorization header', 401);
    }

    if (!authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Invalid authorization format', 401);
    }

    const token = authHeader.split(' ')[1];

    // Check if token has been blacklisted
    try {
      const isRevoked = await redis.get(`revoked_token:${token}`);
      if (isRevoked) {
        return sendError(res, 'Token has been revoked. Please log in again.', 401);
      }
    } catch (redisError) {
      console.warn("Redis check failed in verifyToken:", redisError.message);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');

    // Check all-device revocation
    try {
      const revokedAt = await redis.get(`user_revoked_at:${decoded.id}`);
      if (revokedAt && decoded.iat < parseInt(revokedAt)) {
        return sendError(res, 'Session revoked from all devices. Please log in again.', 401);
      }
    } catch (redisError) {
      console.warn("Redis check failed in verifyToken:", redisError.message);
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    console.error('JWT Verification Error:', error);
    return sendError(res, error.message || 'Unauthorized access', 403);
  }
};

/**
 * Role Restriction Middleware
 * @param {Array<String>} allowedRoles - Roles allowed to mutate resources
 */
export const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    // Collect possible role identifiers from req.user
    const roleId = String(req.user?.role_id || '').toLowerCase().trim();
    const roleName = String(req.user?.role || '').toLowerCase().trim();

    // Map of roles for broad compatibility
    const isAllowed = allowedRoles.some(allowed => {
      const target = allowed.toLowerCase().trim();
      
      // Exact checks (e.g. custom role strings or IDs)
      if (roleName === target || roleId === target) {
        return true;
      }

      // Admin checks
      if (target === 'admin') {
        return (
          roleName === 'admin' ||
          roleName === 'superadmin' ||
          roleName === 'super admin' ||
          roleId === '2' ||
          roleName.toUpperCase() === 'MD' ||
          roleName.toUpperCase() === 'COO' ||
          roleName.toUpperCase() === 'EXECUTIVE_DIRECTOR'
        );
      }
      
      // Manager checks
      if (target === 'manager') {
        return (
          roleName === 'manager' ||
          roleName === 'admin' ||
          roleName === 'superadmin' ||
          roleName === 'super admin' ||
          roleId === '2' ||
          roleName.toUpperCase() === 'DEPARTMENT_MANAGER'
        );
      }

      return false;
    });

    if (!isAllowed) {
      return sendError(res, 'Access denied. Insufficient permissions.', 403);
    }

    next();
  };
};

/**
 * Strict Role Access control middleware for leads and analytics
 * Checks req.user.role (e.g. 'digital_marketer') and req.user.role_id (e.g. '4')
 */
export const restrictToRoles = (allowedRoles = []) => {
  return (req, res, next) => {
    const userRole = String(req.user?.role || '').toLowerCase().trim();
    const userRoleId = String(req.user?.role_id || '').trim();

    const isAllowed = allowedRoles.some(role => {
      const target = role.toLowerCase().trim();
      return userRole === target || userRoleId === target;
    });

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Exclusive to digital marketing teams.'
      });
    }

    next();
  };
};

export const restrictToDepartment = (deptCodeOrId) => {
  return async (req, res, next) => {
    // Administrative roles (1, 2, hr, admin) can bypass department checks
    const role = String(req.user?.role || req.user?.role_id || '').toLowerCase().trim();
    const isPrivileged = ['1', '2', 'hr', 'admin'].includes(role);
    if (isPrivileged) {
      return next();
    }

    let userDeptId = req.user?.departmentId;

    // Fallback: If departmentId is missing from token (e.g. active session), query from DB
    if (!userDeptId && req.user?.id) {
      try {
        const User = (await import('../models/user.model.js')).default;
        const userObj = await User.findById(req.user.id);
        if (userObj) {
          userDeptId = userObj.departmentId;
        }
      } catch (err) {
        console.error("Failed to fetch user department fallback:", err);
      }
    }

    userDeptId = String(userDeptId || '').trim();

    const Department = (await import('../modules/departments/department.model.js')).default;

    // Bypass for HR/ADMIN department (code: 'HR')
    try {
      const hrDept = await Department.findOne({ code: 'HR' });
      if (hrDept && userDeptId === String(hrDept._id)) {
        return next();
      }
    } catch (err) {
      console.error("Failed to fetch HR department for bypass check:", err);
    }

    // Resolve the target department ID from deptCodeOrId (could be a code or ObjectID)
    let targetDeptId = String(deptCodeOrId).trim();
    if (targetDeptId.length !== 24) {
      try {
        const targetDept = await Department.findOne({ code: targetDeptId.toUpperCase() });
        targetDeptId = targetDept ? String(targetDept._id) : '';
      } catch (err) {
        console.error("Failed to resolve department code:", err);
        targetDeptId = '';
      }
    }

    if (userDeptId !== targetDeptId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Exclusive to the authorized department.'
      });
    }

    next();
  };
};

/**
 * Original default protectRoute middleware to prevent breaking existing routes
 * Restored EXACTLY to original implementation, with added Redis sliding session check.
 */
const protectRoute = async (req, res, next) => {
  try {
    console.log("HEADERS:", req.headers);

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        detail: "No authorization header"
      });
    }

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        detail: "Invalid authorization format"
      });
    }

    const token = authHeader.split(" ")[1];

    console.log("TOKEN:", token);

    // Check if token has been blacklisted
    try {
      const isRevoked = await redis.get(`revoked_token:${token}`);
      if (isRevoked) {
        return res.status(401).json({
          detail: "Token has been revoked. Please log in again."
        });
      }
    } catch (redisError) {
      console.warn("Redis check failed in protectRoute:", redisError.message);
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    console.log("DECODED:", decoded);

    // Check all-device revocation
    try {
      const revokedAt = await redis.get(`user_revoked_at:${decoded.id}`);
      if (revokedAt && decoded.iat < parseInt(revokedAt)) {
        return res.status(401).json({
          detail: "Session revoked from all devices. Please log in again."
        });
      }
    } catch (redisError) {
      console.warn("Redis check failed in protectRoute:", redisError.message);
    }

    req.user = decoded;

    // --- Inactivity sliding session check (30 mins = 1800 seconds) ---
    try {
      const sessionKey = `session:active:${decoded.id}`;
      const sessionExists = await redis.exists(sessionKey);
      
      if (!sessionExists) {
        return res.status(401).json({
          detail: "Session expired due to inactivity. Please log in again."
        });
      }
      
      // Slide expiration forward
      await redis.expire(sessionKey, 1800);
    } catch (redisError) {
      console.warn("Redis session verification failed, skipping check:", redisError.message);
    }

    next();

  } catch (error) {
    console.error("JWT ERROR:", error);

    return res.status(403).json({
      detail: error.message
    });
  }
};

export default protectRoute;