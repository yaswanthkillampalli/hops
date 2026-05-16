const {
  createLuggage: createLuggageService,
  getLuggageDetails: getLuggageDetailsService,
  updateLuggageStatus: updateLuggageStatusService,
  assignLuggageStaff: assignLuggageStaffService,
  completeLuggageDelivery: completeLuggageDeliveryService,
} = require("../services/luggageService");

const createLuggage = async (req, res) => {
  try {
    const businessId = req.business?._id || req.staff?.businessId;

    const performedBy = req.staff?._id || null;

    const { bookingId, luggageCount } = req.body;

    const result = await createLuggageService({ businessId, bookingId, luggageCount, performedBy });

    return res.status(201).json({ success: true, luggage: result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message || "Server Error" });
  }
};

const getLuggageDetails = async (req, res) => {
  try {
    const businessId = req.business?._id || req.staff?.businessId;
    const bookingId = req.params.bookingId;

    const result = await getLuggageDetailsService({ businessId, bookingId });

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message || "Server Error" });
  }
};

const updateLuggageStatus = async (req, res) => {
  try {
    const businessId = req.business?._id || req.staff?.businessId;
    const performedBy = req.staff?._id || null;
    const { luggageId, tokenId, status } = req.body;

    const result = await updateLuggageStatusService({ businessId, luggageId, tokenId, status, performedBy });

    return res.status(200).json({ success: true, result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message || "Server Error" });
  }
};

const assignLuggageStaff = async (req, res) => {
  try {
    const businessId = req.business?._id || req.staff?.businessId;
    const performedBy = req.staff?._id || null;
    const { luggageId, staffId } = req.body;

    const result = await assignLuggageStaffService({ businessId, luggageId, staffId, performedBy });

    return res.status(200).json({ success: true, result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message || "Server Error" });
  }
};

const completeLuggageDelivery = async (req, res) => {
  try {
    const businessId = req.business?._id || req.staff?.businessId;
    const performedBy = req.staff?._id || null;
    const { luggageId } = req.body;

    const result = await completeLuggageDeliveryService({ businessId, luggageId, performedBy });

    return res.status(200).json({ success: true, status: result.status });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message || "Server Error" });
  }
};

module.exports = {
  createLuggage,
  getLuggageDetails,
  updateLuggageStatus,
  assignLuggageStaff,
  completeLuggageDelivery,
};
