const Luggage = require("../models/Luggage");
const Booking = require("../models/Booking");
const Guest = require("../models/Guest");
const Staff = require("../models/Staff");
const Task = require("../models/Task");

const generateId = require("../utils/generateId");

const telegramService = require("./telegramService");
const Business = require("../models/Business");

const buildError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const createLuggage = async ({ businessId, bookingId, luggageCount = 1, performedBy = null }) => {
  if (!businessId) throw buildError("Business context is required", 401);
  if (!bookingId) throw buildError("bookingId is required", 400);
  if (!Number.isFinite(Number(luggageCount)) || luggageCount < 1) luggageCount = 1;

  const booking = await Booking.findOne({ businessId, bookingId }).populate("guestId");
  if (!booking) throw buildError("Booking not found", 404);

  const guest = booking.guestId;
  if (!guest) throw buildError("Guest not found for booking", 404);

  const luggageBatchId = await generateId("luggage", "LUG");

  const tokens = [];
  for (let i = 1; i <= luggageCount; i++) {
    tokens.push({ tokenId: `${luggageBatchId}-${String(i).padStart(3, "0")}`, tagNumber: `${luggageBatchId}-${String(i).padStart(3, "0")}`, status: "registered" });
  }

  const luggage = await Luggage.create({
    businessId,
    bookingId: booking._id,
    guestId: guest._id,
    roomNumber: booking.roomNumber || "",
    luggageId: luggageBatchId,
    luggageCount: tokens.length,
    luggageTokens: tokens,
    overallStatus: "registered",
    notes: "",
  });

  // create task for luggage handling
  const staff = await Staff.findOne({ businessId, department: "housekeeping", isAvailable: true, currentStatus: "active" }).sort({ createdAt: 1 });

  const task = await Task.create({
    businessId,
    taskId: await generateId("task", "TK"),
    title: `Luggage registration for ${luggage.luggageId}`,
    description: `Register ${luggage.luggageCount} luggage items for booking ${booking.bookingId}`,
    taskType: "luggage",
    priority: "medium",
    status: staff ? "assigned" : "pending",
    department: "housekeeping",
    guestId: guest._id,
    roomNumber: booking.roomNumber || null,
    assignedTo: staff ? staff._id : null,
    assignedBy: performedBy || null,
    entityType: "luggage",
    entityId: luggage._id,
    notes: `Luggage tokens created: ${tokens.map((t) => t.tokenId).join(",")}`,
    assignedAt: staff ? new Date() : null,
    activityLogs: [{ action: "created", performedBy: performedBy || null, message: "Luggage batch created" }],
  });

  // attach task id
  luggage.taskId = task._id;
  await luggage.save();

  return { luggage, tokens, task };
};

const getLuggageDetails = async ({ businessId, bookingId }) => {
  if (!businessId) throw buildError("Business context is required", 401);
  if (!bookingId) throw buildError("bookingId is required", 400);

  const booking = await Booking.findOne({ businessId, bookingId }).populate("guestId");
  if (!booking) throw buildError("Booking not found", 404);

  const luggage = await Luggage.findOne({ businessId, bookingId: booking._id }).populate("assignedStaffId");
  if (!luggage) throw buildError("Luggage not found for booking", 404);

  return {
    luggageId: luggage.luggageId,
    luggageCount: luggage.luggageCount,
    tokens: luggage.luggageTokens,
    roomNumber: luggage.roomNumber,
    overallStatus: luggage.overallStatus,
    assignedStaff: luggage.assignedStaffId ? { id: luggage.assignedStaffId._id, fullName: luggage.assignedStaffId.fullName, phone: luggage.assignedStaffId.phone } : null,
    taskId: luggage.taskId,
  };
};

const validTokenStatuses = new Set(["registered", "picked_up", "in_transit", "delivered", "confirmed", "lost"]);

const updateLuggageStatus = async ({ businessId, luggageId, tokenId, status, performedBy = null }) => {
  if (!businessId) throw buildError("Business context is required", 401);
  if (!luggageId) throw buildError("luggageId is required", 400);
  if (!status) throw buildError("status is required", 400);
  if (!validTokenStatuses.has(status)) throw buildError("Invalid status", 400);

  const luggage = await Luggage.findOne({ businessId, luggageId });
  if (!luggage) throw buildError("Luggage not found", 404);

  if (tokenId) {
    const token = luggage.luggageTokens.find((t) => t.tokenId === tokenId);
    if (!token) throw buildError("Token not found", 404);

    token.status = status;
  } else {
    // update overall status for batch
    luggage.overallStatus = status;
  }

  // update timestamps
  const now = new Date();
  if (status === "picked_up") luggage.pickedUpAt = luggage.pickedUpAt || now;
  if (status === "delivered") luggage.deliveredAt = luggage.deliveredAt || now;
  if (status === "confirmed") luggage.confirmedAt = luggage.confirmedAt || now;

  // recalc overallStatus
  const tokenStatuses = luggage.luggageTokens.map((t) => t.status);
  if (tokenStatuses.every((s) => s === "delivered" || s === "confirmed")) {
    luggage.overallStatus = "delivered";
  } else if (tokenStatuses.some((s) => s === "picked_up" || s === "in_transit")) {
    luggage.overallStatus = "in_transit";
  }

  luggage.activityLogs = luggage.activityLogs || [];
  luggage.activityLogs.push({ action: status, performedBy: performedBy || null, message: `Status updated to ${status}` });

  await luggage.save();

  return { luggageId: luggage.luggageId, overallStatus: luggage.overallStatus };
};

const assignLuggageStaff = async ({ businessId, luggageId, staffId, performedBy = null }) => {
  if (!businessId) throw buildError("Business context is required", 401);
  if (!luggageId) throw buildError("luggageId is required", 400);

  const luggage = await Luggage.findOne({ businessId, luggageId });
  if (!luggage) throw buildError("Luggage not found", 404);

  const staff = await Staff.findById(staffId);
  if (!staff) throw buildError("Staff not found", 404);

  luggage.assignedStaffId = staff._id;
  luggage.overallStatus = "assigned";
  luggage.activityLogs = luggage.activityLogs || [];
  luggage.activityLogs.push({ action: "assigned", performedBy: performedBy || null, message: `Assigned to ${staff.fullName}` });
  await luggage.save();

  // create a task
  const task = await Task.create({
    businessId,
    taskId: await generateId("task", "TK"),
    title: `Luggage delivery for ${luggage.luggageId}`,
    description: `Deliver luggage to room ${luggage.roomNumber}`,
    taskType: "luggage",
    priority: "medium",
    status: "assigned",
    department: "housekeeping",
    guestId: luggage.guestId,
    roomNumber: luggage.roomNumber || null,
    assignedTo: staff._id,
    assignedBy: performedBy || null,
    entityType: "luggage",
    entityId: luggage._id,
    notes: `Deliver ${luggage.luggageCount} items`,
    assignedAt: new Date(),
    activityLogs: [{ action: "created", performedBy: performedBy || null, message: "Delivery task created" }],
  });

  luggage.taskId = task._id;
  await luggage.save();

  return { luggageId: luggage.luggageId, assignedTo: staff._id, taskId: task._id };
};

const completeLuggageDelivery = async ({ businessId, luggageId, performedBy = null }) => {
  if (!businessId) throw buildError("Business context is required", 401);
  if (!luggageId) throw buildError("luggageId is required", 400);

  const luggage = await Luggage.findOne({ businessId, luggageId });
  if (!luggage) throw buildError("Luggage not found", 404);

  const now = new Date();
  luggage.overallStatus = "completed";
  luggage.deliveredAt = luggage.deliveredAt || now;
  luggage.activityLogs = luggage.activityLogs || [];
  luggage.activityLogs.push({ action: "completed", performedBy: performedBy || null, message: "Delivery completed" });
  await luggage.save();

  // close related task
  try {
    if (luggage.taskId) {
      const t = await Task.findById(luggage.taskId);
      if (t) {
        t.status = "completed";
        t.completedAt = now;
        t.isCompleted = true;
        t.activityLogs = t.activityLogs || [];
        t.activityLogs.push({ action: "completed", performedBy: performedBy || null, message: "Task closed on delivery completion" });
        await t.save();
      }
    }
  } catch (e) {
    // ignore
  }

  return { status: "completed" };
};

module.exports = {
  createLuggage,
  getLuggageDetails,
  updateLuggageStatus,
  assignLuggageStaff,
  completeLuggageDelivery,
};
