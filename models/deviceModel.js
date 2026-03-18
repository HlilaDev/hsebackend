const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema(
  {
    // identifiant physique (MQTT) du device
    deviceId: { type: String, required: true, unique: true, trim: true },

    name: { type: String, default: "", trim: true },

    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
      required: true,
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    sensors: [{ type: mongoose.Schema.Types.ObjectId, ref: "Sensor" }],

    status: {
      type: String,
      enum: ["online", "offline", "maintenance"],
      default: "offline",
    },

    description: { type: String, default: "", trim: true },

    lastSeen: { type: Date, default: null },

    ipAddress: { type: String, default: "", trim: true },
    macAddress: { type: String, default: "", trim: true },
    firmware: { type: String, default: "", trim: true },

    uptime: { type: Number, default: 0 },
    memoryUsage: { type: Number, default: 0 },
    cpuTemp: { type: Number, default: 0 },

    networkType: { type: String, default: "", trim: true },
    signal: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Device", deviceSchema);