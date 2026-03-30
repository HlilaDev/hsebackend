const ChecklistTemplate = require("../../models/checklist/checklistTemplateModel");
const ChecklistItem = require("../../models/checklist/checklistItemModel");
const ChecklistExecution = require("../../models/checklist/checklistExecutionModel");
const ChecklistResponse = require("../../models/checklist/checklistResponseModel");

// helper
function computeScore(responses, totalItems) {
  if (!totalItems || totalItems <= 0) return 0;

  const passed = responses.filter((r) => r.value === true).length;
  return Math.round((passed / totalItems) * 100);
}

// @desc    Start checklist execution
// @route   POST /api/checklists/executions
// @access  Private (agent)
exports.startChecklistExecution = async (req, res) => {
  try {
    const {
      checklistId,
      title,
      inspectionType,
      zone,
      members,
      observers,
      approver,
      scheduledAt,
      dueDate,
      priority,
      riskLevel,
      description,
      notes,
      relatedDevices,
      startNow,
    } = req.body;

    if (!checklistId) {
      return res.status(400).json({ message: "checklistId is required." });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "title is required." });
    }

    const template = await ChecklistTemplate.findOne({
      _id: checklistId,
      company: req.user.company,
      isActive: true,
    });

    if (!template) {
      return res.status(404).json({ message: "Checklist template not found." });
    }

    const execution = await ChecklistExecution.create({
      checklist: template._id,
      title: title.trim(),
      inspectionType: inspectionType || "routine",
      agent: req.user._id,
      company: req.user.company,
      zone: zone || null,
      members: Array.isArray(members) ? members : [],
      observers: Array.isArray(observers) ? observers : [],
      approver: approver || null,
      scheduledAt: scheduledAt || null,
      dueDate: dueDate || null,
      priority: priority || "medium",
      riskLevel: riskLevel || "low",
      relatedDevices: Array.isArray(relatedDevices) ? relatedDevices : [],
      description: description?.trim() || "",
      notes: notes?.trim() || "",
      status: startNow ? "in_progress" : scheduledAt ? "scheduled" : "draft",
      startedAt: startNow ? new Date() : null,
    });

    res.status(201).json({
      message: "Checklist execution started successfully.",
      execution,
    });
  } catch (error) {
    console.error("startChecklistExecution error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// @desc    Get all executions
// @route   GET /api/checklists/executions
// @access  Private
exports.getChecklistExecutions = async (req, res) => {
  try {
    const query = {
      company: req.user.company,
    };

    if (req.user.role === "agent") {
      query.agent = req.user._id;
    }

    if (req.query.status) query.status = req.query.status;
    if (req.query.checklist) query.checklist = req.query.checklist;
    if (req.query.zone) query.zone = req.query.zone;

    const executions = await ChecklistExecution.find(query)
      .populate("checklist", "title category")
      .populate("agent", "firstName lastName email role")
      .populate("zone", "name")
      .sort({ createdAt: -1 });

    res.status(200).json(executions);
  } catch (error) {
    console.error("getChecklistExecutions error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// @desc    Get execution details
// @route   GET /api/checklists/executions/:id
// @access  Private
exports.getChecklistExecutionById = async (req, res) => {
  try {
    const execution = await ChecklistExecution.findOne({
      _id: req.params.id,
      company: req.user.company,
    })
      .populate("checklist", "title description category")
      .populate("agent", "firstName lastName email role")
      .populate("zone", "name");

    if (!execution) {
      return res.status(404).json({ message: "Checklist execution not found." });
    }

    if (
      req.user.role === "agent" &&
      execution.agent?._id?.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Access denied." });
    }

    const items = await ChecklistItem.find({
      checklist: execution.checklist._id,
    }).sort({ order: 1, createdAt: 1 });

    const responses = await ChecklistResponse.find({
      execution: execution._id,
    }).populate("item", "label type isRequired order");

    res.status(200).json({
      ...execution.toObject(),
      items,
      responses,
    });
  } catch (error) {
    console.error("getChecklistExecutionById error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// @desc    Save or update one response
// @route   POST /api/checklists/executions/:executionId/responses
// @access  Private (agent)
exports.saveChecklistResponse = async (req, res) => {
  try {
    const { itemId, value, comment, photo } = req.body;

    if (!itemId) {
      return res.status(400).json({ message: "itemId is required." });
    }

    const execution = await ChecklistExecution.findOne({
      _id: req.params.executionId,
      company: req.user.company,
    });

    if (!execution) {
      return res.status(404).json({ message: "Checklist execution not found." });
    }

    if (execution.agent.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied." });
    }

    const item = await ChecklistItem.findOne({
      _id: itemId,
      checklist: execution.checklist,
    });

    if (!item) {
      return res.status(404).json({ message: "Checklist item not found." });
    }

    let response = await ChecklistResponse.findOne({
      execution: execution._id,
      item: item._id,
    });

    if (!response) {
      response = await ChecklistResponse.create({
        execution: execution._id,
        item: item._id,
        value,
        comment: comment?.trim() || "",
        photo: photo || "",
      });
    } else {
      response.value = value;
      response.comment = comment?.trim() || "";
      response.photo = photo || "";
      await response.save();
    }

    if (execution.status === "draft") {
      execution.status = "in_progress";
      await execution.save();
    }

    res.status(200).json({
      message: "Checklist response saved successfully.",
      response,
    });
  } catch (error) {
    console.error("saveChecklistResponse error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// @desc    Complete execution and compute score
// @route   PUT /api/checklists/executions/:id/complete
// @access  Private (agent)
exports.completeChecklistExecution = async (req, res) => {
  try {
    const execution = await ChecklistExecution.findOne({
      _id: req.params.id,
      company: req.user.company,
    });

    if (!execution) {
      return res.status(404).json({ message: "Checklist execution not found." });
    }

    if (execution.agent.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied." });
    }

    const items = await ChecklistItem.find({
      checklist: execution.checklist,
    });

    const responses = await ChecklistResponse.find({
      execution: execution._id,
    });

    const score = computeScore(responses, items.length);

    execution.status = "completed";
    execution.score = score;
    execution.completedAt = new Date();

    if (req.body.notes !== undefined) {
      execution.notes = req.body.notes?.trim() || "";
    }

    await execution.save();

    res.status(200).json({
      message: "Checklist execution completed successfully.",
      execution,
    });
  } catch (error) {
    console.error("completeChecklistExecution error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// @desc    Update execution notes/status manually
// @route   PUT /api/checklists/executions/:id
// @access  Private
exports.updateChecklistExecution = async (req, res) => {
  try {
    const execution = await ChecklistExecution.findOne({
      _id: req.params.id,
      company: req.user.company,
    });

    if (!execution) {
      return res.status(404).json({ message: "Checklist execution not found." });
    }

    const isOwner = execution.agent.toString() === req.user._id.toString();
    const isManager = ["manager", "admin", "supervisor", "superAdmin"].includes(
      req.user.role
    );

    if (!isOwner && !isManager) {
      return res.status(403).json({ message: "Access denied." });
    }

    const { status, notes, zone } = req.body;

    if (status !== undefined) execution.status = status;
    if (notes !== undefined) execution.notes = notes?.trim() || "";
    if (zone !== undefined) execution.zone = zone || null;

    await execution.save();

    res.status(200).json({
      message: "Checklist execution updated successfully.",
      execution,
    });
  } catch (error) {
    console.error("updateChecklistExecution error:", error);
    res.status(500).json({ message: "Server error." });
  }
};