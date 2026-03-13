const Report = require("../models/reportModel");
const Zone = require("../models/zoneModel");

function parseBoolean(value, fallback = true) {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value) === "true";
}

function parseNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isNaN(n) ? fallback : n;
}

// CREATE
exports.createReport = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!req.user.company) {
      return res
        .status(400)
        .json({ message: "Connected user is not linked to any company" });
    }

    const companyId = req.user.company;

    const {
      type,
      title,
      startDate,
      endDate,
      zone,
    } = req.body;

    if (!type) {
      return res.status(400).json({ message: "type is required" });
    }

    if (zone) {
      const zoneExists = await Zone.findOne({
        _id: zone,
        company: companyId,
      });

      if (!zoneExists) {
        return res
          .status(400)
          .json({ message: "Invalid zone for this company" });
      }
    }

    const payload = {
      company: companyId,
      type,
      title: title?.trim() || "",
      startDate: startDate || null,
      endDate: endDate || null,
      zone: zone || null,
      generatedBy: req.user._id,
      isAutomatic: parseBoolean(req.body.isAutomatic, true),
      metrics: {
        totalIncidents: parseNumber(req.body["metrics[totalIncidents]"], 0),
        totalObservations: parseNumber(
          req.body["metrics[totalObservations]"],
          0
        ),
        complianceRate: parseNumber(req.body["metrics[complianceRate]"], 0),
      },
      exportUrl: req.file ? `/uploads/reports/${req.file.filename}` : null,
    };

    const doc = await Report.create(payload);

    const populated = await Report.findById(doc._id)
      .populate("company", "name")
      .populate("zone", "name riskLevel")
      .populate("generatedBy", "name email role");

    return res.status(201).json(populated);
  } catch (err) {
    console.error("Create report failed:", err);
    return res.status(500).json({
      message: "Create report failed",
      error: err.message,
    });
  }
};

// LIST
exports.listReports = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!req.user.company) {
      return res
        .status(400)
        .json({ message: "Connected user is not linked to any company" });
    }

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

    const filter = {
      company: req.user.company,
    };

    if (type) filter.type = type;
    if (zone) filter.zone = zone;

    if (isAutomatic !== undefined) {
      filter.isAutomatic = String(isAutomatic) === "true";
    }

    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { type: { $regex: q, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      const and = [];
      if (startDate) and.push({ endDate: { $gte: new Date(startDate) } });
      if (endDate) and.push({ startDate: { $lte: new Date(endDate) } });
      if (and.length) filter.$and = and;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Report.find(filter)
        .populate("company", "name")
        .populate("zone", "name riskLevel")
        .populate("generatedBy", "name email role")
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Report.countDocuments(filter),
    ]);

    return res.json({
      items,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("List reports failed:", err);
    return res.status(500).json({
      message: "List reports failed",
      error: err.message,
    });
  }
};

// GET BY ID
exports.getReportById = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const doc = await Report.findOne({
      _id: req.params.id,
      company: req.user.company,
    })
      .populate("company", "name")
      .populate("zone", "name riskLevel")
      .populate("generatedBy", "name email role");

    if (!doc) {
      return res.status(404).json({ message: "Report not found" });
    }

    return res.json(doc);
  } catch (err) {
    console.error("Get report failed:", err);
    return res.status(500).json({
      message: "Get report failed",
      error: err.message,
    });
  }
};

// UPDATE
exports.updateReport = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const existing = await Report.findOne({
      _id: req.params.id,
      company: req.user.company,
    });

    if (!existing) {
      return res.status(404).json({ message: "Report not found" });
    }

    const updateData = {
      ...(req.body.type !== undefined && { type: req.body.type }),
      ...(req.body.title !== undefined && { title: req.body.title }),
      ...(req.body.startDate !== undefined && { startDate: req.body.startDate || null }),
      ...(req.body.endDate !== undefined && { endDate: req.body.endDate || null }),
      ...(req.body.zone !== undefined && { zone: req.body.zone || null }),
      ...(req.body.isAutomatic !== undefined && {
        isAutomatic: String(req.body.isAutomatic) === "true",
      }),
    };

    if (req.file) {
      updateData.exportUrl = `/uploads/reports/${req.file.filename}`;
    }

    const doc = await Report.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("company", "name")
      .populate("zone", "name riskLevel")
      .populate("generatedBy", "name email role");

    return res.json(doc);
  } catch (err) {
    console.error("Update report failed:", err);
    return res.status(500).json({
      message: "Update report failed",
      error: err.message,
    });
  }
};

// PATCH METRICS
exports.updateReportMetrics = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const existing = await Report.findOne({
      _id: req.params.id,
      company: req.user.company,
    });

    if (!existing) {
      return res.status(404).json({ message: "Report not found" });
    }

    const { metrics } = req.body;

    if (!metrics || typeof metrics !== "object") {
      return res.status(400).json({ message: "metrics object is required" });
    }

    const doc = await Report.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          metrics: {
            totalIncidents: Number(metrics.totalIncidents || 0),
            totalObservations: Number(metrics.totalObservations || 0),
            complianceRate: Number(metrics.complianceRate || 0),
          },
        },
      },
      { new: true, runValidators: true }
    )
      .populate("company", "name")
      .populate("zone", "name riskLevel")
      .populate("generatedBy", "name email role");

    return res.json(doc);
  } catch (err) {
    console.error("Update report metrics failed:", err);
    return res.status(500).json({
      message: "Update report metrics failed",
      error: err.message,
    });
  }
};

// DELETE
exports.deleteReport = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const doc = await Report.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company,
    });

    if (!doc) {
      return res.status(404).json({ message: "Report not found" });
    }

    return res.json({ message: "Report deleted" });
  } catch (err) {
    console.error("Delete report failed:", err);
    return res.status(500).json({
      message: "Delete report failed",
      error: err.message,
    });
  }
};