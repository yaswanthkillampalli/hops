const mongoose = require("mongoose");

const foodOrderSchema = new mongoose.Schema(
  {
    // Multi-tenant business isolation
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    // Public readable food order ID
    foodOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Booking reference
    bookingId: {
      type: String,
      required: true,
      index: true,
    },

    // Guest reference
    guestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guest",
      required: true,
      index: true,
    },

    // Room number for kitchen reference
    roomNumber: {
      type: String,
      required: true,
    },

    // Meal type
    mealType: {
      type: String,
      enum: ["breakfast", "lunch", "dinner"],
      required: true,
    },

    // Preferred time for the meal
    preferredTime: {
      type: Date,
      required: true,
    },

    // Order status
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
      index: true,
    },

    // Kitchen staff assigned to prepare
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },

    // Who created the order
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },

    // Activity logs for tracking changes
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

    // Completion timestamp
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("FoodOrder", foodOrderSchema);
