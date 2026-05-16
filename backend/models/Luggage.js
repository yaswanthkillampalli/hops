// models/Luggage.js

const mongoose = require("mongoose");

const luggageSchema = new mongoose.Schema(
  {
    // =====================================
    // Multi Tenant Business
    // =====================================

    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    // =====================================
    // Booking Reference
    // =====================================

    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },

    // =====================================
    // Guest Reference
    // =====================================

    guestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guest",
      required: true,
      index: true,
    },

    // =====================================
    // Room Reference
    // =====================================

    roomNumber: {
      type: String,
      required: true,
      trim: true,
    },

    // =====================================
    // Luggage Batch ID
    // =====================================

    luggageId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // =====================================
    // Total Luggage Count
    // =====================================

    luggageCount: {
      type: Number,
      required: true,
      default: 1,
    },

    // =====================================
    // Individual Luggage Tokens
    // =====================================

    luggageTokens: [
      {
        tokenId: {
          type: String,
          required: true,
        },

        tagNumber: {
          type: String,
          default: "",
        },

        status: {
          type: String,
          enum: [
            "registered",
            "picked_up",
            "in_transit",
            "delivered",
            "confirmed",
            "lost",
          ],
          default: "registered",
        },

        qrCodeToken: {
          type: String,
          default: null,
        },

        notes: {
          type: String,
          default: "",
        },
      },
    ],

    // =====================================
    // Overall Delivery Status
    // =====================================

    overallStatus: {
      type: String,
      enum: [
        "registered",
        "assigned",
        "picked_up",
        "in_transit",
        "delivered",
        "completed",
      ],
      default: "registered",
      index: true,
    },

    // =====================================
    // Assigned Staff
    // =====================================

    assignedStaffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },

    // =====================================
    // Related Task
    // =====================================

    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },

    // =====================================
    // Delivery Timeline
    // =====================================

    pickedUpAt: {
      type: Date,
      default: null,
    },

    deliveredAt: {
      type: Date,
      default: null,
    },

    confirmedAt: {
      type: Date,
      default: null,
    },

    // =====================================
    // Operational Notes
    // =====================================

    notes: {
      type: String,
      default: "",
    },

    // =====================================
    // Activity Logs
    // =====================================

    activityLogs: [
      {
        action: {
          type: String,
          required: true,
        },

        message: {
          type: String,
          default: "",
        },

        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Staff",
          default: null,
        },

        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // =====================================
    // Active Flag
    // =====================================

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Luggage",
  luggageSchema
);