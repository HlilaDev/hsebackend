// mqtt/mqttHandler.js
const Device = require("../models/deviceModel");
const Reading = require("../models/readingModel");
const parsers = require("./parsers");

function safeParse(payload) {
  const s = payload.toString().trim();

  // JSON normal
  if (s.startsWith("{") || s.startsWith("[")) {
    try {
      return JSON.parse(s);
    } catch {
      return { value: s };
    }
  }

  // format "temperature=16.6" ou "humidity=55.1" ou "temperature:16.6,humidity:55"
  const obj = {};
  for (const part of s.split(/[;,]+/)) {
    const [k, v] = part.split(/[:=]/).map(x => x && x.trim());
    if (k && v) obj[k] = v;
  }
  if (Object.keys(obj).length > 0) return obj;

  // sinon brut
  return { value: s };
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
    { returnDocument: "after" }
  );

  if (!device) {
    console.warn(`⚠️ Unknown device: ${deviceId}`);
    return;
  }

  await Reading.create({
    device: device._id,   
    zone: device.zone,
    sensorType,
    values,
    raw
  });
};
