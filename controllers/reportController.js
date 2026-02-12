// controllers/reportController.js
const Report = require("../models/reportModel");

// Create
exports.createReport = async (req, res) => {
  try {
    const payload = {
      type: req.body.type, // weekly/monthly/yearly/audit/custom
      title: req.body.title,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      zone: req.body.zone,
      metrics: req.body.metrics || {},
      generatedBy: req.body.generatedBy,
      isAutomatic: req.body.isAutomatic ?? true,
      exportUrl: req.body.exportUrl,
    };

    const doc = await Report.create(payload);

    const populated = await Report.findById(doc._id)
      .populate("zone")
      .populate("generatedBy", "name email");

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: "Create report failed", error: err.message });
  }
};

// List (filters + pagination)
exports.listReports = async (req, res) => {
  try {
    const {
      type,
      zone,
      isAutomatic,
      startDate,
      endDate,
      q,
      page = 1,
      limit = 20,
      sort = "-createdAt",
    } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (zone) filter.zone = zone;

    if (isAutomatic !== undefined) {
      // "true"/"false" from query string
      filter.isAutomatic = String(isAutomatic) === "true";
    }

    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { type: { $regex: q, $options: "i" } },
      ];
    }

    // date range intersection filter (optional)
    if (startDate || endDate) {
      const and = [];
      if (startDate) and.push({ endDate: { $gte: new Date(startDate) } });
      if (endDate) and.push({ startDate: { $lte: new Date(endDate) } });
      if (and.length) filter.$and = and;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Report.find(filter)
        .populate("zone")
        .populate("generatedBy", "name email")
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Report.countDocuments(filter),
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
    res.status(500).json({ message: "List reports failed", error: err.message });
  }
};

// Get by id
exports.getReportById = async (req, res) => {
  try {
    const doc = await Report.findById(req.params.id)
      .populate("zone")
      .populate("generatedBy", "name email");

    if (!doc) return res.status(404).json({ message: "Report not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: "Get report failed", error: err.message });
  }
};

// Update
exports.updateReport = async (req, res) => {
  try {
    const doc = await Report.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("zone")
      .populate("generatedBy", "name email");

    if (!doc) return res.status(404).json({ message: "Report not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: "Update report failed", error: err.message });
  }
};

// Patch metrics only (nice for recompute)
exports.updateReportMetrics = async (req, res) => {
  try {
    const { metrics } = req.body;
    if (!metrics || typeof metrics !== "object") {
      return res.status(400).json({ message: "metrics object is required" });
    }

    const doc = await Report.findByIdAndUpdate(
      req.params.id,
      { $set: { metrics } },
      { new: true, runValidators: true }
    )
      .populate("zone")
      .populate("generatedBy", "name email");

    if (!doc) return res.status(404).json({ message: "Report not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: "Update report metrics failed", error: err.message });
  }
};

// Delete
exports.deleteReport = async (req, res) => {
  try {
    const doc = await Report.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Report not found" });
    res.json({ message: "Report deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete report failed", error: err.message });
  }
};
