// mqtt/mqttHandler.js
const Device = require("../models/deviceModel");
const Reading = require("../models/readingModel");
const parsers = require("./parsers");

function safeParse(payload) {
  try {
    return JSON.parse(payload.toString());
  } catch {
    return { value: payload.toString() };
  }
}

module.exports = async function mqttHandler(topic, payload) {
  // sensors/{deviceId}/{sensorType}
  const parts = topic.split("/");
  if (parts.length < 3) return;

  const deviceId = parts[1];
  const sensorType = parts[2];

  const parser = parsers[sensorType];
  if (!parser) {
    console.warn(`⚠️ No parser for sensorType: ${sensorType}`);
    return;
  }

  const data = safeParse(payload);

  const { values, raw } = parser(data);

  const device = await Device.findOneAndUpdate(
    { deviceId },
    { status: "online", lastSeen: new Date() },
    { new: true }
  );

  if (!device) {
    console.warn(`⚠️ Unknown device: ${deviceId}`);
    return;
  }

  await Reading.create({
    deviceId,
    zone: device.zone,
    sensorType,
    values,
    raw
  });
};
