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
      unique: true,
      sparse: true,
      trim: true,
    },

    department: {
      type: String,
      trim: true,
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    jobTitle: {
      type: String,
      trim: true,
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

// Index
employeeSchema.index({ fullName: 1 });
employeeSchema.index({ department: 1 });
employeeSchema.index({ company: 1 });

// Trainings liés
employeeSchema.virtual("trainings", {
  ref: "Training",
  localField: "_id",
  foreignField: "participants.employee",
});

// Toutes les affectations d’inventaire
employeeSchema.virtual("inventoryAssignments", {
  ref: "InventoryAssignment",
  localField: "_id",
  foreignField: "employee",
  options: {
    sort: { assignedAt: -1 },
  },
});

// Seulement les affectations en cours
employeeSchema.virtual("activeInventoryAssignments", {
  ref: "InventoryAssignment",
  localField: "_id",
  foreignField: "employee",
  match: {
    status: { $in: ["active", "overdue"] },
  },
  options: {
    sort: { assignedAt: -1 },
  },
});

module.exports = mongoose.model("Employee", employeeSchema);