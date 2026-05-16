// models/Room.js

const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    // Multi-tenant business isolation
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    // Public room identifier
    roomNumber: {
      type: String,
      required: true,
      trim: true,
    },

    // Internal room unique ID
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Room category
    roomType: {
      type: String,
      enum: [
        "single",
        "double",
        "deluxe",
        "suite",
        "conference",
        "service_room",
      ],
      default: "single",
    },

    // Floor / block information
    floor: {
      type: Number,
      default: 1,
    },

    block: {
      type: String,
      default: "",
    },

    // Guest capacity
    capacity: {
      adults: {
        type: Number,
        default: 1,
      },

      children: {
        type: Number,
        default: 0,
      },
    },

    // Operational occupancy state
    occupancyStatus: {
      type: String,
      enum: [
        "available",
        "reserved",
        "occupied",
        "blocked",
      ],
      default: "available",
      index: true,
    },

    // Housekeeping operational state
    housekeepingStatus: {
      type: String,
      enum: [
        "clean",
        "dirty",
        "cleaning_in_progress",
        "inspection_pending",
      ],
      default: "clean",
      index: true,
    },

    // Maintenance operational state
    maintenanceStatus: {
      type: String,
      enum: [
        "operational",
        "maintenance_required",
        "under_maintenance",
        "out_of_service",
      ],
      default: "operational",
      index: true,
    },

    // Current booking occupying room
    currentBookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },

    // Current guest
    currentGuestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guest",
      default: null,
    },

    // Assigned housekeeping staff
    assignedHousekeepingStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },

    // Room pricing
    pricePerNight: {
      type: Number,
      default: 0,
    },

    // Amenities
    amenities: [
      {
        type: String,
      },
    ],

    // QR for operational scanning
    qrCodeToken: {
      type: String,
      default: null,
    },

    // Last cleaned timestamp
    lastCleanedAt: {
      type: Date,
      default: null,
    },

    // Last maintenance timestamp
    lastMaintenanceAt: {
      type: Date,
      default: null,
    },

    // Operational notes
    notes: {
      type: String,
      default: "",
    },

    // Room activity timeline
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

    // Availability flag
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate room numbers inside same business
roomSchema.index(
  { businessId: 1, roomNumber: 1 },
  { unique: true }
);

module.exports = mongoose.model("Room", roomSchema);