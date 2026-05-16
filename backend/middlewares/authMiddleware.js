const jwt = require("jsonwebtoken");

const Business = require("../models/Business");
const Staff = require("../models/Staff");
const Guest = require("../models/Guest");

const authMiddleware = async (
  req,
  res,
  next
) => {
  try {
    let token;

    // =====================================
    // Extract Token
    // =====================================

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith(
        "Bearer"
      )
    ) {
      token =
        req.headers.authorization.split(" ")[1];
    }

    // =====================================
    // No Token
    // =====================================

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token",
      });
    }

    // =====================================
    // Verify Token
    // =====================================

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // =====================================
    // BUSINESS AUTH
    // =====================================

    if (decoded.role === "business") {
      const business =
        await Business.findById(
          decoded.id
        ).select("-password");

      if (!business) {
        return res.status(401).json({
          success: false,
          message: "Business not found",
        });
      }

      req.business = business;

      req.userRole = "business";
    }

    // =====================================
    // STAFF AUTH
    // =====================================

    else if (decoded.role === "staff") {
      const staff = await Staff.findById(
        decoded.id
      ).select("-password");

      if (!staff) {
        return res.status(401).json({
          success: false,
          message: "Staff not found",
        });
      }

      req.staff = staff;

      req.userRole = "staff";
    }

    // =====================================
    // GUEST AUTH
    // =====================================

    else if (decoded.role === "guest") {
      const guest = await Guest.findById(
        decoded.id
      );

      if (!guest) {
        return res.status(401).json({
          success: false,
          message: "Guest not found",
        });
      }

      req.guest = guest;

      req.userRole = "guest";
    }

    // =====================================
    // Invalid Role
    // =====================================

    else {
      return res.status(401).json({
        success: false,
        message: "Invalid token role",
      });
    }

    next();
  } catch (error) {
    console.error(error);

    return res.status(401).json({
      success: false,
      message: "Not authorized",
    });
  }
};

module.exports = authMiddleware;