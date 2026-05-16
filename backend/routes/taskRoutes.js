const express = require("express");

const authMiddleware = require("../middlewares/authMiddleware");
const { authorizeAccess } = require("../middlewares/roleMiddleware");

const {
  createTask,
  getTasks,
  getTaskByTaskId,
  assignTask,
  updateTaskStatus,
  completeTask,
} = require("../controllers/taskController");

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  authorizeAccess(["business", "staff", "manager", "admin"]),
  getTasks
);

router.get(
  "/:taskId",
  authMiddleware,
  authorizeAccess(["business", "staff", "manager", "admin"]),
  getTaskByTaskId
);

router.post(
  "/create",
  authMiddleware,
  authorizeAccess(["business", "manager", "admin"]),
  createTask
);

router.patch(
  "/assign",
  authMiddleware,
  authorizeAccess(["business", "staff", "manager", "admin"]),
  assignTask
);

router.patch(
  "/status",
  authMiddleware,
  authorizeAccess(["business", "staff", "manager", "admin"]),
  updateTaskStatus
);

router.patch(
  "/complete",
  authMiddleware,
  authorizeAccess(["business", "staff", "manager", "admin"]),
  completeTask
);

module.exports = router;
