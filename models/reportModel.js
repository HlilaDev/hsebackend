const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["weekly", "monthly", "yearly", "audit", "custom"],
      required: true,
      trim: true,
    },

    title: {
      type: String,
      trim: true,
      default: "",
    },

    startDate: {
      type: Date,
      default: null,
    },

    endDate: {
      type: Date,
      default: null,
    },

    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
      default: null,
    },

    metrics: {
      totalIncidents: { type: Number, default: 0 },
      totalObservations: { type: Number, default: 0 },
      complianceRate: { type: Number, default: 0 },
    },

    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    isAutomatic: {
      type: Boolean,
      default: true,
    },

    exportUrl: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema);