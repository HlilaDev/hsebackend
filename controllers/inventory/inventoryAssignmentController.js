const mongoose = require("mongoose");
const InventoryAssignment = require("../../models/inventory/inventoryAssignmentModel");
const InventoryItem = require("../../models/inventory/InventoryItemModel");
const InventoryMovement = require("../../models/inventory/inventoryMovementModel");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// =====================================
// CREATE ASSIGNMENT
// =====================================
exports.createInventoryAssignment = async (req, res) => {
  try {
    const {
      inventoryItem,
      company,
      employee,
      assignmentType = "individual",
      zone,
      expectedReturnDate,
      notes,
      metadata,
    } = req.body;

    if (!inventoryItem || !isValidObjectId(inventoryItem)) {
      return res.status(400).json({ message: "Valid inventoryItem is required" });
    }

    if (!employee || !isValidObjectId(employee)) {
      return res.status(400).json({ message: "Valid employee is required" });
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

    const existingActiveAssignment = await InventoryAssignment.findOne({
      inventoryItem,
      company: finalCompany,
      status: "active",
    });

    if (existingActiveAssignment && item.category === "extinguisher") {
      return res.status(400).json({
        message: "This unit already has an active assignment",
      });
    }

    if (item.category !== "extinguisher" && Number(item.quantity || 0) <= 0) {
      return res.status(400).json({
        message: "Item is out of stock",
      });
    }

    const assignment = await InventoryAssignment.create({
      inventoryItem,
      company: finalCompany,
      employee,
      assignedBy: req.user?._id || null,
      assignmentType,
      zone: zone || item.zone || null,
      assignedAt: new Date(),
      expectedReturnDate: expectedReturnDate || null,
      notes,
      metadata,
    });

    // update current item
    item.assignedTo = employee;
    item.assignedBy = req.user?._id || null;
    item.assignedAt = new Date();
    item.updatedBy = req.user?._id || null;
    item.status = "assigned";

    if (item.category !== "extinguisher") {
      item.quantity = Math.max(Number(item.quantity || 0) - 1, 0);
    }

    await item.save();

    // create movement
    await InventoryMovement.create({
      inventoryItem: item._id,
      company: finalCompany,
      movementType: "assignment",
      quantity: 1,
      unit: item.unit || "unit",
      previousQuantity:
        item.category === "extinguisher" ? 1 : Number(item.quantity || 0) + 1,
      newQuantity: item.category === "extinguisher" ? 1 : Number(item.quantity || 0),
      fromZone: item.zone || null,
      toZone: zone || item.zone || null,
      employee,
      reason: "Inventory assignment",
      reference: `ASSIGN-${assignment._id}`,
      notes: notes || "",
      createdBy: req.user?._id || null,
    });

    const populatedAssignment = await InventoryAssignment.findById(assignment._id)
      .populate("inventoryItem", "name category subCategory inventoryCode")
      .populate("employee", "firstName lastName email")
      .populate("assignedBy", "firstName lastName email")
      .populate("zone", "name")
      .populate("returnedBy", "firstName lastName email");

    return res.status(201).json({
      message: "Inventory assignment created successfully",
      assignment: populatedAssignment,
      item,
    });
  } catch (error) {
    console.error("createInventoryAssignment error:", error);
    return res.status(500).json({
      message: "Failed to create inventory assignment",
      error: error.message,
    });
  }
};

// =====================================
// RETURN ASSIGNMENT
// =====================================
exports.returnInventoryAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { returnCondition = "", notes = "" } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid assignment id" });
    }

    const filter = { _id: id };
    if (req.user?.company) filter.company = req.user.company;

    const assignment = await InventoryAssignment.findOne(filter);

    if (!assignment) {
      return res.status(404).json({ message: "Inventory assignment not found" });
    }

    if (assignment.status !== "active") {
      return res.status(400).json({ message: "Only active assignments can be returned" });
    }

    assignment.returnedAt = new Date();
    assignment.returnedBy = req.user?._id || null;
    assignment.returnCondition = returnCondition;
    assignment.status = "returned";
    assignment.notes = notes || assignment.notes;

    await assignment.save();

    const item = await InventoryItem.findById(assignment.inventoryItem);
    if (item) {
      item.assignedTo = null;
      item.assignedBy = null;
      item.assignedAt = null;
      item.updatedBy = req.user?._id || null;

      if (item.category !== "extinguisher") {
        item.quantity = Number(item.quantity || 0) + 1;
        item.status = item.quantity <= item.minStockLevel ? "low_stock" : "in_stock";
      } else {
        item.status = "available";
      }

      await item.save();

      await InventoryMovement.create({
        inventoryItem: item._id,
        company: assignment.company,
        movementType: "return",
        quantity: 1,
        unit: item.unit || "unit",
        previousQuantity:
          item.category === "extinguisher" ? 1 : Number(item.quantity || 0) - 1,
        newQuantity: item.category === "extinguisher" ? 1 : Number(item.quantity || 0),
        fromZone: assignment.zone || item.zone || null,
        toZone: item.zone || null,
        employee: assignment.employee,
        reason: "Assignment return",
        reference: `RETURN-${assignment._id}`,
        notes: notes || "",
        createdBy: req.user?._id || null,
      });
    }

    const populatedAssignment = await InventoryAssignment.findById(assignment._id)
      .populate("inventoryItem", "name category subCategory inventoryCode")
      .populate("employee", "firstName lastName email")
      .populate("assignedBy", "firstName lastName email")
      .populate("returnedBy", "firstName lastName email")
      .populate("zone", "name");

    return res.status(200).json({
      message: "Inventory assignment returned successfully",
      assignment: populatedAssignment,
      item,
    });
  } catch (error) {
    console.error("returnInventoryAssignment error:", error);
    return res.status(500).json({
      message: "Failed to return inventory assignment",
      error: error.message,
    });
  }
};

// =====================================
// GET ALL ASSIGNMENTS
// =====================================
exports.getAllInventoryAssignments = async (req, res) => {
  try {
    const {
      inventoryItem,
      employee,
      status,
      assignmentType,
      page = 1,
      limit = 10,
      sortBy = "assignedAt",
      order = "desc",
    } = req.query;

    const filter = {};

    if (req.user?.company) {
      filter.company = req.user.company;
    } else if (req.query.company) {
      filter.company = req.query.company;
    }

    if (inventoryItem && isValidObjectId(inventoryItem)) filter.inventoryItem = inventoryItem;
    if (employee && isValidObjectId(employee)) filter.employee = employee;
    if (status) filter.status = status;
    if (assignmentType) filter.assignmentType = assignmentType;

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.max(parseInt(limit, 10) || 10, 1);
    const skip = (pageNumber - 1) * limitNumber;

    const sortOrder = order === "asc" ? 1 : -1;
    const allowedSortFields = ["assignedAt", "expectedReturnDate", "returnedAt", "createdAt"];
    const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : "assignedAt";

    const [assignments, total] = await Promise.all([
      InventoryAssignment.find(filter)
        .populate("inventoryItem", "name category subCategory inventoryCode")
        .populate("employee", "firstName lastName email")
        .populate("assignedBy", "firstName lastName email")
        .populate("returnedBy", "firstName lastName email")
        .populate("zone", "name")
        .sort({ [finalSortBy]: sortOrder })
        .skip(skip)
        .limit(limitNumber),
      InventoryAssignment.countDocuments(filter),
    ]);

    return res.status(200).json({
      message: "Inventory assignments fetched successfully",
      assignments,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        pages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("getAllInventoryAssignments error:", error);
    return res.status(500).json({
      message: "Failed to fetch inventory assignments",
      error: error.message,
    });
  }
};

// =====================================
// GET ASSIGNMENT BY ID
// =====================================
exports.getInventoryAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid assignment id" });
    }

    const filter = { _id: id };
    if (req.user?.company) filter.company = req.user.company;

    const assignment = await InventoryAssignment.findOne(filter)
      .populate("inventoryItem", "name category subCategory inventoryCode")
      .populate("employee", "firstName lastName email")
      .populate("assignedBy", "firstName lastName email")
      .populate("returnedBy", "firstName lastName email")
      .populate("zone", "name");

    if (!assignment) {
      return res.status(404).json({ message: "Inventory assignment not found" });
    }

    return res.status(200).json({
      message: "Inventory assignment fetched successfully",
      assignment,
    });
  } catch (error) {
    console.error("getInventoryAssignmentById error:", error);
    return res.status(500).json({
      message: "Failed to fetch inventory assignment",
      error: error.message,
    });
  }
};

// =====================================
// UPDATE ASSIGNMENT STATUS
// =====================================
exports.updateInventoryAssignmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid assignment id" });
    }

    const allowedStatuses = ["active", "returned", "overdue", "lost", "damaged", "cancelled"];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const filter = { _id: id };
    if (req.user?.company) filter.company = req.user.company;

    const assignment = await InventoryAssignment.findOne(filter);

    if (!assignment) {
      return res.status(404).json({ message: "Inventory assignment not found" });
    }

    assignment.status = status;
    await assignment.save();

    return res.status(200).json({
      message: "Inventory assignment status updated successfully",
      assignment,
    });
  } catch (error) {
    console.error("updateInventoryAssignmentStatus error:", error);
    return res.status(500).json({
      message: "Failed to update inventory assignment status",
      error: error.message,
    });
  }
};

// =====================================
// DELETE ASSIGNMENT
// =====================================
exports.deleteInventoryAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid assignment id" });
    }

    const filter = { _id: id };
    if (req.user?.company) filter.company = req.user.company;

    const assignment = await InventoryAssignment.findOne(filter);

    if (!assignment) {
      return res.status(404).json({ message: "Inventory assignment not found" });
    }

    await InventoryAssignment.deleteOne({ _id: id });

    return res.status(200).json({
      message: "Inventory assignment deleted successfully",
    });
  } catch (error) {
    console.error("deleteInventoryAssignment error:", error);
    return res.status(500).json({
      message: "Failed to delete inventory assignment",
      error: error.message,
    });
  }
};