const Task = require("../models/Task");
const Booking = require("../models/Booking");
const Guest = require("../models/Guest");
const Staff = require("../models/Staff");

const generateId = require("../utils/generateId");

const buildError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const validTaskStatuses = new Set([
  "pending",
  "assigned",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
  "delayed",
  "escalated",
]);

const createTask = async ({
  businessId,
  bookingId,
  guestId,
  department,
  title,
  description = "",
  priority = "medium",
  taskType,
  entityType = null,
  entityId = null,
  roomNumber = null,
  assignedBy = null,
  supervisedBy = null,
  notes = "",
}) => {
  if (!businessId) throw buildError("Business context is required", 401);
  if (!department || !title) throw buildError("department and title are required", 400);

  const finalTaskType = taskType || department;

  let finalGuestId = guestId || null;
  let finalRoomNumber = roomNumber;

  if (bookingId && !finalGuestId) {
    const booking = await Booking.findOne({ businessId, bookingId }).populate("guestId");
    if (!booking) throw buildError("Booking not found", 404);

    finalGuestId = booking.guestId?._id || null;
    finalRoomNumber = finalRoomNumber || booking.roomNumber || null;
  }

  if (!finalGuestId) {
    throw buildError("guestId or bookingId is required", 400);
  }

  const guest = await Guest.findOne({ _id: finalGuestId, businessId });
  if (!guest) throw buildError("Guest not found", 404);

  const task = await Task.create({
    businessId,
    taskId: await generateId("task", "TK"),
    title,
    description,
    taskType: finalTaskType,
    priority,
    status: "pending",
    department,
    guestId: finalGuestId,
    roomNumber: finalRoomNumber,
    assignedBy,
    supervisedBy,
    entityType,
    entityId,
    notes,
    activityLogs: [
      {
        action: "created",
        performedBy: assignedBy || null,
        message: "Task created",
      },
    ],
  });

  return task;
};

const assignTask = async ({ businessId, taskId, staffId, assignedBy = null }) => {
  if (!businessId) throw buildError("Business context is required", 401);
  if (!taskId || !staffId) throw buildError("taskId and staffId are required", 400);

  const task = await Task.findOne({ businessId, taskId });
  if (!task) throw buildError("Task not found", 404);

  const staff = await Staff.findOne({ _id: staffId, businessId });
  if (!staff) throw buildError("Staff not found", 404);

  task.assignedTo = staff._id;
  task.assignedBy = assignedBy || task.assignedBy || null;
  task.assignedAt = new Date();
  task.status = "assigned";
  task.activityLogs = task.activityLogs || [];
  task.activityLogs.push({
    action: "assigned",
    performedBy: assignedBy || null,
    message: `Assigned to ${staff.fullName}`,
  });

  await task.save();

  return task;
};

const updateTaskStatus = async ({ businessId, taskId, status, performedBy = null }) => {
  if (!businessId) throw buildError("Business context is required", 401);
  if (!taskId || !status) throw buildError("taskId and status are required", 400);
  if (!validTaskStatuses.has(status)) throw buildError("Invalid status", 400);

  const task = await Task.findOne({ businessId, taskId });
  if (!task) throw buildError("Task not found", 404);

  task.status = status;
  task.activityLogs = task.activityLogs || [];
  task.activityLogs.push({
    action: status,
    performedBy: performedBy || null,
    message: `Status updated to ${status}`,
  });

  const now = new Date();

  if (status === "assigned") task.assignedAt = task.assignedAt || now;
  if (status === "accepted") task.acceptedAt = now;
  if (status === "in_progress") task.startedAt = task.startedAt || now;
  if (status === "completed") {
    task.completedAt = now;
    task.isCompleted = true;
  }
  if (status === "cancelled") task.cancelledAt = now;
  if (status === "escalated") {
    task.escalatedAt = now;
    task.isEscalated = true;
  }

  await task.save();
  return task;
};

const completeTask = async ({ businessId, taskId, performedBy = null }) => {
  return updateTaskStatus({
    businessId,
    taskId,
    status: "completed",
    performedBy,
  });
};

const getTasks = async ({ businessId, department, status, priority, staff }) => {
  if (!businessId) throw buildError("Business context is required", 401);

  const query = { businessId };

  if (department) query.department = department;
  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (staff) query.assignedTo = staff;

  const tasks = await Task.find(query)
    .populate("assignedTo")
    .populate("guestId")
    .sort({ createdAt: -1 });

  return tasks;
};

const getTaskByTaskId = async ({ businessId, taskId }) => {
  if (!businessId) throw buildError("Business context is required", 401);
  if (!taskId) throw buildError("taskId is required", 400);

  const task = await Task.findOne({ businessId, taskId })
    .populate("assignedTo")
    .populate("guestId")
    .populate("assignedBy")
    .populate("supervisedBy");

  if (!task) throw buildError("Task not found", 404);

  return task;
};

module.exports = {
  createTask,
  assignTask,
  updateTaskStatus,
  completeTask,
  getTasks,
  getTaskByTaskId,
};
