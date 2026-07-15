import User from '../models/user.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import redis from '../config/redis.js';
import mongoose from 'mongoose';
import { recordAudit } from '../middleware/audit.middleware.js';
import notificationService from '../services/notification.service.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

export const signup = async (req, res) => {
  try {
    const {
      name, email, password, phone, role_id, status,
      designation_id, department_id, departmentId, joining_date, salary, address,
      identityType, identityNumber, profile_image
    } = req.body;

    // 1. Check if user already exists
    const searchConditions = [{ email }];
    if (phone) searchConditions.push({ phone });
    const existingUsers = await User.find({ $or: searchConditions });
    if (existingUsers.length > 0) {
      const conflicts = [];
      const hasEmail = existingUsers.some(u => u.email === email);
      const hasPhone = phone && existingUsers.some(u => u.phone === phone);
      if (hasEmail) conflicts.push('Email');
      if (hasPhone) conflicts.push('Phone number');

      let msgPart = '';
      if (conflicts.length === 1) {
        msgPart = `${conflicts[0]} is`;
      } else {
        msgPart = `${conflicts[0]} and ${conflicts[1]} are`;
      }
      return res.status(400).json({ detail: `Conflict: ${msgPart} already registered.` });
    }

    // 2. Hash security password
    const hashedPassword = await bcrypt.hash(password, 10);

    const roleMap = {
      '1': 'hr',
      '2': 'admin',
      '3': 'employee',
      '4': 'digital_marketer',
      '10': 'student'
    };
    const userRole = roleMap[role_id] || String(role_id || 'employee');

    // 2.5 Resolve designation and department names if provided
    let resolvedDesignationName = '';
    let resolvedDesignationId = null;
    if (designation_id && mongoose.Types.ObjectId.isValid(String(designation_id))) {
      const Designation = (await import('../models/designation.model.js')).default;
      const designationObj = await Designation.findById(designation_id);
      if (designationObj) {
        resolvedDesignationName = designationObj.name;
        resolvedDesignationId = designationObj._id;
      }
    }

    let resolvedDepartmentName = '';
    let resolvedDepartmentId = null;
    const deptId = departmentId || department_id;
    if (deptId && mongoose.Types.ObjectId.isValid(String(deptId))) {
      const Department = (await import('../modules/departments/department.model.js')).default;
      const departmentObj = await Department.findById(deptId);
      if (departmentObj) {
        resolvedDepartmentName = departmentObj.name;
        resolvedDepartmentId = departmentObj._id;
      }
    }

    // 3. Create document instance
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      passwordHash: hashedPassword,
      phone,
      role_id: String(role_id),
      role: userRole,
      status: status || 'active',
      isActive: (status || 'active') === 'active',
      designation: resolvedDesignationName,
      designationId: resolvedDesignationId,
      department: resolvedDepartmentName,
      departmentId: resolvedDepartmentId,
      designation_id: resolvedDesignationId ? String(resolvedDesignationId) : String(designation_id || ''),
      joining_date: joining_date ? new Date(joining_date) : new Date(),
      salary: parseFloat(salary) || 0,
      address,
      identityType,
      identityNumber,
      profile_image: profile_image || null,
      avatar: profile_image || null,
      employeeId: email,
      lastLogin: null
    });

    await newUser.save();

    // Audit log for signup
    req.user = { id: newUser._id };
    await recordAudit(req, {
      action: 'CREATE',
      entity: 'User',
      entityId: newUser._id,
      newValue: { email: newUser.email, role: userRole }
    });

    // Welcome email notification
    const signupWelcomeHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 32px; text-align: center;">
          <h1 style="color: #00d4ff; margin: 0; font-size: 24px;">🎉 Account Registered!</h1>
        </div>
        <div style="padding: 32px; background: #ffffff;">
          <p style="font-size: 16px; color: #333;">Hi <strong>${newUser.name}</strong>,</p>
          <p style="color: #555;">Your account has been successfully registered on the CRM platform.</p>
          <div style="background: #f4f7ff; border-left: 4px solid #00d4ff; padding: 16px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 4px 0;"><strong>Email:</strong> ${newUser.email}</p>
            <p style="margin: 4px 0;"><strong>Role:</strong> ${userRole.toUpperCase()}</p>
          </div>
          <p style="color: #e74c3c; font-size: 13px;">⚠️ Please keep your login credentials secure.</p>
        </div>
      </div>
    `;
    try {
      await notificationService.sendEmail(
        newUser.email,
        '🎉 Welcome — Your CRM Account is Ready',
        signupWelcomeHtml
      );
    } catch (emailErr) {
      console.warn('Failed to send signup welcome email:', emailErr.message);
    }

    res.status(201).json({ message: "Staff Registration Successful!", userId: newUser._id });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
};



export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ detail: "Invalid credentials provided." });
    }

    // 2. Verify password
    const storedPassword = user.password || user.passwordHash;
    const validPassword = storedPassword && await bcrypt.compare(password, storedPassword);
    if (!validPassword) {
      return res.status(401).json({ detail: "Invalid credentials provided." });
    }

    // 3. Sign Auth JWT Token
    const token = jwt.sign(
      {
        id: user._id,
        role_id: user.role_id,
        role: user.role,
        departmentId: user.departmentId || null
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '7d'
      }
    );

    // Set Redis active session key for inactivity timeout (30 mins = 1800 seconds)
    try {
      await redis.set(`session:active:${user._id}`, 'active', 'EX', 1800);
      console.log(`🔑 Redis active session key set for User: ${user._id}`);
    } catch (redisError) {
      console.warn("Failed to set Redis session key during login:", redisError.message);
    }

    // Record login audit log
    req.user = { id: user._id };
    await recordAudit(req, {
      action: 'LOGIN',
      entity: 'User',
      entityId: user._id,
      newValue: { email: user.email }
    });

    const Department = (await import('../modules/departments/department.model.js')).default;
    const isTeamLead = await Department.exists({ managerId: user._id }) ? true : false;

    // Retrieve user's department to get name and code
    let departmentName = user.department || null;
    let departmentCode = null;
    if (user.departmentId) {
      try {
        const userDept = await Department.findById(user.departmentId).select('name code');
        if (userDept) {
          departmentName = userDept.name;
          departmentCode = userDept.code;
        }
      } catch (err) {
        console.error("Failed to query user department on login:", err);
      }
    }

    // 4. Return matching data structure required by your React components
    res.json({
      success: true, // Added to match standard response handlers
      message: "Login successful",
      token,
      user: {
        id: user._id,          // Standardized frontend fallback id
        _id: user._id,        // Native MongoDB ID mapping
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        role: user.role || "employee",
        role_id: user.role_id,
        designation: user.designation,
        designationId: user.designationId || user.designation_id, 
        reportingManager: user.reportingManager || null,
        salary: user.salary ?? 0,
        profile_image: user.profile_image || null,
        departmentId: user.departmentId || null,
        department: departmentName,
        departmentCode: departmentCode,
        employeeId: user.employeeId || null,
        avatar: user.avatar || null,
        isActive: user.isActive ?? true,
        status: user.status || "active",
        joining_date: user.joining_date,
        isTeamLead,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
};

export const verifyForgotPassword = async (req, res) => {
  try {
    const { email, phone } = req.body;
    if (!email || !phone) {
      return res.status(400).json({ success: false, detail: "Email and phone number are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ success: false, detail: "User profile not found with this email." });
    }

    const cleanUserPhone = String(user.phone || '').trim().replace(/[-()\s]/g, '');
    const cleanInputPhone = String(phone).trim().replace(/[-()\s]/g, '');

    if (cleanUserPhone !== cleanInputPhone) {
      return res.status(400).json({ success: false, detail: "Phone number does not match our records." });
    }

    return res.status(200).json({ success: true, message: "Credentials verified." });
  } catch (error) {
    res.status(500).json({ success: false, detail: error.message });
  }
};

export const resetForgotPassword = async (req, res) => {
  try {
    const { email, phone, newPassword } = req.body;
    if (!email || !phone || !newPassword) {
      return res.status(400).json({ success: false, detail: "Email, phone number, and new password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ success: false, detail: "User profile not found." });
    }

    const cleanUserPhone = String(user.phone || '').trim().replace(/[-()\s]/g, '');
    const cleanInputPhone = String(phone).trim().replace(/[-()\s]/g, '');

    if (cleanUserPhone !== cleanInputPhone) {
      return res.status(400).json({ success: false, detail: "Phone number verification failed." });
    }

    // Backend validation for password requirements (symbol, length, uppercase, number)
    const hasSymbol = /[\W_]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const isLongEnough = newPassword.length >= 8;

    if (!hasSymbol || !hasNumber || !hasUppercase || !hasLowercase || !isLongEnough) {
      return res.status(400).json({
        success: false,
        detail: "Password must be at least 8 characters long and include a symbol, number, uppercase and lowercase letters."
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.passwordHash = hashedPassword;
    await user.save();

    return res.status(200).json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    res.status(500).json({ success: false, detail: error.message });
  }
};

export const logout = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      // 1. Blacklist current JWT token in Redis for 7 days
      try {
        await redis.set(`revoked_token:${token}`, 'REVOKED', 'EX', 7 * 24 * 60 * 60);
      } catch (redisError) {
        console.warn("Failed to blacklist token in Redis:", redisError.message);
      }
    }

    if (userId) {
      const allDevices = req.body?.allDevices === true || req.query?.allDevices === 'true';
      
      if (allDevices) {
        // 2. Invalidate sessions on ALL devices
        try {
          await redis.set(`user_revoked_at:${userId}`, Math.floor(Date.now() / 1000));
          await redis.del(`session:active:${userId}`);
          
          const authService = (await import('../services/auth.service.js')).authService;
          await authService.revokeAllSessions(String(userId));
        } catch (redisError) {
          console.warn("Failed to revoke all sessions in Redis:", redisError.message);
        }
        
        console.log(`🧹 Logged out user ${userId} from all devices.`);
      } else {
        // 3. Single device logout (just delete inactivity session key)
        try {
          await redis.del(`session:active:${userId}`);
        } catch (redisError) {
          console.warn("Failed to delete active session key in Redis:", redisError.message);
        }
      }

      await recordAudit(req, {
        action: 'LOGOUT',
        entity: 'User',
        entityId: userId
      });
    }

    return res.status(200).json({ success: true, message: "Logout successful" });
  } catch (error) {
    next(error);
  }
};