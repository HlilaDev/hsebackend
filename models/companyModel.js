const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    industry: {
      type: String,
      default: "",
      trim: true,
    },

    logoUrl: {
      type: String,
      default: "",
      trim: true,
    },

    address: {
      country: { type: String, default: "", trim: true },
      city: { type: String, default: "", trim: true },
      street: { type: String, default: "", trim: true },
      postalCode: { type: String, default: "", trim: true },
    },

    contacts: {
      email: { type: String, default: "", trim: true },
      phone: { type: String, default: "", trim: true },
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Company", companySchema);