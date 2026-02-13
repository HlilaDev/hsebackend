const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true, trim: true, maxlength: 255 },
    url: { type: String, required: true, trim: true },
    mimeType: { type: String, trim: true }, // image/png, application/pdf...
    size: { type: Number, min: 0 }, // bytes

    // Pour différencier image / pdf / doc etc.
    category: {
      type: String,
      enum: ["image", "pdf", "doc", "video", "other"],
      default: "other",
    },

    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Lien générique vers n'importe quelle entité
    relatedTo: {
      model: {
        type: String,
        required: true,
        enum: ["Observation", "IncidentEvent", "Inspection", "Report", "Action", "Sensor", "Device", "Zone", "User"],
      },
      id: { type: mongoose.Schema.Types.ObjectId, required: true },
    },

    // Optionnel : description courte
    note: { type: String, trim: true, maxlength: 500 },

    // Optionnel : pour soft-delete
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Index utiles
attachmentSchema.index({ "relatedTo.model": 1, "relatedTo.id": 1, isDeleted: 1 });
attachmentSchema.index({ uploadedBy: 1, createdAt: -1 });

module.exports = mongoose.model("Attachment", attachmentSchema);
