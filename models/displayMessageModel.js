const mongoose = require("mongoose");

const displayMessageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: "",
    },

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    messageType: {
      type: String,
      enum: ["info", "warning", "alert", "emergency"],
      default: "info",
    },

    priority: {
      type: String,
      enum: ["low", "normal", "high", "critical"],
      default: "normal",
    },

    targetType: {
      type: String,
      enum: ["device", "zone", "broadcast"],
      required: true,
      default: "device",
    },

    targetDevice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      default: null,
    },

    targetZone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
      default: null,
    },

    displayMode: {
      type: String,
      enum: ["once", "repeat", "persistent"],
      default: "once",
    },

    durationSeconds: {
      type: Number,
      default: 10,
      min: 1,
      max: 3600,
    },

    status: {
      type: String,
      enum: [
        "draft",
        "queued",
        "sent",
        "delivered",
        "displayed",
        "failed",
        "expired",
        "cancelled",
      ],
      default: "draft",
    },

    scheduledAt: {
      type: Date,
      default: null,
    },

    sentAt: {
      type: Date,
      default: null,
    },

    displayedAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    mqttTopic: {
      type: String,
      trim: true,
      default: "",
    },

    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

displayMessageSchema.pre("validate", function () {
  if (this.targetType === "device" && !this.targetDevice) {
    throw new Error("targetDevice is required when targetType is 'device'");
  }

  if (this.targetType === "zone" && !this.targetZone) {
    throw new Error("targetZone is required when targetType is 'zone'");
  }

  if (this.targetType === "broadcast") {
    this.targetDevice = null;
    this.targetZone = null;
  }
});

displayMessageSchema.index({ company: 1, status: 1, createdAt: -1 });
displayMessageSchema.index({ targetDevice: 1, createdAt: -1 });
displayMessageSchema.index({ targetZone: 1, createdAt: -1 });
displayMessageSchema.index({ scheduledAt: 1 });
displayMessageSchema.index({ expiresAt: 1 });

module.exports = mongoose.model("DisplayMessage", displayMessageSchema);