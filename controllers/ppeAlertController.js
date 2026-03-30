const PpeAlert = require("../models/ppeAlertModel");

function buildFilters(query) {
  const filters = {};

  if (query.status) {
    filters.status = query.status;
  }

  if (query.alertType) {
    filters.alertType = query.alertType;
  }

  if (query.deviceId) {
    filters.deviceId = query.deviceId;
  }

  if (query.companyId) {
    filters.company = query.companyId;
  }

  if (query.zoneId) {
    filters.zone = query.zoneId;
  }

  if (query.cameraId) {
    filters.cameraId = query.cameraId;
  }

  if (query.from || query.to) {
    filters.timestamp = {};

    if (query.from) {
      filters.timestamp.$gte = new Date(query.from);
    }

    if (query.to) {
      filters.timestamp.$lte = new Date(query.to);
    }
  }

  return filters;
}

exports.getPpeAlerts = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const filters = buildFilters(req.query);

    const [items, total] = await Promise.all([
      PpeAlert.find(filters)
        .populate("device", "name serialNumber type status company zone")
        .populate("company", "name")
        .populate("zone", "name code")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PpeAlert.countDocuments(filters),
    ]);

    res.status(200).json({
      message: "PPE alerts fetched successfully",
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      items,
    });
  } catch (error) {
    console.error("getPpeAlerts error:", error.message);
    res.status(500).json({
      message: "Failed to fetch PPE alerts",
      error: error.message,
    });
  }
};

exports.getPpeAlertById = async (req, res) => {
  try {
    const alert = await PpeAlert.findById(req.params.id)
      .populate("device", "name serialNumber type status company zone")
      .populate("company", "name")
      .populate("zone", "name code");

    if (!alert) {
      return res.status(404).json({
        message: "PPE alert not found",
      });
    }

    res.status(200).json({
      message: "PPE alert fetched successfully",
      alert,
    });
  } catch (error) {
    console.error("getPpeAlertById error:", error.message);
    res.status(500).json({
      message: "Failed to fetch PPE alert",
      error: error.message,
    });
  }
};

exports.updatePpeAlertStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "open",
      "acknowledged",
      "resolved",
      "false_positive",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status value",
      });
    }

    const updateData = {
      status,
      reviewedAt: new Date(),
    };

    if (req.user?._id) {
      updateData.reviewedBy = req.user._id;
    }

    const alert = await PpeAlert.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        returnDocument: "after",
        runValidators: true,
      }
    )
      .populate("device", "name serialNumber type status company zone")
      .populate("company", "name")
      .populate("zone", "name code");

    if (!alert) {
      return res.status(404).json({
        message: "PPE alert not found",
      });
    }

    res.status(200).json({
      message: "PPE alert status updated successfully",
      alert,
    });
  } catch (error) {
    console.error("updatePpeAlertStatus error:", error.message);
    res.status(500).json({
      message: "Failed to update PPE alert status",
      error: error.message,
    });
  }
};

exports.deletePpeAlert = async (req, res) => {
  try {
    const alert = await PpeAlert.findByIdAndDelete(req.params.id);

    if (!alert) {
      return res.status(404).json({
        message: "PPE alert not found",
      });
    }

    res.status(200).json({
      message: "PPE alert deleted successfully",
    });
  } catch (error) {
    console.error("deletePpeAlert error:", error.message);
    res.status(500).json({
      message: "Failed to delete PPE alert",
      error: error.message,
    });
  }
};

exports.getPpeAlertStats = async (req, res) => {
  try {
    const filters = buildFilters(req.query);

    const [total, open, acknowledged, resolved, falsePositive, byType] =
      await Promise.all([
        PpeAlert.countDocuments(filters),
        PpeAlert.countDocuments({ ...filters, status: "open" }),
        PpeAlert.countDocuments({ ...filters, status: "acknowledged" }),
        PpeAlert.countDocuments({ ...filters, status: "resolved" }),
        PpeAlert.countDocuments({ ...filters, status: "false_positive" }),
        PpeAlert.aggregate([
          { $match: filters },
          {
            $group: {
              _id: "$alertType",
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
        ]),
      ]);

    res.status(200).json({
      message: "PPE alert stats fetched successfully",
      stats: {
        total,
        open,
        acknowledged,
        resolved,
        falsePositive,
        byType,
      },
    });
  } catch (error) {
    console.error("getPpeAlertStats error:", error.message);
    res.status(500).json({
      message: "Failed to fetch PPE alert stats",
      error: error.message,
    });
  }
};

exports.uploadPpeAlertSnapshot = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No snapshot file uploaded",
      });
    }

    const snapshotPath = `/uploads/ppe-alerts/${req.file.filename}`;

    res.status(200).json({
      message: "PPE snapshot uploaded successfully",
      snapshotPath,
      filename: req.file.filename,
    });
  } catch (error) {
    console.error("uploadPpeAlertSnapshot error:", error.message);
    res.status(500).json({
      message: "Failed to upload PPE snapshot",
      error: error.message,
    });
  }
};