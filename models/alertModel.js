const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["threshold_breach", "device_offline", "sensor_fault", "manual"],
      default: "threshold_breach"
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "warning"
    },
    zone: { type: mongoose.Schema.Types.ObjectId, ref: "Zone" },
    device: { type: mongoose.Schema.Types.ObjectId, ref: "Device" },
    sensor: { type: mongoose.Schema.Types.ObjectId, ref: "Sensor" },
    rule: { type: mongoose.Schema.Types.ObjectId, ref: "AlertRule" },
    readingValue: Number,
    threshold: Number,
    status: {
      type: String,
      enum: ["open", "acknowledged", "resolved"],
      default: "open"
    },
    isRead: { type: Boolean, default: false },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    acknowledgedAt: Date,
    resolvedAt: Date
  },
  { timestamps: true }
);

module.exports = mongoose.model("Alert", alertSchema);