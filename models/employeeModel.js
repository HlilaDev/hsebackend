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

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
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
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index utiles
employeeSchema.index({ fullName: 1 });
employeeSchema.index({ department: 1 });
employeeSchema.index({ company: 1 });

// Virtual: récupère les trainings liés via Training.participants.employee
employeeSchema.virtual("trainings", {
  ref: "Training",
  localField: "_id",
  foreignField: "participants.employee",
});

module.exports = mongoose.model("Employee", employeeSchema);