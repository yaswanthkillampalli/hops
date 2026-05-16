const Guest = require("../models/Guest");
const Booking = require("../models/Booking");

const generateToken = require(
  "../utils/generateToken"
);

// =====================================
// REGISTER GUEST (Merged - Public & Internal)
// =====================================

const registerGuest = async (req, res) => {
  try {
    const {
      businessId,
      fullName,
      phone,
      email,
      guestType = "regular",
      preferences,
    } = req.body;

    // Determine which businessId to use
    const finalBusinessId = req.business?._id || businessId;

    // Validation
    if (!finalBusinessId || !fullName || !phone) {
      return res.status(400).json({
        success: false,
        message:
          "Business ID, full name and phone are required",
      });
    }

    // Check existing guest
    const existingGuest = await Guest.findOne({
      businessId: finalBusinessId,
      phone,
    });

    if (existingGuest) {
      return res.status(400).json({
        success: false,
        message:
          "Guest already exists with this phone number",
      });
    }

    // Create guest
    const guest = await Guest.create({
      businessId: finalBusinessId,
      fullName,
      phone,
      email,
      guestType,
      preferences,
    });

    return res.status(201).json({
      success: true,
      message:
        "Guest registered successfully",
      guest,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const guestLogin = async (req, res) => {
  try {
    const { bookingId, phone } = req.body;

    // Validation
    if (!bookingId || !phone) {
      return res.status(400).json({
        success: false,
        message:
          "Booking ID and phone are required",
      });
    }

    // Find booking
    const booking = await Booking.findOne({
      bookingId,
    }).populate("guestId");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const guest = booking.guestId;

    // Verify phone
    if (guest.phone !== phone) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate token
    const token = generateToken({
        id: guest._id,
        role: "guest",
    });

    return res.status(200).json({
      success: true,
      message: "Guest login successful",
      token,

      guest: {
        id: guest._id,
        fullName: guest.fullName,
        phone: guest.phone,
        roomNumber: guest.roomNumber,
        guestType: guest.guestType,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports = {
  registerGuest,
  guestLogin
};