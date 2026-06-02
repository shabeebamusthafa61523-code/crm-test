// middleware/auth.middleware.js

import jwt from 'jsonwebtoken';
import { sendError } from '../utils/response.helper.js';

/**
 * Standard Token Verification Middleware for Departments Module
 */
export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return sendError(res, 'No authorization header', 401);
    }

    if (!authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Invalid authorization format', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    
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
    const roleId = String(req.user?.role_id || '');
    const roleName = String(req.user?.role || '');

    // Map of roles for broad compatibility
    // Allows admin access if allowedRoles contains 'admin' and user is admin/1/MD/COO/EXECUTIVE_DIRECTOR
    const isAllowed = allowedRoles.some(allowed => {
      const target = allowed.toLowerCase();
      
      // Admin checks
      if (target === 'admin') {
        return (
          roleName.toLowerCase() === 'admin' ||
          roleId === '1' ||
          roleId === '10' ||
          roleName === '10' ||
          roleName.toUpperCase() === 'MD' ||
          roleName.toUpperCase() === 'COO' ||
          roleName.toUpperCase() === 'EXECUTIVE_DIRECTOR'
        );
      }
      
      // Manager checks
      if (target === 'manager') {
        return (
          roleName.toLowerCase() === 'manager' ||
          roleId === '2' ||
          roleName.toUpperCase() === 'DEPARTMENT_MANAGER'
        );
      }

      // Exact checks (e.g. custom role strings or IDs)
      return (
        roleName.toLowerCase() === target ||
        roleId === target
      );
    });

    if (!isAllowed) {
      return sendError(res, 'Access denied. Insufficient permissions.', 403);
    }

    next();
  };
};

/**
 * Original default protectRoute middleware to prevent breaking existing routes
 * Restored EXACTLY to original implementation.
 */
const protectRoute = (req, res, next) => {
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

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    console.log("DECODED:", decoded);

    req.user = decoded;

    next();

  } catch (error) {
    console.error("JWT ERROR:", error);

    return res.status(403).json({
      detail: error.message
    });
  }
};

export default protectRoute;