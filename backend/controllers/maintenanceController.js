const MaintenanceRequest = require("../models/MaintenanceRequest");
const Booking = require("../models/Booking");
const Guest = require("../models/Guest");
const Room = require("../models/Room");
const Task = require("../models/Task");
const { createTask: createTaskService } = require("../services/taskService");
const generateId = require("../utils/generateId");

const buildError = (message, statusCode = 400) => {
	const error = new Error(message);
	error.statusCode = statusCode;
	return error;
};

const issueToRoomStatus = {
	general: "maintenance_required",
	plumbing: "maintenance_required",
	electrical: "maintenance_required",
	hvac: "under_maintenance",
	furniture: "maintenance_required",
	damage: "out_of_service",
	cleaning: "maintenance_required",
	other: "maintenance_required",
};

const severityToPriority = (severity, isVIP = false) => {
	if (isVIP) return "vip";
	if (severity === "urgent") return "urgent";
	if (severity === "high") return "high";
	if (severity === "low") return "low";
	return "medium";
};

const resolveBookingContext = async ({ businessId, bookingId, guestId }) => {
	let booking = null;
	let guest = null;

	if (bookingId) {
		booking = await Booking.findOne({ businessId, bookingId }).populate("guestId");
		if (!booking) throw buildError("Booking not found", 404);
		guest = booking.guestId || null;
	}

	if (!guest && guestId) {
		guest = await Guest.findOne({ _id: guestId, businessId });
		if (!guest) throw buildError("Guest not found", 404);
	}

	if (!booking && guest) {
		booking = await Booking.findOne({ businessId, guestId: guest._id }).sort({ createdAt: -1 });
	}

	if (!booking || !guest) {
		throw buildError("bookingId or guest context is required", 400);
	}

	return { booking, guest };
};

const createMaintenanceRequest = async ({
	businessId,
	bookingId,
	guestId,
	roomNumber = null,
	issueType = "general",
	severity = "medium",
	title = "Maintenance request",
	description = "",
	reportedBy = null,
	source = "telegram",
	roomStatus = null,
	notes = "",
}) => {
	if (!businessId) throw buildError("Business context is required", 401);

	const { booking, guest } = await resolveBookingContext({ businessId, bookingId, guestId });
	const requestRoomNumber = roomNumber || booking.roomNumber || guest.roomNumber || null;
	const requestStatus = roomStatus || issueToRoomStatus[issueType] || "maintenance_required";

	const maintenanceRequest = await MaintenanceRequest.create({
		businessId,
		maintenanceRequestId: await generateId("maintenance", "MNT"),
		bookingId: booking._id,
		guestId: guest._id,
		roomNumber: requestRoomNumber,
		issueType,
		severity,
		title,
		description,
		status: "open",
		roomStatusImpact: requestStatus,
		reportedBy,
		activityLogs: [
			{
				action: "created",
				performedBy: reportedBy || null,
				message: `${source} maintenance request created${notes ? `: ${notes}` : ""}`,
			},
		],
	});

	const task = await createTaskService({
		businessId,
		bookingId: booking.bookingId,
		guestId: guest._id,
		department: "maintenance",
		title,
		description: description || title,
		priority: severityToPriority(severity, booking.isVIP),
		taskType: "maintenance",
		entityType: "maintenance_request",
		entityId: maintenanceRequest._id,
		roomNumber: requestRoomNumber,
		assignedBy: reportedBy,
		notes: notes || description,
	});

	maintenanceRequest.relatedTaskId = task._id;
	maintenanceRequest.assignedTo = task.assignedTo || null;
	maintenanceRequest.status = task.assignedTo ? "assigned" : "open";
	maintenanceRequest.activityLogs.push({
		action: "task_created",
		performedBy: reportedBy || null,
		message: `Maintenance linked to task ${task.taskId}`,
	});

	await maintenanceRequest.save();

	if (requestRoomNumber) {
		const room = await Room.findOne({ businessId, roomNumber: requestRoomNumber });
		if (room) {
			room.maintenanceStatus = requestStatus;
			room.activityLogs = room.activityLogs || [];
			room.activityLogs.push({
				action: requestStatus,
				performedBy: reportedBy || null,
				message: `Maintenance request created: ${title}`,
			});
			await room.save();
		}
	}

	return { maintenanceRequest, task, booking, guest };
};

const resolveMaintenanceRequest = async ({ businessId, maintenanceRequestId, performedBy = null, resolutionNotes = "" }) => {
	if (!businessId) throw buildError("Business context is required", 401);
	if (!maintenanceRequestId) throw buildError("maintenanceRequestId is required", 400);

	const request = await MaintenanceRequest.findOne({ businessId, maintenanceRequestId });
	if (!request) throw buildError("Maintenance request not found", 404);

	request.status = "resolved";
	request.resolutionNotes = resolutionNotes;
	request.resolvedAt = new Date();
	request.activityLogs = request.activityLogs || [];
	request.activityLogs.push({
		action: "resolved",
		performedBy,
		message: resolutionNotes || "Maintenance request resolved",
	});

	if (request.relatedTaskId) {
		try {
			const task = await Task.findById(request.relatedTaskId);
			if (task) {
				task.status = "completed";
				task.completedAt = new Date();
				task.isCompleted = true;
				task.activityLogs = task.activityLogs || [];
				task.activityLogs.push({
					action: "completed",
					performedBy,
					message: resolutionNotes || "Maintenance resolved",
				});
				await task.save();
			}
		} catch (error) {
			// ignore task sync issues
		}
	}

	if (request.roomNumber) {
		const room = await Room.findOne({ businessId, roomNumber: request.roomNumber });
		if (room) {
			room.maintenanceStatus = "operational";
			room.activityLogs = room.activityLogs || [];
			room.activityLogs.push({
				action: "operational",
				performedBy,
				message: resolutionNotes || "Maintenance cleared",
			});
			await room.save();
		}
	}

	await request.save();
	return request;
};

module.exports = {
	createMaintenanceRequest,
	resolveMaintenanceRequest,
};
