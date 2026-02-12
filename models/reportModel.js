const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["weekly", "monthly", "yearly", "audit", "custom"],
      required: true,
    },

    title: {
      type: String,
    },

    startDate: Date,
    endDate: Date,

    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
    },

    metrics: {
      totalIncidents: { type: Number, default: 0 },
      totalObservations: { type: Number, default: 0 },
      complianceRate: Number,
    },

    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    isAutomatic: {
      type: Boolean,
      default: true,
    },

    exportUrl: {
      type: String, // lien vers PDF généré
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema);
