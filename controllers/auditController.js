const Audit = require("../models/auditModel");

// Create audit
exports.createAudit = async (req, res) => {
  try {
    const payload = {
      title: req.body.title,
      description: req.body.description,
      type: req.body.type,
      status: req.body.status || "planned",
      zone: req.body.zone,
      auditor: req.user?._id || req.body.auditor,
      scheduledDate: req.body.scheduledDate,
      completedDate: req.body.completedDate,
      score: req.body.score,
      findings: Array.isArray(req.body.findings) ? req.body.findings : [],
      attachments: Array.isArray(req.body.attachments) ? req.body.attachments : [],
    };

    if (!payload.auditor) {
      return res.status(400).json({
        message: "auditor is required (req.user._id or body.auditor)",
      });
    }

    const doc = await Audit.create(payload);

    const populated = await Audit.findById(doc._id)
      .populate("zone", "_id name")
      .populate("auditor", "_id firstName lastName email company")
      .populate({
        path: "auditor",
        populate: { path: "company", select: "_id name industry" },
      });

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: "Create audit failed", error: err.message });
  }
};

// List audits
exports.listAudits = async (req, res) => {
  try {
    const {
      type,
      status,
      zone,
      auditor,
      from,
      to,
      q,
      page = 1,
      limit = 20,
      sort = "-createdAt",
    } = req.query;

    const filter = {};

    if (type) filter.type = type;
    if (status) filter.status = status;
    if (zone) filter.zone = zone;
    if (auditor) filter.auditor = auditor;

    if (from || to) {
      filter.scheduledDate = {};
      if (from) filter.scheduledDate.$gte = new Date(from);
      if (to) filter.scheduledDate.$lte = new Date(to);
    }

    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { type: { $regex: q, $options: "i" } },
        { status: { $regex: q, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Audit.find(filter)
        .populate("zone", "_id name")
        .populate("auditor", "_id firstName lastName email company")
        .populate({
          path: "auditor",
          populate: { path: "company", select: "_id name industry" },
        })
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Audit.countDocuments(filter),
    ]);

    res.json({
      items,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ message: "List audits failed", error: err.message });
  }
};

// Get audit by id
exports.getAuditById = async (req, res) => {
  try {
    const doc = await Audit.findById(req.params.id)
      .populate("zone", "_id name")
      .populate("auditor", "_id firstName lastName email company")
      .populate({
        path: "auditor",
        populate: { path: "company", select: "_id name industry" },
      });

    if (!doc) {
      return res.status(404).json({ message: "Audit not found" });
    }

    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: "Get audit failed", error: err.message });
  }
};

// Update audit
exports.updateAudit = async (req, res) => {
  try {
    const updates = {
      title: req.body.title,
      description: req.body.description,
      type: req.body.type,
      status: req.body.status,
      zone: req.body.zone,
      auditor: req.body.auditor,
      scheduledDate: req.body.scheduledDate,
      completedDate: req.body.completedDate,
      score: req.body.score,
      findings: req.body.findings,
      attachments: req.body.attachments,
    };

    Object.keys(updates).forEach((key) => {
      if (updates[key] === undefined) delete updates[key];
    });

    const doc = await Audit.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    })
      .populate("zone", "_id name")
      .populate("auditor", "_id firstName lastName email company")
      .populate({
        path: "auditor",
        populate: { path: "company", select: "_id name industry" },
      });

    if (!doc) {
      return res.status(404).json({ message: "Audit not found" });
    }

    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: "Update audit failed", error: err.message });
  }
};

// Add finding
exports.addFinding = async (req, res) => {
  try {
    const finding = {
      title: req.body.title,
      description: req.body.description,
      severity: req.body.severity || "medium",
      status: req.body.status || "open",
      dueDate: req.body.dueDate,
      assignedTo: req.body.assignedTo,
    };

    if (!finding.title) {
      return res.status(400).json({ message: "Finding title is required" });
    }

    const doc = await Audit.findByIdAndUpdate(
      req.params.id,
      { $push: { findings: finding } },
      { new: true, runValidators: true }
    )
      .populate("zone", "_id name")
      .populate("auditor", "_id firstName lastName email company")
      .populate({
        path: "auditor",
        populate: { path: "company", select: "_id name industry" },
      });

    if (!doc) {
      return res.status(404).json({ message: "Audit not found" });
    }

    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: "Add finding failed", error: err.message });
  }
};

// Update finding
exports.updateFinding = async (req, res) => {
  try {
    const { findingId } = req.params;

    const updates = {};
    if (req.body.title !== undefined) updates["findings.$.title"] = req.body.title;
    if (req.body.description !== undefined) updates["findings.$.description"] = req.body.description;
    if (req.body.severity !== undefined) updates["findings.$.severity"] = req.body.severity;
    if (req.body.status !== undefined) updates["findings.$.status"] = req.body.status;
    if (req.body.dueDate !== undefined) updates["findings.$.dueDate"] = req.body.dueDate;
    if (req.body.assignedTo !== undefined) updates["findings.$.assignedTo"] = req.body.assignedTo;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No finding fields provided to update" });
    }

    const doc = await Audit.findOneAndUpdate(
      { _id: req.params.id, "findings._id": findingId },
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate("zone", "_id name")
      .populate("auditor", "_id firstName lastName email company")
      .populate({
        path: "auditor",
        populate: { path: "company", select: "_id name industry" },
      });

    if (!doc) {
      return res.status(404).json({ message: "Audit or finding not found" });
    }

    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: "Update finding failed", error: err.message });
  }
};

// Remove finding
exports.removeFinding = async (req, res) => {
  try {
    const { findingId } = req.params;

    const doc = await Audit.findByIdAndUpdate(
      req.params.id,
      { $pull: { findings: { _id: findingId } } },
      { new: true }
    )
      .populate("zone", "_id name")
      .populate("auditor", "_id firstName lastName email company")
      .populate({
        path: "auditor",
        populate: { path: "company", select: "_id name industry" },
      });

    if (!doc) {
      return res.status(404).json({ message: "Audit not found" });
    }

    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: "Remove finding failed", error: err.message });
  }
};

// Delete audit
exports.deleteAudit = async (req, res) => {
  try {
    const doc = await Audit.findByIdAndDelete(req.params.id);

    if (!doc) {
      return res.status(404).json({ message: "Audit not found" });
    }

    res.json({ message: "Audit deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete audit failed", error: err.message });
  }
};