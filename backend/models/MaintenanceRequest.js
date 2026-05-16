const mongoose = require("mongoose");

const maintenanceRequestSchema = new mongoose.Schema(
	{
		businessId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Business",
			required: true,
			index: true,
		},

		maintenanceRequestId: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},

		bookingId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Booking",
			required: true,
			index: true,
		},

		guestId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Guest",
			required: true,
			index: true,
		},

		roomNumber: {
			type: String,
			default: null,
			trim: true,
			index: true,
		},

		issueType: {
			type: String,
			enum: ["general", "plumbing", "electrical", "hvac", "furniture", "damage", "cleaning", "other"],
			default: "general",
			index: true,
		},

		severity: {
			type: String,
			enum: ["low", "medium", "high", "urgent"],
			default: "medium",
			index: true,
		},

		title: {
			type: String,
			required: true,
			trim: true,
		},

		description: {
			type: String,
			default: "",
			trim: true,
		},

		status: {
			type: String,
			enum: ["open", "assigned", "in_progress", "resolved", "closed", "cancelled"],
			default: "open",
			index: true,
		},

		roomStatusImpact: {
			type: String,
			enum: ["operational", "maintenance_required", "under_maintenance", "out_of_service"],
			default: "maintenance_required",
		},

		reportedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Staff",
			default: null,
		},

		assignedTo: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Staff",
			default: null,
			index: true,
		},

		relatedTaskId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Task",
			default: null,
		},

		resolutionNotes: {
			type: String,
			default: "",
		},

		resolvedAt: {
			type: Date,
			default: null,
		},

		activityLogs: [
			{
				action: {
					type: String,
					required: true,
				},
				performedBy: {
					type: mongoose.Schema.Types.ObjectId,
					ref: "Staff",
					default: null,
				},
				message: {
					type: String,
					default: "",
				},
				timestamp: {
					type: Date,
					default: Date.now,
				},
			},
		],
	},
	{ timestamps: true }
);

module.exports = mongoose.model("MaintenanceRequest", maintenanceRequestSchema);
