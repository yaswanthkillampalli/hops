const express = require("express");

const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const { authorizeAccess } = require("../middlewares/roleMiddleware");

const {
  telegramWebhook,
  getVehicleInfo,
  sendManualTelegramMessage,
} = require(
  "../controllers/telegramController"
);

router.post(
  "/webhook",
  telegramWebhook
);

router.post(
  "/getVehicleInfo",
  getVehicleInfo
);

router.post(
  "/send-message",
  authMiddleware,
  authorizeAccess(["business", "admin", "manager", "supervisor", "staff"]),
  sendManualTelegramMessage
);



module.exports = router;