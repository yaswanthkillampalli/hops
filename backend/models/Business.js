// models/Business.js

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const businessSchema = new mongoose.Schema({
    businessName: {
      type: String,
      required: true,
      trim: true,
    },

    ownerName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    businessType: {
      type: String,
      enum: [
        "hotel",
        "resort",
        "hostel",
        "service_apartment",
      ],
      default: "hotel",
    },

    address: {
      type: String,
      default: "",
    },

    telegramBotToken: {
      type: String,
      default: null,
    },

    subscriptionPlan: {
      type: String,
      enum: ["free", "pro", "enterprise"],
      default: "free",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

businessSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);

  this.password = await bcrypt.hash(
    this.password,
    salt
  );
});

businessSchema.methods.comparePassword =
  async function (enteredPassword) {
    return await bcrypt.compare(
      enteredPassword,
      this.password
    );
  };

module.exports = mongoose.model("Business", businessSchema);