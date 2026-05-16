const express = require("express");

const router = express.Router();

const {
  createBooking,
} = require("../controllers/bookingController");

const authMiddleware = require(
  "../middlewares/authMiddleware"
);

router.post(
  "/create",
  createBooking
);

module.exports = router;