const mongoose = require("mongoose");

const inventoryMovementSchema = new mongoose.Schema(
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

    movementType: {
      type: String,
      enum: [
        "in",               // entrée de stock
        "out",              // sortie de stock
        "assignment",       // affectation
        "return",           // retour
        "transfer",         // transfert entre zones
        "adjustment",       // correction manuelle
        "maintenance_out",  // envoyé en maintenance
        "maintenance_in",   // retour de maintenance
        "inspection",
        "loss",
        "damage",
        "archive",
      ],
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
    },

    unit: {
      type: String,
      trim: true,
      default: "unit",
    },

    previousQuantity: {
      type: Number,
      default: null,
      min: 0,
    },

    newQuantity: {
      type: Number,
      default: null,
      min: 0,
    },

    fromZone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
      default: null,
    },

    toZone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
      default: null,
    },

    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    reason: {
      type: String,
      trim: true,
      default: "",
    },

    reference: {
      type: String,
      trim: true,
      default: "",
      // ex: BON-ENTREE-001, AFFECT-2026-03, INSPECT-44
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

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

inventoryMovementSchema.index({ company: 1, movementType: 1, createdAt: -1 });
inventoryMovementSchema.index({ company: 1, inventoryItem: 1, createdAt: -1 });
inventoryMovementSchema.index({ company: 1, employee: 1, createdAt: -1 });

module.exports = mongoose.model("InventoryMovement", inventoryMovementSchema);