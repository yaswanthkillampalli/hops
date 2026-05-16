// models/Guest.js

const mongoose = require("mongoose");

const guestSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
    },

    telegramChatId: {
      type: String,
      default: null,
    },

    guestType: {
      type: String,
      enum: [
        "regular",
        "vip",
        "corporate",
      ],
      default: "regular",
    },

    currentBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },

    roomNumber: {
      type: String,
      default: null,
    },

    vehicleNumber: {
      type: String,
      default: null,
    },

    parkingSlot: {
      type: String,
      default: null,
    },

    preferences: {
      foodPreference: {
        type: String,
        default: "",
      },

      specialNeeds: {
        type: String,
        default: "",
      },

      notes: {
        type: String,
        default: "",
      },
    },

    isCheckedIn: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Guest", guestSchema);