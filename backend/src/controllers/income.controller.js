import Income from '../models/income.model.js';
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
      { folder: 'accounting/income' },
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

export const getIncomes = async (req, res) => {
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
    if (req.query.paymentMethod) {
      query.paymentMethod = req.query.paymentMethod;
    }
    if (req.query.customerId) {
      query.customerId = req.query.customerId;
    }
    if (req.query.startDate && req.query.endDate) {
      query.date = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    const incomes = await Income.find(query)
      .populate('customerId', 'name companyName')
      .populate('createdBy', 'name')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Income.countDocuments(query);

    return sendSuccess(res, 'Incomes retrieved successfully', {
      incomes,
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

export const getIncomeById = async (req, res) => {
  try {
    const income = await Income.findOne({ _id: req.params.id, deleted: { $ne: true } })
      .populate('customerId', 'name companyName')
      .populate('createdBy', 'name');

    if (!income) {
      return sendError(res, 'Income record not found', 404);
    }
    return sendSuccess(res, 'Income record retrieved successfully', income);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const createIncome = async (req, res) => {
  try {
    const data = { ...req.body };
    data.createdBy = req.user.id;

    // Convert date string if present
    if (data.date) {
      data.date = new Date(data.date);
    }

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

    const income = await Income.create(data);

    await recordAudit(req, {
      action: 'CREATE',
      entity: 'Income',
      entityId: income._id,
      newValue: income
    });

    return sendSuccess(res, 'Income record created successfully', income, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const updateIncome = async (req, res) => {
  try {
    const oldValue = await Income.findOne({ _id: req.params.id, deleted: { $ne: true } });
    if (!oldValue) {
      return sendError(res, 'Income record not found', 404);
    }

    const data = { ...req.body };
    data.modifiedBy = req.user.id;

    if (data.date) {
      data.date = new Date(data.date);
    }

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

    const income = await Income.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });

    await recordAudit(req, {
      action: 'UPDATE',
      entity: 'Income',
      entityId: income._id,
      oldValue,
      newValue: income
    });

    return sendSuccess(res, 'Income record updated successfully', income);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const deleteIncome = async (req, res) => {
  try {
    const income = await Income.findOne({ _id: req.params.id, deleted: { $ne: true } });
    if (!income) {
      return sendError(res, 'Income record not found', 404);
    }

    // Soft delete
    income.deleted = true;
    income.status = 'Inactive';
    await income.save();

    await recordAudit(req, {
      action: 'DELETE',
      entity: 'Income',
      entityId: income._id,
      oldValue: income
    });

    return sendSuccess(res, 'Income record deleted successfully (soft-deleted)', income);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const incomeController = {
  getIncomes,
  getIncomeById,
  createIncome,
  updateIncome,
  deleteIncome
};

export default incomeController;
