import User from '../models/user.model.js';
import Designation from '../models/designation.model.js';
import mongoose from 'mongoose';
import { hashPassword } from '../utils/bcrypt.util.js';
import { authService } from '../services/auth.service.js';
import { recordAudit } from '../middleware/audit.middleware.js';
import notificationService from '../services/notification.service.js';
import { sendSuccess } from '../utils/response.util.js';
import {
  getPaginationParams,
  getPaginationMetadata
} from '../utils/pagination.util.js';
import { AppError } from '../middleware/errorHandler.js';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary using environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'crm_profiles' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

const findDesignationById = async (designationId) => {
  if (!designationId) return null;

  if (!mongoose.Types.ObjectId.isValid(String(designationId))) {
    throw new AppError('Selected designation was not found.', 400);
  }

  const designation = await Designation.findById(designationId);

  if (!designation) {
    throw new AppError('Selected designation was not found.', 400);
  }

  return designation;
};

export const userController = {

  /**
   * GET /api/v1/users/list
   */
  getUserList: async (req, res) => {
    try {

      const users = await User.find(
        { 
          isActive: true,
          role: { $nin: ['student', 'Student'] },
          role_id: { $nin: ['10', 10] }
        },
        {
          password: 0,
          passwordHash: 0,
          __v: 0
        }
      ).sort({ name: 1 });

      return res.status(200).json(users);

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        message: 'Failed to fetch users'
      });
    }
  },

  /**
   * GET /api/v1/users
   */
  getUsers: async (req, res, next) => {
    try {
      const { page, limit, skip } =
        getPaginationParams(req.query);

      const {
        department,
        role,
        search,
        status
      } = req.query;

      const whereClause = { role_id: { $ne: '10' } };

      if (department) {
        whereClause.$or = [
          { departmentId: department },
          { department: { $regex: department, $options: 'i' } }
        ];
      }

      if (role) {
        if (role === 'student' || role === '10') {
          whereClause.role_id = '10';
        } else {
          whereClause.role = role;
          delete whereClause.role_id;
        }
      }

      if (status !== undefined && status !== '') {
        whereClause.status = status;
      }

      if (search) {
        whereClause.$or = [
          {
            name: {
              $regex: search,
              $options: 'i'
            }
          },
          {
            email: {
              $regex: search,
              $options: 'i'
            }
          },
          {
            employeeId: {
              $regex: search,
              $options: 'i'
            }
          }
        ];
      }

      const isPaginationRequested = req.query.page !== undefined || req.query.limit !== undefined;

      let query = User.find(whereClause)
        .populate(
          'departmentId',
          'name'
        )
        .sort({ createdAt: -1 });

      if (isPaginationRequested) {
        query = query.skip(skip).limit(limit);
      }

      const [users, totalCount] =
        await Promise.all([
          query,
          User.countDocuments(whereClause)
        ]);

      const designationIds = users
        .map((u) => u.designationId || u.designation)
        .filter((designationId) => mongoose.Types.ObjectId.isValid(String(designationId)))
        .filter(Boolean);
      const designations = await Designation.find({ _id: { $in: designationIds } });
      const designationMap = new Map(designations.map((designation) => [
        String(designation._id),
        designation.name
      ]));

      const safeUsers = users.map((u) => {
        const designationId = u.designationId ? String(u.designationId) : '';
        const legacyDesignationId = designationMap.has(String(u.designation)) ? String(u.designation) : '';
        const resolvedDesignationId = designationId || legacyDesignationId;

        return ({
        id: u._id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        employeeId: u.employeeId,
        department: u.department || (u.departmentId ? u.departmentId.name : ''),
        departmentId: u.departmentId,
        designation: resolvedDesignationId || u.designation,
        designationId: resolvedDesignationId,
        designationName: designationMap.get(resolvedDesignationId) || u.designation,
        reportingManager: u.reportingManager,
        avatar: u.avatar || u.profile_image,
        isActive: u.isActive,
        status: u.status || (u.isActive ? 'active' : 'inactive'),
        lastLogin: u.lastLogin,
        createdAt: u.createdAt
        });
      });

      const paginationMeta =
        getPaginationMetadata(
          totalCount,
          page,
          limit
        );

      return sendSuccess(res, {
        status: 200,
        message:
          'Staff directory list retrieved successfully.',
        data: safeUsers,
        pagination: paginationMeta
      });

    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/users/:id
   */
  getUserById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const user = await User.findById(id)
        .populate(
          'departmentId',
          'name headUserId'
        )
        .populate('designationId', 'name');

      if (!user) {
        throw new AppError(
          'Employee profile not found in directory.',
          404
        );
      }

      return sendSuccess(res, {
        status: 200,
        message:
          'Employee details successfully retrieved.',
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          employeeId: user.employeeId,
          department: user.department || (user.departmentId ? user.departmentId.name : ''),
          departmentId: user.departmentId,
          designation: user.designationId ? String(user.designationId._id) : user.designation,
          designationId: user.designationId ? String(user.designationId._id) : '',
          designationName: user.designationId?.name || user.designation,
          reportingManager: user.reportingManager,
          avatar: user.avatar || user.profile_image,
          isActive: user.isActive,
          status: user.status || (user.isActive ? 'active' : 'inactive'),
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        }
      });

    } catch (error) {
      next(error);
    }
  },

  createUser: async (req, res, next) => {
    try {

      const {
        name,
        email,
        phone,
        role,
        department,
        departmentId,
        designation,
        reportingManager,
        status,
        employeeId,
        avatar,
        profile_image,
        password
      } = req.body;

      const existingUser =
        await User.findOne({
          $or: [
            { email },
            { phone },
            { employeeId }
          ]
        });

      if (existingUser) {
        throw new AppError(
          'Conflict: Email, Phone, or Employee ID already registered.',
          409
        );
      }

      const tempPass =
        password || 'WelcomeKOD123!';

      const passwordHash =
        await hashPassword(tempPass);

      let fileUrl = avatar || profile_image || null;

      if (req.file) {
        try {
          const uploadResult = await uploadToCloudinary(req.file.buffer);
          fileUrl = uploadResult.secure_url;
        } catch (uploadError) {
          console.error("Cloudinary upload failed for profile image onboarding:", uploadError);
        }
      }

      const selectedDesignation = await findDesignationById(designation);

      const newUser =
        await User.create({
          name,
          email,
          phone,
          role: role || 'employee',
          role_id: role === 'admin' ? '1' : (role === 'manager' ? '2' : '3'),
          department,
          departmentId,
          designation: selectedDesignation?.name || '',
          designationId: selectedDesignation?._id,
          reportingManager,
          status: status || 'active',
          employeeId,
          avatar: fileUrl,
          profile_image: fileUrl,
          passwordHash
        });

      await recordAudit(req, {
        action: 'CREATE',
        entity: 'User',
        entityId: newUser._id,
        newValue: {
          name,
          email,
          role,
          employeeId,
          department,
          designation: selectedDesignation?.name || '',
          designationId: selectedDesignation?._id
        }
      });

      try {
        await notificationService.sendEmail(
          newUser.email,
          '🎉 Welcome to the Team!',
          'Your Command Center Account is Ready',
          `Welcome ${newUser.name}! Temp Password: ${tempPass}`
        );
      } catch (err) {
        console.error('Failed to send welcome email:', err.message);
      }

      return sendSuccess(res, {
        status: 201,
        message:
          'New employee account registered.',
        data: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          employeeId: newUser.employeeId,
          status: newUser.status
        }
      });

    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/v1/users/:id
   */
  updateUser: async (req, res, next) => {
    try {

      const { id } = req.params;

      const {
        name,
        phone,
        role,
        department,
        departmentId,
        designation,
        reportingManager,
        status,
        avatar,
        profile_image,
        isActive
      } = req.body;

      const existingUser =
        await User.findById(id);

      if (!existingUser) {
        throw new AppError(
          'Employee profile not found.',
          404
        );
      }

      let fileUrl = undefined;

      if (req.file) {
        try {
          const uploadResult = await uploadToCloudinary(req.file.buffer);
          fileUrl = uploadResult.secure_url;
        } catch (uploadError) {
          console.error("Cloudinary upload failed for profile image update:", uploadError);
        }
      }

      const selectedDesignation = await findDesignationById(designation);

      const updateFields = {
        name,
        phone,
        department,
        departmentId,
        designation: selectedDesignation?.name || '',
        designationId: selectedDesignation?._id,
        reportingManager,
      };

      if (fileUrl) {
        updateFields.avatar = fileUrl;
        updateFields.profile_image = fileUrl;
      } else if (avatar || profile_image) {
        updateFields.avatar = avatar || profile_image;
        updateFields.profile_image = profile_image || avatar;
      }

      if (role) {
        updateFields.role = role;
        updateFields.role_id = role === 'admin' ? '1' : (role === 'manager' ? '2' : '3');
      }

      if (status !== undefined) {
        updateFields.status = status;
        updateFields.isActive = status === 'active';
      } else if (isActive !== undefined) {
        updateFields.isActive = isActive;
        updateFields.status = isActive ? 'active' : 'inactive';
      }

      const updatedUser =
        await User.findByIdAndUpdate(
          id,
          updateFields,
          { new: true }
        );

      await recordAudit(req, {
        action: 'UPDATE',
        entity: 'User',
        entityId: id,
        oldValue: {
          name: existingUser.name,
          phone: existingUser.phone,
          status: existingUser.status
        },
        newValue: {
          name,
          phone,
          department,
          designation: selectedDesignation?.name || '',
          designationId: selectedDesignation?._id,
          status
        }
      });

      return sendSuccess(res, {
        status: 200,
        message:
          'Employee record successfully updated.',
        data: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          status: updatedUser.status,
          isActive: updatedUser.isActive
        }
      });

    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/v1/users/:id/role
   */
  changeUserRole: async (req, res, next) => {
    try {

      const { id } = req.params;
      const { role } = req.body;

      const user =
        await User.findById(id);

      if (!user) {
        throw new AppError(
          'Employee profile not found.',
          404
        );
      }

      const updatedUser =
        await User.findByIdAndUpdate(
          id,
          { role },
          { new: true }
        );

      await authService.revokeAllSessions(id);

      await recordAudit(req, {
        action: 'UPDATE',
        entity: 'User',
        entityId: id,
        oldValue: {
          role: user.role
        },
        newValue: {
          role
        }
      });

      return sendSuccess(res, {
        status: 200,
        message:
          `Role updated to ${role}. Security protocol triggered.`,
        data: {
          id: updatedUser._id,
          name: updatedUser.name,
          role: updatedUser.role
        }
      });

    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/v1/users/:id/deactivate
   */
  deactivateUser: async (req, res, next) => {
    try {

      const { id } = req.params;

      const user =
        await User.findById(id);

      if (!user) {
        throw new AppError(
          'Employee profile not found.',
          404
        );
      }

      await User.findByIdAndUpdate(
        id,
        { isActive: false }
      );

      await authService.revokeAllSessions(id);

      await recordAudit(req, {
        action: 'UPDATE',
        entity: 'User',
        entityId: id,
        oldValue: {
          isActive: true
        },
        newValue: {
          isActive: false
        }
      });

      return sendSuccess(res, {
        status: 200,
        message:
          'Employee account deactivated.'
      });

    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/v1/users/:id
   */
  deleteUser: async (req, res, next) => {
    try {

      const { id } = req.params;

      const user =
        await User.findById(id);

      if (!user) {
        throw new AppError(
          'Employee profile not found.',
          404
        );
      }

      await User.findByIdAndDelete(id);

      await authService.revokeAllSessions(id);

      await recordAudit(req, {
        action: 'DELETE',
        entity: 'User',
        entityId: id,
        oldValue: {
          name: user.name,
          email: user.email
        }
      });

      return sendSuccess(res, {
        status: 200,
        message:
          'Employee record successfully purged from the CRM database.'
      });

    } catch (error) {
      next(error);
    }
  }

};
