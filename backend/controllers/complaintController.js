const Complaint = require("../models/Complaint");
const Booking = require("../models/Booking");
const Guest = require("../models/Guest");
const Task = require("../models/Task");
const { createTask: createTaskService } = require("../services/taskService");
const generateId = require("../utils/generateId");

const buildError = (message, statusCode = 400) => {
	const error = new Error(message);
	error.statusCode = statusCode;
	return error;
};

const categoryToDepartment = {
	service: "reception",
	housekeeping: "housekeeping",
	maintenance: "maintenance",
	food: "food_service",
	parking: "parking",
	billing: "reception",
	other: "reception",
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

const createComplaint = async ({
	businessId,
	bookingId,
	guestId,
	roomNumber = null,
	category = "service",
	severity = "medium",
	title = "Guest complaint",
	description = "",
	reportedBy = null,
	source = "telegram",
	notes = "",
}) => {
	if (!businessId) throw buildError("Business context is required", 401);

	const { booking, guest } = await resolveBookingContext({ businessId, bookingId, guestId });
	const complaintCategory = category || "service";
	const complaintSeverity = severity || "medium";
	const complaintRoomNumber = roomNumber || booking.roomNumber || guest.roomNumber || null;

	const complaint = await Complaint.create({
		businessId,
		complaintId: await generateId("complaint", "CMP"),
		bookingId: booking._id,
		guestId: guest._id,
		roomNumber: complaintRoomNumber,
		category: complaintCategory,
		severity: complaintSeverity,
		title,
		description,
		status: "open",
		reportedBy,
		activityLogs: [
			{
				action: "created",
				performedBy: reportedBy || null,
				message: `${source} complaint created${notes ? `: ${notes}` : ""}`,
			},
		],
	});

	const task = await createTaskService({
		businessId,
		bookingId: booking.bookingId,
		guestId: guest._id,
		department: categoryToDepartment[complaintCategory] || "reception",
		title,
		description: description || title,
		priority: severityToPriority(complaintSeverity, booking.isVIP),
		taskType: "complaint",
		entityType: "complaint",
		entityId: complaint._id,
		roomNumber: complaintRoomNumber,
		assignedBy: reportedBy,
		notes: notes || description,
	});

	complaint.relatedTaskId = task._id;
	complaint.assignedTo = task.assignedTo || null;
	complaint.status = task.assignedTo ? "assigned" : "open";
	complaint.activityLogs.push({
		action: "task_created",
		performedBy: reportedBy || null,
		message: `Complaint linked to task ${task.taskId}`,
	});

	await complaint.save();

	return { complaint, task, booking, guest };
};

const resolveComplaint = async ({ businessId, complaintId, performedBy = null, resolutionNotes = "" }) => {
	if (!businessId) throw buildError("Business context is required", 401);
	if (!complaintId) throw buildError("complaintId is required", 400);

	const complaint = await Complaint.findOne({ businessId, complaintId });
	if (!complaint) throw buildError("Complaint not found", 404);

	complaint.status = "resolved";
	complaint.resolutionNotes = resolutionNotes;
	complaint.resolvedAt = new Date();
	complaint.activityLogs = complaint.activityLogs || [];
	complaint.activityLogs.push({
		action: "resolved",
		performedBy,
		message: resolutionNotes || "Complaint resolved",
	});

	if (complaint.relatedTaskId) {
		try {
			const task = await Task.findById(complaint.relatedTaskId);
			if (task) {
				task.status = "completed";
				task.completedAt = new Date();
				task.isCompleted = true;
				task.activityLogs = task.activityLogs || [];
				task.activityLogs.push({
					action: "completed",
					performedBy,
					message: resolutionNotes || "Complaint resolved",
				});
				await task.save();
			}
		} catch (error) {
			// ignore task sync issues
		}
	}

	await complaint.save();
	return complaint;
};

module.exports = {
	createComplaint,
	resolveComplaint,
};
