const mongoose = require("mongoose");

const findingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
    },
    dueDate: Date,
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: true }
);

const auditSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    type: {
      type: String,
      enum: ["internal", "external", "safety", "environment", "compliance"],
      default: "internal",
    },
    status: {
      type: String,
      enum: ["planned", "in_progress", "completed", "cancelled"],
      default: "planned",
    },
    zone: { type: mongoose.Schema.Types.ObjectId, ref: "Zone" },
    auditor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    scheduledDate: Date,
    completedDate: Date,
    score: { type: Number, min: 0, max: 100 },
    findings: [findingSchema],
    attachments: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Audit", auditSchema);