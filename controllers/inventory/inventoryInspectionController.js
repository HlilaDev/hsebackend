const mongoose = require("mongoose");
const InventoryInspection = require("../../models/inventory/inventoryInspectionModel");
const InventoryItem = require("../../models/inventory/InventoryItemModel");
const InventoryMovement = require("../../models/inventory/inventoryMovementModel");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// =====================================
// CREATE INSPECTION
// =====================================
exports.createInventoryInspection = async (req, res) => {
  try {
    const {
      inventoryItem,
      company,
      inspectionType = "routine",
      inspectionDate,
      zone,
      result,
      statusBefore,
      statusAfter,
      condition = "",
      checklist = [],
      observations,
      actionsRequired,
      nextInspectionDate,
      attachments = [],
      metadata = {},
    } = req.body;

    if (!inventoryItem || !isValidObjectId(inventoryItem)) {
      return res.status(400).json({ message: "Valid inventoryItem is required" });
    }

    if (!result) {
      return res.status(400).json({ message: "result is required" });
    }

    const allowedResults = ["pass", "fail", "warning", "not_applicable"];
    if (!allowedResults.includes(result)) {
      return res.status(400).json({ message: "Invalid result value" });
    }

    const finalCompany = req.user?.company || company;
    if (!finalCompany) {
      return res.status(400).json({ message: "Company is required" });
    }

    const item = await InventoryItem.findOne({
      _id: inventoryItem,
      company: finalCompany,
      isActive: true,
    });

    if (!item) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    const inspection = await InventoryInspection.create({
      inventoryItem,
      company: finalCompany,
      inspectionType,
      inspectionDate: inspectionDate || new Date(),
      inspectedBy: req.user?._id || null,
      zone: zone || item.zone || null,
      result,
      statusBefore: statusBefore || item.status || "",
      statusAfter: statusAfter || item.status || "",
      condition,
      checklist,
      observations,
      actionsRequired,
      nextInspectionDate: nextInspectionDate || null,
      attachments,
      metadata,
    });

    // sync current item state
    item.lastInspectionDate = inspection.inspectionDate;
    if (nextInspectionDate) {
      item.nextInspectionDate = nextInspectionDate;
    }

    if (result === "fail") {
      item.status = "out_of_service";
    } else if (result === "warning" && item.status !== "maintenance") {
      item.status = "maintenance";
    } else if (result === "pass" && ["maintenance", "out_of_service"].includes(item.status)) {
      item.status = item.category === "extinguisher" ? "available" : "in_stock";
    }

    if (condition === "expired") {
      item.status = "expired";
    }

    item.updatedBy = req.user?._id || null;
    await item.save();

    await InventoryMovement.create({
      inventoryItem: item._id,
      company: finalCompany,
      movementType: "inspection",
      quantity: 1,
      unit: item.unit || "unit",
      previousQuantity: item.quantity || 1,
      newQuantity: item.quantity || 1,
      fromZone: item.zone || null,
      toZone: zone || item.zone || null,
      employee: item.assignedTo || null,
      reason: `Inspection result: ${result}`,
      reference: `INSP-${inspection._id}`,
      notes: observations || actionsRequired || "",
      createdBy: req.user?._id || null,
    });

    const populatedInspection = await InventoryInspection.findById(inspection._id)
      .populate("inventoryItem", "name category subCategory inventoryCode status")
      .populate("company", "name")
      .populate("inspectedBy", "firstName lastName email")
      .populate("zone", "name");

    return res.status(201).json({
      message: "Inventory inspection created successfully",
      inspection: populatedInspection,
      item,
    });
  } catch (error) {
    console.error("createInventoryInspection error:", error);
    return res.status(500).json({
      message: "Failed to create inventory inspection",
      error: error.message,
    });
  }
};

// =====================================
// GET ALL INSPECTIONS
// =====================================
exports.getAllInventoryInspections = async (req, res) => {
  try {
    const {
      inventoryItem,
      inspectionType,
      result,
      inspectedBy,
      page = 1,
      limit = 10,
      sortBy = "inspectionDate",
      order = "desc",
    } = req.query;

    const filter = {};

    if (req.user?.company) {
      filter.company = req.user.company;
    } else if (req.query.company) {
      filter.company = req.query.company;
    }

    if (inventoryItem && isValidObjectId(inventoryItem)) filter.inventoryItem = inventoryItem;
    if (inspectionType) filter.inspectionType = inspectionType;
    if (result) filter.result = result;
    if (inspectedBy && isValidObjectId(inspectedBy)) filter.inspectedBy = inspectedBy;

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.max(parseInt(limit, 10) || 10, 1);
    const skip = (pageNumber - 1) * limitNumber;

    const sortOrder = order === "asc" ? 1 : -1;
    const allowedSortFields = ["inspectionDate", "createdAt", "result"];
    const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : "inspectionDate";

    const [inspections, total] = await Promise.all([
      InventoryInspection.find(filter)
        .populate("inventoryItem", "name category subCategory inventoryCode")
        .populate("inspectedBy", "firstName lastName email")
        .populate("zone", "name")
        .sort({ [finalSortBy]: sortOrder })
        .skip(skip)
        .limit(limitNumber),
      InventoryInspection.countDocuments(filter),
    ]);

    return res.status(200).json({
      message: "Inventory inspections fetched successfully",
      inspections,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        pages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("getAllInventoryInspections error:", error);
    return res.status(500).json({
      message: "Failed to fetch inventory inspections",
      error: error.message,
    });
  }
};

// =====================================
// GET INSPECTION BY ID
// =====================================
exports.getInventoryInspectionById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid inspection id" });
    }

    const filter = { _id: id };
    if (req.user?.company) filter.company = req.user.company;

    const inspection = await InventoryInspection.findOne(filter)
      .populate("inventoryItem", "name category subCategory inventoryCode status")
      .populate("company", "name")
      .populate("inspectedBy", "firstName lastName email")
      .populate("zone", "name");

    if (!inspection) {
      return res.status(404).json({ message: "Inventory inspection not found" });
    }

    return res.status(200).json({
      message: "Inventory inspection fetched successfully",
      inspection,
    });
  } catch (error) {
    console.error("getInventoryInspectionById error:", error);
    return res.status(500).json({
      message: "Failed to fetch inventory inspection",
      error: error.message,
    });
  }
};

// =====================================
// UPDATE INSPECTION
// =====================================
exports.updateInventoryInspection = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid inspection id" });
    }

    const filter = { _id: id };
    if (req.user?.company) filter.company = req.user.company;

    const inspection = await InventoryInspection.findOne(filter);

    if (!inspection) {
      return res.status(404).json({ message: "Inventory inspection not found" });
    }

    const forbiddenFields = ["_id", "company", "inventoryItem", "inspectedBy", "createdAt"];
    forbiddenFields.forEach((field) => delete req.body[field]);

    const updatedInspection = await InventoryInspection.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("inventoryItem", "name category subCategory inventoryCode status")
      .populate("inspectedBy", "firstName lastName email")
      .populate("zone", "name");

    return res.status(200).json({
      message: "Inventory inspection updated successfully",
      inspection: updatedInspection,
    });
  } catch (error) {
    console.error("updateInventoryInspection error:", error);
    return res.status(500).json({
      message: "Failed to update inventory inspection",
      error: error.message,
    });
  }
};

// =====================================
// DELETE INSPECTION
// =====================================
exports.deleteInventoryInspection = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid inspection id" });
    }

    const filter = { _id: id };
    if (req.user?.company) filter.company = req.user.company;

    const inspection = await InventoryInspection.findOne(filter);

    if (!inspection) {
      return res.status(404).json({ message: "Inventory inspection not found" });
    }

    await InventoryInspection.deleteOne({ _id: id });

    return res.status(200).json({
      message: "Inventory inspection deleted successfully",
    });
  } catch (error) {
    console.error("deleteInventoryInspection error:", error);
    return res.status(500).json({
      message: "Failed to delete inventory inspection",
      error: error.message,
    });
  }
};