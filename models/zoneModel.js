const mongoose = require("mongoose");

const zoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
      // ex: "Zone A", "Boiler Room"
    },

    description: {
      type: String,
      default: "",
      trim: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Zone", zoneSchema);
