const Room = require("../models/Room");
const Booking = require("../models/Booking");
const Guest = require("../models/Guest");
const Parking = require("../models/Parking");
const FoodOrder = require("../models/FoodOrder");
const Luggage = require("../models/Luggage");
const Task = require("../models/Task");

const { createTask: createTaskService } = require("../services/taskService");
const { createComplaint } = require("./complaintController");
const { createMaintenanceRequest } = require("./maintenanceController");

const buildError = (message, statusCode = 400) => {
	const error = new Error(message);
	error.statusCode = statusCode;
	return error;
};

const resolveBookingContext = async ({ businessId, bookingId }) => {
	const booking = await Booking.findOne({ businessId, bookingId }).populate("guestId").populate("roomId");

	if (!booking) {
		throw buildError("Booking not found", 404);
	}

	const guest = booking.guestId || null;
	if (!guest) {
		throw buildError("Guest not found", 404);
	}

	const room = booking.roomId || (booking.roomNumber ? await Room.findOne({ businessId, roomNumber: booking.roomNumber }) : null) || (guest.roomNumber ? await Room.findOne({ businessId, roomNumber: guest.roomNumber }) : null);

	return { booking, guest, room };
};

const getRoomSnapshot = async ({ businessId, bookingId }) => {
	if (!businessId) throw buildError("Business context is required", 401);
	if (!bookingId) throw buildError("bookingId is required", 400);

	const { booking, guest, room } = await resolveBookingContext({ businessId, bookingId });
	const roomNumber = room?.roomNumber || booking.roomNumber || guest.roomNumber || null;
	const taskQuery = {
		businessId,
		$or: [{ entityId: booking._id }],
	};

	if (roomNumber) {
		taskQuery.$or.unshift({ roomNumber });
	}

	const linkedTasks = await Task.find(taskQuery)
		.sort({ createdAt: -1 })
		.populate("assignedTo", "fullName role")
		.populate("guestId", "fullName phone");

	const parking = await Parking.findOne({ businessId, bookingId: booking._id }).populate("guestId");
	const foodOrders = await FoodOrder.find({ businessId, bookingId: booking.bookingId, status: { $in: ["pending", "confirmed"] } });
	const luggage = await Luggage.findOne({ businessId, bookingId: booking._id });
	const complaints = await require("../models/Complaint").find({ businessId, bookingId: booking._id }).sort({ createdAt: -1 });
	const maintenanceRequests = await require("../models/MaintenanceRequest").find({ businessId, bookingId: booking._id }).sort({ createdAt: -1 });

	return {
		booking: {
			bookingId: booking.bookingId,
			bookingStatus: booking.bookingStatus,
			checkInDate: booking.checkInDate,
			checkOutDate: booking.checkOutDate,
			actualCheckInTime: booking.actualCheckInTime,
			actualCheckOutTime: booking.actualCheckOutTime,
		},
		guest: {
			fullName: guest.fullName,
			roomNumber: guest.roomNumber || null,
			vehicleNumber: guest.vehicleNumber || null,
			parkingSlot: guest.parkingSlot || null,
		},
		room: room
			? {
					roomNumber: room.roomNumber,
					occupancyStatus: room.occupancyStatus,
					housekeepingStatus: room.housekeepingStatus,
					maintenanceStatus: room.maintenanceStatus,
					floor: room.floor,
					block: room.block,
					notes: room.notes,
				}
			: null,
		parking: parking
			? {
					parkingId: parking.parkingId,
					status: parking.status,
					vehicleNumber: parking.vehicleNumber,
				}
			: null,
		foodOrders: foodOrders.map((order) => ({
			foodOrderId: order.foodOrderId,
			mealType: order.mealType,
			status: order.status,
			preferredTime: order.preferredTime,
		})),
		luggage: luggage
			? {
					luggageId: luggage.luggageId,
					overallStatus: luggage.overallStatus,
					luggageCount: luggage.luggageCount,
				}
			: null,
		complaints: complaints.map((complaint) => ({
			complaintId: complaint.complaintId,
			category: complaint.category,
			severity: complaint.severity,
			status: complaint.status,
			title: complaint.title,
		})),
		maintenanceRequests: maintenanceRequests.map((request) => ({
			maintenanceRequestId: request.maintenanceRequestId,
			issueType: request.issueType,
			severity: request.severity,
			status: request.status,
			title: request.title,
		})),
		tasks: linkedTasks.map((task) => ({
			taskId: task.taskId,
			title: task.title,
			status: task.status,
			taskType: task.taskType,
			department: task.department,
			roomNumber: task.roomNumber,
			priority: task.priority,
			createdAt: task.createdAt,
			assignedTo: task.assignedTo
				? {
					fullName: task.assignedTo.fullName,
					role: task.assignedTo.role,
				}
				: null,
		})),
	};
};

const getRoomList = async ({ businessId }) => {
	if (!businessId) throw buildError("Business context is required", 401);

	const rooms = await Room.find({ businessId, isActive: true })
		.populate("currentBookingId", "bookingId bookingStatus checkInDate checkOutDate specialRequests bookingType paymentStatus totalGuests")
		.populate("currentGuestId", "fullName phone email")
		.sort({ floor: 1, roomNumber: 1 })
		.lean();

	return rooms.map((room) => ({
		_id: room._id,
		roomNumber: room.roomNumber,
		roomId: room.roomId,
		roomType: room.roomType,
		floor: room.floor,
		block: room.block,
		occupancyStatus: room.occupancyStatus,
		housekeepingStatus: room.housekeepingStatus,
		maintenanceStatus: room.maintenanceStatus,
		pricePerNight: room.pricePerNight,
		notes: room.notes,
		currentBooking: room.currentBookingId
			? {
				bookingId: room.currentBookingId.bookingId,
				bookingStatus: room.currentBookingId.bookingStatus,
				checkInDate: room.currentBookingId.checkInDate,
				checkOutDate: room.currentBookingId.checkOutDate,
				specialRequests: room.currentBookingId.specialRequests,
				bookingType: room.currentBookingId.bookingType,
				paymentStatus: room.currentBookingId.paymentStatus,
				totalGuests: room.currentBookingId.totalGuests,
			}
			: null,
		currentGuest: room.currentGuestId
			? {
				fullName: room.currentGuestId.fullName,
				phone: room.currentGuestId.phone,
				email: room.currentGuestId.email,
			}
			: null,
	}));
};

const closeRelatedTask = async ({ businessId, entityType, entityId, performedBy, completedMessage, cancelled = false }) => {
	const task = await Task.findOne({ businessId, entityType, entityId, status: { $ne: "completed" } }).sort({ createdAt: -1 });

	if (!task) {
		return null;
	}

	task.status = cancelled ? "cancelled" : "completed";
	task.completedAt = cancelled ? task.completedAt : new Date();
	task.isCompleted = !cancelled;
	task.activityLogs = task.activityLogs || [];
	task.activityLogs.push({
		action: cancelled ? "cancelled" : "completed",
		performedBy: performedBy || null,
		message: completedMessage,
	});

	await task.save();
	return task;
};

const checkoutBooking = async ({
	businessId,
	bookingId,
	performedBy = null,
	checkoutMode = "standard",
	maintenanceDetails = "",
	complaintDetails = "",
}) => {
	if (!businessId) throw buildError("Business context is required", 401);
	if (!bookingId) throw buildError("bookingId is required", 400);

	const { booking, guest, room } = await resolveBookingContext({ businessId, bookingId });

	if (booking.bookingStatus === "checked_out") {
		throw buildError("Booking is already checked out", 400);
	}

	const now = new Date();
	const roomNumber = room?.roomNumber || booking.roomNumber || guest.roomNumber || null;

	booking.bookingStatus = "checked_out";
	booking.actualCheckOutTime = now;
	booking.checkedOutBy = performedBy || null;
	booking.activityLogs = booking.activityLogs || [];
	booking.activityLogs.push({
		action: "checked_out",
		performedBy: performedBy || null,
		message: `Checkout completed for room ${roomNumber || "N/A"}`,
	});
	await booking.save();

	guest.isCheckedIn = false;
	guest.currentBooking = null;
	guest.roomNumber = null;
	await guest.save();

	if (room) {
		room.currentBookingId = null;
		room.currentGuestId = null;
		room.occupancyStatus = "available";
		room.housekeepingStatus = "dirty";
		if (checkoutMode === "maintenance" || maintenanceDetails) {
			room.maintenanceStatus = "maintenance_required";
		}
		room.activityLogs = room.activityLogs || [];
		room.activityLogs.push({
			action: "available",
			performedBy: performedBy || null,
			message: `Room vacated after checkout${roomNumber ? ` for ${roomNumber}` : ""}`,
		});
		await room.save();
	}

	const housekeepingTask = await createTaskService({
		businessId,
		bookingId: booking.bookingId,
		guestId: guest._id,
		department: "housekeeping",
		title: `Clean room ${roomNumber || booking.bookingId}`,
		description: `Post-checkout cleaning for room ${roomNumber || "N/A"}`,
		priority: booking.isVIP ? "vip" : "medium",
		taskType: "housekeeping",
		entityType: "guest_request",
		entityId: room?._id || booking._id,
		roomNumber,
		assignedBy: performedBy,
		notes: "Post-checkout room cleaning required",
	});

	const foodOrders = await FoodOrder.find({ businessId, bookingId: booking.bookingId, status: { $in: ["pending", "confirmed"] } });
	for (const order of foodOrders) {
		order.status = "cancelled";
		order.activityLogs = order.activityLogs || [];
		order.activityLogs.push({
			action: "cancelled",
			performedBy: performedBy || null,
			message: "Cancelled because guest checked out",
		});
		await order.save();
		await closeRelatedTask({
			businessId,
			entityType: "food_order",
			entityId: order._id,
			performedBy,
			completedMessage: "Food order cancelled during checkout",
			cancelled: true,
		});
	}

	const luggage = await Luggage.findOne({ businessId, bookingId: booking._id });
	let luggageTask = null;
	if (luggage) {
		luggage.overallStatus = "completed";
		luggage.deliveredAt = luggage.deliveredAt || now;
		luggage.activityLogs = luggage.activityLogs || [];
		luggage.activityLogs.push({
			action: "completed",
			performedBy: performedBy || null,
			message: "Luggage workflow closed on checkout",
		});
		await luggage.save();

		luggageTask = await closeRelatedTask({
			businessId,
			entityType: "luggage",
			entityId: luggage._id,
			performedBy,
			completedMessage: "Luggage workflow completed on checkout",
		});
	}

	const parking = await Parking.findOne({ businessId, bookingId: booking._id });
	let parkingTask = null;
	if (parking && ["occupied", "reserved"].includes(parking.status)) {
		parking.status = "reserved";
		parking.retrievalRequestedAt = now;
		parking.activityLogs = parking.activityLogs || [];
		parking.activityLogs.push({
			action: "vehicle_requested",
			performedBy: performedBy || null,
			message: "Vehicle retrieval requested during checkout",
		});
		await parking.save();

		parkingTask = await closeRelatedTask({
			businessId,
			entityType: "parking",
			entityId: parking._id,
			performedBy,
			completedMessage: "Vehicle retrieval requested during checkout",
		});
	}

	let maintenanceRequest = null;
	let complaint = null;

	if (checkoutMode === "maintenance" || maintenanceDetails) {
		const maintenanceResult = await createMaintenanceRequest({
			businessId,
			bookingId: booking.bookingId,
			guestId: guest._id,
			roomNumber,
			issueType: "damage",
			severity: "high",
			title: `Post-checkout maintenance for room ${roomNumber || booking.bookingId}`,
			description: maintenanceDetails || "Maintenance review requested during checkout",
			reportedBy: performedBy,
			source: "telegram",
			roomStatus: "maintenance_required",
			notes: "Created from checkout workflow",
		});

		maintenanceRequest = maintenanceResult.maintenanceRequest;
	}

	if (checkoutMode === "complaint" || complaintDetails) {
		const complaintResult = await createComplaint({
			businessId,
			bookingId: booking.bookingId,
			guestId: guest._id,
			roomNumber,
			category: "service",
			severity: "medium",
			title: `Post-checkout complaint for ${guest.fullName}`,
			description: complaintDetails || "Complaint recorded during checkout",
			reportedBy: performedBy,
			source: "telegram",
			notes: "Created from checkout workflow",
		});

		complaint = complaintResult.complaint;
	}

	return {
		booking,
		guest,
		room,
		roomNumber,
		housekeepingTask,
		luggageTask,
		parkingTask,
		maintenanceRequest,
		complaint,
	};
};

module.exports = {
	getRoomSnapshot,
	getRoomList,
	checkoutBooking,
};
