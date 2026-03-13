const mongoose = require("mongoose");

const sensorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
    },

    type: {
      type: String,
      required: true,
      trim: true,
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    device: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      required: true,
      index: true,
    },

    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
      required: true,
      index: true,
    },

    threshold: {
      type: Number,
      default: null,
    },

    unit: {
      type: String,
      default: null,
      trim: true,
    },

    status: {
      type: String,
      enum: ["online", "offline", "maintenance"],
      default: "offline",
      index: true,
    },

    lastSeen: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Un capteur avec le même nom unique par device dans une company
sensorSchema.index({ company: 1, device: 1, name: 1 }, { unique: true });

// Index utiles
sensorSchema.index({ company: 1, zone: 1, type: 1 });
sensorSchema.index({ company: 1, status: 1, lastSeen: -1 });
sensorSchema.index({ company: 1, device: 1 });

module.exports = mongoose.model("Sensor", sensorSchema);