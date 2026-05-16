const express = require("express");

const authMiddleware = require("../middlewares/authMiddleware");
const { authorizeAccess } = require("../middlewares/roleMiddleware");

const {
  createLuggage,
  getLuggageDetails,
  updateLuggageStatus,
  assignLuggageStaff,
  completeLuggageDelivery,
} = require("../controllers/luggageController");

const router = express.Router();

router.post(
  "/create",
  authMiddleware,
  authorizeAccess(["reception", "staff", "manager", "admin"]),
  createLuggage
);

router.get(
  "/:bookingId",
  authMiddleware,
  authorizeAccess(["reception", "parking", "housekeeping", "manager", "admin", "guest"]),
  getLuggageDetails
);

router.patch(
  "/status",
  authMiddleware,
  authorizeAccess(["housekeeping", "staff", "manager", "admin"]),
  updateLuggageStatus
);

router.patch(
  "/assign",
  authMiddleware,
  authorizeAccess(["reception", "manager", "admin"]),
  assignLuggageStaff
);

router.patch(
  "/complete",
  authMiddleware,
  authorizeAccess(["housekeeping", "manager", "admin"]),
  completeLuggageDelivery
);

module.exports = router;
