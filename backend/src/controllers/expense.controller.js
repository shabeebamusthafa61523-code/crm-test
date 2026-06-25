import Expense from '../models/expense.model.js';
import { sendSuccess, sendError } from '../utils/response.helper.js';
import { recordAudit } from '../middleware/audit.middleware.js';
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
      { folder: 'accounting/expenses' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

const deleteFromCloudinary = (publicId) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
};

export const getExpenses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const skip = (page - 1) * limit;

    const query = { deleted: { $ne: true } };

    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.category) {
      query.category = req.query.category;
    }
    if (req.query.expenseType) {
      query.expenseType = req.query.expenseType;
    }
    if (req.query.vendorId) {
      query.vendorId = req.query.vendorId;
    }
    if (req.query.startDate && req.query.endDate) {
      query.expenseDate = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    const expenses = await Expense.find(query)
      .populate('vendorId', 'name companyName')
      .populate('approvedBy', 'name')
      .populate('createdBy', 'name')
      .sort({ expenseDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Expense.countDocuments(query);

    return sendSuccess(res, 'Expenses retrieved successfully', {
      expenses,
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

export const getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, deleted: { $ne: true } })
      .populate('vendorId', 'name companyName')
      .populate('approvedBy', 'name')
      .populate('createdBy', 'name');

    if (!expense) {
      return sendError(res, 'Expense record not found', 404);
    }
    return sendSuccess(res, 'Expense record retrieved successfully', expense);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const createExpense = async (req, res) => {
  try {
    const data = { ...req.body };
    data.createdBy = req.user.id;

    if (data.expenseDate) {
      data.expenseDate = new Date(data.expenseDate);
    }

    // Convert numeric inputs
    if (data.amount) data.amount = Number(data.amount);
    if (data.taxAmount) data.taxAmount = Number(data.taxAmount);

    // Handle File Attachment
    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(req.file.buffer);
        data.attachmentUrl = uploadResult.secure_url;
        data.attachmentPublicId = uploadResult.public_id;
      } catch (uploadError) {
        console.error('Cloudinary upload failed:', uploadError);
        return sendError(res, 'Attachment upload failed: ' + uploadError.message, 500);
      }
    }

    const expense = await Expense.create(data);

    await recordAudit(req, {
      action: 'CREATE',
      entity: 'Expense',
      entityId: expense._id,
      newValue: expense
    });

    return sendSuccess(res, 'Expense record created successfully', expense, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const updateExpense = async (req, res) => {
  try {
    const oldValue = await Expense.findOne({ _id: req.params.id, deleted: { $ne: true } });
    if (!oldValue) {
      return sendError(res, 'Expense record not found', 404);
    }

    const data = { ...req.body };

    if (data.expenseDate) {
      data.expenseDate = new Date(data.expenseDate);
    }
    if (data.amount) data.amount = Number(data.amount);
    if (data.taxAmount) data.taxAmount = Number(data.taxAmount);

    // Handle File Attachment Update
    if (req.file) {
      try {
        if (oldValue.attachmentPublicId) {
          await deleteFromCloudinary(oldValue.attachmentPublicId).catch(err =>
            console.error('Failed to delete old attachment:', err)
          );
        }
        const uploadResult = await uploadToCloudinary(req.file.buffer);
        data.attachmentUrl = uploadResult.secure_url;
        data.attachmentPublicId = uploadResult.public_id;
      } catch (uploadError) {
        console.error('Cloudinary upload failed:', uploadError);
        return sendError(res, 'Attachment upload failed: ' + uploadError.message, 500);
      }
    }

    const expense = await Expense.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });

    await recordAudit(req, {
      action: 'UPDATE',
      entity: 'Expense',
      entityId: expense._id,
      oldValue,
      newValue: expense
    });

    return sendSuccess(res, 'Expense record updated successfully', expense);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const approveExpense = async (req, res) => {
  try {
    const oldValue = await Expense.findOne({ _id: req.params.id, deleted: { $ne: true } });
    if (!oldValue) {
      return sendError(res, 'Expense record not found', 404);
    }

    const { status } = req.body; // Approved or Rejected or Paid
    if (!['Approved', 'Rejected', 'Paid'].includes(status)) {
      return sendError(res, 'Invalid approval status type', 400);
    }

    const updateData = {
      status,
      approvedBy: req.user.id,
      approvedDate: new Date()
    };

    const expense = await Expense.findByIdAndUpdate(req.params.id, updateData, { new: true });

    await recordAudit(req, {
      action: 'APPROVE',
      entity: 'Expense',
      entityId: expense._id,
      oldValue,
      newValue: expense
    });

    return sendSuccess(res, `Expense status updated to ${status} successfully`, expense);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, deleted: { $ne: true } });
    if (!expense) {
      return sendError(res, 'Expense record not found', 404);
    }

    // Soft delete
    expense.deleted = true;
    await expense.save();

    await recordAudit(req, {
      action: 'DELETE',
      entity: 'Expense',
      entityId: expense._id,
      oldValue: expense
    });

    return sendSuccess(res, 'Expense record deleted successfully (soft-deleted)', expense);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const expenseController = {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  approveExpense,
  deleteExpense
};

export default expenseController;
