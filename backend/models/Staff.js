// models/Staff.js

const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema(
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
      unique: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      trim: true,
    },

    employeeId: {
      type: String,
      required: true,
      unique: true,
    },

    department: {
      type: String,
      enum: [
        "reception",
        "parking",
        "housekeeping",
        "maintenance",
        "food_service",
        "security",
        "management",
      ],
      default:null,
    },

    role: {
      type: String,
      enum: [
        "staff",
        "supervisor",
        "manager",
        "admin",
      ],
      default: "staff",
    },

    currentStatus: {
      type: String,
      enum: [
        "active",
        "busy",
        "offline",
        "on_leave",
      ],
      default: "active",
    },

    assignedTasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
    ],

    shift: {
      start: {
        type: String,
        default: "",
      },

      end: {
        type: String,
        default: "",
      },
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    telegramChatId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Staff", staffSchema);