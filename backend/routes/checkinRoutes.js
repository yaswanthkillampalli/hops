const express = require("express");
const { scanBooking, completeCheckIn } = require("../controllers/checkinController");
const authMiddleware = require("../middlewares/authMiddleware");
const { authorizeAccess } = require("../middlewares/roleMiddleware");

const router = express.Router();

// Allowed access: staff with role 'admin' or 'manager', or staff in departments 'reception' or 'management'
router.post(
	"/scan",
	authMiddleware,
	authorizeAccess(["admin", "manager", "reception", "management"]),
	scanBooking
);

router.post(
	"/complete",
	authMiddleware,
	authorizeAccess(["admin", "manager", "reception", "management"]),
	completeCheckIn
);

module.exports = router;
