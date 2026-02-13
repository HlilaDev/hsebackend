const mongoose = require("mongoose");

const zoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    description: String,

    riskLevel: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // 🎯 ROI (Region Of Interest) pour la caméra
    roi: {
      x1: Number,
      y1: Number,
      x2: Number,
      y2: Number,
    },

    // 🦺 Règles EPI intégrées
    ppeRules: {
      helmet: {
        required: { type: Boolean, default: true },
        minConfidence: { type: Number, default: 0.75 },
      },
      vest: {
        required: { type: Boolean, default: true },
        minConfidence: { type: Number, default: 0.70 },
      },
      gloves: {
        required: { type: Boolean, default: false },
        minConfidence: { type: Number, default: 0.70 },
      },
      glasses: {
        required: { type: Boolean, default: false },
        minConfidence: { type: Number, default: 0.70 },
      },
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Zone", zoneSchema);
