const mongoose = require("mongoose");

const incidentEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true, // NO_HELMET, GAS_ALERT...
    },

    sourceType: {
      type: String,
      enum: ["camera", "sensor"],
      required: true,
    },

    device: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeviceModel",
    },

    reading: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReadingModel",
    },

    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
    },

    confidenceScore: {
      type: Number, // pour YOLO
    },

    evidence: {
      imageUrl: String,
      videoUrl: String,
    },

    status: {
      type: String,
      enum: ["open", "reviewed", "closed", "false_positive"],
      default: "open",
    },

    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    resolvedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("IncidentEvent", incidentEventSchema);
