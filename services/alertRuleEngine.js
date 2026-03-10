const Alert = require("../models/alertModel");
const AlertRule = require("../models/alertRuleModel");
const { getIo } = require("../socket/socket");

function compareValue(value, operator, threshold) {
  switch (operator) {
    case ">":
      return value > threshold;
    case ">=":
      return value >= threshold;
    case "<":
      return value < threshold;
    case "<=":
      return value <= threshold;
    case "==":
      return value === threshold;
    case "!=":
      return value !== threshold;
    default:
      return false;
  }
}

async function findApplicableRules({ metric, deviceId, zoneId, sensorId }) {
  const rules = await AlertRule.find({
    isActive: true,
    metric,
  }).sort({ createdAt: -1 });

  return rules.filter((rule) => {
    const matchDevice =
      !rule.device || String(rule.device) === String(deviceId || "");
    const matchZone =
      !rule.zone || String(rule.zone) === String(zoneId || "");
    const matchSensor =
      !rule.sensor || String(rule.sensor) === String(sensorId || "");

    return matchDevice && matchZone && matchSensor;
  });
}

async function shouldSkipByCooldown(existingAlert, cooldownSec) {
  if (!existingAlert) return false;
  if (!cooldownSec || cooldownSec <= 0) return false;

  const now = Date.now();
  const createdAt = new Date(existingAlert.createdAt).getTime();
  const diffSec = Math.floor((now - createdAt) / 1000);

  return diffSec < cooldownSec;
}

async function emitNewAlert(alertId) {
  try {
    const io = getIo();
    if (!io) return;

    const populatedAlert = await Alert.findById(alertId)
      .populate("zone", "_id name")
      .populate("device", "_id name deviceId status")
      .populate("sensor", "_id name type")
      .populate("rule", "_id name metric operator threshold severity");

    if (!populatedAlert) return;

    io.emit("alert:new", populatedAlert);
  } catch (error) {
    console.error("❌ Socket emit alert:new failed:", error.message);
  }
}

async function evaluateMetric({ metric, value, device, zone, sensor }) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return [];
  }

  const numericValue = Number(value);

  const rules = await findApplicableRules({
    metric,
    deviceId: device?._id,
    zoneId: zone,
    sensorId: sensor,
  });

  const triggeredAlerts = [];

  for (const rule of rules) {
    const matched = compareValue(numericValue, rule.operator, rule.threshold);
    if (!matched) continue;

    const existingOpenAlert = await Alert.findOne({
      rule: rule._id,
      device: device?._id || undefined,
      zone: zone || undefined,
      sensor: sensor || undefined,
      status: { $in: ["open", "acknowledged"] },
    }).sort({ createdAt: -1 });

    const cooldownBlocked = await shouldSkipByCooldown(
      existingOpenAlert,
      rule.cooldownSec
    );

    if (cooldownBlocked) {
      triggeredAlerts.push(existingOpenAlert);
      continue;
    }

    if (existingOpenAlert) {
      triggeredAlerts.push(existingOpenAlert);
      continue;
    }

    const alert = await Alert.create({
      type: "threshold_breach",
      title: `${metric} threshold exceeded`,
      message: `${metric} value ${numericValue} crossed threshold ${rule.threshold}`,
      severity: rule.severity,
      zone: zone || undefined,
      device: device?._id || undefined,
      sensor: sensor || undefined,
      rule: rule._id,
      readingValue: numericValue,
      threshold: rule.threshold,
      status: "open",
      isRead: false,
    });

    await emitNewAlert(alert._id);

    triggeredAlerts.push(alert);
  }

  return triggeredAlerts;
}

async function evaluateValues({ values, device, zone, sensor }) {
  if (!values || typeof values !== "object") return [];

  const allAlerts = [];

  for (const [metric, value] of Object.entries(values)) {
    const alerts = await evaluateMetric({
      metric,
      value,
      device,
      zone,
      sensor,
    });

    if (alerts.length) {
      allAlerts.push(...alerts);
    }
  }

  return allAlerts;
}

module.exports = {
  compareValue,
  evaluateMetric,
  evaluateValues,
};