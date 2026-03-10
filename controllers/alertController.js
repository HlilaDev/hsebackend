const Alert = require("../models/alertModel");

// GET /api/alerts
exports.listAlerts = async (req, res) => {
  try {
    const {
      status,
      severity,
      zone,
      device,
      type,
      isRead,
      page = 1,
      limit = 20,
      sort = "-createdAt",
    } = req.query;

    const filter = {};

    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (zone) filter.zone = zone;
    if (device) filter.device = device;
    if (type) filter.type = type;
    if (isRead !== undefined) filter.isRead = isRead === "true";

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Alert.find(filter)
        .populate("zone", "_id name")
        .populate("device", "_id name deviceId status")
        .populate("sensor", "_id name type")
        .populate("rule", "_id name metric operator threshold severity")
        .populate("acknowledgedBy", "_id firstName lastName email")
        .populate("resolvedBy", "_id firstName lastName email")
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Alert.countDocuments(filter),
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
  } catch (error) {
    res.status(500).json({
      message: "Failed to list alerts",
      error: error.message,
    });
  }
};

// GET /api/alerts/:id
exports.getAlertById = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id)
      .populate("zone", "_id name")
      .populate("device", "_id name deviceId status")
      .populate("sensor", "_id name type")
      .populate("rule", "_id name metric operator threshold severity")
      .populate("acknowledgedBy", "_id firstName lastName email")
      .populate("resolvedBy", "_id firstName lastName email");

    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    res.json(alert);
  } catch (error) {
    res.status(500).json({
      message: "Failed to get alert",
      error: error.message,
    });
  }
};

// PATCH /api/alerts/:id/read
exports.markAsRead = async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    res.json(alert);
  } catch (error) {
    res.status(500).json({
      message: "Failed to mark alert as read",
      error: error.message,
    });
  }
};

// PATCH /api/alerts/:id/acknowledge
exports.acknowledgeAlert = async (req, res) => {
  try {
    const update = {
      status: "acknowledged",
      acknowledgedAt: new Date(),
    };

    if (req.user?._id) {
      update.acknowledgedBy = req.user._id;
    }

    const alert = await Alert.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });

    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    res.json(alert);
  } catch (error) {
    res.status(500).json({
      message: "Failed to acknowledge alert",
      error: error.message,
    });
  }
};

// PATCH /api/alerts/:id/resolve
exports.resolveAlert = async (req, res) => {
  try {
    const update = {
      status: "resolved",
      resolvedAt: new Date(),
      isRead: true,
    };

    if (req.user?._id) {
      update.resolvedBy = req.user._id;
    }

    const alert = await Alert.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });

    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    res.json(alert);
  } catch (error) {
    res.status(500).json({
      message: "Failed to resolve alert",
      error: error.message,
    });
  }
};

// DELETE /api/alerts/:id
exports.deleteAlert = async (req, res) => {
  try {
    const alert = await Alert.findByIdAndDelete(req.params.id);

    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    res.json({ message: "Alert deleted" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete alert",
      error: error.message,
    });
  }
};