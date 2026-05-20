import Task from '../models/tasks.js'; // ✅ Fixed to match default export

/**
 * FETCH ALL TASKS
 * GET /api/tasks/all
 */
export const getAllTasks = async (req, res) => {
  try {
    // Fetches all tasks from database. 
    // The model's toJSON transform automatically maps _id to id for the frontend.
    const tasks = await Task.find({});
    return res.status(200).json(tasks);
  } catch (err) {
    console.error("Fetch Tasks Error:", err);
    return res.status(500).json({ 
      error: "Internal operational exception parsing pipeline arrays" 
    });
  }
};

/**
 * CREATE TASK
 * POST /api/tasks/create
 */
export const createTask = async (req, res) => {
  try {
    const { title, description, assigned_to, designation_id } = req.body;

    // Validation barrier
    if (!title || !assigned_to || !designation_id) {
      return res.status(400).json({ error: "Missing required core assignment parameters" });
    }
    
    const newTask = new Task({
      title,
      description: description || '',
      assigned_to,
      designation_id,
      status: 'pending', // Fresh tasks default to pending column
      user_id: req.user.id, // Injected securely via verified JWT auth middleware
      image: req.file ? req.file.path : null // Secure Cloudinary URL path from Multer
    });

    await newTask.save();
    return res.status(201).json(newTask);
  } catch (err) {
    console.error("Create Task Error:", err);
    return res.status(500).json({ 
      error: "Failed to persist new task structure initialization" 
    });
  }
};

/**
 * UPDATE TASK (Form-Data fields & optional Image rewrite)
 * PUT /api/tasks/update/:id
 */
export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, assigned_to, designation_id } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ error: "Asset Reference not found" });
    }

    // Security Gate: Enforce the frontend's 'canModify' authorization rule
    if (String(task.user_id) !== String(req.user.id)) {
      return res.status(403).json({ error: "Unprivileged Modification Attempt Denied" });
    }

    // Fallbacks preserve existing state if optional fields aren't resent
    task.title = title || task.title;
    task.description = description !== undefined ? description : task.description;
    task.assigned_to = assigned_to || task.assigned_to;
    task.designation_id = designation_id || task.designation_id;
    
    // Replace current Cloudinary string if a new file payload exists
    if (req.file) {
      task.image = req.file.path;
    }

    await task.save();
    return res.status(200).json(task);
  } catch (err) {
    console.error("Update Task Error:", err);
    return res.status(500).json({ 
      error: "Failed executing atomic field mutation pipeline update" 
    });
  }
};

/**
 * UPDATE TASK STATUS (Targets Drag-and-Drop column drops & Quick Selection options)
 * PUT /api/tasks/task-status/:id?status=...
 */
export const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.query; // Reads from URL query parameters string format: (?status=x)

    const validStatuses = ['pending', 'current', 'preview', 'done'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid phase state declaration parameter" });
    }

    // Find and update single field atomically
    const updatedTask = await Task.findByIdAndUpdate(
      id, 
      { status }, 
      { new: true } // Returns revised document data instance
    );
    
    if (!updatedTask) {
      return res.status(404).json({ error: "Asset reference not located for phase mutation" });
    }

    return res.status(200).json(updatedTask);
  } catch (err) {
    console.error("Status Update Error:", err);
    return res.status(500).json({ 
      error: "Failure resolving network status update request" 
    });
  }
};

/**
 * PURGE / DELETE TASK
 * DELETE /api/tasks/delete/:id
 */
export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ error: "Asset structure already clear or missing" });
    }

    // Security Gate: Ensure only the creator account can delete this entry
    if (String(task.user_id) !== String(req.user.id)) {
      return res.status(403).json({ error: "Privileged structural purge action intercepted" });
    }

    await task.deleteOne();
    return res.status(200).json({ 
      message: "Asset purged completely from active memory registers" 
    });
  } catch (err) {
    console.error("Delete Task Error:", err);
    return res.status(500).json({ 
      error: "Failed to fulfill absolute system file wipe parameter" 
    });
  }
};