import Purchase from '../models/purchase.model.js';
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
      { folder: 'accounting/purchases' },
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

export const getPurchases = async (req, res) => {
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
    if (req.query.vendorId) {
      query.vendorId = req.query.vendorId;
    }
    if (req.query.startDate && req.query.endDate) {
      query.purchaseDate = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    const purchases = await Purchase.find(query)
      .populate('vendorId', 'name companyName')
      .populate('receivedBy', 'name')
      .populate('createdBy', 'name')
      .sort({ purchaseDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Purchase.countDocuments(query);

    return sendSuccess(res, 'Purchases retrieved successfully', {
      purchases,
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

export const getPurchaseById = async (req, res) => {
  try {
    const purchase = await Purchase.findOne({ _id: req.params.id, deleted: { $ne: true } })
      .populate('vendorId', 'name companyName')
      .populate('receivedBy', 'name')
      .populate('createdBy', 'name');

    if (!purchase) {
      return sendError(res, 'Purchase record not found', 404);
    }
    return sendSuccess(res, 'Purchase record retrieved successfully', purchase);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const createPurchase = async (req, res) => {
  try {
    const data = { ...req.body };
    data.createdBy = req.user.id;

    if (data.purchaseDate) {
      data.purchaseDate = new Date(data.purchaseDate);
    }

    // Parse items if passed as string JSON (e.g. from FormData)
    if (typeof data.items === 'string') {
      try {
        data.items = JSON.parse(data.items);
      } catch (err) {
        return sendError(res, 'Invalid format for items list', 400);
      }
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

    const purchase = await Purchase.create(data);

    await recordAudit(req, {
      action: 'CREATE',
      entity: 'Purchase',
      entityId: purchase._id,
      newValue: purchase
    });

    return sendSuccess(res, 'Purchase order created successfully', purchase, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const updatePurchase = async (req, res) => {
  try {
    const oldValue = await Purchase.findOne({ _id: req.params.id, deleted: { $ne: true } });
    if (!oldValue) {
      return sendError(res, 'Purchase record not found', 404);
    }

    const data = { ...req.body };

    if (data.purchaseDate) {
      data.purchaseDate = new Date(data.purchaseDate);
    }

    if (typeof data.items === 'string') {
      try {
        data.items = JSON.parse(data.items);
      } catch (err) {
        return sendError(res, 'Invalid format for items list', 400);
      }
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

    // Since pre-save computes totals, we must fetch the document, update it, and save it rather than findByIdAndUpdate
    const purchase = await Purchase.findById(req.params.id);
    Object.assign(purchase, data);
    await purchase.save();

    await recordAudit(req, {
      action: 'UPDATE',
      entity: 'Purchase',
      entityId: purchase._id,
      oldValue,
      newValue: purchase
    });

    return sendSuccess(res, 'Purchase order updated successfully', purchase);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const updatePurchaseStatus = async (req, res) => {
  try {
    const oldValue = await Purchase.findOne({ _id: req.params.id, deleted: { $ne: true } });
    if (!oldValue) {
      return sendError(res, 'Purchase record not found', 404);
    }

    const { status } = req.body;
    if (!['Draft', 'Confirmed', 'Received', 'Invoiced', 'Paid'].includes(status)) {
      return sendError(res, 'Invalid purchase lifecycle status state', 400);
    }

    const updateData = { status };
    if (status === 'Received') {
      updateData.receivedDate = new Date();
      updateData.receivedBy = req.user.id;
    }

    const purchase = await Purchase.findByIdAndUpdate(req.params.id, updateData, { new: true });

    await recordAudit(req, {
      action: 'UPDATE_STATUS',
      entity: 'Purchase',
      entityId: purchase._id,
      oldValue,
      newValue: purchase
    });

    return sendSuccess(res, `Purchase status updated to ${status} successfully`, purchase);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const deletePurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findOne({ _id: req.params.id, deleted: { $ne: true } });
    if (!purchase) {
      return sendError(res, 'Purchase record not found', 404);
    }

    // Soft delete
    purchase.deleted = true;
    await purchase.save();

    await recordAudit(req, {
      action: 'DELETE',
      entity: 'Purchase',
      entityId: purchase._id,
      oldValue: purchase
    });

    return sendSuccess(res, 'Purchase record deleted successfully (soft-deleted)', purchase);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const purchaseController = {
  getPurchases,
  getPurchaseById,
  createPurchase,
  updatePurchase,
  updatePurchaseStatus,
  deletePurchase
};

export default purchaseController;
