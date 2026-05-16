const Booking = require("../models/Booking");
const Guest = require("../models/Guest");
const Business = require("../models/Business");
const Parking = require("../models/Parking");
const FoodOrder = require("../models/FoodOrder");
const Room = require("../models/Room");
const Task = require("../models/Task");
const Staff = require("../models/Staff");
const generateId = require("../utils/generateId");
const { getParkingDetails } = require("../services/parkingService");
const { createLuggage, getLuggageDetails } = require("../services/luggageService");
const { getRoomSnapshot, checkoutBooking } = require("./roomController");
const { createComplaint } = require("./complaintController");
const { createMaintenanceRequest } = require("./maintenanceController");

const extractBookingId = require(
  "../utils/extractBookingId"
);

const {
  sendTelegramMessage,
  answerTelegramCallback,
} = require(
  "../services/telegramService"
);

const { createTask } = require("../services/taskService");

const buildMenuText = (guest, booking) => {
  const lines = [
    `Welcome ${guest.fullName}!`,
    `Booking ID: ${booking.bookingId}`,
    guest.roomNumber ? `Room Number: ${guest.roomNumber}` : null,
    "",
    "Menu:",
    "/food - view dining timing",
    "/food reschedule HH:MM - change dining timing",
    "/luggage - view luggage and request count",
    "/parking_status - view parking status",
    "/room - view room status",
    "/checkout - close the stay and create follow-up work",
    "/complaint - report a complaint",
    "/maintenance - report a maintenance issue",
    "/set_booking_id <booking_id> - link this chat to a booking",
  ];

  return lines.filter((line) => line !== null).join("\n");
};

const resolveTelegramBotToken = async (businessId = null) => {
  if (businessId) {
    const business = await Business.findById(businessId).select("telegramBotToken");

    if (business?.telegramBotToken) {
      return business.telegramBotToken;
    }
  }

  const fallbackBusiness = await Business.findOne({ telegramBotToken: { $ne: null } }).select("telegramBotToken");

  return fallbackBusiness?.telegramBotToken || null;
};

const luggageRequestState = new Map();
const complaintRequestState = new Map();
const maintenanceRequestState = new Map();

const foodMealOptions = {
  breakfast: { displayLabel: "Tiffin", defaultHour: 8, defaultMinute: 0 },
  lunch: { displayLabel: "Lunch", defaultHour: 12, defaultMinute: 30 },
  dinner: { displayLabel: "Dinner", defaultHour: 19, defaultMinute: 0 },
};

const normalizeMealType = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "tiffin" || normalized === "breakfast") {
    return "breakfast";
  }

  if (normalized === "lunch" || normalized === "lucnh") {
    return "lunch";
  }

  if (normalized === "dinner") {
    return "dinner";
  }

  return null;
};

const buildFoodMenuMarkup = () => ({
  inline_keyboard: [
    [{ text: "View Schedule", callback_data: "food:view" }],
    [{ text: "Schedule Food", callback_data: "food:schedule_menu" }],
    [{ text: "Reschedule", callback_data: "food:reschedule_menu" }],
  ],
});

const buildFoodMealMarkup = () => ({
  inline_keyboard: [
    [
      { text: "Tiffin", callback_data: "food:schedule:breakfast" },
      { text: "Lunch", callback_data: "food:schedule:lunch" },
    ],
    [{ text: "Dinner", callback_data: "food:schedule:dinner" }],
    [{ text: "Back", callback_data: "food:menu" }],
  ],
});

const buildLuggageMenuMarkup = () => ({
  inline_keyboard: [
    [{ text: "View Luggage", callback_data: "luggage:view" }],
    [{ text: "Request Luggage", callback_data: "luggage:request" }],
    [{ text: "Back", callback_data: "luggage:menu" }],
  ],
});

const buildRoomMenuMarkup = () => ({
  inline_keyboard: [
    [{ text: "View Room", callback_data: "room:status" }],
    [{ text: "Checkout", callback_data: "room:checkout" }],
    [{ text: "Complaint", callback_data: "complaint:menu" }],
    [{ text: "Maintenance", callback_data: "maintenance:menu" }],
  ],
});

const buildCheckoutMenuMarkup = () => ({
  inline_keyboard: [
    [{ text: "Standard Checkout", callback_data: "room:checkout:standard" }],
    [{ text: "Checkout + Maintenance", callback_data: "room:checkout:maintenance" }],
    [{ text: "Checkout + Complaint", callback_data: "room:checkout:complaint" }],
    [{ text: "Back", callback_data: "room:menu" }],
  ],
});

const buildComplaintMenuMarkup = () => ({
  inline_keyboard: [
    [
      { text: "Service", callback_data: "complaint:create:service" },
      { text: "Housekeeping", callback_data: "complaint:create:housekeeping" },
    ],
    [
      { text: "Food", callback_data: "complaint:create:food" },
      { text: "Parking", callback_data: "complaint:create:parking" },
    ],
    [
      { text: "Billing", callback_data: "complaint:create:billing" },
      { text: "Other", callback_data: "complaint:create:other" },
    ],
    [{ text: "Back", callback_data: "room:menu" }],
  ],
});

const buildMaintenanceMenuMarkup = () => ({
  inline_keyboard: [
    [
      { text: "General", callback_data: "maintenance:create:general" },
      { text: "Plumbing", callback_data: "maintenance:create:plumbing" },
    ],
    [
      { text: "Electrical", callback_data: "maintenance:create:electrical" },
      { text: "HVAC", callback_data: "maintenance:create:hvac" },
    ],
    [
      { text: "Furniture", callback_data: "maintenance:create:furniture" },
      { text: "Damage", callback_data: "maintenance:create:damage" },
    ],
    [{ text: "Back", callback_data: "room:menu" }],
  ],
});

const buildDefaultFoodTime = (mealType) => {
  const config = foodMealOptions[mealType];

  if (!config) {
    return new Date();
  }

  const scheduled = new Date();
  scheduled.setHours(config.defaultHour, config.defaultMinute, 0, 0);

  if (scheduled <= new Date()) {
    scheduled.setDate(scheduled.getDate() + 1);
  }

  return scheduled;
};

const getFoodDisplayLabel = (mealType) => foodMealOptions[mealType]?.displayLabel || mealType;

const getComplaintTitle = (category) => {
  const normalized = String(category || "service").trim().toLowerCase();

  const labels = {
    service: "Service complaint",
    housekeeping: "Housekeeping complaint",
    maintenance: "Maintenance complaint",
    food: "Food complaint",
    parking: "Parking complaint",
    billing: "Billing complaint",
    other: "Guest complaint",
  };

  return labels[normalized] || labels.other;
};

const getMaintenanceTitle = (issueType) => {
  const normalized = String(issueType || "general").trim().toLowerCase();

  const labels = {
    general: "Maintenance request",
    plumbing: "Plumbing request",
    electrical: "Electrical request",
    hvac: "HVAC request",
    furniture: "Furniture request",
    damage: "Damage report",
    cleaning: "Cleaning request",
    other: "Maintenance request",
  };

  return labels[normalized] || labels.other;
};

const sendFoodMenu = async ({ botToken, chatId, guest, booking, foodOrder, textPrefix = "" }) => {
  const currentLine = foodOrder
    ? `Current schedule: ${getFoodDisplayLabel(foodOrder.mealType)} at ${new Date(foodOrder.preferredTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : "No dining reservation found yet.";

  const lines = [
    textPrefix || `Food options for ${guest.fullName}:`,
    currentLine,
    "Tap Schedule Food to choose Tiffin, Lunch, or Dinner.",
    booking?.bookingId ? `Booking ID: ${booking.bookingId}` : null,
  ].filter(Boolean);

  await sendTelegramMessage({
    botToken,
    chatId,
    text: lines.join("\n"),
    reply_markup: buildFoodMenuMarkup(),
  });
};

const sendLuggageMenu = async ({ botToken, chatId, guest, booking, luggage, textPrefix = "" }) => {
  const currentLine = luggage
    ? `Current luggage: ${luggage.luggageCount} item${luggage.luggageCount === 1 ? "" : "s"} (${luggage.overallStatus})`
    : "No luggage request found yet.";

  const lines = [
    textPrefix || `Luggage options for ${guest.fullName}:`,
    currentLine,
    "Tap Request Luggage and send the luggage count to create a request.",
    booking?.bookingId ? `Booking ID: ${booking.bookingId}` : null,
  ].filter(Boolean);

  await sendTelegramMessage({
    botToken,
    chatId,
    text: lines.join("\n"),
    reply_markup: buildLuggageMenuMarkup(),
  });
};

const sendRoomMenu = async ({ botToken, chatId, guest, booking, snapshot = null, textPrefix = "" }) => {
  const roomLine = snapshot?.room
    ? `Room: ${snapshot.room.roomNumber} | Occupancy: ${snapshot.room.occupancyStatus} | Housekeeping: ${snapshot.room.housekeepingStatus} | Maintenance: ${snapshot.room.maintenanceStatus}`
    : guest.roomNumber
      ? `Room: ${guest.roomNumber}`
      : "Room not linked.";

  const lines = [
    textPrefix || `Room options for ${guest.fullName}:`,
    roomLine,
    snapshot?.parking ? `Parking: ${snapshot.parking.status} (${snapshot.parking.parkingId})` : null,
    snapshot?.foodOrders?.length ? `Active food orders: ${snapshot.foodOrders.length}` : null,
    snapshot?.luggage ? `Luggage: ${snapshot.luggage.overallStatus}` : null,
  ].filter(Boolean);

  await sendTelegramMessage({
    botToken,
    chatId,
    text: lines.join("\n"),
    reply_markup: buildRoomMenuMarkup(),
  });
};

const scheduleFoodOrderFromTelegram = async ({ businessId, guest, booking, mealType, chatId, botToken }) => {
  const mealConfig = foodMealOptions[mealType];

  if (!mealConfig) {
    throw new Error("Invalid meal type");
  }

  const preferredTime = buildDefaultFoodTime(mealType);
  const roomNumber = booking.roomNumber || guest.roomNumber || null;

  let foodOrder = await FoodOrder.findOne({ bookingId: booking.bookingId, status: { $in: ["pending", "confirmed"] } });

  if (foodOrder) {
    foodOrder.mealType = mealType;
    foodOrder.preferredTime = preferredTime;
    foodOrder.roomNumber = roomNumber;
    foodOrder.status = "confirmed";
    foodOrder.activityLogs = foodOrder.activityLogs || [];
    foodOrder.activityLogs.push({
      action: "timing_updated",
      performedBy: null,
      message: `Telegram scheduled ${mealConfig.displayLabel} for ${preferredTime.toISOString()}`,
    });
    await foodOrder.save();
  } else {
    const foodOrderId = await generateId("foodOrder", "FO");

    foodOrder = await FoodOrder.create({
      businessId,
      foodOrderId,
      bookingId: booking.bookingId,
      guestId: guest._id,
      roomNumber,
      mealType,
      preferredTime,
      status: "confirmed",
      createdBy: null,
      activityLogs: [
        {
          action: "created",
          performedBy: null,
          message: `Telegram scheduled ${mealConfig.displayLabel}`,
        },
      ],
    });

    try {
      const task = await createTask({
        businessId,
        bookingId: booking.bookingId,
        guestId: guest._id,
        department: "food_service",
        title: `${mealConfig.displayLabel} order for ${guest.fullName}`,
        description: `Guest scheduled ${mealConfig.displayLabel} via Telegram`,
        priority: booking.isVIP ? "vip" : "medium",
        taskType: "food_service",
        entityType: "food_order",
        entityId: foodOrder._id,
        roomNumber,
        notes: `Room: ${roomNumber || "N/A"}, Meal: ${mealConfig.displayLabel}, Time: ${preferredTime.toLocaleTimeString()}`,
      });

      foodOrder.assignedTo = task.assignedTo || null;
      await foodOrder.save();
    } catch (taskError) {
      console.error("Telegram food task creation error:", taskError.message);
    }
  }

  const business = await Business.findById(businessId);
  const timeString = preferredTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const mealLabel = getFoodDisplayLabel(mealType);

  if (business?.telegramBotToken && guest.telegramChatId) {
    await sendTelegramMessage({
      botToken: business.telegramBotToken,
      chatId,
      text: `Your ${mealLabel} is scheduled for ${timeString}.\n\nOrder ID: ${foodOrder.foodOrderId}`,
    }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));
  }

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
          text: `${mealLabel} scheduled:\nRoom: ${roomNumber || "N/A"}\nGuest: ${guest.fullName}\nTime: ${timeString}\nOrder ID: ${foodOrder.foodOrderId}`,
        }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));
      }
    }
  }

  return { foodOrder, timeString, mealLabel };
};

const linkGuestToChat = async ({ chatId, bookingId }) => {
  const booking = await Booking.findOne({ bookingId }).populate("guestId");

  if (!booking) {
    return { booking: null, guest: null };
  }

  const guest = booking.guestId;

  if (!guest) {
    return { booking: null, guest: null };
  }

  guest.telegramChatId = String(chatId);
  await guest.save();

  booking.telegramConnected = true;
  await booking.save();

  return { booking, guest };
};

const getVehicleInfo = async (req, res) => {
  try {
    const chatId =
      req.body?.message?.chat?.id ||
      req.body?.chatId ||
      req.body?.chat_id ||
      req.body?.fromChatId;

    if (!chatId) {
      return res.status(400).json({
        success: false,
        message: "chatId is required",
      });
    }

    const guest = await Guest.findOne({
      telegramChatId: String(chatId),
      isActive: true,
    }).populate("currentBooking");

    if (!guest) {
      const botToken = await resolveTelegramBotToken();
      if (botToken) {
        await sendTelegramMessage({
          botToken,
          chatId,
          text: "No guest profile found for this Telegram account.",
        }).catch(() => null);
      }

      return res.status(200).json({
        success: false,
        message: "Guest not found",
      });
    }

    const booking = guest.currentBooking;

    if (!booking) {
      const botToken = await resolveTelegramBotToken(guest.businessId);
      if (botToken) {
        await sendTelegramMessage({
          botToken,
          chatId,
          text: `Hello ${guest.fullName}, your booking is not linked yet.`,
        }).catch(() => null);
      }

      return res.status(200).json({
        success: false,
        message: "Booking not linked",
      });
    }

    const parking = await Parking.findOne({
      businessId: guest.businessId,
      bookingId: booking._id,
    }).populate("guestId");

    const roomNumber = booking.roomNumber || guest.roomNumber || null;

    const parkingSlot = parking?.parkingId || guest.parkingSlot || null;
    const vehicleNumber = parking?.vehicleNumber || guest.vehicleNumber || null;
    const status = parking?.status || (booking.bookingStatus === "checked_in" ? "occupied" : "available");

    const replyLines = [
      `Vehicle Info for ${guest.fullName}`,
      roomNumber ? `Room: ${roomNumber}` : null,
      vehicleNumber ? `Vehicle: ${vehicleNumber}` : "Vehicle: not linked",
      parkingSlot ? `Parking Slot: ${parkingSlot}` : "Parking Slot: not assigned",
      `Status: ${status}`,
    ].filter(Boolean);

    const replyText = replyLines.join("\n");

    const business = await Business.findById(guest.businessId);

    if (business?.telegramBotToken) {
      await sendTelegramMessage({
        botToken: business.telegramBotToken,
        chatId,
        text: replyText,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vehicle info sent",
      guest: {
        fullName: guest.fullName,
        roomNumber,
      },
      booking: {
        bookingId: booking.bookingId,
        bookingStatus: booking.bookingStatus,
      },
      parking: parking
        ? {
            parkingId: parking.parkingId,
            status: parking.status,
            vehicleNumber: parking.vehicleNumber,
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

const sendManualTelegramMessage = async (req, res) => {
  try {
    const businessId = req.business?._id || req.staff?.businessId || null;
    const senderId = req.staff?._id || req.business?._id || null;

    const {
      chatId,
      text,
      parse_mode,
      disable_web_page_preview,
    } = req.body;

    if (!chatId || !text) {
      return res.status(400).json({
        success: false,
        message: "chatId and text are required",
      });
    }

    const botToken = await resolveTelegramBotToken(businessId);

    if (!botToken) {
      return res.status(400).json({
        success: false,
        message: "Telegram bot token is not configured",
      });
    }

    const sentMessage = await sendTelegramMessage({
      botToken,
      chatId: String(chatId),
      text,
      parse_mode,
      disable_web_page_preview,
    });

    return res.status(200).json({
      success: true,
      message: "Telegram message sent",
      sentMessage,
      chatId: String(chatId),
      sentBy: senderId,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

const telegramWebhook = async (
  req,
  res
) => {
  try {
    // =====================================
    // Telegram Payload
    // =====================================

    const callbackQuery = req.body.callback_query;

    if (callbackQuery) {
      const chatId = callbackQuery.message?.chat?.id;
      const callbackData = callbackQuery.data || "";

      if (!chatId) {
        return res.sendStatus(200);
      }

      console.log("Received Telegram callback from chatId:", chatId, "data:", callbackData);

      const guest = await Guest.findOne({
        telegramChatId: String(chatId),
        isActive: true,
      }).populate("currentBooking");

      const botToken = await resolveTelegramBotToken(guest?.businessId || guest?.currentBooking?.businessId || null);

      if (!guest || !guest.currentBooking || !botToken) {
        if (callbackQuery.id) {
          await answerTelegramCallback({
            botToken,
            callbackQueryId: callbackQuery.id,
            text: guest ? "Please link a booking first." : "No linked booking found.",
          }).catch((err) => console.error("Telegram callback error:", err?.response?.data || err.message));
        }

        return res.sendStatus(200);
      }

      const booking = guest.currentBooking;
      const businessId = guest.businessId || booking.businessId;

      if (callbackData === "food:view" || callbackData === "food:menu") {
        const foodOrder = await FoodOrder.findOne({ bookingId: booking.bookingId, status: { $in: ["pending", "confirmed"] } });

        await sendFoodMenu({
          botToken,
          chatId,
          guest,
          booking,
          foodOrder,
        }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));

        if (callbackQuery.id) {
          await answerTelegramCallback({
            botToken,
            callbackQueryId: callbackQuery.id,
            text: "Food menu opened",
          }).catch((err) => console.error("Telegram callback error:", err?.response?.data || err.message));
        }

        return res.sendStatus(200);
      }

      if (callbackData === "food:schedule_menu") {
        await sendTelegramMessage({
          botToken,
          chatId,
          text: "Choose the food type you want to schedule:",
          reply_markup: buildFoodMealMarkup(),
        }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));

        if (callbackQuery.id) {
          await answerTelegramCallback({
            botToken,
            callbackQueryId: callbackQuery.id,
            text: "Choose a meal type",
          }).catch((err) => console.error("Telegram callback error:", err?.response?.data || err.message));
        }

        return res.sendStatus(200);
      }

      if (callbackData.startsWith("food:schedule:")) {
        const mealType = normalizeMealType(callbackData.split(":")[2]);

        if (!mealType) {
          if (callbackQuery.id) {
            await answerTelegramCallback({
              botToken,
              callbackQueryId: callbackQuery.id,
              text: "Invalid food type",
              show_alert: true,
            }).catch((err) => console.error("Telegram callback error:", err?.response?.data || err.message));
          }

          return res.sendStatus(200);
        }

        try {
          const result = await scheduleFoodOrderFromTelegram({
            businessId,
            guest,
            booking,
            mealType,
            chatId,
            botToken,
          });

          if (callbackQuery.id) {
            await answerTelegramCallback({
              botToken,
              callbackQueryId: callbackQuery.id,
              text: `${result.mealLabel} scheduled for ${result.timeString}`,
            }).catch((err) => console.error("Telegram callback error:", err?.response?.data || err.message));
          }
        } catch (scheduleError) {
          console.error("Telegram food schedule error:", scheduleError.message);
          if (callbackQuery.id) {
            await answerTelegramCallback({
              botToken,
              callbackQueryId: callbackQuery.id,
              text: "Unable to schedule food right now.",
              show_alert: true,
            }).catch((err) => console.error("Telegram callback error:", err?.response?.data || err.message));
          }
        }

        return res.sendStatus(200);
      }

      if (callbackData === "food:reschedule_menu") {
        await sendTelegramMessage({
          botToken,
          chatId,
          text: "Use /food reschedule HH:MM to change the timing after choosing the food type.",
        }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));

        if (callbackQuery.id) {
          await answerTelegramCallback({
            botToken,
            callbackQueryId: callbackQuery.id,
            text: "Use /food reschedule HH:MM",
          }).catch((err) => console.error("Telegram callback error:", err?.response?.data || err.message));
        }

        return res.sendStatus(200);
      }

      if (callbackData === "luggage:view" || callbackData === "luggage:menu") {
        try {
          const luggage = await getLuggageDetails({
            businessId,
            bookingId: booking.bookingId,
          });

          await sendLuggageMenu({
            botToken,
            chatId,
            guest,
            booking,
            luggage,
          }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));
        } catch (error) {
          await sendLuggageMenu({
            botToken,
            chatId,
            guest,
            booking,
            luggage: null,
            textPrefix: "No luggage request found yet.",
          }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));
        }

        if (callbackQuery.id) {
          await answerTelegramCallback({
            botToken,
            callbackQueryId: callbackQuery.id,
            text: "Luggage menu opened",
          }).catch((err) => console.error("Telegram callback error:", err?.response?.data || err.message));
        }

        return res.sendStatus(200);
      }

      if (callbackData === "luggage:request") {
        luggageRequestState.set(String(chatId), {
          businessId,
          bookingId: booking.bookingId,
          waitingForCount: true,
          requestedAt: Date.now(),
        });

        await sendTelegramMessage({
          botToken,
          chatId,
          text: "Send the luggage count as a number to create the request.",
          reply_markup: buildLuggageMenuMarkup(),
        }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));

        if (callbackQuery.id) {
          await answerTelegramCallback({
            botToken,
            callbackQueryId: callbackQuery.id,
            text: "Send the luggage count now",
          }).catch((err) => console.error("Telegram callback error:", err?.response?.data || err.message));
        }

        return res.sendStatus(200);
      }

      if (callbackData === "room:menu") {
        await sendRoomMenu({ botToken, chatId, guest, booking }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));

        if (callbackQuery.id) {
          await answerTelegramCallback({
            botToken,
            callbackQueryId: callbackQuery.id,
            text: "Room menu opened",
          }).catch((err) => console.error("Telegram callback error:", err?.response?.data || err.message));
        }

        return res.sendStatus(200);
      }

      if (callbackData === "room:status") {
        try {
          const snapshot = await getRoomSnapshot({ businessId, bookingId: booking.bookingId });
          await sendRoomMenu({ botToken, chatId, guest, booking, snapshot }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));

          if (callbackQuery.id) {
            await answerTelegramCallback({
              botToken,
              callbackQueryId: callbackQuery.id,
              text: "Room status opened",
            }).catch((err) => console.error("Telegram callback error:", err?.response?.data || err.message));
          }
        } catch (error) {
          await sendTelegramMessage({
            botToken,
            chatId,
            text: "Room information is not available right now.",
            reply_markup: buildRoomMenuMarkup(),
          }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));
        }

        return res.sendStatus(200);
      }

      if (callbackData === "room:checkout") {
        await sendTelegramMessage({
          botToken,
          chatId,
          text: "Choose how the checkout should close the room workflow:",
          reply_markup: buildCheckoutMenuMarkup(),
        }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));

        if (callbackQuery.id) {
          await answerTelegramCallback({
            botToken,
            callbackQueryId: callbackQuery.id,
            text: "Checkout options opened",
          }).catch((err) => console.error("Telegram callback error:", err?.response?.data || err.message));
        }

        return res.sendStatus(200);
      }

      if (callbackData.startsWith("room:checkout:")) {
        const mode = callbackData.split(":")[2] || "standard";

        try {
          const result = await checkoutBooking({
            businessId,
            bookingId: booking.bookingId,
            performedBy: null,
            checkoutMode: mode,
            maintenanceDetails: mode === "maintenance" ? `Maintenance requested from Telegram for room ${booking.roomNumber || guest.roomNumber || "N/A"}` : "",
            complaintDetails: mode === "complaint" ? `Complaint reported from Telegram for room ${booking.roomNumber || guest.roomNumber || "N/A"}` : "",
          });

          const responseLines = [
            `Checkout completed for ${guest.fullName}`,
            result.roomNumber ? `Room: ${result.roomNumber}` : null,
            result.maintenanceRequest ? `Maintenance request: ${result.maintenanceRequest.maintenanceRequestId}` : null,
            result.complaint ? `Complaint: ${result.complaint.complaintId}` : null,
            result.housekeepingTask ? `Housekeeping task: ${result.housekeepingTask.taskId}` : null,
          ].filter(Boolean);

          await sendTelegramMessage({
            botToken,
            chatId,
            text: responseLines.join("\n"),
            reply_markup: buildRoomMenuMarkup(),
          }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));

          if (callbackQuery.id) {
            await answerTelegramCallback({
              botToken,
              callbackQueryId: callbackQuery.id,
              text: "Checkout completed",
            }).catch((err) => console.error("Telegram callback error:", err?.response?.data || err.message));
          }
        } catch (error) {
          console.error("Telegram checkout error:", error.message);
          if (callbackQuery.id) {
            await answerTelegramCallback({
              botToken,
              callbackQueryId: callbackQuery.id,
              text: error.message || "Unable to complete checkout",
              show_alert: true,
            }).catch((err) => console.error("Telegram callback error:", err?.response?.data || err.message));
          }
        }

        return res.sendStatus(200);
      }

      if (callbackData === "complaint:menu") {
        complaintRequestState.set(String(chatId), {
          businessId,
          bookingId: booking.bookingId,
          guestId: guest._id,
          roomNumber: booking.roomNumber || guest.roomNumber || null,
          waitingForDescription: true,
          category: "service",
          requestedAt: Date.now(),
        });

        await sendTelegramMessage({
          botToken,
          chatId,
          text: "Choose a complaint category, then send the issue description in chat.",
          reply_markup: buildComplaintMenuMarkup(),
        }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));

        if (callbackQuery.id) {
          await answerTelegramCallback({
            botToken,
            callbackQueryId: callbackQuery.id,
            text: "Complaint menu opened",
          }).catch((err) => console.error("Telegram callback error:", err?.response?.data || err.message));
        }

        return res.sendStatus(200);
      }

      if (callbackData.startsWith("complaint:create:")) {
        const category = callbackData.split(":")[2] || "service";

        complaintRequestState.set(String(chatId), {
          businessId,
          bookingId: booking.bookingId,
          guestId: guest._id,
          roomNumber: booking.roomNumber || guest.roomNumber || null,
          waitingForDescription: true,
          category,
          requestedAt: Date.now(),
        });

        await sendTelegramMessage({
          botToken,
          chatId,
          text: `${getComplaintTitle(category)} selected. Send the complaint description now.`,
          reply_markup: buildComplaintMenuMarkup(),
        }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));

        if (callbackQuery.id) {
          await answerTelegramCallback({
            botToken,
            callbackQueryId: callbackQuery.id,
            text: "Complaint category selected",
          }).catch((err) => console.error("Telegram callback error:", err?.response?.data || err.message));
        }

        return res.sendStatus(200);
      }

      if (callbackData === "maintenance:menu") {
        maintenanceRequestState.set(String(chatId), {
          businessId,
          bookingId: booking.bookingId,
          guestId: guest._id,
          roomNumber: booking.roomNumber || guest.roomNumber || null,
          waitingForDescription: true,
          issueType: "general",
          requestedAt: Date.now(),
        });

        await sendTelegramMessage({
          botToken,
          chatId,
          text: "Choose a maintenance type, then send the issue description in chat.",
          reply_markup: buildMaintenanceMenuMarkup(),
        }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));

        if (callbackQuery.id) {
          await answerTelegramCallback({
            botToken,
            callbackQueryId: callbackQuery.id,
            text: "Maintenance menu opened",
          }).catch((err) => console.error("Telegram callback error:", err?.response?.data || err.message));
        }

        return res.sendStatus(200);
      }

      if (callbackData.startsWith("maintenance:create:")) {
        const issueType = callbackData.split(":")[2] || "general";

        maintenanceRequestState.set(String(chatId), {
          businessId,
          bookingId: booking.bookingId,
          guestId: guest._id,
          roomNumber: booking.roomNumber || guest.roomNumber || null,
          waitingForDescription: true,
          issueType,
          requestedAt: Date.now(),
        });

        await sendTelegramMessage({
          botToken,
          chatId,
          text: `${getMaintenanceTitle(issueType)} selected. Send the maintenance description now.`,
          reply_markup: buildMaintenanceMenuMarkup(),
        }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));

        if (callbackQuery.id) {
          await answerTelegramCallback({
            botToken,
            callbackQueryId: callbackQuery.id,
            text: "Maintenance type selected",
          }).catch((err) => console.error("Telegram callback error:", err?.response?.data || err.message));
        }

        return res.sendStatus(200);
      }

      return res.sendStatus(200);
    }

    const message = req.body.message;

    if (!message) {
      return res.sendStatus(200);
    }

    
    // =====================================
    // Extract Chat Info
    // =====================================

    const chatId = message.chat.id;
    console.log("Received Telegram message from chatId:", chatId);
    const text = message.text || "";
    console.log("Received Telegram text:", text);

    const luggageState = luggageRequestState.get(String(chatId));
    const luggageCountMatch = text.trim().match(/^\d+$/);

    const complaintState = complaintRequestState.get(String(chatId));
    if (complaintState?.waitingForDescription && text.trim() && !text.startsWith("/")) {
      try {
        const guest = await Guest.findOne({ telegramChatId: String(chatId), isActive: true }).populate("currentBooking");
        const booking = guest?.currentBooking || null;
        const botToken = await resolveTelegramBotToken(guest?.businessId || booking?.businessId || complaintState.businessId || null);

        if (guest && booking && botToken) {
          const complaint = await createComplaint({
            businessId: booking.businessId || complaintState.businessId,
            bookingId: booking.bookingId || complaintState.bookingId,
            guestId: guest._id,
            roomNumber: complaintState.roomNumber || booking.roomNumber || guest.roomNumber || null,
            category: complaintState.category || "service",
            severity: "medium",
            title: getComplaintTitle(complaintState.category || "service"),
            description: text.trim(),
            reportedBy: null,
            source: "telegram",
            notes: "Created from Telegram conversation",
          });

          complaintRequestState.delete(String(chatId));

          await sendTelegramMessage({
            botToken,
            chatId,
            text: `Complaint created successfully.\nComplaint ID: ${complaint.complaint.complaintId}`,
            reply_markup: buildRoomMenuMarkup(),
          }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));

          return res.sendStatus(200);
        }
      } catch (error) {
        console.error("Telegram complaint create error:", error.message);
      }
    }

    const maintenanceState = maintenanceRequestState.get(String(chatId));
    if (maintenanceState?.waitingForDescription && text.trim() && !text.startsWith("/")) {
      try {
        const guest = await Guest.findOne({ telegramChatId: String(chatId), isActive: true }).populate("currentBooking");
        const booking = guest?.currentBooking || null;
        const botToken = await resolveTelegramBotToken(guest?.businessId || booking?.businessId || maintenanceState.businessId || null);

        if (guest && booking && botToken) {
          const request = await createMaintenanceRequest({
            businessId: booking.businessId || maintenanceState.businessId,
            bookingId: booking.bookingId || maintenanceState.bookingId,
            guestId: guest._id,
            roomNumber: maintenanceState.roomNumber || booking.roomNumber || guest.roomNumber || null,
            issueType: maintenanceState.issueType || "general",
            severity: "medium",
            title: getMaintenanceTitle(maintenanceState.issueType || "general"),
            description: text.trim(),
            reportedBy: null,
            source: "telegram",
            roomStatus: "maintenance_required",
            notes: "Created from Telegram conversation",
          });

          maintenanceRequestState.delete(String(chatId));

          await sendTelegramMessage({
            botToken,
            chatId,
            text: `Maintenance request created successfully.\nRequest ID: ${request.maintenanceRequest.maintenanceRequestId}`,
            reply_markup: buildRoomMenuMarkup(),
          }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));

          return res.sendStatus(200);
        }
      } catch (error) {
        console.error("Telegram maintenance create error:", error.message);
      }
    }

    if (luggageState?.waitingForCount && luggageCountMatch) {
      try {
        const guest = await Guest.findOne({ telegramChatId: String(chatId), isActive: true }).populate("currentBooking");
        const booking = guest?.currentBooking || null;
        const botToken = await resolveTelegramBotToken(guest?.businessId || booking?.businessId || luggageState.businessId || null);

        if (!guest || !booking || !botToken) {
          luggageRequestState.delete(String(chatId));
          return res.sendStatus(200);
        }

        const luggageCount = Math.max(1, parseInt(text.trim(), 10));
        const result = await createLuggage({
          businessId: booking.businessId || luggageState.businessId,
          bookingId: booking.bookingId,
          luggageCount,
          performedBy: null,
        });

        luggageRequestState.delete(String(chatId));

        const luggage = await getLuggageDetails({
          businessId: booking.businessId || luggageState.businessId,
          bookingId: booking.bookingId,
        }).catch(() => null);

        const replyLines = [
          `Luggage request created for ${guest.fullName}`,
          `Count: ${result.luggage.luggageCount}`,
          luggage?.luggageId ? `Luggage ID: ${luggage.luggageId}` : `Request ID: ${result.luggage.luggageId}`,
          "Use /luggage to view the request.",
        ];

        await sendTelegramMessage({
          botToken,
          chatId,
          text: replyLines.join("\n"),
          reply_markup: buildLuggageMenuMarkup(),
        }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));

        return res.sendStatus(200);
      } catch (error) {
        luggageRequestState.delete(String(chatId));
        console.error("Telegram luggage request error:", error.message);
        return res.sendStatus(200);
      }
    }

    // =====================================
    // Handle /luggage commands (view / request)
    // Commands:
    //  - /luggage                    -> show current luggage and actions
    //  - /luggage request            -> prompt for count
    //  - /luggage request 3          -> create request immediately
    //  - /luggage 3                  -> create request immediately
    // =====================================
    if (text.startsWith("/luggage")) {
      console.log("/luggage command detected");
      try {
        const parts = text.split(/\s+/).filter(Boolean);

        const guest = await Guest.findOne({ telegramChatId: String(chatId), isActive: true }).populate("currentBooking");
        const booking = guest?.currentBooking || null;
        const botToken = await resolveTelegramBotToken(guest?.businessId || booking?.businessId || null);

        if (!guest || !booking || !botToken) {
          console.log("No guest or booking linked for chatId", chatId);
          if (botToken) {
            await sendTelegramMessage({ botToken, chatId, text: "No linked booking found for this Telegram account." }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));
          }
          return res.sendStatus(200);
        }

        const luggage = await getLuggageDetails({ businessId: booking.businessId, bookingId: booking.bookingId }).catch(() => null);

        if (parts.length === 1) {
          await sendLuggageMenu({ botToken, chatId, guest, booking, luggage }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));
          return res.sendStatus(200);
        }

        if (parts[1] === "request" && !parts[2]) {
          luggageRequestState.set(String(chatId), {
            businessId: booking.businessId,
            bookingId: booking.bookingId,
            waitingForCount: true,
            requestedAt: Date.now(),
          });

          await sendTelegramMessage({
            botToken,
            chatId,
            text: "Send the luggage count as a number to create the request.",
            reply_markup: buildLuggageMenuMarkup(),
          }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));

          return res.sendStatus(200);
        }

        const requestCount = parts[1] === "request" ? parts[2] : parts[1];
        if (requestCount && /^\d+$/.test(requestCount)) {
          const luggageCount = Math.max(1, parseInt(requestCount, 10));
          const result = await createLuggage({
            businessId: booking.businessId,
            bookingId: booking.bookingId,
            luggageCount,
            performedBy: null,
          });

          luggageRequestState.delete(String(chatId));

          const replyLines = [
            `Luggage request created for ${guest.fullName}`,
            `Count: ${result.luggage.luggageCount}`,
            `Request ID: ${result.luggage.luggageId}`,
            "Use /luggage to view the request.",
          ];

          await sendTelegramMessage({
            botToken,
            chatId,
            text: replyLines.join("\n"),
            reply_markup: buildLuggageMenuMarkup(),
          }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));

          return res.sendStatus(200);
        }

        await sendTelegramMessage({
          botToken,
          chatId,
          text: "Use /luggage, /luggage request, or /luggage request 3.",
          reply_markup: buildLuggageMenuMarkup(),
        }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));

        return res.sendStatus(200);
      } catch (err) {
        console.error("/luggage handler error:", err.message);
        return res.sendStatus(500);
      }
    }

    // =====================================
    // Handle /room commands
    // =====================================
    if (text.startsWith("/room")) {
      try {
        const guest = await Guest.findOne({ telegramChatId: String(chatId), isActive: true }).populate("currentBooking");
        const booking = guest?.currentBooking || null;
        const botToken = await resolveTelegramBotToken(guest?.businessId || booking?.businessId || null);

        if (!guest || !booking || !botToken) {
          if (botToken) {
            await sendTelegramMessage({ botToken, chatId, text: "No linked booking found for this Telegram account." }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));
          }
          return res.sendStatus(200);
        }

        const snapshot = await getRoomSnapshot({ businessId: booking.businessId, bookingId: booking.bookingId });

        await sendRoomMenu({ botToken, chatId, guest, booking, snapshot }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));
        return res.sendStatus(200);
      } catch (err) {
        console.error("/room handler error:", err.message);
        return res.sendStatus(500);
      }
    }

    // =====================================
    // Handle /complaint commands
    // =====================================
    if (text.startsWith("/complaint")) {
      try {
        const parts = text.trim().split(/\s+/).filter(Boolean);
        const guest = await Guest.findOne({ telegramChatId: String(chatId), isActive: true }).populate("currentBooking");
        const booking = guest?.currentBooking || null;
        const botToken = await resolveTelegramBotToken(guest?.businessId || booking?.businessId || null);

        if (!guest || !booking || !botToken) {
          if (botToken) {
            await sendTelegramMessage({ botToken, chatId, text: "No linked booking found for this Telegram account." }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));
          }
          return res.sendStatus(200);
        }

        if (parts.length === 1) {
          complaintRequestState.set(String(chatId), {
            businessId: booking.businessId,
            bookingId: booking.bookingId,
            guestId: guest._id,
            roomNumber: booking.roomNumber || guest.roomNumber || null,
            waitingForDescription: true,
            category: "service",
            requestedAt: Date.now(),
          });

          await sendTelegramMessage({ botToken, chatId, text: "Choose a complaint category, then send the issue description in chat.", reply_markup: buildComplaintMenuMarkup() }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));
          return res.sendStatus(200);
        }

        const category = parts[1] || "service";
        const description = parts.slice(2).join(" ").trim();

        if (!description) {
          complaintRequestState.set(String(chatId), {
            businessId: booking.businessId,
            bookingId: booking.bookingId,
            guestId: guest._id,
            roomNumber: booking.roomNumber || guest.roomNumber || null,
            waitingForDescription: true,
            category,
            requestedAt: Date.now(),
          });

          await sendTelegramMessage({ botToken, chatId, text: `${getComplaintTitle(category)} selected. Send the complaint description now.`, reply_markup: buildComplaintMenuMarkup() }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));
          return res.sendStatus(200);
        }

        const result = await createComplaint({
          businessId: booking.businessId,
          bookingId: booking.bookingId,
          guestId: guest._id,
          roomNumber: booking.roomNumber || guest.roomNumber || null,
          category,
          severity: "medium",
          title: getComplaintTitle(category),
          description,
          reportedBy: null,
          source: "telegram",
          notes: "Created from Telegram command",
        });

        await sendTelegramMessage({
          botToken,
          chatId,
          text: `Complaint created successfully.\nComplaint ID: ${result.complaint.complaintId}`,
          reply_markup: buildRoomMenuMarkup(),
        }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));

        return res.sendStatus(200);
      } catch (err) {
        console.error("/complaint handler error:", err.message);
        return res.sendStatus(500);
      }
    }

    // =====================================
    // Handle /maintenance commands
    // =====================================
    if (text.startsWith("/maintenance")) {
      try {
        const parts = text.trim().split(/\s+/).filter(Boolean);
        const guest = await Guest.findOne({ telegramChatId: String(chatId), isActive: true }).populate("currentBooking");
        const booking = guest?.currentBooking || null;
        const botToken = await resolveTelegramBotToken(guest?.businessId || booking?.businessId || null);

        if (!guest || !booking || !botToken) {
          if (botToken) {
            await sendTelegramMessage({ botToken, chatId, text: "No linked booking found for this Telegram account." }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));
          }
          return res.sendStatus(200);
        }

        if (parts.length === 1) {
          maintenanceRequestState.set(String(chatId), {
            businessId: booking.businessId,
            bookingId: booking.bookingId,
            guestId: guest._id,
            roomNumber: booking.roomNumber || guest.roomNumber || null,
            waitingForDescription: true,
            issueType: "general",
            requestedAt: Date.now(),
          });

          await sendTelegramMessage({ botToken, chatId, text: "Choose a maintenance type, then send the issue description in chat.", reply_markup: buildMaintenanceMenuMarkup() }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));
          return res.sendStatus(200);
        }

        const issueType = parts[1] || "general";
        const description = parts.slice(2).join(" ").trim();

        if (!description) {
          maintenanceRequestState.set(String(chatId), {
            businessId: booking.businessId,
            bookingId: booking.bookingId,
            guestId: guest._id,
            roomNumber: booking.roomNumber || guest.roomNumber || null,
            waitingForDescription: true,
            issueType,
            requestedAt: Date.now(),
          });

          await sendTelegramMessage({ botToken, chatId, text: `${getMaintenanceTitle(issueType)} selected. Send the maintenance description now.`, reply_markup: buildMaintenanceMenuMarkup() }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));
          return res.sendStatus(200);
        }

        const result = await createMaintenanceRequest({
          businessId: booking.businessId,
          bookingId: booking.bookingId,
          guestId: guest._id,
          roomNumber: booking.roomNumber || guest.roomNumber || null,
          issueType,
          severity: "medium",
          title: getMaintenanceTitle(issueType),
          description,
          reportedBy: null,
          source: "telegram",
          roomStatus: "maintenance_required",
          notes: "Created from Telegram command",
        });

        await sendTelegramMessage({
          botToken,
          chatId,
          text: `Maintenance request created successfully.\nRequest ID: ${result.maintenanceRequest.maintenanceRequestId}`,
          reply_markup: buildRoomMenuMarkup(),
        }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));

        return res.sendStatus(200);
      } catch (err) {
        console.error("/maintenance handler error:", err.message);
        return res.sendStatus(500);
      }
    }

    // =====================================
    // Handle /food commands (view / reschedule)
    // Commands:
    //  - /food                     -> show current dining timing
    //  - /food reschedule HH:MM    -> reschedule to HH:MM (24h)
    // =====================================
    if (text.startsWith("/food")) {
      console.log("/food command detected");
      try {
        const parts = text.split(" ").filter(Boolean);

        const guest = await Guest.findOne({
          telegramChatId: String(chatId),
          isActive: true,
        }).populate("currentBooking");

        const booking = guest?.currentBooking || null;
        const botToken = await resolveTelegramBotToken(guest?.businessId || booking?.businessId || null);

        if (!guest || !booking || !botToken) {
          console.log("No guest or booking linked for chatId", chatId);
          if (botToken) {
            await sendTelegramMessage({ botToken, chatId, text: "No linked booking found for this Telegram account." }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));
          }
          return res.sendStatus(200);
        }

        const token = botToken;

        const foodOrder = await FoodOrder.findOne({ bookingId: booking.bookingId, status: { $in: ["pending", "confirmed"] } });

        if (parts.length === 1) {
          await sendFoodMenu({ botToken: token, chatId, guest, booking, foodOrder }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));
          return res.sendStatus(200);
        }

        if (parts[1] === "schedule" && !parts[2]) {
          await sendTelegramMessage({
            botToken: token,
            chatId,
            text: "Choose the food type you want to schedule:",
            reply_markup: buildFoodMealMarkup(),
          }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));

          return res.sendStatus(200);
        }

        if (parts[1] === "schedule" && parts[2]) {
          const mealType = normalizeMealType(parts[2]);

          if (!mealType) {
            await sendTelegramMessage({
              botToken: token,
              chatId,
              text: "Invalid food type. Use tiffin, lunch, or dinner.",
            }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));

            return res.sendStatus(200);
          }

          await scheduleFoodOrderFromTelegram({
            businessId: booking.businessId,
            guest,
            booking,
            mealType,
            chatId,
            botToken: token,
          }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));

          return res.sendStatus(200);
        }

        // /food reschedule HH:MM
        if (parts[1] === "reschedule" && parts[2]) {
          if (!foodOrder) {
            await sendTelegramMessage({ botToken: token, chatId, text: "No active dining reservation to reschedule." }).catch(() => null);
            return res.sendStatus(200);
          }

          const timePart = parts[2];
          const m = timePart.match(/^([0-2]\d):([0-5]\d)$/);
          if (!m) {
            console.log("Invalid time format provided:", timePart);
            await sendTelegramMessage({ botToken: token, chatId, text: "Invalid time format. Use HH:MM (24h)." }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));
            return res.sendStatus(200);
          }

          const hh = parseInt(m[1], 10);
          const mm = parseInt(m[2], 10);
          const newTime = new Date();
          newTime.setHours(hh, mm, 0, 0);
          if (newTime <= new Date()) newTime.setDate(newTime.getDate() + 1);

          // Update food order
          const performedBy = null;
          foodOrder.preferredTime = newTime;
          foodOrder.activityLogs = foodOrder.activityLogs || [];
          foodOrder.activityLogs.push({ action: "timing_updated", performedBy, message: `Rescheduled via Telegram to ${newTime.toISOString()}` });
          await foodOrder.save();

          // Update related task if any
          try {
            const task = await Task.findOne({ businessId: booking.businessId, entityType: "food_order", entityId: foodOrder._id });
            if (task) {
              task.activityLogs = task.activityLogs || [];
              task.activityLogs.push({ action: "timing_updated", performedBy, message: `Rescheduled via Telegram to ${newTime.toISOString()}` });
              await task.save();
            }
          } catch (e) {
            console.error("Task update error:", e.message);
          }

          // Notify guest
          const mealLabel = foodOrder.mealType.charAt(0).toUpperCase() + foodOrder.mealType.slice(1);
          const newTimeStr = newTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          console.log("Rescheduled foodOrder", foodOrder.foodOrderId, "to", newTime.toISOString());
          await sendTelegramMessage({ botToken: token, chatId, text: `Your ${mealLabel} has been rescheduled to ${newTimeStr}.` }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));

          // Notify assigned staff if present
          try {
            if (foodOrder.assignedTo) {
              const assigned = await Staff.findById(foodOrder.assignedTo);
                if (assigned?.telegramChatId) {
                await sendTelegramMessage({ botToken: token, chatId: assigned.telegramChatId, text: `${mealLabel} order updated:\nRoom: ${foodOrder.roomNumber}\nGuest: ${guest.fullName}\nNew time: ${newTimeStr}\nOrder ID: ${foodOrder.foodOrderId}` }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));
              }
            } else {
              // Broadcast to all food_service staff as fallback
              const foodStaff = await Staff.find({ businessId: booking.businessId, department: "food_service", telegramChatId: { $ne: null }, currentStatus: "active" });
              for (const s of foodStaff) {
                if (s.telegramChatId) {
                  await sendTelegramMessage({ botToken: token, chatId: s.telegramChatId, text: `${mealLabel} order updated:\nRoom: ${foodOrder.roomNumber}\nGuest: ${guest.fullName}\nNew time: ${newTimeStr}\nOrder ID: ${foodOrder.foodOrderId}` }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));
                }
              }
            }
          } catch (notifyErr) {
            console.error("Notification error:", notifyErr.message);
          }

          return res.sendStatus(200);
        }

        // Unknown /food subcommand
        await sendTelegramMessage({ botToken: token, chatId, text: "Commands:\n/food - open food menu\n/food schedule - choose tiffin, lunch, or dinner\n/food reschedule HH:MM - change timing" }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));
        return res.sendStatus(200);
      } catch (err) {
        console.error("/food handler error:", err.message);
        return res.sendStatus(500);
      }
    }

    // =====================================
    // Handle /checkout commands
    // =====================================
    if (text.startsWith("/checkout")) {
      try {
        const parts = text.trim().split(/\s+/).filter(Boolean);
        const guest = await Guest.findOne({ telegramChatId: String(chatId), isActive: true }).populate("currentBooking");
        const booking = guest?.currentBooking || null;
        const botToken = await resolveTelegramBotToken(guest?.businessId || booking?.businessId || null);

        if (!guest || !booking || !botToken) {
          if (botToken) {
            await sendTelegramMessage({ botToken, chatId, text: "No linked booking found for this Telegram account." }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));
          }
          return res.sendStatus(200);
        }

        if (parts.length === 1) {
          await sendTelegramMessage({
            botToken,
            chatId,
            text: "Choose how the checkout should close the room workflow:",
            reply_markup: buildCheckoutMenuMarkup(),
          }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));

          return res.sendStatus(200);
        }

        const mode = parts[1] || "standard";
        const payload = parts.slice(2).join(" ").trim();
        const result = await checkoutBooking({
          businessId: booking.businessId,
          bookingId: booking.bookingId,
          performedBy: null,
          checkoutMode: mode,
          maintenanceDetails: mode === "maintenance" ? payload || `Maintenance requested from Telegram for room ${booking.roomNumber || guest.roomNumber || "N/A"}` : "",
          complaintDetails: mode === "complaint" ? payload || `Complaint reported from Telegram for room ${booking.roomNumber || guest.roomNumber || "N/A"}` : "",
        });

        const responseLines = [
          `Checkout completed for ${guest.fullName}`,
          result.roomNumber ? `Room: ${result.roomNumber}` : null,
          result.maintenanceRequest ? `Maintenance request: ${result.maintenanceRequest.maintenanceRequestId}` : null,
          result.complaint ? `Complaint: ${result.complaint.complaintId}` : null,
          result.housekeepingTask ? `Housekeeping task: ${result.housekeepingTask.taskId}` : null,
        ].filter(Boolean);

        await sendTelegramMessage({
          botToken,
          chatId,
          text: responseLines.join("\n"),
          reply_markup: buildRoomMenuMarkup(),
        }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));

        return res.sendStatus(200);
      } catch (err) {
        console.error("/checkout handler error:", err.message);
        return res.sendStatus(500);
      }
    }

    // =====================================
    // Handle /parking_status or /parking
    // =====================================
    if (text.startsWith("/parking_status") || text.startsWith("/parking")) {
      try {
        console.log("/parking_status command detected");

        const parts = text.trim().split(/\s+/).filter(Boolean);
        const vehicleNumber = parts[1] && parts[1].toLowerCase() !== "status" ? parts[1] : null;

        const guest = await Guest.findOne({ telegramChatId: String(chatId), isActive: true }).populate("currentBooking");

        if (!guest) {
          console.log("No guest linked for chatId", chatId);
          const botToken = await resolveTelegramBotToken();
          if (botToken) {
            await sendTelegramMessage({ botToken, chatId, text: "No guest profile found for this Telegram account." }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));
          }
          return res.sendStatus(200);
        }

        if (!vehicleNumber && !guest.currentBooking) {
          console.log("No booking linked for chatId", chatId);
          const botToken = await resolveTelegramBotToken(guest.businessId);
          if (botToken) {
            await sendTelegramMessage({ botToken, chatId, text: "No linked booking found for this Telegram account." }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));
          }
          return res.sendStatus(200);
        }

        const booking = guest.currentBooking || null;
        const businessId = guest.businessId || booking?.businessId;
        const token = await resolveTelegramBotToken(businessId);

        if (!token) {
          console.error("No Telegram bot token available for parking status reply");
          return res.sendStatus(200);
        }

        try {
          const details = await getParkingDetails(
            vehicleNumber
              ? { businessId, vehicleNumber }
              : { businessId, bookingId: booking.bookingId }
          );

          const lines = [
            `Parking Info for ${details.guest?.fullName || guest.fullName}`,
            details.slot ? `Slot: ${details.slot.parkingId}` : "Slot: not assigned",
            details.vehicle ? `Vehicle: ${details.vehicle.vehicleNumber}` : "Vehicle: not linked",
            details.guest?.roomNumber || guest.roomNumber ? `Room: ${details.guest?.roomNumber || guest.roomNumber}` : null,
            `Status: ${details.status}`,
          ];

          await sendTelegramMessage({ botToken: token, chatId, text: lines.join("\n") }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));
        } catch (e) {
          console.error("Parking lookup error:", e.message);
          await sendTelegramMessage({ botToken: token, chatId, text: "No parking information found for your booking." }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));
        }

        return res.sendStatus(200);
      } catch (err) {
        console.error("/parking handler error:", err.message);
        return res.sendStatus(500);
      }
    }

    // =====================================
    // Handle /start
    // =====================================

    if (text.startsWith("/start")) {
      const existingGuest = await Guest.findOne({ telegramChatId: String(chatId), isActive: true }).populate("currentBooking");

      if (existingGuest?.currentBooking) {
        const booking = existingGuest.currentBooking;
        const token = await resolveTelegramBotToken(existingGuest.businessId || booking.businessId);

        if (token) {
          await sendTelegramMessage({
            botToken: token,
            chatId,
            text: buildMenuText(existingGuest, booking),
            reply_markup: buildRoomMenuMarkup(),
          });
        }

        return res.sendStatus(200);
      }

      const bookingId = extractBookingId(text);

      if (!bookingId) {
        const botToken = await resolveTelegramBotToken();
        if (botToken) {
          await sendTelegramMessage({
            botToken,
            chatId,
            text: "Please link your account first using /set_booking_id <booking_id>.",
          }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));
        }

        return res.sendStatus(200);
      }

      const linked = await linkGuestToChat({ chatId, bookingId });

      if (!linked.booking || !linked.guest) {
        const botToken = await resolveTelegramBotToken();
        if (botToken) {
          await sendTelegramMessage({
            botToken,
            chatId,
            text: "Booking not found. Please use /set_booking_id <booking_id> with a valid booking ID.",
          }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));
        }

        return res.sendStatus(200);
      }

      const token = await resolveTelegramBotToken(linked.booking.businessId);

      if (token) {
        await sendTelegramMessage({
          botToken: token,
          chatId,
          text: buildMenuText(linked.guest, linked.booking),
          reply_markup: buildRoomMenuMarkup(),
        }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));
      }

      return res.sendStatus(200);
    }

    if (text.startsWith("/set_booking_id")) {
      const bookingId = extractBookingId(text);

      if (!bookingId) {
        const botToken = await resolveTelegramBotToken();
        if (botToken) {
          await sendTelegramMessage({
            botToken,
            chatId,
            text: "Use /set_booking_id <booking_id> to link your Telegram chat.",
          }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));
        }

        return res.sendStatus(200);
      }

      const linked = await linkGuestToChat({ chatId, bookingId });

      if (!linked.booking || !linked.guest) {
        const botToken = await resolveTelegramBotToken();
        if (botToken) {
          await sendTelegramMessage({
            botToken,
            chatId,
            text: "Booking not found. Please check the booking ID and try again.",
          }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));
        }

        return res.sendStatus(200);
      }

      const token = await resolveTelegramBotToken(linked.booking.businessId);
      if (token) {
        await sendTelegramMessage({
          botToken: token,
          chatId,
          text: buildMenuText(linked.guest, linked.booking),
          reply_markup: buildRoomMenuMarkup(),
        }).catch((err) => console.error("Telegram send error:", err?.response?.data || err.message));
      }

      return res.sendStatus(200);
    }

    // =====================================
    // Future Messages
    // =====================================

    return res.sendStatus(200);
  } catch (error) {
    console.error(error);

    return res.sendStatus(500);
  }
};

module.exports = {
  telegramWebhook,
  getVehicleInfo,
  sendManualTelegramMessage,
};