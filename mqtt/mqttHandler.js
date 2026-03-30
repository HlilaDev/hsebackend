const Reading = require("../models/readingModel");
const PpeAlert = require("../models/ppeAlertModel");
const Notification = require("../models/notificationModel");
const UserNotification = require("../models/UserNotificationModel");
const User = require("../models/userModel");

const parsers = require("./parsers");
const { evaluateValues } = require("../services/alertRuleEngine");
const { markDeviceOnline } = require("../services/deviceHeartbeatMonitor");
const { getIo } = require("../socket/socket");

function safeParse(payload) {
  const s = payload.toString().trim();

  if (s.startsWith("{") || s.startsWith("[")) {
    try {
      return JSON.parse(s);
    } catch {
      return { value: s };
    }
  }

  const obj = {};
  for (const part of s.split(/[;,]+/)) {
    const [k, v] = part.split(/[:=]/).map((x) => x && x.trim());
    if (k && v) obj[k] = v;
  }

  if (Object.keys(obj).length > 0) return obj;

  return { value: s };
}

function normalizeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildAlertKey(data) {
  if (data.trackId !== undefined && data.trackId !== null && data.trackId !== "") {
    return `track:${data.trackId}:${data.violationType || "ppe_violation"}`;
  }

  const bbox = data.bbox || {};
  const hasBbox =
    bbox &&
    bbox.x1 !== undefined &&
    bbox.y1 !== undefined &&
    bbox.x2 !== undefined &&
    bbox.y2 !== undefined;

  if (hasBbox) {
    return [
      "bbox",
      Math.round(normalizeNumber(bbox.x1) / 20),
      Math.round(normalizeNumber(bbox.y1) / 20),
      Math.round(normalizeNumber(bbox.x2) / 20),
      Math.round(normalizeNumber(bbox.y2) / 20),
      data.violationType || "ppe_violation",
    ].join(":");
  }

  return `generic:${data.violationType || "ppe_violation"}`;
}

function getPpeTitle(violationType) {
  switch (violationType) {
    case "no_helmet":
      return "Alerte PPE - Absence de casque";
    case "no_vest":
      return "Alerte PPE - Absence de gilet";
    case "zone_intrusion":
      return "Alerte PPE - Intrusion en zone";
    default:
      return "Alerte PPE détectée";
  }
}

function getPpeMessage(device, zone, data) {
  const zoneName =
    typeof zone === "object" && zone?.name
      ? zone.name
      : "Zone inconnue";

  const deviceName = device?.name || device?.deviceId || data.deviceId || "Device inconnu";

  switch (data.violationType) {
    case "no_helmet":
      return `Absence de casque détectée par ${deviceName} dans ${zoneName}.`;
    case "no_vest":
      return `Absence de gilet détectée par ${deviceName} dans ${zoneName}.`;
    case "zone_intrusion":
      return `Intrusion détectée par ${deviceName} dans ${zoneName}.`;
    default:
      return `Violation PPE détectée par ${deviceName} dans ${zoneName}.`;
  }
}

function getSeverityFromViolation(violationType) {
  switch (violationType) {
    case "no_helmet":
    case "zone_intrusion":
      return "critical";
    case "no_vest":
      return "warning";
    default:
      return "warning";
  }
}

async function getRecipientsForPpe(companyId) {
  if (!companyId) return [];

  const users = await User.find({
    company: companyId,
    role: { $in: ["admin", "manager", "supervisor"] },
  }).select("_id");

  return users.map((user) => user._id);
}

async function emitUserNotifications(userNotificationIds) {
  if (!userNotificationIds.length) return;

  const io = getIo();
  if (!io) return;

  const rows = await UserNotification.find({
    _id: { $in: userNotificationIds },
  })
    .populate({
      path: "notification",
      populate: [
        { path: "zone", select: "_id name code" },
        { path: "device", select: "_id name deviceId status" },
        { path: "actor", select: "_id firstName lastName email fullName" },
      ],
    })
    .populate("user", "_id firstName lastName email fullName role");

  for (const row of rows) {
    io.to(`user:${row.user._id}`).emit("notification:new", row);
  }
}

async function handleStatusMessage(deviceId, data) {
  const updatedDevice = await markDeviceOnline(deviceId, {
    status: data.status || "online",
    lastSeen: data.timestamp ? new Date(data.timestamp) : new Date(),
    ipAddress: data.ipAddress || "",
    macAddress: data.macAddress || "",
    firmware: data.firmware || "",
    uptime: typeof data.uptime === "number" ? data.uptime : 0,
    memoryUsage: typeof data.memoryUsage === "number" ? data.memoryUsage : 0,
    cpuTemp: typeof data.cpuTemp === "number" ? data.cpuTemp : 0,
    networkType: data.networkType || "",
    signal: typeof data.signal === "number" ? data.signal : 0,
  });

  if (!updatedDevice) {
    console.warn(`⚠️ Unknown device for status topic: ${deviceId}`);
    return;
  }

  console.log(`✅ Status updated for ${deviceId}`);
}

async function handleTelemetryMessage(deviceId, data) {
  const sensorType = data.sensorType;
  if (!sensorType) {
    console.warn(`⚠️ Missing sensorType in telemetry payload for device: ${deviceId}`);
    return;
  }

  const parser = parsers[sensorType];
  if (!parser) {
    console.warn(`⚠️ No parser for sensorType: ${sensorType}`);
    return;
  }

  const { values, raw } = parser(data);

  const device = await markDeviceOnline(deviceId, {
    lastSeen: new Date(),
    status: "online",
  });

  if (!device) {
    console.warn(`⚠️ Unknown device: ${deviceId}`);
    return;
  }

  await Reading.create({
    device: device._id,
    zone: device.zone,
    sensorType,
    values,
    raw,
  });

  const alerts = await evaluateValues({
    values,
    device,
    zone: device.zone,
    sensor: undefined,
  });

  if (alerts.length) {
    console.log(`🚨 ${alerts.length} alert(s) triggered for ${deviceId}`);
  }

  console.log(`✅ Reading saved for ${deviceId} (${sensorType})`);
}

async function handlePpeAlertMessage(deviceId, data) {
  const device = await markDeviceOnline(deviceId, {
    lastSeen: data.timestamp ? new Date(data.timestamp) : new Date(),
    status: "online",
  });

  if (!device) {
    console.warn(`⚠️ Unknown device for PPE alert: ${deviceId}`);
    return;
  }

  const violationType = data.violationType || "ppe_violation";
  const companyId = device.company?._id || device.company || null;
  const zoneId = device.zone?._id || device.zone || null;

  console.log(`🦺 PPE alert received from ${deviceId}: ${violationType}`);
  console.log("🦺 PPE payload:", data);

  const alertKey = buildAlertKey(data);

  const cooldownSeconds = 15;
  const since = new Date(Date.now() - cooldownSeconds * 1000);

  const recentExisting = await PpeAlert.findOne({
    device: device._id,
    alertType: violationType,
    status: { $in: ["open", "acknowledged"] },
    timestamp: { $gte: since },
    "metadata.alertKey": alertKey,
  });

  if (recentExisting) {
    console.log(`⏱️ PPE alert skipped بسبب cooldown for ${deviceId} (${alertKey})`);
    return;
  }

  const alert = await PpeAlert.create({
    device: device._id,
    company: companyId,
    zone: zoneId,
    alertType: ["no_helmet", "no_vest", "zone_intrusion", "ppe_violation"].includes(
      violationType
    )
      ? violationType
      : "ppe_violation",
    label: data.label || violationType,
    confidence: normalizeNumber(data.confidence, 0),
    cameraId: data.cameraId || "",
    siteId: data.siteId || "",
    deviceId: data.deviceId || deviceId,
    snapshotPath: data.snapshotPath || "",
    source: data.source || "raspberrypi-yolo",
    timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
    bbox: {
      x1: normalizeNumber(data?.bbox?.x1, 0),
      y1: normalizeNumber(data?.bbox?.y1, 0),
      x2: normalizeNumber(data?.bbox?.x2, 0),
      y2: normalizeNumber(data?.bbox?.y2, 0),
    },
    metadata: {
      eventType: data.eventType || "ppe_violation",
      trackId: data.trackId ?? null,
      siteId: data.siteId || "",
      zoneId: data.zoneId || "",
      cameraId: data.cameraId || "",
      alertKey,
      rawPayload: data,
    },
  });

  const recipientIds = await getRecipientsForPpe(companyId);

  if (!recipientIds.length) {
    console.warn(`⚠️ No recipients found for PPE alert ${alert._id}`);
    return;
  }

  const notification = await Notification.create({
    company: companyId,
    title: getPpeTitle(violationType),
    message: getPpeMessage(device, device.zone, data),
    type: "alert",
    action: "ppe_violation",
    severity: getSeverityFromViolation(violationType),
    device: device._id,
    zone: zoneId,
    meta: {
      ppeAlertId: alert._id,
      violationType,
      label: data.label || violationType,
      confidence: normalizeNumber(data.confidence, 0),
      snapshotPath: data.snapshotPath || "",
      cameraId: data.cameraId || "",
      siteId: data.siteId || "",
      deviceId: data.deviceId || deviceId,
      trackId: data.trackId ?? null,
      timestamp: data.timestamp || new Date().toISOString(),
    },
  });

  const userNotificationRows = recipientIds.map((userId) => ({
    notification: notification._id,
    user: userId,
    company: companyId,
    isRead: false,
    isDeleted: false,
  }));

  const insertedRows = await UserNotification.insertMany(userNotificationRows, {
    ordered: false,
  });

  await emitUserNotifications(insertedRows.map((row) => row._id));

  const io = getIo();
  if (io) {
    io.emit("ppe-alert:new", {
      _id: alert._id,
      alertType: alert.alertType,
      status: alert.status,
      confidence: alert.confidence,
      timestamp: alert.timestamp,
      snapshotPath: alert.snapshotPath,
      zone: device.zone || null,
      device: {
        _id: device._id,
        name: device.name,
        deviceId: device.deviceId,
        status: device.status,
      },
      meta: alert.metadata,
    });
  }

  console.log(`✅ PPE alert saved and notifications sent for ${deviceId}`);
}

async function mqttHandler(topic, payload) {
  try {
    const parts = topic.split("/");

    if (parts.length < 4) {
      console.warn(`⚠️ Invalid topic: ${topic}`);
      return;
    }

    const root = parts[0];
    const group = parts[1];
    const deviceId = parts[2];
    const channel = parts[3];
    const subChannel = parts[4] || null;

    if (root !== "hsemonitor" || group !== "devices") {
      console.warn(`⚠️ Unsupported topic root: ${topic}`);
      return;
    }

    const data = safeParse(payload);

    if (channel === "status") {
      await handleStatusMessage(deviceId, data);
      return;
    }

    if (channel === "telemetry") {
      await handleTelemetryMessage(deviceId, data);
      return;
    }

    if (channel === "alerts" && subChannel === "ppe") {
      await handlePpeAlertMessage(deviceId, data);
      return;
    }

    console.warn(
      `⚠️ Unsupported channel: ${channel}${subChannel ? `/${subChannel}` : ""}`
    );
  } catch (error) {
    console.error("❌ mqttHandler error:", error.message);
  }
}

function publishDeviceCommand(deviceId, action, params = {}) {
  const client = require("./mqttClient");

  return new Promise((resolve, reject) => {
    if (!client || !client.connected) {
      return reject(new Error("MQTT client not connected"));
    }

    const topic = `hsemonitor/devices/${deviceId}/commands`;

    const message = {
      action,
      requestId: `req_${Date.now()}`,
      source: "admin-dashboard",
      timestamp: new Date().toISOString(),
      params,
    };

    client.publish(topic, JSON.stringify(message), { qos: 1 }, (err) => {
      if (err) return reject(err);

      console.log(`📤 Command sent to ${deviceId}: ${action}`);
      resolve({ topic, message });
    });
  });
}

module.exports = {
  mqttHandler,
  publishDeviceCommand,
};