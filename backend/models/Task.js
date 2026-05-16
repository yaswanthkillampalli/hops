// models/Task.js

const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    // Multi-tenant business isolation
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    // Public readable task ID
    taskId: {
      type: String,
      unique: true,
      required: true,
    },

    // Task basic info
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    // Core operational type
    taskType: {
      type: String,
      enum: [
        "parking",
        "luggage",
        "housekeeping",
        "maintenance",
        "food_service",
        "complaint",
        "guest_request",
        "security",
      ],
      required: true,
      index: true,
    },

    // Task priority
    priority: {
      type: String,
      enum: [
        "low",
        "medium",
        "high",
        "urgent",
        "vip",
      ],
      default: "medium",
    },

    // Operational status
    status: {
      type: String,
      enum: [
        "pending",
        "assigned",
        "accepted",
        "in_progress",
        "completed",
        "cancelled",
        "delayed",
        "escalated",
      ],
      default: "pending",
      index: true,
    },

    // Department handling the task
    department: {
      type: String,
      enum: [
        "reception",
        "parking",
        "housekeeping",
        "maintenance",
        "food_service",
        "security",
      ],
      required: true,
    },

    // Guest linked to task
    guestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guest",
      required: true,
      index: true,
    },

    // Optional room reference
    roomNumber: {
      type: String,
      default: null,
    },

    // Assigned staff
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
      index: true,
    },

    // Supervisor/manager assigning task
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },

    // Task supervision
    supervisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },

    // Related operational entity
    entityType: {
      type: String,
      enum: [
        "parking",
        "vehicle",
        "luggage",
        "complaint",
        "food_order",
        "maintenance_request",
      ],
      default: null,
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    // Timestamps for analytics/workflows
    assignedAt: {
      type: Date,
      default: null,
    },

    acceptedAt: {
      type: Date,
      default: null,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    escalatedAt: {
      type: Date,
      default: null,
    },

    // Delay tracking
    expectedCompletionTime: {
      type: Date,
      default: null,
    },

    // Internal notes
    notes: {
      type: String,
      default: "",
    },

    // Activity timeline
    activityLogs: [
      {
        action: {
          type: String,
          required: true,
        },

        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Staff",
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

    // AI assistance later
    aiSuggestions: [
      {
        suggestion: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Operational flags
    isEscalated: {
      type: Boolean,
      default: false,
    },

    isCompleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Task", taskSchema);