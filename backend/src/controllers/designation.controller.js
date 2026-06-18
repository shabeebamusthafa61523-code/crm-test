import Designation from '../models/designation.model.js';
import { AppError } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/response.util.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const designationController = {
  getDesignations: async (req, res, next) => {
    try {
      const designations = await Designation.find({ isActive: true }).sort({ name: 1 });

      return sendSuccess(res, {
        status: 200,
        message: 'Designations retrieved successfully.',
        data: designations.map((designation) => ({
          id: designation._id,
          name: designation.name
        }))
      });
    } catch (error) {
      next(error);
    }
  },

  createDesignation: async (req, res, next) => {
    try {
      const name = String(req.body.name || '').trim();

      if (!name) {
        throw new AppError('Designation name is required.', 400);
      }

      const existingDesignation = await Designation.findOne({
        name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' }
      });

      if (existingDesignation) {
        return sendSuccess(res, {
          status: 200,
          message: 'Designation already exists.',
          data: {
            id: existingDesignation._id,
            name: existingDesignation.name
          }
        });
      }

      const designation = await Designation.create({ name });

      return sendSuccess(res, {
        status: 201,
        message: 'Designation created successfully.',
        data: {
          id: designation._id,
          name: designation.name
        }
      });
    } catch (error) {
      next(error);
    }
  },

  updateDesignation: async (req, res, next) => {
    try {
      const { designation_id } = req.params;
      const name = String(req.body.name || '').trim();

      if (!name) {
        throw new AppError('Designation name is required.', 400);
      }

      const existingDesignation = await Designation.findOne({
        _id: { $ne: designation_id },
        name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' }
      });

      if (existingDesignation) {
        throw new AppError('Designation name already exists.', 400);
      }

      const updated = await Designation.findByIdAndUpdate(
        designation_id,
        { name },
        { new: true }
      );

      if (!updated) {
        throw new AppError('Designation not found.', 404);
      }

      return sendSuccess(res, {
        status: 200,
        message: 'Designation updated successfully.',
        data: {
          id: updated._id,
          name: updated.name
        }
      });
    } catch (error) {
      next(error);
    }
  },

  deleteDesignation: async (req, res, next) => {
    try {
      const { designation_id } = req.params;

      const updated = await Designation.findByIdAndUpdate(
        designation_id,
        { isActive: false },
        { new: true }
      );

      if (!updated) {
        throw new AppError('Designation not found.', 404);
      }

      return sendSuccess(res, {
        status: 200,
        message: 'Designation deleted successfully.'
      });
    } catch (error) {
      next(error);
    }
  }
};
