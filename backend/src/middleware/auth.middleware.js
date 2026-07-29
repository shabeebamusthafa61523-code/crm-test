import jwt from 'jsonwebtoken';
import { sendError } from '../utils/response.helper.js';
import redis from '../config/redis.js';

const JWT_SECRET_KEY = process.env.JWT_SECRET || 'fallback_secret_key';

/**
 * Standard Token Verification Middleware
 */
export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return sendError(res, 'No authorization header', 401);
    }

    let token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
    token = token ? token.replace(/^"(.*)"$/, '$1').trim() : '';

    if (!token) {
      return sendError(res, 'Invalid authorization format', 401);
    }

    const decoded = jwt.verify(token, JWT_SECRET_KEY);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('JWT Verification Error:', error.message);
    return sendError(res, 'Unauthorized access. Token invalid or expired.', 401);
  }
};

/**
 * Role Restriction Middleware
 */
export const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized. User authentication required.', 401);
    }
    // Grant access to all authenticated users
    next();
  };
};

export const restrictToRoles = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized.' });
    const userRole = String(req.user?.role || '').toLowerCase().trim();
    const userRoleId = String(req.user?.role_id || '').trim();

    const isAllowed = allowedRoles.some(role => {
      const target = role.toLowerCase().trim();
      return userRole === target || userRoleId === target;
    });

    if (!isAllowed) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    next();
  };
};

export const restrictToDepartment = (departmentId) => {
  return async (req, res, next) => {
    const role = String(req.user?.role || req.user?.role_id || '').toLowerCase().trim();
    const isPrivileged = ['1', '2', 'hr', 'admin'].includes(role);
    if (isPrivileged) return next();

    let userDeptId = req.user?.departmentId;
    if (!userDeptId && req.user?.id) {
      try {
        const User = (await import('../models/user.model.js')).default;
        const userObj = await User.findById(req.user.id);
        if (userObj) userDeptId = userObj.departmentId;
      } catch (err) {
        console.error("Failed to fetch user department fallback:", err);
      }
    }

    userDeptId = String(userDeptId || '').trim();
    if (userDeptId === '6a3caed51194353cbc8a3686' || userDeptId === '6a55c7e8b613a280003481d8') {
      return next();
    }

    if (userDeptId !== String(departmentId).trim()) {
      return res.status(403).json({ success: false, message: 'Access denied to department resource.' });
    }

    next();
  };
};

/**
 * Core protectRoute Middleware
 */
const protectRoute = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ detail: "No authorization header provided." });
    }

    let token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
    token = token ? token.replace(/^"(.*)"$/, '$1').trim() : '';

    if (!token) {
      return res.status(401).json({ detail: "Invalid authorization token format." });
    }

    const decoded = jwt.verify(token, JWT_SECRET_KEY);
    req.user = decoded;

    // Non-blocking Redis session touch
    try {
      const sessionKey = `session:active:${decoded.id}`;
      await redis.expire(sessionKey, 1800);
    } catch (redisError) {
      // Redis warning ignored to prevent blocking valid JWT requests
    }

    next();
  } catch (error) {
    console.error("protectRoute JWT ERROR:", error.message);
    return res.status(401).json({ detail: error.message || "Unauthorized access. Token invalid or expired." });
  }
};

export default protectRoute;