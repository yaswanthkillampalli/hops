const express = require("express");

const authMiddleware = require("../middlewares/authMiddleware");
const { authorizeAccess } = require("../middlewares/roleMiddleware");
const {
	registerStaff,
	loginStaff,
	getStaffProfile,
} = require("../controllers/staffController");

const router = express.Router();

router.post(
	"/register",
	authMiddleware,
	authorizeAccess(["admin", "manager", "supervisor"]),
	registerStaff
);

router.post(
	"/create",
	authMiddleware,
	authorizeAccess(["admin", "manager", "supervisor"]),
	registerStaff
);

router.post("/login", loginStaff);
router.get("/me", authMiddleware, getStaffProfile);

module.exports = router;
