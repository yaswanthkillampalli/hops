const Booking = require("../models/Booking");
const Guest = require("../models/Guest");
const Parking = require("../models/Parking");
const Staff = require("../models/Staff");
const Task = require("../models/Task");
const Business = require("../models/Business");

const generateId = require("../utils/generateId");
const telegramService = require("./telegramService");

const PARKING_STATUSES = new Set([
  "available",
  "reserved",
  "occupied",
  "blocked",
  "maintenance",
]);

const LEGACY_STATUS_TO_SLOT_STATUS = {
  allocated: "occupied",
  vehicle_received: "occupied",
  parked: "occupied",
  vehicle_requested: "reserved",
  vehicle_delivered: "available",
  completed: "available",
};

const buildError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeSlotStatus = (inputStatus) => {
  const normalized = String(inputStatus || "").trim().toLowerCase();
  if (PARKING_STATUSES.has(normalized)) {
    return normalized;
  }

  return LEGACY_STATUS_TO_SLOT_STATUS[normalized] || null;
};

const allocateParkingSlot = async ({
  businessId,
  performedBy,
  bookingId,
  vehicleNumber,
  vehicleType,
}) => {
  if (!businessId) {
    throw buildError("Business context is required", 401);
  }

  if (!bookingId || !vehicleNumber || !vehicleType) {
    throw buildError("bookingId, vehicleNumber and vehicleType are required");
  }

  const normalizedVehicleNumber = String(vehicleNumber).trim().toUpperCase();
  const normalizedVehicleType = String(vehicleType).trim().toLowerCase();

  const booking = await Booking.findOne({
    businessId,
    bookingId,
    isActive: true,
  }).populate("guestId");

  if (!booking) {
    throw buildError("Booking not found", 404);
  }

  if (!booking.guestId) {
    throw buildError("Guest not found for this booking", 404);
  }

  const guest = await Guest.findOne({
    _id: booking.guestId._id,
    businessId,
    isActive: true,
  });

  if (!guest) {
    throw buildError("Guest not found", 404);
  }

  const existingAllocation = await Parking.findOne({
    businessId,
    bookingId: booking._id,
    status: { $in: ["reserved", "occupied"] },
    isActive: true,
  });

  if (existingAllocation) {
    throw buildError("Parking is already allocated for this booking", 400);
  }

  const parkingSlot = await Parking.findOneAndUpdate(
    {
      businessId,
      status: "available",
      isActive: true,
    },
    {
      $set: {
        status: "occupied",
        vehicleNumber: normalizedVehicleNumber,
        vehicleType: normalizedVehicleType,
        guestId: guest._id,
        bookingId: booking._id,
        parkedBy: performedBy || null,
        parkedAt: new Date(),
        retrievalRequestedAt: null,
        retrievedBy: null,
        retrievedAt: null,
      },
      $push: {
        activityLogs: {
          action: "allocated",
          performedBy: performedBy || null,
          message: `Allocated to booking ${booking.bookingId} for vehicle ${normalizedVehicleNumber}`,
        },
      },
    },
    {
      new: true,
      sort: { createdAt: 1 },
    }
  );

  if (!parkingSlot) {
    throw buildError("No parking slots are available", 400);
  }

  const previousGuestParkingSlot = guest.parkingSlot || null;
  const previousBookingParkingRequired = booking.parkingRequired;

  try {
    guest.parkingSlot = parkingSlot.parkingId;
    await guest.save();

    booking.parkingRequired = true;
    await booking.save();

    const parkingStaff = await Staff.findOne({
      businessId,
      department: "parking",
      isAvailable: true,
      currentStatus: "active",
    }).sort({ createdAt: 1 });

    const parkingTask = await Task.create({
      businessId,
      taskId: await generateId("task", "TK"),
      title: `Parking allocation for ${parkingSlot.parkingId}`,
      description: `Allocate ${normalizedVehicleType} vehicle ${normalizedVehicleNumber} to slot ${parkingSlot.parkingId} for booking ${booking.bookingId}`,
      taskType: "parking",
      priority: booking.isVIP ? "vip" : "medium",
      status: parkingStaff ? "assigned" : "pending",
      department: "parking",
      guestId: guest._id,
      roomNumber: booking.roomNumber || null,
      assignedTo: parkingStaff ? parkingStaff._id : null,
      assignedBy: performedBy || null,
      entityType: "parking",
      entityId: parkingSlot._id,
      notes: `Vehicle ${normalizedVehicleNumber} allocated to ${parkingSlot.parkingId}`,
      assignedAt: parkingStaff ? new Date() : null,
      activityLogs: [
        {
          action: "created",
          performedBy: performedBy || null,
          message: `Parking allocation created for ${parkingSlot.parkingId}`,
        },
      ],
    });

    return {
      parkingSlot: parkingSlot.parkingId,
      parkingTask,
    };
  } catch (error) {
    await Parking.findByIdAndUpdate(parkingSlot._id, {
      $set: {
        status: "available",
        vehicleNumber: null,
        vehicleType: "car",
        guestId: null,
        bookingId: null,
        parkedBy: null,
        parkedAt: null,
        retrievalRequestedAt: null,
        retrievedBy: null,
        retrievedAt: null,
      },
    });

    guest.parkingSlot = previousGuestParkingSlot;
    await guest.save().catch(() => null);

    booking.parkingRequired = previousBookingParkingRequired;
    await booking.save().catch(() => null);

    throw error;
  }
};

const getParkingDetails = async ({ businessId, bookingId, vehicleNumber }) => {
  if (!businessId) throw buildError("Business context is required", 401);

  let parking = null;

  if (bookingId) {
    const booking = await Booking.findOne({ businessId, bookingId }).populate("guestId");
    if (!booking) throw buildError("Booking not found", 404);

    parking = await Parking.findOne({ businessId, bookingId: booking._id }).populate("guestId");
    if (!parking) throw buildError("Parking record not found for booking", 404);
  } else if (vehicleNumber) {
    const normalized = String(vehicleNumber).trim().toUpperCase();

    parking = await Parking.findOne({ businessId, vehicleNumber: normalized }).populate("guestId");
    if (!parking) throw buildError("Parking record not found for vehicle", 404);
  } else {
    throw buildError("bookingId or vehicleNumber is required", 400);
  }

  const guest = parking.guestId
    ? {
        id: parking.guestId._id,
        fullName: parking.guestId.fullName,
        phone: parking.guestId.phone,
        email: parking.guestId.email,
        roomNumber: parking.guestId.roomNumber || null,
      }
    : null;

  const vehicle = {
    vehicleNumber: parking.vehicleNumber,
    vehicleType: parking.vehicleType,
    vehicleColor: parking.vehicleColor,
  };

  const slot = {
    parkingId: parking.parkingId,
    slotNumber: parking.slotNumber,
    zone: parking.zone,
    floor: parking.floor,
  };

  return {
    guest,
    vehicle,
    slot,
    status: parking.status,
  };
};

const getAvailableSlots = async ({ businessId }) => {
  if (!businessId) throw buildError("Business context is required", 401);

  const slots = await Parking.find({ businessId, status: "available", isActive: true }).sort({ floor: 1, slotNumber: 1 });

  return slots.map((s) => ({
    parkingId: s.parkingId,
    slotNumber: s.slotNumber,
    zone: s.zone,
    floor: s.floor,
    isVIPSlot: s.isVIPSlot,
    notes: s.notes,
  }));
};

const updateParkingStatus = async ({ businessId, parkingId, status, performedBy }) => {
  if (!businessId) throw buildError("Business context is required", 401);
  if (!parkingId || !status) throw buildError("parkingId and status are required", 400);

  const mappedStatus = normalizeSlotStatus(status);
  if (!mappedStatus) {
    throw buildError("Invalid status. Use slot statuses: available, reserved, occupied, blocked, maintenance", 400);
  }

  const parking = await Parking.findOne({ businessId, parkingId });
  if (!parking) throw buildError("Parking record not found", 404);

  const updates = { status: mappedStatus };
  const now = new Date();

  if (mappedStatus === "occupied") {
    updates.parkedAt = parking.parkedAt || now;
  }

  if (mappedStatus === "reserved") {
    updates.retrievalRequestedAt = now;
  }

  if (mappedStatus === "available") {
    updates.retrievedAt = now;
    updates.retrievedBy = performedBy || null;
  }

  const updated = await Parking.findByIdAndUpdate(
    parking._id,
    {
      $set: updates,
      $push: {
        activityLogs: {
          action: mappedStatus,
          performedBy: performedBy || null,
          message: `Slot status updated to ${mappedStatus}`,
        },
      },
    },
    { new: true }
  );

  if (mappedStatus === "available" && updated.guestId) {
    try {
      const guest = await Guest.findById(updated.guestId);
      if (guest) {
        guest.parkingSlot = null;
        await guest.save();
      }
    } catch (e) {
      // ignore
    }
  }

  return { status: updated.status };
};

const requestVehicleRetrieval = async ({ businessId, bookingId, performedBy }) => {
  if (!businessId) throw buildError("Business context is required", 401);
  if (!bookingId) throw buildError("bookingId is required", 400);

  const booking = await Booking.findOne({ businessId, bookingId }).populate("guestId");
  if (!booking) throw buildError("Booking not found", 404);

  const parking = await Parking.findOne({ businessId, bookingId: booking._id });
  if (!parking) throw buildError("Parking record not found for booking", 404);

  const now = new Date();

  const updated = await Parking.findByIdAndUpdate(
    parking._id,
    {
      $set: { status: "reserved", retrievalRequestedAt: now },
      $push: {
        activityLogs: {
          action: "vehicle_requested",
          performedBy: performedBy || null,
          message: `Vehicle retrieval requested for booking ${booking.bookingId}`,
        },
      },
    },
    { new: true }
  );

  const parkingStaff = await Staff.findOne({
    businessId,
    department: "parking",
    isAvailable: true,
    currentStatus: "active",
  }).sort({ createdAt: 1 });

  const task = await Task.create({
    businessId,
    taskId: await generateId("task", "TK"),
    title: `Vehicle retrieval for ${updated.parkingId}`,
    description: `Retrieve vehicle ${updated.vehicleNumber || ""} for booking ${booking.bookingId}`,
    taskType: "parking",
    priority: booking.isVIP ? "vip" : "high",
    status: parkingStaff ? "assigned" : "pending",
    department: "parking",
    guestId: booking.guestId ? booking.guestId._id : null,
    roomNumber: booking.roomNumber || null,
    assignedTo: parkingStaff ? parkingStaff._id : null,
    assignedBy: performedBy || null,
    entityType: "parking",
    entityId: updated._id,
    notes: `Retrieval requested for ${updated.parkingId}`,
    assignedAt: parkingStaff ? new Date() : null,
    activityLogs: [
      {
        action: "created",
        performedBy: performedBy || null,
        message: "Retrieval task created",
      },
    ],
  });

  try {
    const business = await Business.findById(businessId);
    if (business && business.telegramBotToken) {
      const staffToNotify = await Staff.find({
        businessId,
        department: "parking",
        telegramChatId: { $ne: null },
        currentStatus: "active",
      });

      const text = `Vehicle retrieval requested:\nBooking: ${booking.bookingId}\nSlot: ${updated.parkingId}\nVehicle: ${updated.vehicleNumber || "N/A"}`;

      for (const s of staffToNotify) {
        if (s.telegramChatId) {
          try {
            await telegramService.sendTelegramMessage({
              botToken: business.telegramBotToken,
              chatId: s.telegramChatId,
              text,
            });
          } catch (e) {
            // ignore
          }
        }
      }
    }
  } catch (e) {
    // ignore
  }

  return { message: "Vehicle retrieval started", task };
};

const completeVehicleDelivery = async ({ businessId, parkingId, performedBy }) => {
  if (!businessId) throw buildError("Business context is required", 401);
  if (!parkingId) throw buildError("parkingId is required", 400);

  const parking = await Parking.findOne({ businessId, parkingId });
  if (!parking) throw buildError("Parking record not found", 404);

  const now = new Date();

  const updated = await Parking.findByIdAndUpdate(
    parking._id,
    {
      $set: {
        status: "available",
        vehicleNumber: null,
        vehicleType: "car",
        vehicleColor: "",
        guestId: null,
        bookingId: null,
        parkedBy: null,
        retrievedBy: performedBy || null,
        parkedAt: null,
        retrievalRequestedAt: null,
        retrievedAt: now,
        isActive: true,
      },
      $push: {
        activityLogs: {
          action: "completed",
          performedBy: performedBy || null,
          message: "Vehicle delivery completed",
        },
      },
    },
    { new: true }
  );

  if (parking.guestId) {
    try {
      const guest = await Guest.findById(parking.guestId);
      if (guest) {
        guest.parkingSlot = null;
        await guest.save();
      }
    } catch (e) {
      // ignore
    }
  }

  try {
    const tasks = await Task.find({
      entityType: "parking",
      entityId: parking._id,
      status: { $ne: "completed" },
    });

    for (const t of tasks) {
      t.status = "completed";
      t.completedAt = now;
      t.isCompleted = true;
      t.activityLogs = t.activityLogs || [];
      t.activityLogs.push({
        action: "completed",
        performedBy: performedBy || null,
        message: "Task closed after delivery",
      });
      await t.save();
    }
  } catch (e) {
    // ignore
  }

  return { status: "completed", parking: updated };
};

module.exports = {
  allocateParkingSlot,
  getParkingDetails,
  getAvailableSlots,
  updateParkingStatus,
  requestVehicleRetrieval,
  completeVehicleDelivery,
};
