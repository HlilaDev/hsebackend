const Device = require("../models/deviceModel");
const Zone = require("../models/zoneModel");


// CREATE: POST /api/devices
exports.createDevice = async (req, res) => {
  try {
    const { deviceId, name, zone, sensors, description } = req.body;

    if (!deviceId || !zone) {
      return res.status(400).json({ message: "deviceId and zone are required" });
    }

    const exists = await Device.findOne({ deviceId: deviceId.trim() });
    if (exists) {
      return res.status(409).json({ message: "Device already exists" });
    }

    const zoneExists = await Zone.findById(zone);
    if (!zoneExists) return res.status(404).json({ message: "Zone not found" });

    const device = await Device.create({
      deviceId: deviceId.trim(),
      name: name || "",
      zone,
      sensors: Array.isArray(sensors) ? sensors : [],
      description: description || ""
    });

    return res.status(201).json(device);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// READ ALL: GET /api/devices?zone=Zone%20A&status=online
exports.getDevices = async (req, res) => {
  try {
    const { zone, status } = req.query;

    const q = {};
    if (zone) q.zone = zone;
    if (status) q.status = status;

    const devices = await Device.find(q).sort({ createdAt: -1 });
    return res.status(200).json(devices);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// READ ONE: GET /api/devices/:id  (Mongo _id)
exports.getDeviceById = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) return res.status(404).json({ message: "Device not found" });
    return res.status(200).json(device);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// READ ONE by deviceId: GET /api/devices/by-device-id/:deviceId
exports.getDeviceByDeviceId = async (req, res) => {
  try {
    const device = await Device.findOne({ deviceId: req.params.deviceId });
    if (!device) return res.status(404).json({ message: "Device not found" });
    return res.status(200).json(device);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// UPDATE: PUT /api/devices/:id
exports.updateDevice = async (req, res) => {
  try {
    const { deviceId, name, zone, sensors, status, description } = req.body;

    // éviter doublon deviceId
    if (deviceId) {
      const exists = await Device.findOne({
        deviceId: deviceId.trim(),
        _id: { $ne: req.params.id }
      });
      if (exists) {
        return res.status(409).json({ message: "deviceId already used" });
      }
    }

    const update = {};
    if (deviceId !== undefined) update.deviceId = deviceId.trim();
    if (name !== undefined) update.name = name;
    if (zone !== undefined) update.zone = zone.trim();
    if (Array.isArray(sensors)) update.sensors = sensors;
    if (status !== undefined) update.status = status; // "online" | "offline"
    if (description !== undefined) update.description = description;

    const device = await Device.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true
    });

    if (!device) return res.status(404).json({ message: "Device not found" });
    return res.status(200).json(device);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// DELETE: DELETE /api/devices/:id
exports.deleteDevice = async (req, res) => {
  try {
    const device = await Device.findByIdAndDelete(req.params.id);
    if (!device) return res.status(404).json({ message: "Device not found" });
    return res.status(200).json({ message: "Device deleted" });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};
