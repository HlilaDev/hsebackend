const mongoose = require("mongoose");
const checklistResponseSchema = new mongoose.Schema(
  {
    execution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChecklistExecution",
      required: true,
    },

    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChecklistItem",
      required: true,
    },

    value: {
      type: mongoose.Schema.Types.Mixed, // true / false / text / number
    },

    comment: {
      type: String,
    },

    photo: {
      type: String, // URL image
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChecklistResponse", checklistResponseSchema);