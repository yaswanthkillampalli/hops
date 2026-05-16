/*
 Flexible authorization middleware

 Usage examples:
 - authorizeAccess(['admin','manager','reception','management'])
	 -> allows staff with role in [admin,manager] OR department in [reception,management]

 - authorizeAccess(['business'])
	 -> allows authenticated business users

 - authorizeAccess(['any'])
	 -> allows any authenticated user (useful when route requires auth but any role is fine)

 The array may include staff roles (admin,manager,supervisor,staff), staff departments
 (reception,management,housekeeping,...), or top-level userRoles (business,guest).
*/

const authorizeAccess = (allowed = []) => {
	// copy to avoid mutation
	const allowedSet = new Set(allowed || []);

	return (req, res, next) => {
		try {
			// If allowed contains 'any' then permit any authenticated user
			if (allowedSet.has("any")) return next();

			// If request carries staff info, check both role and department
			if (req.userRole === "staff" && req.staff) {
				const staffRole = req.staff.role || "staff";
				const staffDept = req.staff.department || null;

				if (allowedSet.has(staffRole) || (staffDept && allowedSet.has(staffDept))) {
					return next();
				}

				return res.status(403).json({
					success: false,
					message: "Forbidden: insufficient staff role/department",
				});
			}

			// Business user check
			if (req.userRole === "business" && allowedSet.has("business")) {
				return next();
			}

			// Guest user check
			if (req.userRole === "guest" && allowedSet.has("guest")) {
				return next();
			}

			return res.status(403).json({
				success: false,
				message: "Forbidden: unauthorized role",
			});
		} catch (error) {
			console.error(error);
			return res.status(500).json({ success: false, message: "Server Error" });
		}
	};
};

module.exports = { authorizeAccess };
