const Booking = require("../models/Booking");
const Room = require("../models/Room");
const FoodOrder = require("../models/FoodOrder");
const { allocateParkingSlot } = require("../services/parkingService");
const { createLuggage } = require("../services/luggageService");
const { createTask } = require("../services/taskService");
const Business = require("../models/Business");
const { sendTelegramMessage } = require("../services/telegramService");
const generateId = require("../utils/generateId");

// POST /api/v1/checkin/scan
const scanBooking = async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "bookingId is required",
      });
    }

    const booking = await Booking.findOne({ bookingId })
      .populate("guestId")
      .populate("roomId");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const guest = booking.guestId || null;
    const room = booking.roomId || null;

    return res.status(200).json({
      success: true,
      booking: {
        id: booking._id,
        bookingId: booking.bookingId,
        bookingStatus: booking.bookingStatus,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        totalGuests: booking.totalGuests,
        totalAmount: booking.totalAmount,
      },
      guest: guest
        ? {
            id: guest._id,
            fullName: guest.fullName,
            phone: guest.phone,
            email: guest.email,
            guestType: guest.guestType,
            preferences: guest.preferences,
            roomNumber: guest.roomNumber || null,
          }
        : null,
      room: room
        ? {
            id: room._id,
            roomNumber: room.roomNumber,
            roomType: room.roomType,
            occupancyStatus: room.occupancyStatus,
            housekeepingStatus: room.housekeepingStatus,
            maintenanceStatus: room.maintenanceStatus,
            isActive: room.isActive,
            floor: room.floor,
            block: room.block,
            pricePerNight: room.pricePerNight,
            amenities: room.amenities,
            notes: room.notes,
          }
        : null,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// POST /api/v1/checkin/complete
const completeCheckIn = async (req, res) => {
  try {
    const {
      bookingId,
      parkingRequired = false,
      vehicleNumber,
      vehicleType = "car",
      luggageCount = 0,
      foodPreference = "",
      specialRequests = "",
    } = req.body;

    const businessId = req.business?._id || req.staff?.businessId;
    const performedBy = req.staff?._id || null;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "bookingId is required",
      });
    }

    const booking = await Booking.findOne({ businessId, bookingId })
      .populate("guestId")
      .populate("roomId");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.bookingStatus !== "reserved") {
      return res.status(400).json({
        success: false,
        message: "Booking is not in reserved status",
      });
    }

    if (booking.actualCheckInTime) {
      return res.status(400).json({
        success: false,
        message: "Guest is already checked in",
      });
    }

    const guest = booking.guestId;
    const room = booking.roomId;

    if (!guest || !room) {
      return res.status(404).json({
        success: false,
        message: "Related guest or room not found",
      });
    }

    booking.bookingStatus = "checked_in";
    booking.actualCheckInTime = new Date();
    booking.parkingRequired = Boolean(parkingRequired);
    booking.luggageCount = Number(luggageCount) || 0;
    booking.foodPreference = foodPreference;
    booking.specialRequests = specialRequests;
    booking.checkedInBy = performedBy;

    booking.activityLogs = booking.activityLogs || [];
    booking.activityLogs.push({
      action: "checked_in",
      performedBy,
      message: "Guest checked in successfully",
    });

    await booking.save();

    guest.isCheckedIn = true;
    guest.currentBooking = booking._id;
    guest.roomNumber = room.roomNumber;
    if (parkingRequired && vehicleNumber) {
      guest.vehicleNumber = String(vehicleNumber).trim().toUpperCase();
    }
    await guest.save();

    room.occupancyStatus = "occupied";
    room.currentBookingId = booking._id;
    room.currentGuestId = guest._id;
    room.activityLogs = room.activityLogs || [];
    room.activityLogs.push({
      action: "occupied",
      performedBy,
      message: `Room occupied by booking ${booking.bookingId}`,
    });
    await room.save();

    const tasks = [];
    let parking = null;
    let luggage = null;

    const checkInTask = await createTask({
      businessId,
      bookingId: booking.bookingId,
      guestId: guest._id,
      department: "reception",
      title: `Check-in complete for ${guest.fullName}`,
      description: `Complete arrival orchestration for booking ${booking.bookingId}`,
      priority: booking.isVIP ? "vip" : "medium",
      taskType: "guest_request",
      entityType: null,
      entityId: null,
      roomNumber: room.roomNumber,
      assignedBy: performedBy,
      notes: "Check-in orchestration task",
    });
    tasks.push(checkInTask);

    if (parkingRequired && vehicleNumber) {
      parking = await allocateParkingSlot({
        businessId,
        bookingId: booking.bookingId,
        vehicleNumber,
        vehicleType,
        performedBy,
      });

      tasks.push(parking.parkingTask);
    }

    if (Number(luggageCount) > 0) {
      luggage = await createLuggage({
        businessId,
        bookingId: booking.bookingId,
        luggageCount: Number(luggageCount),
        performedBy,
      });

      if (luggage.task) {
        tasks.push(luggage.task);
      }
    }

    // Create food order if food preference is provided
    let foodOrder = null;
    if (foodPreference && foodPreference.trim()) {
      try {
        const currentHour = new Date().getHours();
        let mealType = "lunch";
        let preferredTime = new Date();

        // Determine meal type and time based on current time
        if (currentHour < 11) {
          mealType = "breakfast";
          preferredTime.setHours(8, 0, 0, 0); // 8 AM
          if (preferredTime <= new Date()) {
            preferredTime.setDate(preferredTime.getDate() + 1);
          }
        } else if (currentHour < 17) {
          mealType = "lunch";
          preferredTime.setHours(12, 30, 0, 0); // 12:30 PM
          if (preferredTime <= new Date()) {
            preferredTime.setDate(preferredTime.getDate() + 1);
          }
        } else {
          mealType = "dinner";
          preferredTime.setHours(19, 0, 0, 0); // 7 PM
          if (preferredTime <= new Date()) {
            preferredTime.setDate(preferredTime.getDate() + 1);
          }
        }

        const foodOrderId = await generateId("foodOrder", "FO");

        foodOrder = await FoodOrder.create({
          businessId,
          foodOrderId,
          bookingId: booking.bookingId,
          guestId: guest._id,
          roomNumber: room.roomNumber,
          mealType,
          preferredTime,
          status: "pending",
          createdBy: performedBy,
          activityLogs: [
            {
              action: "created",
              performedBy,
              message: `Food order created during check-in. Preference: ${foodPreference}`,
            },
          ],
        });

        // Create task for food_service department
        const foodTask = await createTask({
          businessId,
          bookingId: booking.bookingId,
          guestId: guest._id,
          department: "food_service",
          title: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} order for ${guest.fullName}`,
          description: `Guest arriving for ${mealType}. Preference: ${foodPreference}`,
          priority: booking.isVIP ? "vip" : "medium",
          taskType: "food_service",
          entityType: "food_order",
          entityId: foodOrder._id,
          roomNumber: room.roomNumber,
          assignedBy: performedBy,
          notes: `Room: ${room.roomNumber}, Preference: ${foodPreference}, Time: ${preferredTime.toLocaleTimeString()}`,
        });

        tasks.push(foodTask);
      } catch (foodError) {
        console.error("Food order creation error:", foodError.message);
      }
    }

    // Optional Telegram notifications for guest and operational staff
    try {
      const business = await Business.findById(businessId);
      const notificationLines = [
        "Welcome to StayOps.",
        "Your room is ready.",
        `Room: ${room.roomNumber}`,
      ];

      if (parking) {
        notificationLines.push(`Parking assigned: ${parking.parkingSlot}`);
      }

      if (luggage) {
        notificationLines.push(`Luggage tags created: ${luggage.tokens.map((token) => token.tokenId).join(", ")}`);
      }

      if (foodOrder) {
        const mealLabel = foodOrder.mealType.charAt(0).toUpperCase() + foodOrder.mealType.slice(1);
        const mealTime = new Date(foodOrder.preferredTime).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        notificationLines.push(`${mealLabel} scheduled: ${mealTime}`);
      }

      const notificationText = notificationLines.join("\n");

      if (guest.telegramChatId && business?.telegramBotToken) {
        await sendTelegramMessage({
          botToken: business.telegramBotToken,
          chatId: guest.telegramChatId,
          text: notificationText,
        });
      }

      if (business?.telegramBotToken) {
        const staffMessages = [];

        if (parking) {
          staffMessages.push({
            chatId: req.staff?.telegramChatId || null,
            text: `Parking workflow started for booking ${booking.bookingId}. Slot: ${parking.parkingSlot}`,
          });
        }

        if (luggage?.task?.assignedTo) {
          const luggageStaff = await require("../models/Staff").findById(luggage.task.assignedTo);
          if (luggageStaff?.telegramChatId) {
            staffMessages.push({
              chatId: luggageStaff.telegramChatId,
              text: `Luggage workflow started for booking ${booking.bookingId}. Luggage count: ${luggage.luggage.luggageCount}`,
            });
          }
        }

        for (const message of staffMessages) {
          if (message.chatId) {
            await sendTelegramMessage({
              botToken: business.telegramBotToken,
              chatId: message.chatId,
              text: message.text,
            });
          }
        }
      }
    } catch (notificationError) {
      console.error("Notification error:", notificationError.message);
    }

    return res.status(200).json({
      success: true,
      message: "Guest checked in successfully",
      booking: {
        bookingId: booking.bookingId,
        bookingStatus: booking.bookingStatus,
        actualCheckInTime: booking.actualCheckInTime,
        parkingRequired: booking.parkingRequired,
        luggageCount: booking.luggageCount,
        foodPreference: booking.foodPreference,
        specialRequests: booking.specialRequests,
      },
      parking: parking
        ? {
            parkingSlot: parking.parkingSlot,
            status: "allocated",
          }
        : null,
      luggage: luggage
        ? {
            luggageId: luggage.luggage.luggageId,
            luggageCount: luggage.luggage.luggageCount,
            tokens: luggage.tokens,
          }
        : null,
      foodOrder: foodOrder
        ? {
            foodOrderId: foodOrder.foodOrderId,
            mealType: foodOrder.mealType,
            preferredTime: foodOrder.preferredTime,
            status: foodOrder.status,
          }
        : null,
      tasks: tasks.map((task) => ({
        taskId: task.taskId,
        title: task.title,
        status: task.status,
        department: task.department,
      })),
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
  scanBooking,
  completeCheckIn,
};
