const express = require("express");

const authMiddleware = require("../middlewares/authMiddleware");
const { authorizeAccess } = require("../middlewares/roleMiddleware");

const {
	createParkingAllocation,
} = require("../controllers/parkingController");

const router = express.Router();

router.post(
	"/allocate",
	authMiddleware,
	authorizeAccess([
		"reception",
		"parking",
		"supervisor",
		"manager",
		"admin",
	]),
	createParkingAllocation
);

router.get(
	"/vehicle/:vehicleNumber",
	authMiddleware,
	authorizeAccess([
		"reception",
		"parking",
		"supervisor",
		"manager",
		"admin",
	]),
	async (req, res) => {
		const { getParkingDetailsByVehicle } = require("../controllers/parkingController");
		return getParkingDetailsByVehicle(req, res);
	}
);

router.get(
	"/available-slots",
	authMiddleware,
	authorizeAccess([
		"reception",
		"parking",
		"supervisor",
		"manager",
		"admin",
		"business",
	]),
	async (req, res) => {
		const { getAvailableSlots } = require("../controllers/parkingController");
		return getAvailableSlots(req, res);
	}
);

router.get(
	"/:bookingId",
	authMiddleware,
	authorizeAccess([
		"reception",
		"parking",
		"supervisor",
		"manager",
		"admin",
	]),
	async (req, res) => {
		const { getParkingDetailsByBooking } = require("../controllers/parkingController");
		return getParkingDetailsByBooking(req, res);
	}
);

router.patch(
	"/status",
	authMiddleware,
	authorizeAccess([
		"parking",
		"supervisor",
		"manager",
		"admin",
	]),
	async (req, res) => {
		const { updateParkingStatus } = require("../controllers/parkingController");
		return updateParkingStatus(req, res);
	}
);

router.post(
	"/request-vehicle",
	authMiddleware,
	authorizeAccess([
		"guest",
		"reception",
		"parking",
		"supervisor",
		"manager",
		"admin",
	]),
	async (req, res) => {
		const { requestVehicleRetrieval } = require("../controllers/parkingController");
		return requestVehicleRetrieval(req, res);
	}
);

router.patch(
	"/complete",
	authMiddleware,
	authorizeAccess([
		"parking",
		"supervisor",
		"manager",
		"admin",
	]),
	async (req, res) => {
		const { completeVehicleDelivery } = require("../controllers/parkingController");
		return completeVehicleDelivery(req, res);
	}
);

module.exports = router;
