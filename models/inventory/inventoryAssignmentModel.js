const mongoose = require("mongoose");

const inventoryAssignmentSchema = new mongoose.Schema(
  {
    inventoryItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
      index: true,
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    assignmentType: {
      type: String,
      enum: [
        "individual",   // affecté à une personne
        "temporary",    // temporaire
        "permanent",    // longue durée
        "team",         // équipe
        "zone",         // affecté à une zone
      ],
      default: "individual",
    },

    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
      default: null,
    },

    assignedAt: {
      type: Date,
      default: Date.now,
    },

    expectedReturnDate: {
      type: Date,
      default: null,
    },

    returnedAt: {
      type: Date,
      default: null,
    },

    returnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    returnCondition: {
      type: String,
      enum: ["new", "good", "fair", "poor", "damaged", ""],
      default: "",
    },

    status: {
      type: String,
      enum: ["active", "returned", "overdue", "lost", "damaged", "cancelled"],
      default: "active",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

inventoryAssignmentSchema.index({ company: 1, employee: 1, status: 1 });
inventoryAssignmentSchema.index({ company: 1, inventoryItem: 1, status: 1 });
inventoryAssignmentSchema.index({ company: 1, assignedAt: -1 });

inventoryAssignmentSchema.virtual("isOverdue").get(function () {
  if (!this.expectedReturnDate || this.status !== "active") return false;
  return new Date() > this.expectedReturnDate;
});

module.exports = mongoose.model("InventoryAssignment", inventoryAssignmentSchema);