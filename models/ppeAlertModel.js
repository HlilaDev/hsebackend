const mongoose = require("mongoose");

const ppeAlertSchema = new mongoose.Schema(
  {
    device: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      required: true,
      index: true,
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },

    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
      default: null,
      index: true,
    },

    alertType: {
      type: String,
      enum: ["no_helmet", "no_vest", "zone_intrusion", "ppe_violation"],
      required: true,
      default: "ppe_violation",
      index: true,
    },

    label: {
      type: String,
      trim: true,
      default: "",
    },

    confidence: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },

    cameraId: {
      type: String,
      trim: true,
      default: "",
    },

    siteId: {
      type: String,
      trim: true,
      default: "",
    },

    deviceId: {
      type: String,
      trim: true,
      required: true,
      index: true,
    },

    snapshotPath: {
      type: String,
      trim: true,
      default: "",
    },

    source: {
      type: String,
      trim: true,
      default: "raspberrypi-yolo",
    },

    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },

    status: {
      type: String,
      enum: ["open", "acknowledged", "resolved", "false_positive"],
      default: "open",
      index: true,
    },
    
reviewedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null,
},
reviewedAt: {
  type: Date,
  default: null,
},

    bbox: {
      x1: {
        type: Number,
        default: 0,
      },
      y1: {
        type: Number,
        default: 0,
      },
      x2: {
        type: Number,
        default: 0,
      },
      y2: {
        type: Number,
        default: 0,
      },
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

ppeAlertSchema.index({ company: 1, status: 1, createdAt: -1 });
ppeAlertSchema.index({ zone: 1, status: 1, createdAt: -1 });
ppeAlertSchema.index({ device: 1, createdAt: -1 });
ppeAlertSchema.index({ alertType: 1, timestamp: -1 });

module.exports = mongoose.model("PpeAlert", ppeAlertSchema);