const ChecklistTemplate = require("../../models/checklist/checklistTemplateModel");
const ChecklistItem = require("../../models/checklist/checklistItemModel");

// @desc    Create checklist template
// @route   POST /api/checklists/templates
// @access  Private (manager/admin/supervisor)
exports.createChecklistTemplate = async (req, res) => {
  try {
    const { title, description, category, items = [] } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ message: "Title is required." });
    }

    if (!req.user?.company) {
      return res.status(400).json({ message: "User company is missing." });
    }

    const template = await ChecklistTemplate.create({
      title: title.trim(),
      description: description?.trim() || "",
      category: category || "safety",
      company: req.user.company,
      createdBy: req.user._id,
    });

    if (Array.isArray(items) && items.length > 0) {
      const formattedItems = items.map((item, index) => ({
        checklist: template._id,
        label: item.label?.trim(),
        type: item.type || "boolean",
        isRequired: item.isRequired ?? true,
        order: item.order ?? index,
      }));

      const validItems = formattedItems.filter((item) => item.label);

      if (validItems.length > 0) {
        await ChecklistItem.insertMany(validItems);
      }
    }

    const checklistItems = await ChecklistItem.find({
      checklist: template._id,
    }).sort({ order: 1, createdAt: 1 });

    res.status(201).json({
      message: "Checklist template created successfully.",
      template,
      items: checklistItems,
    });
  } catch (error) {
    console.error("createChecklistTemplate error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// @desc    Get all checklist templates
// @route   GET /api/checklists/templates
// @access  Private
exports.getChecklistTemplates = async (req, res) => {
  try {
    const query = {
      company: req.user.company,
    };

    if (req.query.isActive === "true") query.isActive = true;
    if (req.query.isActive === "false") query.isActive = false;
    if (req.query.category) query.category = req.query.category;

    const templates = await ChecklistTemplate.find(query)
      .populate("createdBy", "firstName lastName email role")
      .sort({ createdAt: -1 });

    res.status(200).json(templates);
  } catch (error) {
    console.error("getChecklistTemplates error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// @desc    Get one checklist template with items
// @route   GET /api/checklists/templates/:id
// @access  Private
exports.getChecklistTemplateById = async (req, res) => {
  try {
    const template = await ChecklistTemplate.findOne({
      _id: req.params.id,
      company: req.user.company,
    }).populate("createdBy", "firstName lastName email role");

    if (!template) {
      return res.status(404).json({ message: "Checklist template not found." });
    }

    const items = await ChecklistItem.find({
      checklist: template._id,
    }).sort({ order: 1, createdAt: 1 });

    res.status(200).json({
      ...template.toObject(),
      items,
    });
  } catch (error) {
    console.error("getChecklistTemplateById error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// @desc    Update checklist template
// @route   PUT /api/checklists/templates/:id
// @access  Private (manager/admin/supervisor)
exports.updateChecklistTemplate = async (req, res) => {
  try {
    const { title, description, category, isActive } = req.body;

    const template = await ChecklistTemplate.findOne({
      _id: req.params.id,
      company: req.user.company,
    });

    if (!template) {
      return res.status(404).json({ message: "Checklist template not found." });
    }

    if (title !== undefined) template.title = title.trim();
    if (description !== undefined) template.description = description.trim();
    if (category !== undefined) template.category = category;
    if (isActive !== undefined) template.isActive = isActive;

    await template.save();

    res.status(200).json({
      message: "Checklist template updated successfully.",
      template,
    });
  } catch (error) {
    console.error("updateChecklistTemplate error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// @desc    Delete checklist template + items
// @route   DELETE /api/checklists/templates/:id
// @access  Private (manager/admin/supervisor)
exports.deleteChecklistTemplate = async (req, res) => {
  try {
    const template = await ChecklistTemplate.findOne({
      _id: req.params.id,
      company: req.user.company,
    });

    if (!template) {
      return res.status(404).json({ message: "Checklist template not found." });
    }

    await ChecklistItem.deleteMany({ checklist: template._id });
    await template.deleteOne();

    res.status(200).json({
      message: "Checklist template deleted successfully.",
    });
  } catch (error) {
    console.error("deleteChecklistTemplate error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// @desc    Add item to checklist template
// @route   POST /api/checklists/templates/:id/items
// @access  Private (manager/admin/supervisor)
exports.addChecklistItem = async (req, res) => {
  try {
    const { label, type, isRequired, order } = req.body;

    if (!label?.trim()) {
      return res.status(400).json({ message: "Item label is required." });
    }

    const template = await ChecklistTemplate.findOne({
      _id: req.params.id,
      company: req.user.company,
    });

    if (!template) {
      return res.status(404).json({ message: "Checklist template not found." });
    }

    const item = await ChecklistItem.create({
      checklist: template._id,
      label: label.trim(),
      type: type || "boolean",
      isRequired: isRequired ?? true,
      order: order ?? 0,
    });

    res.status(201).json({
      message: "Checklist item added successfully.",
      item,
    });
  } catch (error) {
    console.error("addChecklistItem error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// @desc    Update checklist item
// @route   PUT /api/checklists/items/:itemId
// @access  Private (manager/admin/supervisor)
exports.updateChecklistItem = async (req, res) => {
  try {
    const item = await ChecklistItem.findById(req.params.itemId);

    if (!item) {
      return res.status(404).json({ message: "Checklist item not found." });
    }

    const template = await ChecklistTemplate.findOne({
      _id: item.checklist,
      company: req.user.company,
    });

    if (!template) {
      return res.status(403).json({ message: "Access denied." });
    }

    const { label, type, isRequired, order } = req.body;

    if (label !== undefined) item.label = label.trim();
    if (type !== undefined) item.type = type;
    if (isRequired !== undefined) item.isRequired = isRequired;
    if (order !== undefined) item.order = order;

    await item.save();

    res.status(200).json({
      message: "Checklist item updated successfully.",
      item,
    });
  } catch (error) {
    console.error("updateChecklistItem error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// @desc    Delete checklist item
// @route   DELETE /api/checklists/items/:itemId
// @access  Private (manager/admin/supervisor)
exports.deleteChecklistItem = async (req, res) => {
  try {
    const item = await ChecklistItem.findById(req.params.itemId);

    if (!item) {
      return res.status(404).json({ message: "Checklist item not found." });
    }

    const template = await ChecklistTemplate.findOne({
      _id: item.checklist,
      company: req.user.company,
    });

    if (!template) {
      return res.status(403).json({ message: "Access denied." });
    }

    await item.deleteOne();

    res.status(200).json({
      message: "Checklist item deleted successfully.",
    });
  } catch (error) {
    console.error("deleteChecklistItem error:", error);
    res.status(500).json({ message: "Server error." });
  }
};