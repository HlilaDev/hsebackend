const mongoose = require("mongoose");

const inventoryInspectionSchema = new mongoose.Schema(
  {
    inventoryItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
      index: true,
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    inspectionType: {
      type: String,
      enum: [
        "routine",
        "periodic",
        "pre_use",
        "post_incident",
        "maintenance_check",
        "compliance",
      ],
      default: "routine",
    },

    inspectionDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    inspectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
      default: null,
    },

    result: {
      type: String,
      enum: ["pass", "fail", "warning", "not_applicable"],
      required: true,
    },

    statusBefore: {
      type: String,
      trim: true,
      default: "",
    },

    statusAfter: {
      type: String,
      trim: true,
      default: "",
    },

    condition: {
      type: String,
      enum: ["new", "good", "fair", "poor", "damaged", "expired", ""],
      default: "",
    },

    checklist: [
      {
        label: {
          type: String,
          required: true,
          trim: true,
        },
        value: {
          type: Boolean,
          default: false,
        },
        note: {
          type: String,
          trim: true,
          default: "",
        },
      },
    ],

    observations: {
      type: String,
      trim: true,
      default: "",
    },

    actionsRequired: {
      type: String,
      trim: true,
      default: "",
    },

    nextInspectionDate: {
      type: Date,
      default: null,
    },

    attachments: [
      {
        fileName: {
          type: String,
          trim: true,
        },
        fileUrl: {
          type: String,
          trim: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

inventoryInspectionSchema.index({ company: 1, inspectionDate: -1 });
inventoryInspectionSchema.index({ company: 1, inventoryItem: 1, inspectionDate: -1 });
inventoryInspectionSchema.index({ company: 1, result: 1 });

module.exports = mongoose.model("InventoryInspection", inventoryInspectionSchema);