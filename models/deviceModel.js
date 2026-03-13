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

    // ✅ relations vers sensors (refs)
    sensors: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Sensor" }
    ],

    status: { type: String, enum: ["online", "offline"], default: "offline" },

    description: { type: String, default: "", trim: true },

    lastSeen: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Device", deviceSchema);