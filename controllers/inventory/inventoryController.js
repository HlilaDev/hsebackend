const mongoose = require("mongoose");
const InventoryItem = require("../../models/inventory/InventoryItemModel");

// helper
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ==============================
// CREATE INVENTORY ITEM
// ==============================
exports.createInventoryItem = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      subCategory,
      inventoryCode,
      brand,
      model,
      serialNumber,
      status,
      condition,
      quantity,
      minStockLevel,
      unit,
      company,
      zone,
      assignedTo,
      locationDescription,
      supplier,
      purchaseDate,
      purchasePrice,
      warrantyUntil,
      manufactureDate,
      expiryDate,
      lastInspectionDate,
      nextInspectionDate,
      lastMaintenanceDate,
      nextMaintenanceDate,
      notes,
      imageUrl,
      attachments,
      ppeDetails,
      extinguisherDetails,
      metadata,
    } = req.body;

    if (!name || !category) {
      return res.status(400).json({
        message: "Name and category are required",
      });
    }

const finalCompany = req.user?.company?._id || req.user?.company || company;
    if (!finalCompany) {
      return res.status(400).json({
        message: "Company is required",
      });
    }

    if (inventoryCode) {
      const exists = await InventoryItem.findOne({
        inventoryCode: inventoryCode.trim().toUpperCase(),
      });

      if (exists) {
        return res.status(400).json({
          message: "Inventory code already exists",
        });
      }
    }

    const item = await InventoryItem.create({
      name,
      description,
      category,
      subCategory,
      inventoryCode,
      brand,
      model,
      serialNumber,
      status,
      condition,
      quantity,
      minStockLevel,
      unit,
      company: finalCompany,
      zone: zone || null,
      assignedTo: assignedTo || null,
      assignedBy: assignedTo ? req.user?._id || null : null,
      assignedAt: assignedTo ? new Date() : null,
      locationDescription,
      supplier,
      purchaseDate,
      purchasePrice,
      warrantyUntil,
      manufactureDate,
      expiryDate,
      lastInspectionDate,
      nextInspectionDate,
      lastMaintenanceDate,
      nextMaintenanceDate,
      notes,
      imageUrl,
      attachments,
      ppeDetails,
      extinguisherDetails,
      metadata,
      createdBy: req.user?._id || null,
      updatedBy: req.user?._id || null,
    });

    const populatedItem = await InventoryItem.findById(item._id)
      .populate("company", "name")
      .populate("zone", "name")
      .populate("assignedTo", "firstName lastName email")
      .populate("createdBy", "firstName lastName email");

    return res.status(201).json({
      message: "Inventory item created successfully",
      item: populatedItem,
    });
  } catch (error) {
    console.error("createInventoryItem error:", error);
    return res.status(500).json({
      message: "Failed to create inventory item",
      error: error.message,
    });
  }
};

// ==============================
// GET ALL INVENTORY ITEMS
// ==============================
exports.getAllInventoryItems = async (req, res) => {
  try {
    const {
      q,
      category,
      subCategory,
      status,
      condition,
      zone,
      assignedTo,
      isActive,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const filter = {};

    if (req.user?.company) {
      filter.company = req.user.company;
    } else if (req.query.company) {
      filter.company = req.query.company;
    }

    if (category) filter.category = category;
    if (subCategory) filter.subCategory = subCategory;
    if (status) filter.status = status;
    if (condition) filter.condition = condition;
    if (zone) filter.zone = zone;
    if (assignedTo) filter.assignedTo = assignedTo;

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { inventoryCode: { $regex: q, $options: "i" } },
        { serialNumber: { $regex: q, $options: "i" } },
        { brand: { $regex: q, $options: "i" } },
        { model: { $regex: q, $options: "i" } },
        { subCategory: { $regex: q, $options: "i" } },
      ];
    }

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.max(parseInt(limit, 10) || 10, 1);
    const skip = (pageNumber - 1) * limitNumber;

    const sortOrder = order === "asc" ? 1 : -1;
    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "name",
      "category",
      "status",
      "quantity",
      "expiryDate",
      "nextInspectionDate",
    ];
    const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

    const [items, total] = await Promise.all([
      InventoryItem.find(filter)
        .populate("company", "name")
        .populate("zone", "name")
        .populate("assignedTo", "firstName lastName email")
        .populate("createdBy", "firstName lastName email")
        .sort({ [finalSortBy]: sortOrder })
        .skip(skip)
        .limit(limitNumber),
      InventoryItem.countDocuments(filter),
    ]);

    return res.status(200).json({
      message: "Inventory items fetched successfully",
      items,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        pages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("getAllInventoryItems error:", error);
    return res.status(500).json({
      message: "Failed to fetch inventory items",
      error: error.message,
    });
  }
};

// ==============================
// GET INVENTORY ITEM BY ID
// ==============================
exports.getInventoryItemById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid inventory item id",
      });
    }

    const filter = { _id: id };

    if (req.user?.company) {
      filter.company = req.user.company;
    }

    const item = await InventoryItem.findOne(filter)
      .populate("company", "name")
      .populate("zone", "name")
      .populate("assignedTo", "firstName lastName email")
      .populate("assignedBy", "firstName lastName email")
      .populate("createdBy", "firstName lastName email")
      .populate("updatedBy", "firstName lastName email");

    if (!item) {
      return res.status(404).json({
        message: "Inventory item not found",
      });
    }

    return res.status(200).json({
      message: "Inventory item fetched successfully",
      item,
    });
  } catch (error) {
    console.error("getInventoryItemById error:", error);
    return res.status(500).json({
      message: "Failed to fetch inventory item",
      error: error.message,
    });
  }
};

// ==============================
// UPDATE INVENTORY ITEM
// ==============================
exports.updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid inventory item id",
      });
    }

    const filter = { _id: id };

    if (req.user?.company) {
      filter.company = req.user.company;
    }

    const existingItem = await InventoryItem.findOne(filter);

    if (!existingItem) {
      return res.status(404).json({
        message: "Inventory item not found",
      });
    }

    if (req.body.inventoryCode) {
      const duplicate = await InventoryItem.findOne({
        _id: { $ne: id },
        inventoryCode: req.body.inventoryCode.trim().toUpperCase(),
      });

      if (duplicate) {
        return res.status(400).json({
          message: "Inventory code already exists",
        });
      }
    }

    const forbiddenFields = ["_id", "createdAt", "createdBy", "company"];
    forbiddenFields.forEach((field) => delete req.body[field]);

    req.body.updatedBy = req.user?._id || null;

    const updatedItem = await InventoryItem.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("company", "name")
      .populate("zone", "name")
      .populate("assignedTo", "firstName lastName email")
      .populate("updatedBy", "firstName lastName email");

    return res.status(200).json({
      message: "Inventory item updated successfully",
      item: updatedItem,
    });
  } catch (error) {
    console.error("updateInventoryItem error:", error);
    return res.status(500).json({
      message: "Failed to update inventory item",
      error: error.message,
    });
  }
};

// ==============================
// DELETE INVENTORY ITEM
// ==============================
exports.deleteInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const hardDelete = req.query.hard === "true";

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid inventory item id",
      });
    }

    const filter = { _id: id };

    if (req.user?.company) {
      filter.company = req.user.company;
    }

    const item = await InventoryItem.findOne(filter);

    if (!item) {
      return res.status(404).json({
        message: "Inventory item not found",
      });
    }

    if (hardDelete) {
      await InventoryItem.deleteOne({ _id: id });
      return res.status(200).json({
        message: "Inventory item deleted permanently",
      });
    }

    item.isActive = false;
    item.updatedBy = req.user?._id || null;
    await item.save();

    return res.status(200).json({
      message: "Inventory item archived successfully",
      item,
    });
  } catch (error) {
    console.error("deleteInventoryItem error:", error);
    return res.status(500).json({
      message: "Failed to delete inventory item",
      error: error.message,
    });
  }
};

// ==============================
// ASSIGN INVENTORY ITEM
// ==============================
exports.assignInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeId } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid inventory item id",
      });
    }

    if (!employeeId || !isValidObjectId(employeeId)) {
      return res.status(400).json({
        message: "Valid employeeId is required",
      });
    }

    const filter = { _id: id };

    if (req.user?.company) {
      filter.company = req.user.company;
    }

    const item = await InventoryItem.findOne(filter);

    if (!item) {
      return res.status(404).json({
        message: "Inventory item not found",
      });
    }

    if (!item.isActive) {
      return res.status(400).json({
        message: "Cannot assign an inactive item",
      });
    }

    if (item.category !== "extinguisher" && item.quantity <= 0) {
      return res.status(400).json({
        message: "Item is out of stock",
      });
    }

    item.assignedTo = employeeId;
    item.assignedBy = req.user?._id || null;
    item.assignedAt = new Date();
    item.status = "assigned";
    item.updatedBy = req.user?._id || null;

    await item.save();

    const populatedItem = await InventoryItem.findById(item._id)
      .populate("zone", "name")
      .populate("assignedTo", "firstName lastName email")
      .populate("assignedBy", "firstName lastName email");

    return res.status(200).json({
      message: "Inventory item assigned successfully",
      item: populatedItem,
    });
  } catch (error) {
    console.error("assignInventoryItem error:", error);
    return res.status(500).json({
      message: "Failed to assign inventory item",
      error: error.message,
    });
  }
};

// ==============================
// UNASSIGN INVENTORY ITEM
// ==============================
exports.unassignInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid inventory item id",
      });
    }

    const filter = { _id: id };

    if (req.user?.company) {
      filter.company = req.user.company;
    }

    const item = await InventoryItem.findOne(filter);

    if (!item) {
      return res.status(404).json({
        message: "Inventory item not found",
      });
    }

    item.assignedTo = null;
    item.assignedBy = null;
    item.assignedAt = null;
    item.updatedBy = req.user?._id || null;

    if (item.category === "extinguisher") {
      item.status = "available";
    } else {
      item.status = item.quantity <= item.minStockLevel ? "low_stock" : "available";
    }

    await item.save();

    return res.status(200).json({
      message: "Inventory item unassigned successfully",
      item,
    });
  } catch (error) {
    console.error("unassignInventoryItem error:", error);
    return res.status(500).json({
      message: "Failed to unassign inventory item",
      error: error.message,
    });
  }
};

// ==============================
// UPDATE STATUS
// ==============================
exports.updateInventoryItemStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid inventory item id",
      });
    }

    if (!status) {
      return res.status(400).json({
        message: "Status is required",
      });
    }

    const allowedStatuses = [
      "available",
      "assigned",
      "in_stock",
      "low_stock",
      "maintenance",
      "expired",
      "damaged",
      "lost",
      "out_of_service",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status value",
      });
    }

    const filter = { _id: id };

    if (req.user?.company) {
      filter.company = req.user.company;
    }

    const item = await InventoryItem.findOne(filter);

    if (!item) {
      return res.status(404).json({
        message: "Inventory item not found",
      });
    }

    item.status = status;
    item.updatedBy = req.user?._id || null;
    await item.save();

    return res.status(200).json({
      message: "Inventory item status updated successfully",
      item,
    });
  } catch (error) {
    console.error("updateInventoryItemStatus error:", error);
    return res.status(500).json({
      message: "Failed to update inventory item status",
      error: error.message,
    });
  }
};

// ==============================
// GET EXPIRED ITEMS
// ==============================
exports.getExpiredInventoryItems = async (req, res) => {
  try {
    const companyId = req.user?.company || req.query.company;

    if (!companyId) {
      return res.status(400).json({
        message: "Company is required",
      });
    }

    const items = await InventoryItem.find({
      company: companyId,
      isActive: true,
      expiryDate: { $ne: null, $lt: new Date() },
    })
      .populate("zone", "name")
      .populate("assignedTo", "firstName lastName email")
      .sort({ expiryDate: 1 });

    return res.status(200).json({
      message: "Expired inventory items fetched successfully",
      count: items.length,
      items,
    });
  } catch (error) {
    console.error("getExpiredInventoryItems error:", error);
    return res.status(500).json({
      message: "Failed to fetch expired inventory items",
      error: error.message,
    });
  }
};

// ==============================
// GET LOW STOCK ITEMS
// ==============================
exports.getLowStockInventoryItems = async (req, res) => {
  try {
    const companyId = req.user?.company || req.query.company;

    if (!companyId) {
      return res.status(400).json({
        message: "Company is required",
      });
    }

    const items = await InventoryItem.find({
      company: companyId,
      isActive: true,
      category: { $ne: "extinguisher" },
      $expr: { $lte: ["$quantity", "$minStockLevel"] },
    })
      .populate("zone", "name")
      .populate("assignedTo", "firstName lastName email")
      .sort({ quantity: 1 });

    return res.status(200).json({
      message: "Low stock inventory items fetched successfully",
      count: items.length,
      items,
    });
  } catch (error) {
    console.error("getLowStockInventoryItems error:", error);
    return res.status(500).json({
      message: "Failed to fetch low stock inventory items",
      error: error.message,
    });
  }
};

// ==============================
// GET INVENTORY STATS
// ==============================
exports.getInventoryStats = async (req, res) => {
  try {
    const companyId = req.user?.company || req.query.company;

    if (!companyId) {
      return res.status(400).json({
        message: "Company is required",
      });
    }

    const now = new Date();

    const [
      totalItems,
      activeItems,
      assignedItems,
      expiredItems,
      lowStockItems,
      maintenanceItems,
      categoryStats,
    ] = await Promise.all([
      InventoryItem.countDocuments({ company: companyId }),
      InventoryItem.countDocuments({ company: companyId, isActive: true }),
      InventoryItem.countDocuments({
        company: companyId,
        isActive: true,
        assignedTo: { $ne: null },
      }),
      InventoryItem.countDocuments({
        company: companyId,
        isActive: true,
        expiryDate: { $ne: null, $lt: now },
      }),
      InventoryItem.countDocuments({
        company: companyId,
        isActive: true,
        category: { $ne: "extinguisher" },
        $expr: { $lte: ["$quantity", "$minStockLevel"] },
      }),
      InventoryItem.countDocuments({
        company: companyId,
        isActive: true,
        status: "maintenance",
      }),
      InventoryItem.aggregate([
        { $match: { company: new mongoose.Types.ObjectId(companyId), isActive: true } },
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
    ]);

    return res.status(200).json({
      message: "Inventory stats fetched successfully",
      stats: {
        totalItems,
        activeItems,
        assignedItems,
        expiredItems,
        lowStockItems,
        maintenanceItems,
        categoryStats,
      },
    });
  } catch (error) {
    console.error("getInventoryStats error:", error);
    return res.status(500).json({
      message: "Failed to fetch inventory stats",
      error: error.message,
    });
  }
};