const express = require("express");
const router = express.Router();

const {
  createFoodOrder,
  updateFoodOrderTiming,
} = require("../controllers/foodOrderController");

const authMiddleware = require("../middlewares/authMiddleware");
const { authorizeAccess } = require("../middlewares/roleMiddleware");

// Create new food order
router.post(
  "/create",
  authMiddleware,
  authorizeAccess([
    "reception",
    "supervisor",
    "manager",
    "admin",
  ]),
  createFoodOrder
);

// Update food order timing
router.put(
  "/update-timing",
  authMiddleware,
  authorizeAccess([
    "reception",
    "supervisor",
    "manager",
    "admin",
  ]),
  updateFoodOrderTiming
);

module.exports = router;
