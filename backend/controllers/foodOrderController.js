const Booking = require("../models/Booking");
const Guest = require("../models/Guest");
const Business = require("../models/Business");
const FoodOrder = require("../models/FoodOrder");
const Staff = require("../models/Staff");
const Task = require("../models/Task");

const generateId = require("../utils/generateId");
const { sendTelegramMessage } = require("../services/telegramService");
const { createTask } = require("../services/taskService");

const createFoodOrder = async (req, res) => {
  try {
    const { bookingId, mealType, preferredTime } = req.body;

    const businessId = req.business?._id || req.staff?.businessId;
    const performedBy = req.staff?._id || null;

    // Validation
    if (!bookingId || !mealType || !preferredTime) {
      return res.status(400).json({
        success: false,
        message: "bookingId, mealType, and preferredTime are required",
      });
    }

    if (!["breakfast", "lunch", "dinner"].includes(mealType)) {
      return res.status(400).json({
        success: false,
        message: "mealType must be breakfast, lunch, or dinner",
      });
    }

    // Find booking
    const booking = await Booking.findOne({ businessId, bookingId }).populate(
      "guestId"
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const guest = booking.guestId;

    if (!guest) {
      return res.status(404).json({
        success: false,
        message: "Guest not found",
      });
    }

    // Create food order
    const foodOrderId = await generateId("foodOrder", "FO");

    const foodOrder = await FoodOrder.create({
      businessId,
      foodOrderId,
      bookingId,
      guestId: guest._id,
      roomNumber: booking.roomNumber || guest.roomNumber,
      mealType,
      preferredTime: new Date(preferredTime),
      status: "pending",
      createdBy: performedBy,
      activityLogs: [
        {
          action: "created",
          performedBy,
          message: `Food order created for ${mealType}`,
        },
      ],
    });

    // Create task for food_service department
    let task = null;
    try {
      task = await createTask({
        businessId,
        bookingId,
        guestId: guest._id,
        department: "food_service",
        title: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} order for ${guest.fullName}`,
        description: `Guest arriving for ${mealType} at ${new Date(preferredTime).toLocaleTimeString()}`,
        priority: booking.isVIP ? "vip" : "medium",
        taskType: "food_service",
        entityType: "food_order",
        entityId: foodOrder._id,
        roomNumber: booking.roomNumber || guest.roomNumber,
        assignedBy: performedBy,
        notes: `Room: ${booking.roomNumber || guest.roomNumber}, Preferred time: ${new Date(preferredTime).toLocaleTimeString()}`,
      });

      // Link task to food order
      foodOrder.assignedTo = task.assignedTo || null;
      await foodOrder.save();
    } catch (taskError) {
      console.error("Task creation error:", taskError.message);
    }

    // Send notifications
    try {
      const business = await Business.findById(businessId);

      const mealLabel = mealType.charAt(0).toUpperCase() + mealType.slice(1);
      const timeString = new Date(preferredTime).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Notify guest
      if (guest.telegramChatId && business?.telegramBotToken) {
        await sendTelegramMessage({
          botToken: business.telegramBotToken,
          chatId: guest.telegramChatId,
          text: `Your ${mealLabel} reservation is confirmed.\n\nTime: ${timeString}\n\nOrder ID: ${foodOrderId}`,
        }).catch(() => null);
      }

      // Notify food service staff
      if (business?.telegramBotToken) {
        const foodStaff = await Staff.find({
          businessId,
          department: "food_service",
          telegramChatId: { $ne: null },
          currentStatus: "active",
        });

        for (const staff of foodStaff) {
          if (staff.telegramChatId) {
            await sendTelegramMessage({
              botToken: business.telegramBotToken,
              chatId: staff.telegramChatId,
              text: `New ${mealLabel} order:\nRoom: ${booking.roomNumber || guest.roomNumber}\nGuest: ${guest.fullName}\nTime: ${timeString}\nOrder ID: ${foodOrderId}`,
            }).catch(() => null);
          }
        }
      }
    } catch (notificationError) {
      console.error("Notification error:", notificationError.message);
    }

    return res.status(201).json({
      success: true,
      message: "Food order created successfully",
      foodOrder: {
        foodOrderId: foodOrder.foodOrderId,
        bookingId: foodOrder.bookingId,
        mealType: foodOrder.mealType,
        preferredTime: foodOrder.preferredTime,
        status: foodOrder.status,
        roomNumber: foodOrder.roomNumber,
      },
      task: task
        ? {
            taskId: task.taskId,
            status: task.status,
            assignedTo: task.assignedTo,
          }
        : null,
    });
  } catch (error) {
    console.error(error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

const updateFoodOrderTiming = async (req, res) => {
  try {
    const { foodOrderId, newPreferredTime } = req.body;

    const businessId = req.business?._id || req.staff?.businessId;
    const performedBy = req.staff?._id || null;

    // Validation
    if (!foodOrderId || !newPreferredTime) {
      return res.status(400).json({
        success: false,
        message: "foodOrderId and newPreferredTime are required",
      });
    }

    // Find food order
    const foodOrder = await FoodOrder.findOne({
      businessId,
      foodOrderId,
    }).populate("guestId");

    if (!foodOrder) {
      return res.status(404).json({
        success: false,
        message: "Food order not found",
      });
    }

    if (foodOrder.status === "completed" || foodOrder.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: `Cannot update timing for ${foodOrder.status} order`,
      });
    }

    const oldTime = foodOrder.preferredTime.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Update timing
    foodOrder.preferredTime = new Date(newPreferredTime);
    foodOrder.activityLogs.push({
      action: "timing_updated",
      performedBy,
      message: `Timing changed from ${oldTime} to ${new Date(newPreferredTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
    });

    await foodOrder.save();

    // Update related task if exists
    try {
      const task = await Task.findOne({
        businessId,
        entityType: "food_order",
        entityId: foodOrder._id,
      });

      if (task) {
        task.activityLogs.push({
          action: "timing_updated",
          performedBy,
          message: `Meal time updated to ${new Date(newPreferredTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        });
        await task.save();
      }
    } catch (taskError) {
      console.error("Task update error:", taskError.message);
    }

    // Send notifications
    try {
      const business = await Business.findById(businessId);
      const guest = foodOrder.guestId;

      const newTimeString = new Date(newPreferredTime).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const mealLabel =
        foodOrder.mealType.charAt(0).toUpperCase() + foodOrder.mealType.slice(1);

      // Notify guest
      if (guest.telegramChatId && business?.telegramBotToken) {
        await sendTelegramMessage({
          botToken: business.telegramBotToken,
          chatId: guest.telegramChatId,
          text: `Your ${mealLabel} time has been updated.\n\nNew time: ${newTimeString}\n\nOrder ID: ${foodOrderId}`,
        }).catch(() => null);
      }

      // Notify food service staff
      if (business?.telegramBotToken && foodOrder.assignedTo) {
        const assignedStaff = await Staff.findById(foodOrder.assignedTo);

        if (assignedStaff?.telegramChatId) {
          await sendTelegramMessage({
            botToken: business.telegramBotToken,
            chatId: assignedStaff.telegramChatId,
            text: `${mealLabel} order updated:\nRoom: ${foodOrder.roomNumber}\nGuest: ${guest.fullName}\nNew time: ${newTimeString}\nOrder ID: ${foodOrderId}`,
          }).catch(() => null);
        }
      }
    } catch (notificationError) {
      console.error("Notification error:", notificationError.message);
    }

    return res.status(200).json({
      success: true,
      message: "Food order timing updated successfully",
      foodOrder: {
        foodOrderId: foodOrder.foodOrderId,
        bookingId: foodOrder.bookingId,
        mealType: foodOrder.mealType,
        preferredTime: foodOrder.preferredTime,
        status: foodOrder.status,
        roomNumber: foodOrder.roomNumber,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

module.exports = {
  createFoodOrder,
  updateFoodOrderTiming,
};
