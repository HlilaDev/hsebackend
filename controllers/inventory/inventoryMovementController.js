const mongoose = require("mongoose");
const InventoryMovement = require("../../models/inventory/inventoryMovementModel");
const InventoryItem = require("../../models/inventory/InventoryItemModel");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// =====================================
// CREATE INVENTORY MOVEMENT
// =====================================
exports.createInventoryMovement = async (req, res) => {
  try {
    const {
      inventoryItem,
      company,
      movementType,
      quantity = 1,
      unit,
      fromZone,
      toZone,
      employee,
      reason,
      reference,
      notes,
      metadata,
    } = req.body;

    if (!inventoryItem || !isValidObjectId(inventoryItem)) {
      return res.status(400).json({ message: "Valid inventoryItem is required" });
    }

    if (!movementType) {
      return res.status(400).json({ message: "movementType is required" });
    }

    const allowedMovementTypes = [
      "in",
      "out",
      "assignment",
      "return",
      "transfer",
      "adjustment",
      "maintenance_out",
      "maintenance_in",
      "inspection",
      "loss",
      "damage",
      "archive",
    ];

    if (!allowedMovementTypes.includes(movementType)) {
      return res.status(400).json({ message: "Invalid movementType" });
    }

    const finalCompany = req.user?.company || company;
    if (!finalCompany) {
      return res.status(400).json({ message: "Company is required" });
    }

    const item = await InventoryItem.findOne({
      _id: inventoryItem,
      company: finalCompany,
    });

    if (!item) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    const qty = Number(quantity || 1);
    if (Number.isNaN(qty) || qty < 0) {
      return res.status(400).json({ message: "Quantity must be a positive number" });
    }

    const previousQuantity = Number(item.quantity || 0);
    let newQuantity = previousQuantity;

    // stock logic
    if (item.category !== "extinguisher") {
      if (["in", "return", "maintenance_in"].includes(movementType)) {
        newQuantity = previousQuantity + qty;
      } else if (
        ["out", "assignment", "maintenance_out", "loss", "damage"].includes(movementType)
      ) {
        if (qty > previousQuantity) {
          return res.status(400).json({
            message: "Movement quantity exceeds current stock",
          });
        }
        newQuantity = previousQuantity - qty;
      } else if (movementType === "adjustment") {
        newQuantity = qty;
      }
    }

    const movement = await InventoryMovement.create({
      inventoryItem,
      company: finalCompany,
      movementType,
      quantity: item.category === "extinguisher" ? 1 : qty,
      unit: unit || item.unit || "unit",
      previousQuantity,
      newQuantity,
      fromZone: fromZone || null,
      toZone: toZone || null,
      employee: employee || null,
      reason,
      reference,
      notes,
      metadata,
      createdBy: req.user?._id || null,
    });

    // sync current item state
    if (movementType === "transfer") {
      item.zone = toZone || item.zone;
    }

    if (movementType === "archive") {
      item.isActive = false;
    }

    if (movementType === "maintenance_out") {
      item.status = "maintenance";
    }

    if (movementType === "maintenance_in") {
      item.status = item.category === "extinguisher" ? "available" : "in_stock";
      item.lastMaintenanceDate = new Date();
    }

    if (movementType === "damage") {
      item.status = "damaged";
    }

    if (movementType === "loss") {
      item.status = "lost";
    }

    if (item.category !== "extinguisher") {
      item.quantity = newQuantity;
      item.status = newQuantity <= item.minStockLevel ? "low_stock" : "in_stock";
    }

    item.updatedBy = req.user?._id || null;
    await item.save();

    const populatedMovement = await InventoryMovement.findById(movement._id)
      .populate("inventoryItem", "name category subCategory inventoryCode quantity")
      .populate("company", "name")
      .populate("fromZone", "name")
      .populate("toZone", "name")
      .populate("employee", "firstName lastName email")
      .populate("createdBy", "firstName lastName email");

    return res.status(201).json({
      message: "Inventory movement created successfully",
      movement: populatedMovement,
      item,
    });
  } catch (error) {
    console.error("createInventoryMovement error:", error);
    return res.status(500).json({
      message: "Failed to create inventory movement",
      error: error.message,
    });
  }
};

// =====================================
// GET ALL INVENTORY MOVEMENTS
// =====================================
exports.getAllInventoryMovements = async (req, res) => {
  try {
    const {
      inventoryItem,
      movementType,
      employee,
      fromZone,
      toZone,
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

    if (inventoryItem && isValidObjectId(inventoryItem)) filter.inventoryItem = inventoryItem;
    if (movementType) filter.movementType = movementType;
    if (employee && isValidObjectId(employee)) filter.employee = employee;
    if (fromZone && isValidObjectId(fromZone)) filter.fromZone = fromZone;
    if (toZone && isValidObjectId(toZone)) filter.toZone = toZone;

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.max(parseInt(limit, 10) || 10, 1);
    const skip = (pageNumber - 1) * limitNumber;

    const sortOrder = order === "asc" ? 1 : -1;
    const allowedSortFields = ["createdAt", "movementType", "quantity"];
    const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

    const [movements, total] = await Promise.all([
      InventoryMovement.find(filter)
        .populate("inventoryItem", "name category subCategory inventoryCode")
        .populate("fromZone", "name")
        .populate("toZone", "name")
        .populate("employee", "firstName lastName email")
        .populate("createdBy", "firstName lastName email")
        .sort({ [finalSortBy]: sortOrder })
        .skip(skip)
        .limit(limitNumber),
      InventoryMovement.countDocuments(filter),
    ]);

    return res.status(200).json({
      message: "Inventory movements fetched successfully",
      movements,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        pages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("getAllInventoryMovements error:", error);
    return res.status(500).json({
      message: "Failed to fetch inventory movements",
      error: error.message,
    });
  }
};

// =====================================
// GET MOVEMENT BY ID
// =====================================
exports.getInventoryMovementById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid movement id" });
    }

    const filter = { _id: id };
    if (req.user?.company) filter.company = req.user.company;

    const movement = await InventoryMovement.findOne(filter)
      .populate("inventoryItem", "name category subCategory inventoryCode quantity")
      .populate("company", "name")
      .populate("fromZone", "name")
      .populate("toZone", "name")
      .populate("employee", "firstName lastName email")
      .populate("createdBy", "firstName lastName email");

    if (!movement) {
      return res.status(404).json({ message: "Inventory movement not found" });
    }

    return res.status(200).json({
      message: "Inventory movement fetched successfully",
      movement,
    });
  } catch (error) {
    console.error("getInventoryMovementById error:", error);
    return res.status(500).json({
      message: "Failed to fetch inventory movement",
      error: error.message,
    });
  }
};

// =====================================
// DELETE MOVEMENT
// =====================================
exports.deleteInventoryMovement = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid movement id" });
    }

    const filter = { _id: id };
    if (req.user?.company) filter.company = req.user.company;

    const movement = await InventoryMovement.findOne(filter);

    if (!movement) {
      return res.status(404).json({ message: "Inventory movement not found" });
    }

    await InventoryMovement.deleteOne({ _id: id });

    return res.status(200).json({
      message: "Inventory movement deleted successfully",
    });
  } catch (error) {
    console.error("deleteInventoryMovement error:", error);
    return res.status(500).json({
      message: "Failed to delete inventory movement",
      error: error.message,
    });
  }
};