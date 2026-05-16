const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
	{
		businessId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Business",
			required: true,
			index: true,
		},

		complaintId: {
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
		},

		category: {
			type: String,
			enum: ["service", "housekeeping", "maintenance", "food", "parking", "billing", "other"],
			default: "service",
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

module.exports = mongoose.model("Complaint", complaintSchema);
