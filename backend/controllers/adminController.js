const Booking = require("../models/Booking");
const Complaint = require("../models/Complaint");
const FoodOrder = require("../models/FoodOrder");
const Guest = require("../models/Guest");
const Luggage = require("../models/Luggage");
const MaintenanceRequest = require("../models/MaintenanceRequest");
const Parking = require("../models/Parking");
const Room = require("../models/Room");
const Staff = require("../models/Staff");
const Task = require("../models/Task");

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const getBusinessId = (req) => req.staff?.businessId || req.business?._id || null;

const getBusinessFilter = (businessId) => ({ businessId });

const getPeriodStart = (days) => new Date(Date.now() - days * DAY_IN_MS);

const groupCount = async (Model, filter, field) => {
  const rows = await Model.aggregate([
    { $match: filter },
    {
      $group: {
        _id: `$${field}`,
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return rows.map((row) => ({
    value: row._id,
    label: row._id ?? "unassigned",
    count: row.count,
  }));
};

const countDocuments = (Model, filter) => Model.countDocuments(filter);

const sumField = async (Model, filter, sumFieldName) => {
  const rows = await Model.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        total: { $sum: `$${sumFieldName}` },
        average: { $avg: `$${sumFieldName}` },
      },
    },
  ]);

  return rows[0] || { total: 0, average: 0 };
};

const averageDurationMinutes = async (Model, filter, startField, endField) => {
  const rows = await Model.aggregate([
    {
      $match: {
        ...filter,
        [startField]: { $ne: null },
        [endField]: { $ne: null },
      },
    },
    {
      $project: {
        durationMinutes: {
          $divide: [
            { $subtract: [`$${endField}`, `$${startField}`] },
            1000 * 60,
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        average: { $avg: "$durationMinutes" },
        count: { $sum: 1 },
      },
    },
  ]);

  return rows[0] || { average: 0, count: 0 };
};

const countByDate = async (Model, filter, dateField, days = 14) => {
  const startDate = getPeriodStart(days);

  const rows = await Model.aggregate([
    {
      $match: {
        ...filter,
        [dateField]: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: `$${dateField}`,
          },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return rows.map((row) => ({
    date: row._id,
    count: row.count,
  }));
};

const buildOverviewMetrics = async (businessId) => {
  const filter = getBusinessFilter(businessId);

  const [
    registeredGuests,
    activeGuests,
    registeredBookings,
    activeBookings,
    totalRooms,
    availableRooms,
    reservedRooms,
    occupiedRooms,
    blockedRooms,
    totalStaff,
    activeStaff,
    openTasks,
    openComplaints,
    openMaintenanceRequests,
    occupiedParkingSlots,
    availableParkingSlots,
    pendingFoodOrders,
    activeLuggageRecords,
  ] = await Promise.all([
    countDocuments(Guest, filter),
    countDocuments(Guest, { ...filter, isActive: true }),
    countDocuments(Booking, filter),
    countDocuments(Booking, { ...filter, isActive: true }),
    countDocuments(Room, filter),
    countDocuments(Room, { ...filter, occupancyStatus: "available" }),
    countDocuments(Room, { ...filter, occupancyStatus: "reserved" }),
    countDocuments(Room, { ...filter, occupancyStatus: "occupied" }),
    countDocuments(Room, { ...filter, occupancyStatus: "blocked" }),
    countDocuments(Staff, filter),
    countDocuments(Staff, { ...filter, currentStatus: "active" }),
    countDocuments(Task, {
      ...filter,
      status: { $in: ["pending", "assigned", "accepted", "in_progress", "delayed", "escalated"] },
    }),
    countDocuments(Complaint, {
      ...filter,
      status: { $in: ["open", "assigned", "in_progress"] },
    }),
    countDocuments(MaintenanceRequest, {
      ...filter,
      status: { $in: ["open", "assigned", "in_progress"] },
    }),
    countDocuments(Parking, { ...filter, status: { $in: ["occupied", "reserved"] } }),
    countDocuments(Parking, { ...filter, status: "available" }),
    countDocuments(FoodOrder, { ...filter, status: "pending" }),
    countDocuments(Luggage, {
      ...filter,
      overallStatus: { $ne: "completed" },
    }),
  ]);

  const roomOccupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;
  const roomPipelineRate = totalRooms > 0 ? ((reservedRooms + occupiedRooms) / totalRooms) * 100 : 0;

  return {
    registeredGuests,
    activeGuests,
    registeredBookings,
    activeBookings,
    totalRooms,
    availableRooms,
    reservedRooms,
    occupiedRooms,
    blockedRooms,
    roomOccupancyRate,
    roomPipelineRate,
    totalStaff,
    activeStaff,
    openTasks,
    openComplaints,
    openMaintenanceRequests,
    occupiedParkingSlots,
    availableParkingSlots,
    pendingFoodOrders,
    activeLuggageRecords,
  };
};

const buildBookingMetrics = async (businessId) => {
  const filter = getBusinessFilter(businessId);
  const startOfWeek = getPeriodStart(7);
  const startOfMonth = getPeriodStart(30);

  const [
    totalBookings,
    byStatus,
    byType,
    byPaymentStatus,
    bookingsToday,
    bookingsThisWeek,
    bookingsThisMonth,
    averageStay,
    averageGuests,
    averageAdults,
    averageChildren,
    bookingsByDay,
    upcomingCheckIns,
    upcomingCheckOuts,
    paidRevenue,
    pendingRevenue,
  ] = await Promise.all([
    countDocuments(Booking, filter),
    groupCount(Booking, filter, "bookingStatus"),
    groupCount(Booking, filter, "bookingType"),
    groupCount(Booking, filter, "paymentStatus"),
    countDocuments(Booking, { ...filter, createdAt: { $gte: getPeriodStart(1) } }),
    countDocuments(Booking, { ...filter, createdAt: { $gte: startOfWeek } }),
    countDocuments(Booking, { ...filter, createdAt: { $gte: startOfMonth } }),
    averageDurationMinutes(Booking, filter, "checkInDate", "checkOutDate"),
    sumField(Booking, filter, "totalGuests"),
    sumField(Booking, filter, "adults"),
    sumField(Booking, filter, "children"),
    countByDate(Booking, filter, "createdAt", 14),
    countDocuments(Booking, {
      ...filter,
      bookingStatus: "reserved",
      checkInDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 7 * DAY_IN_MS),
      },
    }),
    countDocuments(Booking, {
      ...filter,
      bookingStatus: "checked_in",
      checkOutDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 7 * DAY_IN_MS),
      },
    }),
    sumField(Booking, { ...filter, paymentStatus: "paid" }, "totalAmount"),
    sumField(Booking, { ...filter, paymentStatus: "pending" }, "totalAmount"),
  ]);

  const averageGuestCount = totalBookings > 0 ? averageGuests.total / totalBookings : 0;
  const averageAdultsPerBooking = totalBookings > 0 ? averageAdults.total / totalBookings : 0;
  const averageChildrenPerBooking = totalBookings > 0 ? averageChildren.total / totalBookings : 0;
  const averageStayNights = averageStay.average ? averageStay.average / 1440 : 0;

  return {
    totalBookings,
    byStatus,
    byType,
    byPaymentStatus,
    bookingsToday,
    bookingsThisWeek,
    bookingsThisMonth,
    averageStayMinutes: averageStay.average || 0,
    averageStayNights,
    averageGuestCount,
    averageAdultsPerBooking,
    averageChildrenPerBooking,
    bookingsByDay,
    upcomingCheckIns,
    upcomingCheckOuts,
    paidRevenue: paidRevenue.total,
    pendingRevenue: pendingRevenue.total,
  };
};

const buildGuestMetrics = async (businessId) => {
  const filter = getBusinessFilter(businessId);

  const [
    totalGuests,
    activeGuests,
    checkedInGuests,
    vipGuests,
    corporateGuests,
    telegramConnectedGuests,
    guestsWithParking,
    guestsWithSpecialRequests,
    guestTypes,
    repeatGuestRows,
  ] = await Promise.all([
    countDocuments(Guest, filter),
    countDocuments(Guest, { ...filter, isActive: true }),
    countDocuments(Guest, { ...filter, isCheckedIn: true }),
    countDocuments(Guest, { ...filter, guestType: "vip" }),
    countDocuments(Guest, { ...filter, guestType: "corporate" }),
    countDocuments(Guest, { ...filter, telegramChatId: { $ne: null } }),
    countDocuments(Guest, { ...filter, vehicleNumber: { $ne: null } }),
    countDocuments(Guest, { ...filter, "preferences.specialNeeds": { $ne: "" } }),
    groupCount(Guest, filter, "guestType"),
    Booking.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$guestId",
          bookingCount: { $sum: 1 },
        },
      },
      { $match: { bookingCount: { $gt: 1 } } },
      { $count: "count" },
    ]),
  ]);

  const repeatGuests = repeatGuestRows[0]?.count || 0;

  return {
    totalGuests,
    activeGuests,
    checkedInGuests,
    vipGuests,
    corporateGuests,
    telegramConnectedGuests,
    guestsWithParking,
    guestsWithSpecialRequests,
    guestTypes,
    repeatGuests,
  };
};

const buildRoomMetrics = async (businessId) => {
  const filter = getBusinessFilter(businessId);

  const [
    totalRooms,
    activeRooms,
    availableRooms,
    reservedRooms,
    occupiedRooms,
    blockedRooms,
    housekeepingStatuses,
    maintenanceStatuses,
    roomTypes,
    floorDistribution,
    roomsNeedingAttention,
  ] = await Promise.all([
    countDocuments(Room, filter),
    countDocuments(Room, { ...filter, isActive: true }),
    countDocuments(Room, { ...filter, occupancyStatus: "available" }),
    countDocuments(Room, { ...filter, occupancyStatus: "reserved" }),
    countDocuments(Room, { ...filter, occupancyStatus: "occupied" }),
    countDocuments(Room, { ...filter, occupancyStatus: "blocked" }),
    groupCount(Room, filter, "housekeepingStatus"),
    groupCount(Room, filter, "maintenanceStatus"),
    groupCount(Room, filter, "roomType"),
    groupCount(Room, filter, "floor"),
    countDocuments(Room, {
      ...filter,
      $or: [
        { housekeepingStatus: { $ne: "clean" } },
        { maintenanceStatus: { $ne: "operational" } },
      ],
    }),
  ]);

  return {
    totalRooms,
    activeRooms,
    availableRooms,
    reservedRooms,
    occupiedRooms,
    blockedRooms,
    housekeepingStatuses,
    maintenanceStatuses,
    roomTypes,
    floorDistribution,
    roomsNeedingAttention,
  };
};

const buildTaskMetrics = async (businessId) => {
  const filter = getBusinessFilter(businessId);

  const [
    totalTasks,
    byStatus,
    byType,
    byPriority,
    byDepartment,
    overdueTasks,
    completedTasks,
    completedToday,
    averageCompletion,
  ] = await Promise.all([
    countDocuments(Task, filter),
    groupCount(Task, filter, "status"),
    groupCount(Task, filter, "taskType"),
    groupCount(Task, filter, "priority"),
    groupCount(Task, filter, "department"),
    countDocuments(Task, {
      ...filter,
      expectedCompletionTime: { $ne: null, $lt: new Date() },
      status: { $nin: ["completed", "cancelled"] },
    }),
    countDocuments(Task, { ...filter, status: "completed" }),
    countDocuments(Task, {
      ...filter,
      status: "completed",
      completedAt: { $gte: getPeriodStart(1) },
    }),
    averageDurationMinutes(Task, filter, "startedAt", "completedAt"),
  ]);

  return {
    totalTasks,
    byStatus,
    byType,
    byPriority,
    byDepartment,
    overdueTasks,
    completedTasks,
    completedToday,
    averageCompletionMinutes: averageCompletion.average || 0,
    averageCompletionCount: averageCompletion.count || 0,
  };
};

const buildComplaintMetrics = async (businessId) => {
  const filter = getBusinessFilter(businessId);

  const [
    totalComplaints,
    byStatus,
    byCategory,
    bySeverity,
    openComplaints,
    resolvedComplaints,
    urgentComplaints,
    averageResolution,
    openOlderThan24Hours,
  ] = await Promise.all([
    countDocuments(Complaint, filter),
    groupCount(Complaint, filter, "status"),
    groupCount(Complaint, filter, "category"),
    groupCount(Complaint, filter, "severity"),
    countDocuments(Complaint, { ...filter, status: { $in: ["open", "assigned", "in_progress"] } }),
    countDocuments(Complaint, { ...filter, status: { $in: ["resolved", "closed"] } }),
    countDocuments(Complaint, { ...filter, severity: "urgent" }),
    averageDurationMinutes(Complaint, filter, "createdAt", "resolvedAt"),
    countDocuments(Complaint, {
      ...filter,
      status: { $in: ["open", "assigned", "in_progress"] },
      createdAt: { $lt: getPeriodStart(1) },
    }),
  ]);

  return {
    totalComplaints,
    byStatus,
    byCategory,
    bySeverity,
    openComplaints,
    resolvedComplaints,
    urgentComplaints,
    openOlderThan24Hours,
    averageResolutionMinutes: averageResolution.average || 0,
    averageResolutionCount: averageResolution.count || 0,
  };
};

const buildMaintenanceMetrics = async (businessId) => {
  const filter = getBusinessFilter(businessId);

  const [
    totalRequests,
    byStatus,
    byIssueType,
    bySeverity,
    byRoomImpact,
    openRequests,
    resolvedRequests,
    averageResolution,
  ] = await Promise.all([
    countDocuments(MaintenanceRequest, filter),
    groupCount(MaintenanceRequest, filter, "status"),
    groupCount(MaintenanceRequest, filter, "issueType"),
    groupCount(MaintenanceRequest, filter, "severity"),
    groupCount(MaintenanceRequest, filter, "roomStatusImpact"),
    countDocuments(MaintenanceRequest, { ...filter, status: { $in: ["open", "assigned", "in_progress"] } }),
    countDocuments(MaintenanceRequest, { ...filter, status: { $in: ["resolved", "closed"] } }),
    averageDurationMinutes(MaintenanceRequest, filter, "createdAt", "resolvedAt"),
  ]);

  return {
    totalRequests,
    byStatus,
    byIssueType,
    bySeverity,
    byRoomImpact,
    openRequests,
    resolvedRequests,
    averageResolutionMinutes: averageResolution.average || 0,
    averageResolutionCount: averageResolution.count || 0,
  };
};

const buildParkingMetrics = async (businessId) => {
  const filter = getBusinessFilter(businessId);

  const [
    totalSlots,
    byStatus,
    byVehicleType,
    occupiedSlots,
    reservedSlots,
    availableSlots,
    blockedSlots,
    vipSlots,
    averageParkingDuration,
  ] = await Promise.all([
    countDocuments(Parking, filter),
    groupCount(Parking, filter, "status"),
    groupCount(Parking, filter, "vehicleType"),
    countDocuments(Parking, { ...filter, status: "occupied" }),
    countDocuments(Parking, { ...filter, status: "reserved" }),
    countDocuments(Parking, { ...filter, status: "available" }),
    countDocuments(Parking, { ...filter, status: { $in: ["blocked", "maintenance"] } }),
    countDocuments(Parking, { ...filter, isVIPSlot: true }),
    averageDurationMinutes(Parking, filter, "parkedAt", "retrievedAt"),
  ]);

  return {
    totalSlots,
    byStatus,
    byVehicleType,
    occupiedSlots,
    reservedSlots,
    availableSlots,
    blockedSlots,
    vipSlots,
    averageParkingDurationMinutes: averageParkingDuration.average || 0,
    averageParkingDurationCount: averageParkingDuration.count || 0,
  };
};

const buildLuggageMetrics = async (businessId) => {
  const filter = getBusinessFilter(businessId);

  const [
    totalBatches,
    byOverallStatus,
    tokenStatusBreakdown,
    luggagePieces,
    deliveredBatches,
    completedBatches,
    averageDelivery,
  ] = await Promise.all([
    countDocuments(Luggage, filter),
    groupCount(Luggage, filter, "overallStatus"),
    Luggage.aggregate([
      { $match: filter },
      { $unwind: "$luggageTokens" },
      {
        $group: {
          _id: "$luggageTokens.status",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]).then((rows) => rows.map((row) => ({ value: row._id, label: row._id ?? "unassigned", count: row.count }))),
    sumField(Luggage, filter, "luggageCount"),
    countDocuments(Luggage, { ...filter, overallStatus: { $in: ["delivered", "completed"] } }),
    countDocuments(Luggage, { ...filter, overallStatus: "completed" }),
    averageDurationMinutes(Luggage, filter, "pickedUpAt", "deliveredAt"),
  ]);

  return {
    totalBatches,
    byOverallStatus,
    tokenStatusBreakdown,
    luggagePieces: luggagePieces.total,
    deliveredBatches,
    completedBatches,
    averageDeliveryMinutes: averageDelivery.average || 0,
    averageDeliveryCount: averageDelivery.count || 0,
  };
};

const buildFoodOrderMetrics = async (businessId) => {
  const filter = getBusinessFilter(businessId);

  const [
    totalOrders,
    byStatus,
    byMealType,
    pendingOrders,
    confirmedOrders,
    completedOrders,
    cancelledOrders,
    averageFulfillment,
    ordersToday,
  ] = await Promise.all([
    countDocuments(FoodOrder, filter),
    groupCount(FoodOrder, filter, "status"),
    groupCount(FoodOrder, filter, "mealType"),
    countDocuments(FoodOrder, { ...filter, status: "pending" }),
    countDocuments(FoodOrder, { ...filter, status: "confirmed" }),
    countDocuments(FoodOrder, { ...filter, status: "completed" }),
    countDocuments(FoodOrder, { ...filter, status: "cancelled" }),
    averageDurationMinutes(FoodOrder, filter, "createdAt", "completedAt"),
    countDocuments(FoodOrder, { ...filter, createdAt: { $gte: getPeriodStart(1) } }),
  ]);

  return {
    totalOrders,
    byStatus,
    byMealType,
    pendingOrders,
    confirmedOrders,
    completedOrders,
    cancelledOrders,
    ordersToday,
    averageFulfillmentMinutes: averageFulfillment.average || 0,
    averageFulfillmentCount: averageFulfillment.count || 0,
  };
};

const buildRevenueMetrics = async (businessId) => {
  const filter = getBusinessFilter(businessId);

  const [paid, pending, refunded, paymentBreakdown, revenueByDay, revenueByMonth] = await Promise.all([
    sumField(Booking, { ...filter, paymentStatus: "paid" }, "totalAmount"),
    sumField(Booking, { ...filter, paymentStatus: "pending" }, "totalAmount"),
    sumField(Booking, { ...filter, paymentStatus: "refunded" }, "totalAmount"),
    groupCount(Booking, filter, "paymentStatus"),
    Booking.aggregate([
      {
        $match: {
          ...filter,
          createdAt: { $gte: getPeriodStart(14) },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          revenue: { $sum: "$totalAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]).then((rows) => rows.map((row) => ({ date: row._id, revenue: row.revenue }))),
    Booking.aggregate([
      {
        $match: {
          ...filter,
          createdAt: { $gte: getPeriodStart(180) },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m",
              date: "$createdAt",
            },
          },
          revenue: { $sum: "$totalAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]).then((rows) => rows.map((row) => ({ month: row._id, revenue: row.revenue }))),
  ]);

  return {
    paidRevenue: paid.total,
    pendingRevenue: pending.total,
    refundedRevenue: refunded.total,
    paymentBreakdown,
    revenueByDay,
    revenueByMonth,
  };
};

const buildStaffMetrics = async (businessId) => {
  const filter = getBusinessFilter(businessId);

  const [
    totalStaff,
    byRole,
    byDepartment,
    byCurrentStatus,
    activeStaff,
    busyStaff,
    offlineStaff,
    onLeaveStaff,
    staffDirectory,
    topTaskLoad,
  ] = await Promise.all([
    countDocuments(Staff, filter),
    groupCount(Staff, filter, "role"),
    groupCount(Staff, filter, "department"),
    groupCount(Staff, filter, "currentStatus"),
    countDocuments(Staff, { ...filter, currentStatus: "active" }),
    countDocuments(Staff, { ...filter, currentStatus: "busy" }),
    countDocuments(Staff, { ...filter, currentStatus: "offline" }),
    countDocuments(Staff, { ...filter, currentStatus: "on_leave" }),
    Staff.find(filter)
      .select("fullName role department shift employeeId currentStatus phone email isAvailable telegramChatId createdAt")
      .sort({ fullName: 1 })
      .then((rows) => rows.map((staff) => ({
        id: staff._id,
        fullName: staff.fullName,
        role: staff.role,
        department: staff.department,
        shift: staff.shift,
        employeeId: staff.employeeId,
        currentStatus: staff.currentStatus,
        phone: staff.phone,
        email: staff.email,
        isAvailable: staff.isAvailable,
        telegramChatId: staff.telegramChatId,
        createdAt: staff.createdAt,
      }))),
    Task.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$assignedTo",
          taskCount: { $sum: 1 },
          openTaskCount: {
            $sum: {
              $cond: [
                { $in: ["$status", ["pending", "assigned", "accepted", "in_progress", "delayed", "escalated"]] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { taskCount: -1 } },
      { $limit: 10 },
    ]).then(async (rows) => {
      const staffIds = rows.map((row) => row._id);
      const staffMembers = await Staff.find({ _id: { $in: staffIds } }).select("fullName role department currentStatus employeeId");
      const staffMap = new Map(staffMembers.map((staff) => [String(staff._id), staff]));

      return rows.map((row) => {
        const staff = staffMap.get(String(row._id)) || null;

        return {
          staffId: row._id,
          taskCount: row.taskCount,
          openTaskCount: row.openTaskCount,
          staff: staff
            ? {
                id: staff._id,
                fullName: staff.fullName,
                role: staff.role,
                department: staff.department,
                currentStatus: staff.currentStatus,
                employeeId: staff.employeeId,
              }
            : null,
        };
      });
    }),
  ]);

  return {
    totalStaff,
    byRole,
    byDepartment,
    byCurrentStatus,
    activeStaff,
    busyStaff,
    offlineStaff,
    onLeaveStaff,
    staffDirectory,
    topTaskLoad,
  };
};

const buildAllMetrics = async (businessId) => {
  const [overview, bookings, guests, rooms, tasks, complaints, maintenance, parking, luggage, foodOrders, staff, revenue] = await Promise.all([
    buildOverviewMetrics(businessId),
    buildBookingMetrics(businessId),
    buildGuestMetrics(businessId),
    buildRoomMetrics(businessId),
    buildTaskMetrics(businessId),
    buildComplaintMetrics(businessId),
    buildMaintenanceMetrics(businessId),
    buildParkingMetrics(businessId),
    buildLuggageMetrics(businessId),
    buildFoodOrderMetrics(businessId),
    buildStaffMetrics(businessId),
    buildRevenueMetrics(businessId),
  ]);

  return {
    overview,
    bookings,
    guests,
    rooms,
    tasks,
    complaints,
    maintenance,
    parking,
    luggage,
    foodOrders,
    staff,
    revenue,
  };
};

const sendMetrics = async (res, businessId, loader) => {
  const data = await loader(businessId);

  return res.status(200).json({
    success: true,
    generatedAt: new Date().toISOString(),
    businessId,
    data,
  });
};

const getMetricsCatalog = async (req, res) => {
  const businessId = getBusinessId(req);

  if (!businessId) {
    return res.status(403).json({
      success: false,
      message: "Business context not found",
    });
  }

  return res.status(200).json({
    success: true,
    generatedAt: new Date().toISOString(),
    businessId,
    endpoints: [
      { method: "GET", path: "/api/v1/admin/metrics", description: "Full analytics payload" },
      { method: "GET", path: "/api/v1/admin/overview", description: "High-level KPI cards" },
      { method: "GET", path: "/api/v1/admin/bookings", description: "Booking analytics" },
      { method: "GET", path: "/api/v1/admin/guests", description: "Guest analytics" },
      { method: "GET", path: "/api/v1/admin/rooms", description: "Room analytics" },
      { method: "GET", path: "/api/v1/admin/tasks", description: "Task analytics" },
      { method: "GET", path: "/api/v1/admin/complaints", description: "Complaint analytics" },
      { method: "GET", path: "/api/v1/admin/maintenance", description: "Maintenance analytics" },
      { method: "GET", path: "/api/v1/admin/parking", description: "Parking analytics" },
      { method: "GET", path: "/api/v1/admin/luggage", description: "Luggage analytics" },
      { method: "GET", path: "/api/v1/admin/food-orders", description: "Food order analytics" },
      { method: "GET", path: "/api/v1/admin/staff", description: "Staff analytics" },
      { method: "GET", path: "/api/v1/admin/revenue", description: "Revenue analytics" },
    ],
  });
};

const getAdminMetrics = async (req, res) => {
  const businessId = getBusinessId(req);

  if (!businessId) {
    return res.status(403).json({
      success: false,
      message: "Business context not found",
    });
  }

  return sendMetrics(res, businessId, buildAllMetrics);
};

const getOverview = async (req, res) => {
  const businessId = getBusinessId(req);

  if (!businessId) {
    return res.status(403).json({
      success: false,
      message: "Business context not found",
    });
  }

  return sendMetrics(res, businessId, async (id) => ({
    overview: await buildOverviewMetrics(id),
  }));
};

const getBookings = async (req, res) => {
  const businessId = getBusinessId(req);

  if (!businessId) {
    return res.status(403).json({
      success: false,
      message: "Business context not found",
    });
  }

  return sendMetrics(res, businessId, async (id) => ({
    bookings: await buildBookingMetrics(id),
  }));
};

const getGuests = async (req, res) => {
  const businessId = getBusinessId(req);

  if (!businessId) {
    return res.status(403).json({
      success: false,
      message: "Business context not found",
    });
  }

  return sendMetrics(res, businessId, async (id) => ({
    guests: await buildGuestMetrics(id),
  }));
};

const getRooms = async (req, res) => {
  const businessId = getBusinessId(req);

  if (!businessId) {
    return res.status(403).json({
      success: false,
      message: "Business context not found",
    });
  }

  return sendMetrics(res, businessId, async (id) => ({
    rooms: await buildRoomMetrics(id),
  }));
};

const getTasks = async (req, res) => {
  const businessId = getBusinessId(req);

  if (!businessId) {
    return res.status(403).json({
      success: false,
      message: "Business context not found",
    });
  }

  return sendMetrics(res, businessId, async (id) => ({
    tasks: await buildTaskMetrics(id),
  }));
};

const getComplaints = async (req, res) => {
  const businessId = getBusinessId(req);

  if (!businessId) {
    return res.status(403).json({
      success: false,
      message: "Business context not found",
    });
  }

  return sendMetrics(res, businessId, async (id) => ({
    complaints: await buildComplaintMetrics(id),
  }));
};

const getMaintenance = async (req, res) => {
  const businessId = getBusinessId(req);

  if (!businessId) {
    return res.status(403).json({
      success: false,
      message: "Business context not found",
    });
  }

  return sendMetrics(res, businessId, async (id) => ({
    maintenance: await buildMaintenanceMetrics(id),
  }));
};

const getParking = async (req, res) => {
  const businessId = getBusinessId(req);

  if (!businessId) {
    return res.status(403).json({
      success: false,
      message: "Business context not found",
    });
  }

  return sendMetrics(res, businessId, async (id) => ({
    parking: await buildParkingMetrics(id),
  }));
};

const getLuggage = async (req, res) => {
  const businessId = getBusinessId(req);

  if (!businessId) {
    return res.status(403).json({
      success: false,
      message: "Business context not found",
    });
  }

  return sendMetrics(res, businessId, async (id) => ({
    luggage: await buildLuggageMetrics(id),
  }));
};

const getFoodOrders = async (req, res) => {
  const businessId = getBusinessId(req);

  if (!businessId) {
    return res.status(403).json({
      success: false,
      message: "Business context not found",
    });
  }

  return sendMetrics(res, businessId, async (id) => ({
    foodOrders: await buildFoodOrderMetrics(id),
  }));
};

const getStaff = async (req, res) => {
  const businessId = getBusinessId(req);

  if (!businessId) {
    return res.status(403).json({
      success: false,
      message: "Business context not found",
    });
  }

  return sendMetrics(res, businessId, async (id) => ({
    staff: await buildStaffMetrics(id),
  }));
};

const getRevenue = async (req, res) => {
  const businessId = getBusinessId(req);

  if (!businessId) {
    return res.status(403).json({
      success: false,
      message: "Business context not found",
    });
  }

  const revenue = await buildRevenueMetrics(businessId);

  return res.status(200).json({
    success: true,
    generatedAt: new Date().toISOString(),
    businessId,
    data: {
      revenue,
    },
  });
};

const getBookingsList = async (req, res) => {
  try {
    const businessId = getBusinessId(req);

    if (!businessId) {
      return res.status(403).json({
        success: false,
        message: "Business context not found",
      });
    }

    const filter = getBusinessFilter(businessId);

    // Fetch bookings with guest information
    const bookings = await Booking.find(filter)
      .populate("guestId", "fullName phone email")
      .sort({ createdAt: -1 })
      .lean();

    // Map to include guest details at top level for easier access
    const bookingsList = bookings.map((booking) => ({
      _id: booking._id,
      bookingId: booking.bookingId,
      guestName: booking.guestId?.fullName || "N/A",
      guestPhone: booking.guestId?.phone || "N/A",
      guestEmail: booking.guestId?.email || "N/A",
      roomNumber: booking.roomNumber || "N/A",
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      status: booking.bookingStatus,
      bookingType: booking.bookingType,
      paymentStatus: booking.paymentStatus,
      totalAmount: booking.totalAmount,
      totalGuests: booking.totalGuests,
      createdAt: booking.createdAt,
    }));

    return res.status(200).json({
      success: true,
      generatedAt: new Date().toISOString(),
      businessId,
      data: {
        bookings: bookingsList,
        total: bookingsList.length,
      },
    });
  } catch (err) {
    console.error("Error fetching bookings list:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
    });
  }
};

module.exports = {
  getMetricsCatalog,
  getAdminMetrics,
  getOverview,
  getBookings,
  getBookingsList,
  getGuests,
  getRooms,
  getTasks,
  getComplaints,
  getMaintenance,
  getParking,
  getLuggage,
  getFoodOrders,
  getStaff,
  getRevenue,
};