// models/employeeModel.js
const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    employeeId: {
      type: String,
      unique: true, // matricule
      sparse: true, // permet null sans conflit
      trim: true,
    },

    department: {
      type: String,
      trim: true, // ex: Production, Maintenance, HSE
    },

    jobTitle: {
      type: String,
      trim: true, // ex: Soudeur, Cariste...
    },

    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
    },

    phone: {
      type: String,
      trim: true,
    },

    hireDate: {
      type: Date,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Index utile
employeeSchema.index({ fullName: 1 });
employeeSchema.index({ department: 1 });

module.exports = mongoose.model("Employee", employeeSchema);
