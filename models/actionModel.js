const mongoose = require("mongoose");

const actionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 5000 },

    // Lien générique vers la source (Observation / IncidentEvent / Inspection / Report...)
    source: {
      model: {
        type: String,
        required: true,
        enum: ["Observation", "IncidentEvent", "Inspection", "Report", "Reading", "Device", "Sensor", "Zone"],
      },
      id: { type: mongoose.Schema.Types.ObjectId, required: true },
    },

    // Assignation
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Suivi
    priority: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
    status: { type: String, enum: ["open", "in_progress", "done", "cancelled"], default: "open" },

    dueDate: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },

    // Clôture + preuve
    completionNote: { type: String, trim: true, maxlength: 2000 },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Optionnel : tags
    tags: [{ type: String, trim: true, lowercase: true, maxlength: 30 }],
  },
  { timestamps: true }
);

// Index utiles
actionSchema.index({ "source.model": 1, "source.id": 1, status: 1 });
actionSchema.index({ assignedTo: 1, status: 1, dueDate: 1 });

module.exports = mongoose.model("Action", actionSchema);
