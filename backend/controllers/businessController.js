const Business = require("../models/Business");
const generateToken = require("../utils/generateToken");
const axios = require("axios");
const registerBusiness = async (req, res) => {
  try {
    const {
      businessName,
      ownerName,
      email,
      password,
      phone,
      businessType,
      address,
    } = req.body;

    // Basic validation
    if (
      !businessName ||
      !ownerName ||
      !email ||
      !password ||
      !phone
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Check existing business
    const existingBusiness = await Business.findOne({
      email,
    });

    if (existingBusiness) {
      return res.status(400).json({
        success: false,
        message: "Business already exists",
      });
    }

    // Create business
    const business = await Business.create({
      businessName,
      ownerName,
      email,
      password,
      phone,
      businessType,
      address,
    });

    const businessData = business.toObject();
    delete businessData.password;

    return res.status(201).json({
      success: true,
      message: "Business registered successfully",
      data: businessData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`,
    });
  }
};

const loginBusiness = async (req, res) => {
  try {
    console.log('Request Recived at loginBusiness with body:', req.body);
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find business
    const business = await Business.findOne({
      email,
    });

    if (!business) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Compare password
    const isMatch =
      await business.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate JWT
    const token = generateToken({
      id: business._id,
      role: "business",
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      business: {
        id: business._id,
        businessName: business.businessName,
        ownerName: business.ownerName,
        email: business.email,
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

const getBusinessProfile = async (
  req,
  res
) => {
  return res.status(200).json({
    success: true,
    business: req.business,
  });
};

const saveTelegramBotToken = async (
  req,
  res
) => {
  try {
    const { telegramBotToken } = req.body;

    if (!telegramBotToken) {
      return res.status(400).json({
        success: false,
        message: "Telegram bot token required",
      });
    }

    const response = await axios.get(
      `https://api.telegram.org/bot${telegramBotToken}/getMe`
    );

    if (!response.data.ok) {
      return res.status(400).json({
        success: false,
        message: "Invalid Telegram bot token",
      });
    }

    // Save token
    req.business.telegramBotToken =
      telegramBotToken;

    await req.business.save();

    return res.status(200).json({
      success: true,
      message:
        "Telegram bot token saved successfully",
      bot: response.data.result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        "Failed to validate Telegram bot token",
    });
  }
};

module.exports = {
  registerBusiness,
  loginBusiness,
  getBusinessProfile,
  saveTelegramBotToken,
};