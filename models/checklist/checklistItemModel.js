const mongoose = require("mongoose");
const checklistItemSchema = new mongoose.Schema(
  {
    checklist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChecklistTemplate",
      required: true,
    },

    label: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["boolean", "text", "number"],
      default: "boolean",
    },

    isRequired: {
      type: Boolean,
      default: true,
    },

    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChecklistItem", checklistItemSchema);