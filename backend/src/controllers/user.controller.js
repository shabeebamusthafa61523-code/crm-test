import User from '../models/user.model.js';
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

export const userController = {

  /**
   * GET /api/v1/users/list
   */
  getUserList: async (req, res) => {
    try {

      const users = await User.find(
        { isActive: true },
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

      const whereClause = {};

      if (department) {
        whereClause.departmentId = department;
      }

      if (role) {
        whereClause.role = role;
      }

      if (status !== undefined) {
        whereClause.isActive =
          status === 'active' ||
          status === 'true';
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

      const [users, totalCount] =
        await Promise.all([

          User.find(whereClause)
            .populate(
              'departmentId',
              'name'
            )
            .skip(skip)
            .limit(limit),

          User.countDocuments(whereClause)
        ]);

      const safeUsers = users.map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        employeeId: u.employeeId,
        department: u.departmentId,
        avatar: u.avatar,
        isActive: u.isActive,
        lastLogin: u.lastLogin,
        createdAt: u.createdAt
      }));

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
        );

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
          department: user.departmentId,
          avatar: user.avatar,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        }
      });

    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/users
   */
  createUser: async (req, res, next) => {
    try {

      const {
        name,
        email,
        phone,
        role,
        departmentId,
        employeeId,
        avatar,
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

      const newUser =
        await User.create({
          name,
          email,
          phone,
          role,
          departmentId,
          employeeId,
          avatar,
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
          departmentId
        }
      });

      await notificationService.sendEmail(
        newUser.email,
        '🎉 Welcome to the Team!',
        'Your Command Center Account is Ready',
        `Welcome ${newUser.name}! Temp Password: ${tempPass}`
      );

      return sendSuccess(res, {
        status: 201,
        message:
          'New employee account registered.',
        data: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          employeeId: newUser.employeeId
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
        departmentId,
        avatar,
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

      const updatedUser =
        await User.findByIdAndUpdate(
          id,
          {
            name,
            phone,
            departmentId,
            avatar,
            isActive
          },
          { new: true }
        );

      await recordAudit(req, {
        action: 'UPDATE',
        entity: 'User',
        entityId: id,
        oldValue: {
          name: existingUser.name,
          phone: existingUser.phone,
          isActive: existingUser.isActive
        },
        newValue: {
          name,
          phone,
          departmentId,
          isActive
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