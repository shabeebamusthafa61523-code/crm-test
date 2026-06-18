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
  }
};
