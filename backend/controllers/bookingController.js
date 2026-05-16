const Booking = require("../models/Booking");
const Guest = require("../models/Guest");
const Room = require("../models/Room");

const generateId = require("../utils/generateId");

const {
  sendEmail,
} = require("../services/emailService");

const generateQRCode = require("../utils/generateQRCode");

const bookingConfirmationTemplate = require(
  "../templates/bookingConfirmationTemplate"
);

const createBooking = async (req, res) => {
  try {
    const {
      fullName,
      phone,
      email,

      roomType,

      businessId,

      checkInDate,
      checkOutDate,

      totalGuests,

      adults,

      children,

      specialRequests,

      preferences,
    } = req.body;

    // =====================================
    // Validation
    // =====================================

    if (
      !businessId ||
      !fullName ||
      !phone ||
      !roomType ||
      !checkInDate ||
      !checkOutDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    // =====================================
    // Find Existing Guest
    // =====================================

    let guest = await Guest.findOne({
      businessId,
      phone,
    });

    // =====================================
    // Create Guest If Not Exists
    // =====================================

    if (!guest) {
      guest = await Guest.create({
        businessId,

        fullName,

        phone,

        email,

        preferences,
      });
    }

    // =====================================
    // Find Available Room
    // =====================================

    const room = await Room.findOne({
      businessId,

      roomType,

      occupancyStatus: "available",

      maintenanceStatus: "operational",

      housekeepingStatus: "clean",

      isActive: true,
    }).sort({
      floor: 1,
      roomNumber: 1,
    });

    // =====================================
    // No Room Available
    // =====================================

    if (!room) {
      return res.status(400).json({
        success: false,
        message:
          "No rooms available for selected room type",
      });
    }

    // =====================================
    // Generate Booking ID
    // =====================================

    const bookingId = await generateId(
      "booking",
      "BK"
    );

    // =====================================
    // Calculate Stay Duration
    // =====================================

    const start = new Date(checkInDate);

    const end = new Date(checkOutDate);

    const totalDays = Math.ceil(
      (end - start) / (1000 * 60 * 60 * 24)
    );

    // Prevent invalid booking duration
    if (totalDays <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid check-in/check-out dates",
      });
    }

    // =====================================
    // Calculate Total Amount
    // =====================================

    const totalAmount =
      totalDays * room.pricePerNight;

    const guestCountSource =
      totalGuests &&
      typeof totalGuests === "object"
        ? totalGuests
        : {};

    const adultsCount = Number(
      guestCountSource.adults ?? adults ?? 1
    );

    const childrenCount = Number(
      guestCountSource.children ?? children ?? 0
    );

    const totalGuestCount =
      Number.isFinite(Number(totalGuests))
        ? Number(totalGuests)
        : adultsCount + childrenCount;

    if (totalGuestCount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Total guests must be at least 1",
      });
    }

    // =====================================
    // Create Booking
    // =====================================

    const booking = await Booking.create({
      businessId,

      guestId: guest._id,

      roomId: room._id,

      roomNumber: room.roomNumber,

      bookingId,

      checkInDate,

      checkOutDate,

      totalGuests: totalGuestCount,

      adults: adultsCount,

      children: childrenCount,

      specialRequests,

      totalAmount,
    });

    // =====================================
    // Update Room
    // =====================================

    room.occupancyStatus = "reserved";

    room.currentBookingId = booking._id;

    room.currentGuestId = guest._id;

    await room.save();

    // =====================================
    // Update Guest
    // =====================================

    guest.currentBooking = booking._id;

    guest.roomNumber = room.roomNumber;

    await guest.save();

    // =====================================
    // Telegram Bot Link
    // =====================================

    const telegramBotLink =
      `https://t.me/hops12_bot?start=${booking.bookingId}`;

    // =====================================
    // Send Booking Confirmation Email
    // =====================================

    if (guest.email) {
      const qrCode = await generateQRCode({
        bookingId: booking.bookingId,
        type: "checkin",
      });

      // Convert the QR data URL into the base64 payload Resend expects.
      const qrBase64 = qrCode.split(",")[1];
      const qrCid = `booking_qr_${booking.bookingId}`;

      const html =
        bookingConfirmationTemplate({
          guestName: guest.fullName,

          bookingId: booking.bookingId,

          roomNumber: room.roomNumber,

          checkInDate,

          checkOutDate,

          checkInTime:
            booking.checkInTime,

          telegramBotLink,
          qrCode,
          qrCid,
        });

      await sendEmail({
        to: guest.email,

        subject: "Booking Confirmation",

        html,
        attachments: [
          {
            filename: "booking_qr.png",
            contentType: "image/png",
            content: qrBase64,
            contentId: qrCid,
          },
        ],
      });
    }

    // =====================================
    // Response
    // =====================================

    return res.status(201).json({
      success: true,

      message:
        "Booking created successfully",

      booking,

      allocatedRoom: {
        roomNumber: room.roomNumber,

        roomType: room.roomType,

        floor: room.floor,

        block: room.block,
      },

      guest: {
        id: guest._id,

        fullName: guest.fullName,

        phone: guest.phone,

        email: guest.email,
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
  createBooking,
};