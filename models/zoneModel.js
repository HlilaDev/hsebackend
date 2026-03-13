const mongoose = require("mongoose");

const zoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    riskLevel: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    roi: {
      x1: { type: Number, default: 0 },
      y1: { type: Number, default: 0 },
      x2: { type: Number, default: 0 },
      y2: { type: Number, default: 0 },
    },

    ppeRules: {
      helmet: { type: Boolean, default: false },
      vest: { type: Boolean, default: false },
      gloves: { type: Boolean, default: false },
      boots: { type: Boolean, default: false },
      glasses: { type: Boolean, default: false },
    },

    configVersion: {
      type: Number,
      default: 1,
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

zoneSchema.index({ company: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Zone", zoneSchema);