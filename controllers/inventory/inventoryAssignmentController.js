const mongoose = require("mongoose");
const InventoryAssignment = require("../../models/inventory/inventoryAssignmentModel");
const InventoryItem = require("../../models/inventory/InventoryItemModel");
const InventoryMovement = require("../../models/inventory/inventoryMovementModel");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const buildAssignmentPopulate = (query) =>
  query
    .populate("inventoryItem", "name category subCategory inventoryCode")
    .populate("employee", "fullName employeeId department jobTitle zone isActive")
    .populate("assignedBy", "firstName lastName email")
    .populate("returnedBy", "firstName lastName email")
    .populate("zone", "name");

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
      assignedAt,
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

    let finalAssignedAt = new Date();

    if (assignedAt) {
      const parsedAssignedAt = new Date(assignedAt);
      if (!Number.isNaN(parsedAssignedAt.getTime())) {
        finalAssignedAt = parsedAssignedAt;
      }
    } else if (metadata?.assignedAt) {
      const parsedAssignedAt = new Date(metadata.assignedAt);
      if (!Number.isNaN(parsedAssignedAt.getTime())) {
        finalAssignedAt = parsedAssignedAt;
      }
    }

    const assignment = await InventoryAssignment.create({
      inventoryItem,
      company: finalCompany,
      employee,
      assignedBy: req.user?._id || null,
      assignmentType,
      zone: zone || item.zone || null,
      assignedAt: finalAssignedAt,
      expectedReturnDate: expectedReturnDate || null,
      notes: notes || "",
      metadata: metadata || {},
      status: "active",
    });

    const previousQuantity =
      item.category === "extinguisher" ? 1 : Number(item.quantity || 0);

    item.assignedTo = employee;
    item.assignedBy = req.user?._id || null;
    item.assignedAt = finalAssignedAt;
    item.updatedBy = req.user?._id || null;
    item.status = "assigned";

    if (item.category !== "extinguisher") {
      item.quantity = Math.max(previousQuantity - 1, 0);
    }

    await item.save();

    await InventoryMovement.create({
      inventoryItem: item._id,
      company: finalCompany,
      movementType: "assignment",
      quantity: 1,
      unit: item.unit || "unit",
      previousQuantity,
      newQuantity: item.category === "extinguisher" ? 1 : Number(item.quantity || 0),
      fromZone: item.zone || null,
      toZone: zone || item.zone || null,
      employee,
      reason: "Inventory assignment",
      reference: `ASSIGN-${assignment._id}`,
      notes: notes || "",
      createdBy: req.user?._id || null,
      metadata: {
        ...(metadata || {}),
        assignedAt: finalAssignedAt,
      },
    });

    const populatedAssignment = await buildAssignmentPopulate(
      InventoryAssignment.findById(assignment._id)
    );

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
      const previousQuantity =
        item.category === "extinguisher" ? 1 : Number(item.quantity || 0);

      item.assignedTo = null;
      item.assignedBy = null;
      item.assignedAt = null;
      item.updatedBy = req.user?._id || null;

      if (item.category !== "extinguisher") {
        item.quantity = previousQuantity + 1;
        item.status =
          item.quantity <= Number(item.minStockLevel || 0) ? "low_stock" : "in_stock";
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
        previousQuantity,
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

    const populatedAssignment = await buildAssignmentPopulate(
      InventoryAssignment.findById(assignment._id)
    );

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

    if (inventoryItem && isValidObjectId(inventoryItem)) {
      filter.inventoryItem = inventoryItem;
    }

    if (employee && isValidObjectId(employee)) {
      filter.employee = employee;
    }

    if (status) {
      filter.status = status;
    }

    if (assignmentType) {
      filter.assignmentType = assignmentType;
    }

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.max(parseInt(limit, 10) || 10, 1);
    const skip = (pageNumber - 1) * limitNumber;

    const sortOrder = order === "asc" ? 1 : -1;
    const allowedSortFields = [
      "assignedAt",
      "expectedReturnDate",
      "returnedAt",
      "createdAt",
    ];
    const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : "assignedAt";

    const [assignments, total] = await Promise.all([
      buildAssignmentPopulate(
        InventoryAssignment.find(filter)
          .sort({ [finalSortBy]: sortOrder })
          .skip(skip)
          .limit(limitNumber)
      ),
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
    if (req.user?.company) {
      filter.company = req.user.company;
    }

    const assignment = await buildAssignmentPopulate(
      InventoryAssignment.findOne(filter)
    );

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

    const allowedStatuses = [
      "active",
      "returned",
      "overdue",
      "lost",
      "damaged",
      "cancelled",
    ];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const filter = { _id: id };
    if (req.user?.company) {
      filter.company = req.user.company;
    }

    const assignment = await InventoryAssignment.findOne(filter);

    if (!assignment) {
      return res.status(404).json({ message: "Inventory assignment not found" });
    }

    assignment.status = status;
    await assignment.save();

    const populatedAssignment = await buildAssignmentPopulate(
      InventoryAssignment.findById(assignment._id)
    );

    return res.status(200).json({
      message: "Inventory assignment status updated successfully",
      assignment: populatedAssignment,
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
    if (req.user?.company) {
      filter.company = req.user.company;
    }

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