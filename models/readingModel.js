const mongoose = require("mongoose");

const readingSchema = new mongoose.Schema(
  {
    device: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      required: true,
      index: true
    },

    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
      required: true,
      index: true
    },

    sensorType: {
      type: String,
      required: true,
      index: true
    },

    ts: {
      type: Date,
      default: Date.now,
      index: true
    },

    values: {
      type: Object,
      required: true
    },

    raw: {
      type: Object
    }
  },
  { timestamps: true }
);

readingSchema.index({ device: 1, sensorType: 1, ts: -1 });
readingSchema.index({ zone: 1, sensorType: 1, ts: -1 });

module.exports = mongoose.model("Reading", readingSchema);
