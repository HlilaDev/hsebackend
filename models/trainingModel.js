// models/trainingModel.js
const mongoose = require("mongoose");

const trainingSchema = new mongoose.Schema(
  {
    title: { 
      type: String, 
      required: true, 
      trim: true 
    },

    description: { 
      type: String, 
      trim: true 
    },

    category: {
      type: String,
      enum: ["safety", "environment", "quality", "security", "other"],
      default: "safety",
    },

    provider: { 
      type: String, 
      trim: true 
    },

    location: { 
      type: String, 
      trim: true 
    },

    startDate: { 
      type: Date, 
      required: true 
    },

    endDate: { 
      type: Date 
    },

    // 👇 PARTICIPANTS = EMPLOYEES (pas User)
    participants: [
      {
        employee: { 
          type: mongoose.Schema.Types.ObjectId, 
          ref: "Employee", 
          required: true 
        },

        status: {
          type: String,
          enum: ["planned", "attended", "passed", "failed"],
          default: "planned",
        },

        score: { 
          type: Number, 
          min: 0, 
          max: 100 
        },

        validUntil: { 
          type: Date 
        },

        note: { 
          type: String, 
          trim: true 
        },
      },
    ],

    // Qui a créé la formation dans l'app
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },

    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled",
    },
  },
  { timestamps: true }
);

// Index utiles
trainingSchema.index({ title: 1, startDate: -1 });
trainingSchema.index({ "participants.employee": 1 });
trainingSchema.index({ status: 1 });

module.exports = mongoose.model("Training", trainingSchema);
