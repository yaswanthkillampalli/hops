const { allocateParkingSlot } = require("../services/parkingService");

const createParkingAllocation = async (req, res) => {
	try {
		const result = await allocateParkingSlot({
			businessId: req.business?._id || req.staff?.businessId,
			performedBy: req.staff?._id || null,
			bookingId: req.body.bookingId,
			vehicleNumber: req.body.vehicleNumber,
			vehicleType: req.body.vehicleType,
		});

		return res.status(201).json({
			success: true,
			parkingSlot: result.parkingSlot,
			status: "allocated",
		});
	} catch (error) {
		const statusCode = error.statusCode || 500;

		return res.status(statusCode).json({
			success: false,
			message: error.message || "Server Error",
		});
	}
};

module.exports = {
	createParkingAllocation,
};

const { getParkingDetails } = require("../services/parkingService");

const getParkingDetailsByBooking = async (req, res) => {
	try {
		const businessId = req.business?._id || req.staff?.businessId;

		const bookingId = req.params.bookingId;

		const result = await getParkingDetails({ businessId, bookingId });

		return res.status(200).json({ success: true, ...result });
	} catch (error) {
		const statusCode = error.statusCode || 500;

		return res.status(statusCode).json({
			success: false,
			message: error.message || "Server Error",
		});
	}
};

const getParkingDetailsByVehicle = async (req, res) => {
	try {
		const businessId = req.business?._id || req.staff?.businessId;

		const vehicleNumber = req.params.vehicleNumber;

		const result = await getParkingDetails({ businessId, vehicleNumber });

		return res.status(200).json({ success: true, ...result });
	} catch (error) {
		const statusCode = error.statusCode || 500;

		return res.status(statusCode).json({
			success: false,
			message: error.message || "Server Error",
		});
	}
};

module.exports.getParkingDetailsByBooking = getParkingDetailsByBooking;
module.exports.getParkingDetailsByVehicle = getParkingDetailsByVehicle;

const { updateParkingStatus: updateParkingStatusService } = require("../services/parkingService");

const updateParkingStatus = async (req, res) => {
	try {
		const businessId = req.business?._id || req.staff?.businessId;

		const performedBy = req.staff?._id || null;

		const { parkingId, status } = req.body;

		const result = await updateParkingStatusService({ businessId, parkingId, status, performedBy });

		return res.status(200).json({ success: true, updatedStatus: result.status });
	} catch (error) {
		const statusCode = error.statusCode || 500;

		return res.status(statusCode).json({
			success: false,
			message: error.message || "Server Error",
		});
	}
};

module.exports.updateParkingStatus = updateParkingStatus;

const { requestVehicleRetrieval: requestVehicleRetrievalService } = require("../services/parkingService");

const requestVehicleRetrieval = async (req, res) => {
	try {
		const businessId = req.business?._id || req.staff?.businessId;

		const performedBy = req.staff?._id || null;

		const { bookingId } = req.body;

		const result = await requestVehicleRetrievalService({ businessId, bookingId, performedBy });

		return res.status(200).json({ success: true, message: result.message });
	} catch (error) {
		const statusCode = error.statusCode || 500;

		return res.status(statusCode).json({
			success: false,
			message: error.message || "Server Error",
		});
	}
};

module.exports.requestVehicleRetrieval = requestVehicleRetrieval;

const { completeVehicleDelivery: completeVehicleDeliveryService } = require("../services/parkingService");

const completeVehicleDelivery = async (req, res) => {
	try {
		const businessId = req.business?._id || req.staff?.businessId;

		const performedBy = req.staff?._id || null;

		const { parkingId } = req.body;

		const result = await completeVehicleDeliveryService({ businessId, parkingId, performedBy });

		return res.status(200).json({ success: true, status: result.status });
	} catch (error) {
		const statusCode = error.statusCode || 500;

		return res.status(statusCode).json({
			success: false,
			message: error.message || "Server Error",
		});
	}
};

module.exports.completeVehicleDelivery = completeVehicleDelivery;

const { getAvailableSlots: getAvailableSlotsService } = require("../services/parkingService");

const getAvailableSlots = async (req, res) => {
	try {
		const businessId = req.business?._id || req.staff?.businessId;

		const slots = await getAvailableSlotsService({ businessId });

		return res.status(200).json({ success: true, slots });
	} catch (error) {
		const statusCode = error.statusCode || 500;

		return res.status(statusCode).json({
			success: false,
			message: error.message || "Server Error",
		});
	}
};

module.exports.getAvailableSlots = getAvailableSlots;
