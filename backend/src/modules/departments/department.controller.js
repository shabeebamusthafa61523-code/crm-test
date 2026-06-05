// src/modules/departments/department.controller.js

import { departmentService } from './department.service.js';
import { sendSuccess } from '../../utils/response.helper.js';
import { validationResult } from 'express-validator';

export const departmentController = {
  /**
   * GET /api/v1/departments
   */
  async getAll(req, res, next) {
    try {
      const { status, search } = req.query;
      const data = await departmentService.getAllDepartments({ status, search });
      return sendSuccess(res, 'Departments retrieved successfully', data, 200);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/departments/:id
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const data = await departmentService.getDepartmentById(id);
      if (!data) {
        const error = new Error('Department not found');
        error.statusCode = 404;
        throw error;
      }
      return sendSuccess(res, 'Department details retrieved', data, 200);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/departments/create
   */
  async create(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const error = new Error('Validation failed');
        error.statusCode = 422;
        error.data = errors.array();
        throw error;
      }

      const newDept = await departmentService.createDepartment(req.body);
      return sendSuccess(res, 'Department created', newDept, 201);
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/v1/departments/update
   */
  async update(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const error = new Error('Validation failed');
        error.statusCode = 422;
        error.data = errors.array();
        throw error;
      }

      const updatedDept = await departmentService.updateDepartment(req.body);
      if (!updatedDept) {
        const error = new Error('Department not found');
        error.statusCode = 404;
        throw error;
      }
      return sendSuccess(res, 'Department updated', updatedDept, 200);
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/v1/departments/:id
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const deleted = await departmentService.deleteDepartment(id);
      if (!deleted) {
        const error = new Error('Department not found');
        error.statusCode = 404;
        throw error;
      }
      return sendSuccess(res, 'Department deleted', null, 200);
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/v1/departments/:id/manager
   */
  async assignManager(req, res, next) {
    try {
      const { id } = req.params;
      const { managerId } = req.body;
      const updated = await departmentService.assignManager(id, managerId);
      if (!updated) {
        const error = new Error('Department not found');
        error.statusCode = 404;
        throw error;
      }
      return sendSuccess(res, 'Manager assigned', updated, 200);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/departments/:id/users
   */
  async getUsers(req, res, next) {
    try {
      const { id } = req.params;
      const users = await departmentService.getDepartmentUsers(id);
      return sendSuccess(res, 'Department users retrieved successfully', users, 200);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/departments/:id/users
   */
  async addUser(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const error = new Error('Validation failed');
        error.statusCode = 422;
        error.data = errors.array();
        throw error;
      }

      const { id } = req.params;
      const { userId, roleInDepartment, isPrimary } = req.body;
      const data = await departmentService.addUserToDepartment({
        departmentId: id,
        userId,
        roleInDepartment,
        isPrimary
      });
      return sendSuccess(res, 'User added to department successfully', data, 201);
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/v1/departments/:id/users/:userId
   */
  async removeUser(req, res, next) {
    try {
      const { id, userId } = req.params;
      await departmentService.removeUserFromDepartment(id, userId);
      return sendSuccess(res, 'User removed from department successfully', null, 200);
    } catch (error) {
      next(error);
    }
  },


  /**
   * PATCH /api/v1/departments/:id/status
   */
  async toggleStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (status === undefined) {
        const error = new Error('Status field is required');
        error.statusCode = 400;
        throw error;
      }

      const updated = await departmentService.updateDepartmentStatus(id, status);
      if (!updated) {
        const error = new Error('Department not found');
        error.statusCode = 404;
        throw error;
      }
      return sendSuccess(res, 'Status updated', updated, 200);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/departments/:id/analytics
   */
  async getAnalytics(req, res, next) {
    try {
      const { id } = req.params;
      const analytics = await departmentService.getDepartmentAnalytics(id);
      if (!analytics) {
        const error = new Error('Department not found');
        error.statusCode = 404;
        throw error;
      }
      return sendSuccess(res, 'Analytics retrieved successfully', analytics, 200);
    } catch (error) {
      next(error);
    }
  }
};
