const express = require("express");

const authMiddleware = require("../middlewares/authMiddleware");
const { authorizeAccess } = require("../middlewares/roleMiddleware");
const { createComplaint, resolveComplaint } = require("../controllers/complaintController");
const Complaint = require("../models/Complaint");

const router = express.Router();

router.get(
	"/",
	authMiddleware,
	authorizeAccess(["business", "reception", "supervisor", "manager", "admin", "staff"]),
	async (req, res) => {
		try {
			const businessId = req.business?._id || req.staff?.businessId;
			const complaints = await Complaint.find({ businessId })
				.populate("guestId", "fullName phone")
				.populate("assignedTo", "fullName role")
				.sort({ createdAt: -1 });

			return res.status(200).json({
				success: true,
				complaints,
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
			const complaints = await Complaint.find({ businessId, bookingId: req.params.bookingId }).sort({ createdAt: -1 });

			return res.status(200).json({
				success: true,
				complaints,
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
			const complaint = await createComplaint({
				businessId,
				bookingId: req.body.bookingId,
				guestId: req.body.guestId || req.guest?._id,
				roomNumber: req.body.roomNumber,
				category: req.body.category,
				severity: req.body.severity,
				title: req.body.title,
				description: req.body.description,
				reportedBy,
				source: req.body.source || "http",
				notes: req.body.notes || "",
			});

			return res.status(201).json({
				success: true,
				complaint: {
					complaintId: complaint.complaint.complaintId,
					status: complaint.complaint.status,
					category: complaint.complaint.category,
					severity: complaint.complaint.severity,
					title: complaint.complaint.title,
				},
				task: complaint.task ? { taskId: complaint.task.taskId, status: complaint.task.status } : null,
			});
		} catch (error) {
			return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Server Error" });
		}
	}
);

router.patch(
	"/resolve/:complaintId",
	authMiddleware,
	authorizeAccess(["business", "reception", "supervisor", "manager", "admin", "staff"]),
	async (req, res) => {
		try {
			const businessId = req.business?._id || req.staff?.businessId;
			const complaint = await resolveComplaint({
				businessId,
				complaintId: req.params.complaintId,
				performedBy: req.staff?._id || null,
				resolutionNotes: req.body.resolutionNotes || "",
			});

			return res.status(200).json({
				success: true,
				complaint: {
					complaintId: complaint.complaintId,
					status: complaint.status,
					resolvedAt: complaint.resolvedAt,
				},
			});
		} catch (error) {
			return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Server Error" });
		}
	}
);

module.exports = router;
