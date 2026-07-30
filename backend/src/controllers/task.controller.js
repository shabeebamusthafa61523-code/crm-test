import mongoose from 'mongoose';
import Task from '../models/task.model.js';
import User from '../models/user.model.js';
import Client from '../models/client.model.js';
import Project from '../models/project.model.js';
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

const getUserId = (createdBy) => {
  if (!createdBy) return undefined;
  if (typeof createdBy === 'object') {
    const val = createdBy._id || createdBy.id || createdBy;
    return val ? val.toString() : undefined;
  }
  return createdBy.toString();
};

const formatLeanTask = (task) => {
  if (!task) return null;
  const id = task._id ? task._id.toString() : (task.id || '');
  const user_id = getUserId(task.created_by);
  const file = task.file_url;
  const image = task.file_url;

  let clientVal = null;
  let clientIdVal = null;
  if (task.client) {
    if (typeof task.client === 'object' && (task.client._id || task.client.id)) {
      clientIdVal = (task.client._id || task.client.id).toString();
      clientVal = {
        ...task.client,
        id: clientIdVal
      };
      delete clientVal._id;
    } else {
      clientIdVal = task.client.toString();
      clientVal = clientIdVal;
    }
  }

  let projectVal = null;
  let projectIdVal = null;
  if (task.project) {
    if (typeof task.project === 'object' && (task.project._id || task.project.id)) {
      projectIdVal = (task.project._id || task.project.id).toString();
      projectVal = {
        ...task.project,
        id: projectIdVal
      };
      delete projectVal._id;
    } else {
      projectIdVal = task.project.toString();
      projectVal = projectIdVal;
    }
  }

  const formatted = {
    ...task,
    id,
    user_id,
    file,
    image,
    client: clientVal,
    client_id: clientIdVal,
    project: projectVal,
    project_id: projectIdVal
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
};

export const syncProjectProgress = async (projectId) => {
  if (!projectId) return;
  try {
    const Project = (await import('../models/project.model.js')).default;
    const projIdStr = typeof projectId === 'object' ? (projectId._id || projectId.id || projectId).toString() : projectId.toString();

    let queryIdList = [projIdStr];
    if (mongoose.Types.ObjectId.isValid(projIdStr)) {
      queryIdList.push(new mongoose.Types.ObjectId(projIdStr));
    }

    const totalTasks = await Task.countDocuments({ project: { $in: queryIdList } });
    if (totalTasks === 0) {
      await Project.findByIdAndUpdate(projIdStr, { progress: 0 });
      return;
    }

    const completedTasks = await Task.countDocuments({
      project: { $in: queryIdList },
      status: { $in: ['done', 'Completed', 'completed', 'Done', 'DONE'] }
    });

    const progressPercentage = Math.round((completedTasks / totalTasks) * 100);
    await Project.findByIdAndUpdate(projIdStr, { progress: progressPercentage });
  } catch (err) {
    console.error("Failed to sync project progress:", err.message);
  }
};

/**
 * 1. CREATE TASK
 * POST /api/v1/tasks/create
 */
export const createTask = async (req, res, next) => {
  try {
    const { title, description, assigned_to, designation_id, dueDate, client, project } = req.body;

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
      dueDate: dueDate || undefined,
      client: (client && mongoose.Types.ObjectId.isValid(client)) ? new mongoose.Types.ObjectId(client) : null,
      project: (project && mongoose.Types.ObjectId.isValid(project)) ? new mongoose.Types.ObjectId(project) : null,

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

    if (task.project) {
      await syncProjectProgress(task.project);
    }

    const populatedTask = await Task.findById(task._id)
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name email')
      .populate('client', 'companyName clientName clientId')
      .populate('project', 'projectName projectCode status')
      .lean();

    const formattedTask = formatLeanTask(populatedTask);

    return res.status(201).json({
      success: true,
      task: formattedTask
    });

  } catch (error) {
    console.error("CREATE TASK ERROR:", error);
    next(error);
  }
};

/**
 * 2. GET ALL TASKS (Role-based access)
 * GET /api/v1/tasks/all
 */
export const getAllTasks = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const roleName = String(req.user.role || '').toLowerCase();
    const roleId = String(req.user.role_id || '');
    
    // 1. Check if Admin or HR
    const isAdminOrHr = (
      roleName === 'admin' ||
      roleName === 'hr' ||
      roleId === '1' ||
      roleId === '10' ||
      ['md', 'coo', 'executive_director'].includes(roleName)
    );

    const targetUserId = req.query.user_id || req.query.userId || req.query.targetUserId;

    let query = {};
    if (targetUserId) {
      query = {
        $or: [
          { created_by: targetUserId },
          { assigned_to: targetUserId },
          { user_id: targetUserId }
        ]
      };
    } else if (isAdminOrHr) {
      // Admin/HR see all tasks
      query = {};
    } else {
      // Check if they manage any departments
      const Department = (await import('../modules/departments/department.model.js')).default;
      const ledDepartments = await Department.find({ managerId: userId }).select('_id name');
      
      let deptIds = ledDepartments.map(d => d._id);
      let deptNames = ledDepartments.map(d => d.name);
      
      // Also check role/designation-based team leads
      const currentUserObj = await User.findById(userId).select('departmentId department designation');
      let userDeptId = req.user.departmentId || currentUserObj?.departmentId;
      let userDeptName = currentUserObj?.department;
      const designationName = String(currentUserObj?.designation || '').toLowerCase();

      const isRoleBasedTeamLead = (
        roleName.includes('manager') ||
        roleName.includes('lead') ||
        roleName.includes('hod') ||
        designationName.includes('manager') ||
        designationName.includes('lead') ||
        designationName.includes('hod') ||
        roleId === '2'
      );

      if (isRoleBasedTeamLead && deptIds.length === 0) {
         // Use their own department as fallback
         if (userDeptId) {
           deptIds.push(userDeptId);
           // Fetch the actual department name from DB just to be safe
           try {
             const fallbackDept = await Department.findById(userDeptId).select('name');
             if (fallbackDept && fallbackDept.name) {
               deptNames.push(fallbackDept.name);
             }
           } catch (err) {}
         }
         if (userDeptName) {
           deptNames.push(userDeptName);
         }
      }

      if (deptIds.length > 0 || deptNames.length > 0) {
        // Find users in these departments
        const UserDepartment = (await import('../models/userDepartment.model.js')).default;
        const userDepts = await UserDepartment.find({ departmentId: { $in: deptIds } }).select('userId');
        const userDeptUserIds = userDepts.map(ud => ud.userId).filter(Boolean);

        const usersInDept = await User.find({
          $or: [
            { departmentId: { $in: deptIds } },
            { department: { $in: deptNames, $ne: '' } }
          ]
        }).select('_id');
        const directUserIds = usersInDept.map(u => u._id);

        const allUserIds = [...new Set([...userDeptUserIds.map(String), ...directUserIds.map(String), String(userId)])];
        
        query = {
          $or: [
            { assigned_to: { $in: allUserIds } },
            { created_by: userId }
          ]
        };
      } else {
        // Normal users see only works assigned to them
        query = { 
          $or: [
            { assigned_to: userId },
            { created_by: userId }
          ]
        };
      }
    }

    const tasks = await Task.find(query)
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name email')
      .populate('client', 'companyName clientName clientId')
      .populate('project', 'projectName projectCode status')
      .select('-file_public_id')
      .lean();

    const formattedTasks = tasks.map(formatLeanTask);

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
    const roleName = String(req.user.role || '').toLowerCase();
    const roleId = String(req.user.role_id || '');
    
    // Check if Admin, HR, or Team Lead
    const isAdminOrHr = (
      roleName === 'admin' ||
      roleName === 'hr' ||
      roleId === '1' ||
      roleId === '10' ||
      ['md', 'coo', 'executive_director'].includes(roleName)
    );

    const Department = (await import('../modules/departments/department.model.js')).default;
    const userId = req.user.id || req.user._id;
    const ledDepartments = await Department.find({ managerId: userId }).select('_id');
    const isDbTeamLead = ledDepartments.length > 0;

    const UserObj = (await import('../models/user.model.js')).default;
    const currentUserObj = await UserObj.findById(userId).select('designation');
    const designationName = String(currentUserObj?.designation || '').toLowerCase();

    const isRoleBasedTeamLead = (
      roleName.includes('manager') ||
      roleName.includes('lead') ||
      roleName.includes('hod') ||
      designationName.includes('manager') ||
      designationName.includes('lead') ||
      designationName.includes('hod') ||
      roleId === '2'
    );

    if (!isAdminOrHr && !isRoleBasedTeamLead && !isDbTeamLead) {
      throw new AppError('Access denied. Insufficient permissions to view user tasks.', 403);
    }

    const { user_id } = req.query;

    const tasks = await Task.find({ assigned_to: user_id })
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name email')
      .populate('client', 'companyName clientName clientId')
      .populate('project', 'projectName projectCode status')
      .select('-file_public_id')
      .lean();

    const formattedTasks = tasks.map(formatLeanTask);

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
      .populate('client', 'companyName clientName clientId')
      .populate('project', 'projectName projectCode status')
      .select('-file_public_id')
      .lean();

    const formattedTasks = tasks.map(formatLeanTask);

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

    // Verify creator authorization
    const userId = req.user.id || req.user._id;
    if (task.created_by.toString() !== userId.toString()) {
      throw new AppError('Forbidden: Only the creator of this task can delete it', 403);
    }

    if (task.file_public_id) {
      await deleteFromCloudinary(task.file_public_id);
    }

    const projectId = task.project;
    await task.deleteOne();

    if (projectId) {
      await syncProjectProgress(projectId);
    }

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

    if (task.project) {
      await syncProjectProgress(task.project);
    }

    const populatedTask = await Task.findById(task._id)
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name email')
      .populate('client', 'companyName clientName clientId')
      .populate('project', 'projectName projectCode status')
      .lean();

    const formattedTask = formatLeanTask(populatedTask);

    return res.status(200).json(formattedTask);
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
    const { title, description, assigned_to, designation_id, client, project } = req.body;

    const task = await Task.findById(task_id);
    if (!task) {
      throw new AppError('Task not found', 404);
    }

    // Verify creator authorization
    const userId = req.user.id || req.user._id;
    if (task.created_by.toString() !== userId.toString()) {
      throw new AppError('Forbidden: Only the creator of this task can edit it', 403);
    }

    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description;
    if (assigned_to !== undefined) task.assigned_to = assigned_to;
    if (req.body.status !== undefined) task.status = req.body.status;
    if (req.body.dueDate !== undefined) task.dueDate = req.body.dueDate;
    if (client !== undefined) {
      task.client = (client && mongoose.Types.ObjectId.isValid(client)) ? new mongoose.Types.ObjectId(client) : null;
    }
    if (project !== undefined) {
      const oldProject = task.project;
      task.project = (project && mongoose.Types.ObjectId.isValid(project)) ? new mongoose.Types.ObjectId(project) : null;
      if (oldProject && oldProject.toString() !== (task.project ? task.project.toString() : '')) {
        await syncProjectProgress(oldProject);
      }
    }

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

    if (task.project) {
      await syncProjectProgress(task.project);
    }

    const populatedTask = await Task.findById(task._id)
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name email')
      .populate('client', 'companyName clientName clientId')
      .populate('project', 'projectName projectCode status')
      .lean();

    const formattedTask = formatLeanTask(populatedTask);

    return res.status(200).json(formattedTask);
  } catch (error) {
    next(error);
  }
};
