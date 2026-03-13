const Device = require("../models/deviceModel");
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

async function mqttHandler(topic, payload) {
  try {
    const parts = topic.split("/");

    if (parts.length < 4) {
      console.warn(`⚠️ Invalid topic: ${topic}`);
      return;
    }

    const deviceId = parts[2];
    const channel = parts[3];

    if (channel !== "telemetry") return;

    const data = safeParse(payload);

    const sensorType = data.sensorType;
    if (!sensorType) {
      console.warn(`⚠️ Missing sensorType in payload for topic: ${topic}`);
      return;
    }

    const parser = parsers[sensorType];
    if (!parser) {
      console.warn(`⚠️ No parser for sensorType: ${sensorType}`);
      return;
    }

    const { values, raw } = parser(data);

    // ✅ Utilise le heartbeat monitor pour remettre le device online
    const device = await markDeviceOnline(deviceId);

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