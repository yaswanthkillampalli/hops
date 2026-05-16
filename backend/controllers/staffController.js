const bcrypt = require("bcryptjs");

const Staff = require("../models/Staff");
const generateToken = require("../utils/generateToken");

const roleRank = {
	staff: 1,
	supervisor: 2,
	manager: 3,
	admin: 4,
};

const buildError = (message, statusCode = 400) => {
	const error = new Error(message);
	error.statusCode = statusCode;
	return error;
};

const canCreateRole = ({ creatorRole, creatorDepartment, targetRole, targetDepartment }) => {
	if (creatorRole === "admin") {
		return true;
	}

	if (creatorRole === "manager") {
		return (
			targetDepartment === creatorDepartment &&
			["supervisor", "staff"].includes(targetRole)
		);
	}

	if (creatorRole === "supervisor") {
		return (
			targetDepartment === creatorDepartment &&
			targetRole === "staff"
		);
	}

	return false;
};

const registerStaff = async (req, res) => {
	try {
		const {
			businessId,
			fullName,
			phone,
			email,
			password,
			employeeId,
			department = null,
			role = "staff",
			shift,
		} = req.body;

		const creatorRole = req.staff?.role || null;
		const creatorDepartment = req.staff?.department || null;
		const creatorBusinessId = req.staff?.businessId || null;
		const isSelfServiceSignup = !req.staff;

		if (!isSelfServiceSignup) {
			if (!["admin", "manager", "supervisor"].includes(creatorRole)) {
				throw buildError("Forbidden: insufficient permissions to create staff", 403);
			}

			if (!creatorBusinessId || String(creatorBusinessId) !== String(businessId)) {
				throw buildError("Forbidden: business mismatch", 403);
			}

			if (!canCreateRole({ creatorRole, creatorDepartment, targetRole: role, targetDepartment: department })) {
				throw buildError("Forbidden: you can only create lower-rank staff in your own department", 403);
			}
		}

		if (
			!businessId ||
			!fullName ||
			!phone ||
			!email ||
			!password ||
			!employeeId
		) {
			return res.status(400).json({
				success: false,
				message: "Please provide all required fields",
			});
		}

		const existingStaff = await Staff.findOne({
			$or: [{ email }, { phone }, { employeeId }],
		});

		if (existingStaff) {
			return res.status(400).json({
				success: false,
				message: "Staff already exists",
			});
		}

		const hashedPassword = await bcrypt.hash(password, 10);

		const staff = await Staff.create({
			businessId,
			fullName,
			phone,
			email,
			password: hashedPassword,
			employeeId,
			department,
			role,
			shift,
		});

		const staffData = staff.toObject();
		delete staffData.password;

		return res.status(201).json({
			success: true,
			message: "Staff registered successfully",
			staff: staffData,
		});
	} catch (error) {
		console.error(error);

		return res.status(500).json({
			success: false,
			message: "Server Error",
		});
	}
};

const loginStaff = async (req, res) => {
	try {
		const { email, password } = req.body;

		if (!email || !password) {
			return res.status(400).json({
				success: false,
				message: "Email and password are required",
			});
		}

		const staff = await Staff.findOne({ email });

		if (!staff) {
			return res.status(401).json({
				success: false,
				message: "Invalid credentials",
			});
		}

		const isMatch = await bcrypt.compare(password, staff.password);

		if (!isMatch) {
			return res.status(401).json({
				success: false,
				message: "Invalid credentials",
			});
		}

		const token = generateToken({
			id: staff._id,
			role: "staff",
		});

		return res.status(200).json({
			success: true,
			message: "Login successful",
			token,
			staff: {
				id: staff._id,
				fullName: staff.fullName,
				email: staff.email,
				phone: staff.phone,
				employeeId: staff.employeeId,
				role: staff.role,
				department: staff.department,
			},
		});
	} catch (error) {
		console.error(error);

		return res.status(500).json({
			success: false,
			message: "Server Error",
		});
	}
};

const getStaffProfile = async (req, res) => {
	return res.status(200).json({
		success: true,
		staff: req.staff,
	});
};

module.exports = {
	registerStaff,
	loginStaff,
	getStaffProfile,
};
