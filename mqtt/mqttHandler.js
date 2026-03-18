const Reading = require("../models/readingModel");
const parsers = require("./parsers");
const { evaluateValues } = require("../services/alertRuleEngine");
const { markDeviceOnline } = require("../services/deviceHeartbeatMonitor");

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

async function mqttHandler(topic, payload) {
  try {
    const parts = topic.split("/");

    if (parts.length < 4) {
      console.warn(`⚠️ Invalid topic: ${topic}`);
      return;
    }

    const deviceId = parts[2];
    const channel = parts[3];
    const data = safeParse(payload);

    if (channel === "status") {
      await handleStatusMessage(deviceId, data);
      return;
    }

    if (channel === "telemetry") {
      await handleTelemetryMessage(deviceId, data);
      return;
    }

    console.warn(`⚠️ Unsupported channel: ${channel}`);
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