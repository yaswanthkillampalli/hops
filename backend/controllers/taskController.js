const {
  createTask: createTaskService,
  assignTask: assignTaskService,
  updateTaskStatus: updateTaskStatusService,
  completeTask: completeTaskService,
  getTasks: getTasksService,
  getTaskByTaskId: getTaskByTaskIdService,
} = require("../services/taskService");

const createTask = async (req, res) => {
  try {
    const businessId = req.business?._id || req.staff?.businessId;
    const performedBy = req.staff?._id || null;

    const task = await createTaskService({
      businessId,
      ...req.body,
      assignedBy: performedBy,
    });

    return res.status(201).json({ success: true, task });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Server Error" });
  }
};

const assignTask = async (req, res) => {
  try {
    const businessId = req.business?._id || req.staff?.businessId;
    const performedBy = req.staff?._id || null;
    const { taskId, staffId } = req.body;

    const task = await assignTaskService({ businessId, taskId, staffId, assignedBy: performedBy });

    return res.status(200).json({ success: true, task });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Server Error" });
  }
};

const updateTaskStatus = async (req, res) => {
  try {
    const businessId = req.business?._id || req.staff?.businessId;
    const performedBy = req.staff?._id || null;
    const { taskId, status } = req.body;

    const task = await updateTaskStatusService({ businessId, taskId, status, performedBy });

    return res.status(200).json({ success: true, task });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Server Error" });
  }
};

const completeTask = async (req, res) => {
  try {
    const businessId = req.business?._id || req.staff?.businessId;
    const performedBy = req.staff?._id || null;
    const { taskId } = req.body;

    const task = await completeTaskService({ businessId, taskId, performedBy });

    return res.status(200).json({ success: true, task });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Server Error" });
  }
};

const getTasks = async (req, res) => {
  try {
    const businessId = req.business?._id || req.staff?.businessId;

    const tasks = await getTasksService({
      businessId,
      department: req.query.department,
      status: req.query.status,
      priority: req.query.priority,
      staff: req.query.staff,
    });

    return res.status(200).json({ success: true, tasks });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Server Error" });
  }
};

const getTaskByTaskId = async (req, res) => {
  try {
    const businessId = req.business?._id || req.staff?.businessId;
    const { taskId } = req.params;

    const task = await getTaskByTaskIdService({ businessId, taskId });

    return res.status(200).json({ success: true, task });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Server Error" });
  }
};

module.exports = {
  createTask,
  assignTask,
  updateTaskStatus,
  completeTask,
  getTasks,
  getTaskByTaskId,
};
