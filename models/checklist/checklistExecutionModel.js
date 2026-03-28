const mongoose = require("mongoose");
const checklistExecutionSchema = new mongoose.Schema(
  {
    checklist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChecklistTemplate",
      required: true,
    },

    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
    },

    status: {
      type: String,
      enum: ["draft", "in_progress", "completed"],
      default: "draft",
    },

    score: {
      type: Number,
      default: 0,
    },

    startedAt: Date,
    completedAt: Date,

    notes: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChecklistExecution", checklistExecutionSchema);