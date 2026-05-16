const mongoose = require("mongoose");

const parkingSchema = new mongoose.Schema(
  {
    // Multi-tenant business isolation
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    // Public parking slot ID
    parkingId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Physical slot number
    slotNumber: {
      type: String,
      required: true,
      trim: true,
    },

    // Parking zone / block
    zone: {
      type: String,
      default: "",
    },

    floor: {
      type: Number,
      default: 0,
    },

    // Slot operational status
    status: {
      type: String,
      enum: [
        "available",
        "reserved",
        "occupied",
        "blocked",
        "maintenance",
      ],
      default: "available",
      index: true,
    },

    // Vehicle information
    vehicleNumber: {
      type: String,
      default: null,
      uppercase: true,
      trim: true,
    },

    vehicleType: {
      type: String,
      enum: [
        "bike",
        "car",
        "suv",
        "van",
        "electric",
        "other",
      ],
      default: "car",
    },

    vehicleColor: {
      type: String,
      default: "",
    },

    // Guest linkage
    guestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guest",
      default: null,
      index: true,
    },

    // Booking linkage
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
      index: true,
    },

    // Staff handling parking
    parkedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },

    retrievedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },

    // Parking lifecycle
    parkedAt: {
      type: Date,
      default: null,
    },

    retrievalRequestedAt: {
      type: Date,
      default: null,
    },

    retrievedAt: {
      type: Date,
      default: null,
    },

    // VIP / reserved handling
    isVIPSlot: {
      type: Boolean,
      default: false,
    },

    reservedFor: {
      type: String,
      default: "",
    },

    // QR scanning support
    qrCodeToken: {
      type: String,
      default: null,
    },

    // Operational notes
    notes: {
      type: String,
      default: "",
    },

    // Parking activity timeline
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

    // Slot active status
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate slot numbers inside same business
parkingSchema.index(
  { businessId: 1, slotNumber: 1 },
  { unique: true }
);

module.exports = mongoose.model("Parking", parkingSchema);