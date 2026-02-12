const Observation = require("../models/observationModel");

// Create
exports.createObservation = async (req, res) => {
  try {
    const payload = {
      title: req.body.title,
      description: req.body.description,
      severity: req.body.severity,
      status: req.body.status,
      zone: req.body.zone,
      reportedBy: req.body.reportedBy,
      images: req.body.images || [], // [{url, uploadedAt}]
    };

    const doc = await Observation.create(payload);
    const populated = await Observation.findById(doc._id)
      .populate("zone")
      .populate("reportedBy", "name email");

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: "Create observation failed", error: err.message });
  }
};

// List (filters + pagination)
exports.listObservations = async (req, res) => {
  try {
    const {
      zone,
      status,
      severity,
      reportedBy,
      q,
      page = 1,
      limit = 20,
      sort = "-createdAt",
    } = req.query;

    const filter = {};
    if (zone) filter.zone = zone;
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (reportedBy) filter.reportedBy = reportedBy;

    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Observation.find(filter)
        .populate("zone")
        .populate("reportedBy", "name email")
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Observation.countDocuments(filter),
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
    res.status(500).json({ message: "List observations failed", error: err.message });
  }
};

// Get by id
exports.getObservationById = async (req, res) => {
  try {
    const doc = await Observation.findById(req.params.id)
      .populate("zone")
      .populate("reportedBy", "name email");
    if (!doc) return res.status(404).json({ message: "Observation not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: "Get observation failed", error: err.message });
  }
};

// Update
exports.updateObservation = async (req, res) => {
  try {
    const doc = await Observation.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("zone")
      .populate("reportedBy", "name email");

    if (!doc) return res.status(404).json({ message: "Observation not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: "Update observation failed", error: err.message });
  }
};

// Add image
exports.addObservationImage = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ message: "url is required" });

    const doc = await Observation.findByIdAndUpdate(
      req.params.id,
      { $push: { images: { url, uploadedAt: new Date() } } },
      { new: true }
    )
      .populate("zone")
      .populate("reportedBy", "name email");

    if (!doc) return res.status(404).json({ message: "Observation not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: "Add image failed", error: err.message });
  }
};

// Delete
exports.deleteObservation = async (req, res) => {
  try {
    const doc = await Observation.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Observation not found" });
    res.json({ message: "Observation deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete observation failed", error: err.message });
  }
};
