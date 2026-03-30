const mongoose = require("mongoose");

const checklistExecutionSchema = new mongoose.Schema(
  {
    checklist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChecklistTemplate",
      required: true,
    },

    title: {
      type: String,
      trim: true,
      required: true,
    },

    inspectionType: {
      type: String,
      enum: ["routine", "planned", "surprise", "incident_followup", "audit", "other"],
      default: "routine",
    },

    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    observers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
      default: null,
    },

    scheduledAt: {
      type: Date,
      default: null,
    },

    dueDate: {
      type: Date,
      default: null,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },

    riskLevel: {
      type: String,
      enum: ["low", "moderate", "high", "critical"],
      default: "low",
    },

    relatedDevices: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Device",
      },
    ],

    status: {
      type: String,
      enum: ["draft", "scheduled", "in_progress", "completed", "cancelled"],
      default: "draft",
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    attachments: [
      {
        name: String,
        url: String,
      },
    ],

    score: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChecklistExecution", checklistExecutionSchema);