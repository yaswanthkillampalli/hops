// models/Booking.js

const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    // Multi-tenant business isolation
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    // Public readable booking ID
    bookingId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Guest linked to booking
    guestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guest",
      required: true,
      index: true,
    },

    // Room assigned
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      default: null,
    },

    // Room number snapshot
    roomNumber: {
      type: String,
      default: null,
    },

    // Booking lifecycle
    bookingStatus: {
      type: String,
      enum: [
        "reserved",
        "checked_in",
        "checked_out",
        "cancelled",
        "no_show",
      ],
      default: "reserved",
      index: true,
    },

    // Booking type
    bookingType: {
      type: String,
      enum: [
        "walk_in",
        "online",
        "corporate",
        "vip",
      ],
      default: "online",
    },

    // Stay details
    checkInDate: {
      type: Date,
      required: true,
    },

    checkOutDate: {
      type: Date,
      required: true,
    },

    actualCheckInTime: {
      type: Date,
      default: null,
    },

    actualCheckOutTime: {
      type: Date,
      default: null,
    },

    totalGuests: {
      type: Number,
      default: 1,
      min: 1,
    },

    adults: {
      type: Number,
      default: 1,
    },

    children: {
      type: Number,
      default: 0,
    },

    // Operational preferences
    parkingRequired: {
      type: Boolean,
      default: false,
    },

    luggageCount: {
      type: Number,
      default: 0,
    },

    foodPreference: {
      type: String,
      default: "",
    },

    specialRequests: {
      type: String,
      default: "",
    },

    // VIP operations
    isVIP: {
      type: Boolean,
      default: false,
    },

    vipNotes: {
      type: String,
      default: "",
    },

    // Telegram integration
    telegramConnected: {
      type: Boolean,
      default: false,
    },

    // Check-in QR
    qrCodeToken: {
      type: String,
      default: null,
    },

    // Staff references
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },

    checkedOutBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },

    // Payment tracking
    paymentStatus: {
      type: String,
      enum: [
        "pending",
        "partial",
        "paid",
        "refunded",
      ],
      default: "pending",
    },

    totalAmount: {
      type: Number,
      default: 0,
    },

    // Operational notes
    internalNotes: {
      type: String,
      default: "",
    },

    // Booking activity timeline
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

    // Flags
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Booking", bookingSchema);