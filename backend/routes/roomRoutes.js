const express = require("express");

const authMiddleware = require("../middlewares/authMiddleware");
const { authorizeAccess } = require("../middlewares/roleMiddleware");
const { getRoomSnapshot, getRoomList, checkoutBooking } = require("../controllers/roomController");

const router = express.Router();

router.get(
	"/list",
	authMiddleware,
	authorizeAccess(["business", "reception", "supervisor", "manager", "admin", "staff"]),
	async (req, res) => {
		try {
			const businessId = req.business?._id || req.staff?.businessId;
			const rooms = await getRoomList({ businessId });
			return res.status(200).json({ success: true, rooms });
		} catch (error) {
			return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Server Error" });
		}
	}
);

router.get(
	"/:bookingId",
	authMiddleware,
	authorizeAccess(["business", "reception", "supervisor", "manager", "admin", "staff"]),
	async (req, res) => {
		try {
			const businessId = req.business?._id || req.staff?.businessId;
			const snapshot = await getRoomSnapshot({ businessId, bookingId: req.params.bookingId });
			return res.status(200).json({ success: true, snapshot });
		} catch (error) {
			return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Server Error" });
		}
	}
);

router.post(
	"/checkout",
	authMiddleware,
	authorizeAccess(["guest", "business", "reception", "supervisor", "manager", "admin", "staff"]),
	async (req, res) => {
		try {
			const businessId = req.business?._id || req.staff?.businessId || req.guest?.businessId;
			const performedBy = req.staff?._id || null;
			const result = await checkoutBooking({
				businessId,
				bookingId: req.body.bookingId,
				performedBy,
				checkoutMode: req.body.checkoutMode || "standard",
				maintenanceDetails: req.body.maintenanceDetails || "",
				complaintDetails: req.body.complaintDetails || "",
			});

			return res.status(200).json({
				success: true,
				message: "Checkout completed",
				roomNumber: result.roomNumber,
				housekeepingTask: result.housekeepingTask ? { taskId: result.housekeepingTask.taskId, status: result.housekeepingTask.status } : null,
				parkingTask: result.parkingTask ? { taskId: result.parkingTask.taskId, status: result.parkingTask.status } : null,
				luggageTask: result.luggageTask ? { taskId: result.luggageTask.taskId, status: result.luggageTask.status } : null,
				maintenanceRequest: result.maintenanceRequest ? { maintenanceRequestId: result.maintenanceRequest.maintenanceRequestId, status: result.maintenanceRequest.status } : null,
				complaint: result.complaint ? { complaintId: result.complaint.complaintId, status: result.complaint.status } : null,
			});
		} catch (error) {
			return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Server Error" });
		}
	}
);

module.exports = router;
