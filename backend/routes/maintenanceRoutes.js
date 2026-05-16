const express = require("express");

const authMiddleware = require("../middlewares/authMiddleware");
const { authorizeAccess } = require("../middlewares/roleMiddleware");
const { createMaintenanceRequest, resolveMaintenanceRequest } = require("../controllers/maintenanceController");
const MaintenanceRequest = require("../models/MaintenanceRequest");

const router = express.Router();

router.get(
	"/",
	authMiddleware,
	authorizeAccess(["business", "reception", "supervisor", "manager", "admin", "staff"]),
	async (req, res) => {
		try {
			const businessId = req.business?._id || req.staff?.businessId;
			const requests = await MaintenanceRequest.find({ businessId })
				.populate("guestId", "fullName phone")
				.populate("assignedTo", "fullName role")
				.sort({ createdAt: -1 });

			return res.status(200).json({
				success: true,
				maintenanceRequests: requests,
			});
		} catch (error) {
			return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Server Error" });
		}
	}
);

router.get(
	"/:bookingId",
	authMiddleware,
	authorizeAccess(["business", "guest", "reception", "supervisor", "manager", "admin", "staff"]),
	async (req, res) => {
		try {
			const businessId = req.business?._id || req.staff?.businessId || req.guest?.businessId;
			const requests = await MaintenanceRequest.find({ businessId, bookingId: req.params.bookingId }).sort({ createdAt: -1 });

			return res.status(200).json({
				success: true,
				maintenanceRequests: requests,
			});
		} catch (error) {
			return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Server Error" });
		}
	}
);

router.post(
	"/create",
	authMiddleware,
	authorizeAccess(["guest", "business", "reception", "supervisor", "manager", "admin", "staff"]),
	async (req, res) => {
		try {
			const businessId = req.business?._id || req.staff?.businessId || req.guest?.businessId;
			const reportedBy = req.staff?._id || null;
			const request = await createMaintenanceRequest({
				businessId,
				bookingId: req.body.bookingId,
				guestId: req.body.guestId || req.guest?._id,
				roomNumber: req.body.roomNumber,
				issueType: req.body.issueType,
				severity: req.body.severity,
				title: req.body.title,
				description: req.body.description,
				reportedBy,
				source: req.body.source || "http",
				roomStatus: req.body.roomStatus,
				notes: req.body.notes || "",
			});

			return res.status(201).json({
				success: true,
				maintenanceRequest: {
					maintenanceRequestId: request.maintenanceRequest.maintenanceRequestId,
					status: request.maintenanceRequest.status,
					issueType: request.maintenanceRequest.issueType,
					severity: request.maintenanceRequest.severity,
					title: request.maintenanceRequest.title,
				},
				task: request.task ? { taskId: request.task.taskId, status: request.task.status } : null,
			});
		} catch (error) {
			return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Server Error" });
		}
	}
);

router.patch(
	"/resolve/:maintenanceRequestId",
	authMiddleware,
	authorizeAccess(["business", "reception", "supervisor", "manager", "admin", "staff"]),
	async (req, res) => {
		try {
			const businessId = req.business?._id || req.staff?.businessId;
			const request = await resolveMaintenanceRequest({
				businessId,
				maintenanceRequestId: req.params.maintenanceRequestId,
				performedBy: req.staff?._id || null,
				resolutionNotes: req.body.resolutionNotes || "",
			});

			return res.status(200).json({
				success: true,
				maintenanceRequest: {
					maintenanceRequestId: request.maintenanceRequestId,
					status: request.status,
					resolvedAt: request.resolvedAt,
				},
			});
		} catch (error) {
			return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Server Error" });
		}
	}
);

module.exports = router;
