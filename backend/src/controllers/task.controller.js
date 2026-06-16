// ── src/controllers/task.controller.js ──
import Task from '../models/task.model.js';
import { AppError } from '../middleware/errorHandler.js';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary using project environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper: Upload file buffer to Cloudinary using upload_stream
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'crm_tasks' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

// Helper: Delete asset from Cloudinary using public ID
const deleteFromCloudinary = (publicId) => {
  if (!publicId) return Promise.resolve();
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
};

/**
 * 1. CREATE TASK
 * POST /api/v1/tasks/create
 */
export const createTask = async (req, res, next) => {
  try {
    const { title, description, assigned_to, designation_id } = req.body;

    const userId = req.user.id || req.user._id;

    let file_url;
    let file_public_id;

    // Upload file to Cloudinary
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer);

      file_url = uploadResult.secure_url;
      file_public_id = uploadResult.public_id;
    }

    const task = new Task({
      title: title?.trim(),
      description: description?.trim() || "",

      assigned_to,
      designation_id: designation_id || undefined,

      status: "pending",

      // creator
      created_by: userId,
      user_id: userId,

      // image/file
      file_url,
      file_public_id,

      image: file_url || null
    });

    await task.save();

    return res.status(201).json({
      success: true,
      task
    });

  } catch (error) {
    console.error("CREATE TASK ERROR:", error);
    next(error);
  }
};

/**
 * 2. GET ALL TASKS (Admin only)
 * GET /api/v1/tasks/all
 */
export const getAllTasks = async (req, res, next) => {
  try {


    const tasks = await Task.find()
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name email')
      .select('-file_public_id')
      .lean();

    const formattedTasks = tasks.map(task => {
      const id = task._id.toString();
      const user_id = task.created_by ? (task.created_by._id || task.created_by).toString() : undefined;
      const file = task.file_url;
      const image = task.file_url;

      const formatted = {
        ...task,
        id,
        user_id,
        file,
        image
      };

      if (formatted.assigned_to && formatted.assigned_to._id) {
        formatted.assigned_to.id = formatted.assigned_to._id.toString();
        delete formatted.assigned_to._id;
      }
      if (formatted.created_by && formatted.created_by._id) {
        formatted.created_by.id = formatted.created_by._id.toString();
        delete formatted.created_by._id;
      }

      delete formatted._id;
      delete formatted.__v;
      return formatted;
    });

    return res.status(200).json(formattedTasks);
  } catch (error) {
    next(error);
  }
};

/**
 * 3. GET TASKS BY USER ID (Admin only)
 * GET /api/v1/tasks/user/tasks?user_id=...
 */
export const getUserTasks = async (req, res, next) => {
  try {
    const role = req.user.role || req.user.role_id;
    if (role !== 'admin') {
      throw new AppError('Access denied. Admin access only.', 403);
    }

    const { user_id } = req.query;

    const tasks = await Task.find({ assigned_to: user_id })
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name email')
      .select('-file_public_id')
      .lean();

    const formattedTasks = tasks.map(task => {
      const id = task._id.toString();
      const user_id_val = task.created_by ? (task.created_by._id || task.created_by).toString() : undefined;
      const file = task.file_url;
      const image = task.file_url;

      const formatted = {
        ...task,
        id,
        user_id: user_id_val,
        file,
        image
      };

      if (formatted.assigned_to && formatted.assigned_to._id) {
        formatted.assigned_to.id = formatted.assigned_to._id.toString();
        delete formatted.assigned_to._id;
      }
      if (formatted.created_by && formatted.created_by._id) {
        formatted.created_by.id = formatted.created_by._id.toString();
        delete formatted.created_by._id;
      }

      delete formatted._id;
      delete formatted.__v;
      return formatted;
    });

    return res.status(200).json(formattedTasks);
  } catch (error) {
    next(error);
  }
};

/**
 * 4. GET TASKS FOR CURRENT LOGGED IN USER
 * GET /api/v1/tasks/current-user/tasks
 */
export const getCurrentUserTasks = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    const tasks = await Task.find({ assigned_to: userId })
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name email')
      .select('-file_public_id')
      .lean();

    const formattedTasks = tasks.map(task => {
      const id = task._id.toString();
      const user_id = task.created_by ? (task.created_by._id || task.created_by).toString() : undefined;
      const file = task.file_url;
      const image = task.file_url;

      const formatted = {
        ...task,
        id,
        user_id,
        file,
        image
      };

      if (formatted.assigned_to && formatted.assigned_to._id) {
        formatted.assigned_to.id = formatted.assigned_to._id.toString();
        delete formatted.assigned_to._id;
      }
      if (formatted.created_by && formatted.created_by._id) {
        formatted.created_by.id = formatted.created_by._id.toString();
        delete formatted.created_by._id;
      }

      delete formatted._id;
      delete formatted.__v;
      return formatted;
    });

    return res.status(200).json(formattedTasks);
  } catch (error) {
    next(error);
  }
};

/**
 * 5. DELETE TASK
 * DELETE /api/v1/tasks/delete/:task_id
 */
export const deleteTask = async (req, res, next) => {
  try {
    const { task_id } = req.params;

    const task = await Task.findById(task_id);
    if (!task) {
      throw new AppError('Task not found', 404);
    }



    if (task.file_public_id) {
      await deleteFromCloudinary(task.file_public_id);
    }

    await task.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Task and associated file resources deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. UPDATE TASK STATUS ONLY
 * PUT /api/v1/tasks/task-status/:task_id?status=...
 */
export const updateTaskStatus = async (req, res, next) => {
  try {
    const { task_id } = req.params;
    const { status } = req.query;

    const task = await Task.findById(task_id);
    if (!task) {
      throw new AppError('Task not found', 404);
    }



    task.status = status;
    await task.save();

    return res.status(200).json(task.toJSON());
  } catch (error) {
    next(error);
  }
};

/**
 * 7. UPDATE TASK
 * PUT /api/v1/tasks/update/:task_id
 */
export const updateTask = async (req, res, next) => {
  try {
    const { task_id } = req.params;
    const { title, description, assigned_to, designation_id } = req.body;

    const task = await Task.findById(task_id);
    if (!task) {
      throw new AppError('Task not found', 404);
    }


    if (description !== undefined) task.description = description;
    if (assigned_to !== undefined) task.assigned_to = assigned_to;
    // Explicit check for designation_id updates (handles empty string resets)
    if (designation_id !== undefined) {
      task.designation_id = designation_id || undefined;
    }

    if (req.file) {
      // Clean up the old asset first
      if (task.file_public_id) {
        await deleteFromCloudinary(task.file_public_id);
      }

      const uploadResult = await uploadToCloudinary(req.file.buffer);
      task.file_url = uploadResult.secure_url;
      task.file_public_id = uploadResult.public_id;
    }

    await task.save();

    return res.status(200).json(task.toJSON());
  } catch (error) {
    next(error);
  }
};
