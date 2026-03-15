const mongoose = require("mongoose");

const inventoryItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    category: {
      type: String,
      enum: [
        "ppe", // casque, gilet, gants...
        "extinguisher",
        "medical",
        "tool",
        "signage",
        "other",
      ],
      required: true,
    },

    subCategory: {
      type: String,
      trim: true,
      default: "",
      // examples:
      // helmet, vest, gloves, goggles, boots, harness
      // co2, powder, foam
    },

    inventoryCode: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    brand: {
      type: String,
      trim: true,
      default: "",
    },

    model: {
      type: String,
      trim: true,
      default: "",
    },

    serialNumber: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "available",
        "assigned",
        "in_stock",
        "low_stock",
        "maintenance",
        "expired",
        "damaged",
        "lost",
        "out_of_service",
      ],
      default: "available",
    },

    condition: {
      type: String,
      enum: ["new", "good", "fair", "poor", "damaged"],
      default: "good",
    },

    quantity: {
      type: Number,
      default: 1,
      min: 0,
    },

    minStockLevel: {
      type: Number,
      default: 0,
      min: 0,
    },

    unit: {
      type: String,
      trim: true,
      default: "unit",
      // unit, pair, box, pack...
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
      default: null,
      index: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
      index: true,
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    assignedAt: {
      type: Date,
      default: null,
    },

    locationDescription: {
      type: String,
      trim: true,
      default: "",
      // ex: Bloc A - 2ème étage - près de la sortie
    },

    supplier: {
      type: String,
      trim: true,
      default: "",
    },

    purchaseDate: {
      type: Date,
      default: null,
    },

    purchasePrice: {
      type: Number,
      default: null,
      min: 0,
    },

    warrantyUntil: {
      type: Date,
      default: null,
    },

    manufactureDate: {
      type: Date,
      default: null,
    },

    expiryDate: {
      type: Date,
      default: null,
    },

    lastInspectionDate: {
      type: Date,
      default: null,
    },

    nextInspectionDate: {
      type: Date,
      default: null,
    },

    lastMaintenanceDate: {
      type: Date,
      default: null,
    },

    nextMaintenanceDate: {
      type: Date,
      default: null,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    imageUrl: {
      type: String,
      trim: true,
      default: "",
    },

    attachments: [
      {
        fileName: {
          type: String,
          trim: true,
        },
        fileUrl: {
          type: String,
          trim: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // =========================
    // PPE DETAILS
    // =========================
    ppeDetails: {
      size: {
        type: String,
        trim: true,
        default: "",
      },

      color: {
        type: String,
        trim: true,
        default: "",
      },

      material: {
        type: String,
        trim: true,
        default: "",
      },

      gender: {
        type: String,
        enum: ["male", "female", "unisex", ""],
        default: "",
      },

      protectionType: {
        type: String,
        trim: true,
        default: "",
        // ex: head, body, hand, eye, foot, fall, respiratory
      },

      standard: {
        type: String,
        trim: true,
        default: "",
        // ex: EN397, EN ISO 20345...
      },
    },

    // =========================
    // EXTINGUISHER DETAILS
    // =========================
    extinguisherDetails: {
      extinguisherType: {
        type: String,
        trim: true,
        default: "",
        // CO2, powder, foam, water...
      },

      capacity: {
        type: Number,
        default: null,
        min: 0,
      },

      capacityUnit: {
        type: String,
        trim: true,
        default: "kg",
      },

      pressure: {
        type: String,
        trim: true,
        default: "",
      },

      installationDate: {
        type: Date,
        default: null,
      },

      lastRefillDate: {
        type: Date,
        default: null,
      },

      nextRefillDate: {
        type: Date,
        default: null,
      },

      inspectionFrequencyMonths: {
        type: Number,
        default: null,
        min: 1,
      },

      mountingType: {
        type: String,
        trim: true,
        default: "",
        // wall, vehicle, portable...
      },
    },

    // =========================
    // FLEXIBLE EXTRA DATA
    // =========================
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// =========================
// INDEXES
// =========================
inventoryItemSchema.index({ company: 1, category: 1 });
inventoryItemSchema.index({ company: 1, status: 1 });
inventoryItemSchema.index({ company: 1, zone: 1 });
inventoryItemSchema.index({ company: 1, assignedTo: 1 });
inventoryItemSchema.index({ name: "text", inventoryCode: "text", subCategory: "text" });

// =========================
// VIRTUALS
// =========================
inventoryItemSchema.virtual("isExpired").get(function () {
  if (!this.expiryDate) return false;
  return this.expiryDate < new Date();
});

inventoryItemSchema.virtual("isLowStock").get(function () {
  return typeof this.quantity === "number" && this.quantity <= this.minStockLevel;
});

// =========================
// PRE SAVE
// =========================
inventoryItemSchema.pre("save", function () {
  if (this.inventoryCode) {
    this.inventoryCode = this.inventoryCode.trim().toUpperCase();
  }

  if (this.serialNumber) {
    this.serialNumber = this.serialNumber.trim().toUpperCase();
  }

  if (this.category === "extinguisher") {
    this.quantity = 1;
    this.unit = "unit";
  }

  if (this.quantity < 0) {
    this.quantity = 0;
  }

  if (this.quantity <= this.minStockLevel && this.category !== "extinguisher") {
    this.status = "low_stock";
  }
});

// =========================
// INSTANCE METHODS
// =========================
inventoryItemSchema.methods.assignToEmployee = function (employeeId, userId = null) {
  this.assignedTo = employeeId;
  this.assignedBy = userId;
  this.assignedAt = new Date();
  this.status = "assigned";
  return this.save();
};

inventoryItemSchema.methods.unassign = function () {
  this.assignedTo = null;
  this.assignedBy = null;
  this.assignedAt = null;
  this.status = this.quantity > 0 ? "available" : "in_stock";
  return this.save();
};

// =========================
// STATIC METHODS
// =========================
inventoryItemSchema.statics.findByCompany = function (companyId) {
  return this.find({ company: companyId, isActive: true })
    .populate("zone", "name")
    .populate("assignedTo", "firstName lastName email");
};

inventoryItemSchema.statics.findExpiredItems = function (companyId) {
  return this.find({
    company: companyId,
    expiryDate: { $ne: null, $lt: new Date() },
    isActive: true,
  });
};

inventoryItemSchema.statics.findLowStockItems = function (companyId) {
  return this.find({
    company: companyId,
    category: { $ne: "extinguisher" },
    isActive: true,
    $expr: { $lte: ["$quantity", "$minStockLevel"] },
  });
};

module.exports = mongoose.model("InventoryItem", inventoryItemSchema);