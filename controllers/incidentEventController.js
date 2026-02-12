const IncidentEvent = require("../models/IncidentEventModel");

// Create
exports.createIncidentEvent = async (req, res) => {
  try {
    const payload = {
      type: req.body.type,
      sourceType: req.body.sourceType,
      device: req.body.device,
      reading: req.body.reading,
      zone: req.body.zone,
      confidenceScore: req.body.confidenceScore,
      evidence: req.body.evidence || {},
      status: req.body.status,
      resolvedBy: req.body.resolvedBy,
      resolvedAt: req.body.resolvedAt,
    };

    const doc = await IncidentEvent.create(payload);
    const populated = await IncidentEvent.findById(doc._id)
      .populate("zone")
      .populate("device")
      .populate("reading")
      .populate("resolvedBy", "name email");

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: "Create incident event failed", error: err.message });
  }
};

// List (filters + pagination)
exports.listIncidentEvents = async (req, res) => {
  try {
    const {
      zone,
      device,
      sourceType,
      type,
      status,
      minConfidence,
      maxConfidence,
      page = 1,
      limit = 20,
      sort = "-createdAt",
    } = req.query;

    const filter = {};
    if (zone) filter.zone = zone;
    if (device) filter.device = device;
    if (sourceType) filter.sourceType = sourceType;
    if (type) filter.type = type;
    if (status) filter.status = status;

    if (minConfidence || maxConfidence) {
      filter.confidenceScore = {};
      if (minConfidence) filter.confidenceScore.$gte = Number(minConfidence);
      if (maxConfidence) filter.confidenceScore.$lte = Number(maxConfidence);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      IncidentEvent.find(filter)
        .populate("zone")
        .populate("device")
        .populate("reading")
        .populate("resolvedBy", "name email")
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      IncidentEvent.countDocuments(filter),
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
    res.status(500).json({ message: "List incident events failed", error: err.message });
  }
};

// Get by id
exports.getIncidentEventById = async (req, res) => {
  try {
    const doc = await IncidentEvent.findById(req.params.id)
      .populate("zone")
      .populate("device")
      .populate("reading")
      .populate("resolvedBy", "name email");

    if (!doc) return res.status(404).json({ message: "IncidentEvent not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: "Get incident event failed", error: err.message });
  }
};

// Update
exports.updateIncidentEvent = async (req, res) => {
  try {
    const doc = await IncidentEvent.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("zone")
      .populate("device")
      .populate("reading")
      .populate("resolvedBy", "name email");

    if (!doc) return res.status(404).json({ message: "IncidentEvent not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: "Update incident event failed", error: err.message });
  }
};

// Mark as resolved / closed
exports.resolveIncidentEvent = async (req, res) => {
  try {
    const { resolvedBy, status = "closed" } = req.body;

    const doc = await IncidentEvent.findByIdAndUpdate(
      req.params.id,
      { status, resolvedBy, resolvedAt: new Date() },
      { new: true }
    )
      .populate("zone")
      .populate("device")
      .populate("reading")
      .populate("resolvedBy", "name email");

    if (!doc) return res.status(404).json({ message: "IncidentEvent not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: "Resolve incident event failed", error: err.message });
  }
};

// Delete
exports.deleteIncidentEvent = async (req, res) => {
  try {
    const doc = await IncidentEvent.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "IncidentEvent not found" });
    res.json({ message: "IncidentEvent deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete incident event failed", error: err.message });
  }
};
