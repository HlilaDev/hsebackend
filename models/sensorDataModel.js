const mongoose = require("mongoose");

const sensorDataSchema = new mongoose.Schema(
  {
    sensor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sensor",
      required: true,
    },

    value: {
      type: Number,
      required: true,
    },

    unit: {
      type: String,
    },

    isAlert: {
      type: Boolean,
      default: false,
    },

    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SensorData", sensorDataSchema);