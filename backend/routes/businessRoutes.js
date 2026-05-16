const express = require("express");
const authMiddleware = require(
  "../middlewares/authMiddleware"
);
const router = express.Router();

const {
  registerBusiness,
  loginBusiness,
  getBusinessProfile,
  saveTelegramBotToken
} = require("../controllers/businessController");

router.post("/register", registerBusiness);
router.post("/login", loginBusiness);
router.post(
  "/telegram-token",
  authMiddleware,
  saveTelegramBotToken
);
router.get(
  "/me",
  authMiddleware,
  getBusinessProfile
);

module.exports = router;