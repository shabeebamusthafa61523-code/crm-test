import Vendor from '../models/vendor.model.js';
import { sendSuccess, sendError } from '../utils/response.helper.js';
import { recordAudit } from '../middleware/audit.middleware.js';

export const getVendors = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }
    if (req.query.status) {
      query.status = req.query.status;
    }

    const vendors = await Vendor.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Vendor.countDocuments(query);

    return sendSuccess(res, 'Vendors retrieved successfully', {
      vendors,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return sendError(res, 'Vendor not found', 404);
    }
    return sendSuccess(res, 'Vendor retrieved successfully', vendor);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const createVendor = async (req, res) => {
  try {
    const vendor = await Vendor.create(req.body);
    
    await recordAudit(req, {
      action: 'CREATE',
      entity: 'Vendor',
      entityId: vendor._id,
      newValue: vendor
    });

    return sendSuccess(res, 'Vendor created successfully', vendor, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const updateVendor = async (req, res) => {
  try {
    const oldValue = await Vendor.findById(req.params.id);
    if (!oldValue) {
      return sendError(res, 'Vendor not found', 404);
    }

    const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    
    await recordAudit(req, {
      action: 'UPDATE',
      entity: 'Vendor',
      entityId: vendor._id,
      oldValue,
      newValue: vendor
    });

    return sendSuccess(res, 'Vendor updated successfully', vendor);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return sendError(res, 'Vendor not found', 404);
    }

    // Soft delete by marking status as inactive
    vendor.status = 'inactive';
    await vendor.save();

    await recordAudit(req, {
      action: 'DELETE',
      entity: 'Vendor',
      entityId: vendor._id,
      oldValue: vendor
    });

    return sendSuccess(res, 'Vendor deactivated successfully', vendor);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const vendorController = {
  getVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor
};

export default vendorController;
