const AlertRule = require("../models/alertRuleModel");

// POST /api/alert-rules
exports.createAlertRule = async (req, res) => {
  try {
    const rule = await AlertRule.create({
      name: req.body.name,
      metric: req.body.metric,
      operator: req.body.operator,
      threshold: req.body.threshold,
      severity: req.body.severity,
      zone: req.body.zone,
      device: req.body.device,
      sensor: req.body.sensor,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      cooldownSec: req.body.cooldownSec ?? 300,
    });

    const populated = await AlertRule.findById(rule._id)
      .populate("zone", "_id name")
      .populate("device", "_id name deviceId")
      .populate("sensor", "_id name type");

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create alert rule",
      error: error.message,
    });
  }
};

// GET /api/alert-rules
exports.listAlertRules = async (req, res) => {
  try {
    const { metric, severity, isActive, zone, device, sensor } = req.query;

    const filter = {};

    if (metric) filter.metric = metric;
    if (severity) filter.severity = severity;
    if (zone) filter.zone = zone;
    if (device) filter.device = device;
    if (sensor) filter.sensor = sensor;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const rules = await AlertRule.find(filter)
      .populate("zone", "_id name")
      .populate("device", "_id name deviceId")
      .populate("sensor", "_id name type")
      .sort({ createdAt: -1 });

    res.json(rules);
  } catch (error) {
    res.status(500).json({
      message: "Failed to list alert rules",
      error: error.message,
    });
  }
};

// GET /api/alert-rules/:id
exports.getAlertRuleById = async (req, res) => {
  try {
    const rule = await AlertRule.findById(req.params.id)
      .populate("zone", "_id name")
      .populate("device", "_id name deviceId")
      .populate("sensor", "_id name type");

    if (!rule) {
      return res.status(404).json({ message: "Alert rule not found" });
    }

    res.json(rule);
  } catch (error) {
    res.status(500).json({
      message: "Failed to get alert rule",
      error: error.message,
    });
  }
};

// PUT /api/alert-rules/:id
exports.updateAlertRule = async (req, res) => {
  try {
    const updates = {
      name: req.body.name,
      metric: req.body.metric,
      operator: req.body.operator,
      threshold: req.body.threshold,
      severity: req.body.severity,
      zone: req.body.zone,
      device: req.body.device,
      sensor: req.body.sensor,
      isActive: req.body.isActive,
      cooldownSec: req.body.cooldownSec,
    };

    Object.keys(updates).forEach((key) => {
      if (updates[key] === undefined) delete updates[key];
    });

    const rule = await AlertRule.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    })
      .populate("zone", "_id name")
      .populate("device", "_id name deviceId")
      .populate("sensor", "_id name type");

    if (!rule) {
      return res.status(404).json({ message: "Alert rule not found" });
    }

    res.json(rule);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update alert rule",
      error: error.message,
    });
  }
};

// PATCH /api/alert-rules/:id/toggle
exports.toggleAlertRule = async (req, res) => {
  try {
    const rule = await AlertRule.findById(req.params.id);

    if (!rule) {
      return res.status(404).json({ message: "Alert rule not found" });
    }

    rule.isActive = !rule.isActive;
    await rule.save();

    res.json(rule);
  } catch (error) {
    res.status(500).json({
      message: "Failed to toggle alert rule",
      error: error.message,
    });
  }
};

// DELETE /api/alert-rules/:id
exports.deleteAlertRule = async (req, res) => {
  try {
    const rule = await AlertRule.findByIdAndDelete(req.params.id);

    if (!rule) {
      return res.status(404).json({ message: "Alert rule not found" });
    }

    res.json({ message: "Alert rule deleted" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete alert rule",
      error: error.message,
    });
  }
};