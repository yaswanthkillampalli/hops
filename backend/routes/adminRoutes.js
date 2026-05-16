const express = require("express");

const authMiddleware = require("../middlewares/authMiddleware");
const { authorizeAccess } = require("../middlewares/roleMiddleware");
const {
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
} = require("../controllers/adminController");

const router = express.Router();
// allow staff with role 'admin' or 'manager', and also allow 'business' users
const adminOrManager = ["admin", "manager", "business"];

router.get("/", authMiddleware, authorizeAccess(adminOrManager), getMetricsCatalog);
router.get("/metrics", authMiddleware, authorizeAccess(adminOrManager), getAdminMetrics);
router.get("/overview", authMiddleware, authorizeAccess(adminOrManager), getOverview);
router.get("/bookings", authMiddleware, authorizeAccess(adminOrManager), getBookings);
router.get("/bookings/list", authMiddleware, authorizeAccess(adminOrManager), getBookingsList);
router.get("/guests", authMiddleware, authorizeAccess(adminOrManager), getGuests);
router.get("/rooms", authMiddleware, authorizeAccess(adminOrManager), getRooms);
router.get("/tasks", authMiddleware, authorizeAccess(adminOrManager), getTasks);
router.get("/complaints", authMiddleware, authorizeAccess(adminOrManager), getComplaints);
router.get("/maintenance", authMiddleware, authorizeAccess(adminOrManager), getMaintenance);
router.get("/parking", authMiddleware, authorizeAccess(adminOrManager), getParking);
router.get("/luggage", authMiddleware, authorizeAccess(adminOrManager), getLuggage);
router.get("/food-orders", authMiddleware, authorizeAccess(adminOrManager), getFoodOrders);
router.get("/staff", authMiddleware, authorizeAccess(adminOrManager), getStaff);
router.get("/revenue", authMiddleware, authorizeAccess(adminOrManager), getRevenue);

module.exports = router;