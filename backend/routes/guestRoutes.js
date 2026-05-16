const express = require("express");

const router = express.Router();

const {
  registerGuest,
  guestLogin
} = require("../controllers/guestController");

const authMiddleware = require(
  "../middlewares/authMiddleware"
);

router.post(
  "/public-register",
  registerGuest
);

router.post("/login", guestLogin);

module.exports = router;