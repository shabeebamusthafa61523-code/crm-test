import Customer from '../models/customer.model.js';
import { sendSuccess, sendError } from '../utils/response.helper.js';
import { recordAudit } from '../middleware/audit.middleware.js';

export const getCustomers = async (req, res) => {
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

    const customers = await Customer.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Customer.countDocuments(query);

    return sendSuccess(res, 'Customers retrieved successfully', {
      customers,
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

export const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return sendError(res, 'Customer not found', 404);
    }
    return sendSuccess(res, 'Customer retrieved successfully', customer);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const createCustomer = async (req, res) => {
  try {
    const customer = await Customer.create(req.body);
    
    await recordAudit(req, {
      action: 'CREATE',
      entity: 'Customer',
      entityId: customer._id,
      newValue: customer
    });

    return sendSuccess(res, 'Customer created successfully', customer, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const oldValue = await Customer.findById(req.params.id);
    if (!oldValue) {
      return sendError(res, 'Customer not found', 404);
    }

    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    
    await recordAudit(req, {
      action: 'UPDATE',
      entity: 'Customer',
      entityId: customer._id,
      oldValue,
      newValue: customer
    });

    return sendSuccess(res, 'Customer updated successfully', customer);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return sendError(res, 'Customer not found', 404);
    }

    // Soft delete by marking status as inactive
    customer.status = 'inactive';
    await customer.save();

    await recordAudit(req, {
      action: 'DELETE',
      entity: 'Customer',
      entityId: customer._id,
      oldValue: customer
    });

    return sendSuccess(res, 'Customer deactivated successfully', customer);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const customerController = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer
};

export default customerController;
