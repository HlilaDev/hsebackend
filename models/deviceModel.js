const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    name: {
      type: String,
      default: ""
    },

    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
      required: true
    },

    sensors: [
      {
        type: String,
        trim: true
      }
    ],

    status: {
      type: String,
      enum: ["online", "offline"],
      default: "offline"
    },

    lastSeen: {
      type: Date,
      default: null
    },

    description: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Device", deviceSchema);
