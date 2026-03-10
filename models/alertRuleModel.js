const mongoose = require("mongoose");

const alertRuleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    metric: { type: String, required: true, trim: true }, // temperature, gas, humidity
    operator: {
      type: String,
      enum: [">", ">=", "<", "<=", "==", "!="],
      required: true
    },
    threshold: { type: Number, required: true },
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "warning"
    },
    zone: { type: mongoose.Schema.Types.ObjectId, ref: "Zone" },
    device: { type: mongoose.Schema.Types.ObjectId, ref: "Device" },
    sensor: { type: mongoose.Schema.Types.ObjectId, ref: "Sensor" },
    isActive: { type: Boolean, default: true },
    cooldownSec: { type: Number, default: 300 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("AlertRule", alertRuleSchema);