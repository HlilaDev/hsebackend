const Device = require("../models/deviceModel");
const Zone = require("../models/zoneModel");
const Sensor = require("../models/sensorModel");
const { publishDeviceCommand } = require("../mqtt/mqttHandler");

// CREATE: POST /api/devices
exports.createDevice = async (req, res) => {
  try {
    const { deviceId, name, zone, sensors, description } = req.body;

    if (!deviceId || !zone) {
      return res
        .status(400)
        .json({ message: "deviceId and zone are required" });
    }

    const exists = await Device.findOne({
      deviceId: deviceId.trim(),
      company: req.user.company,
    });

    if (exists) {
      return res.status(409).json({ message: "Device already exists" });
    }

    const zoneExists = await Zone.findOne({
      _id: zone,
      company: req.user.company,
    });

    if (!zoneExists) {
      return res.status(404).json({ message: "Zone not found" });
    }

    const device = await Device.create({
      deviceId: deviceId.trim(),
      name: name || "",
      company: req.user.company,
      zone,
      sensors: Array.isArray(sensors) ? sensors : [],
      description: description || "",
    });

    const populated = await Device.findOne({
      _id: device._id,
      company: req.user.company,
    })
      .populate("zone", "_id name")
      .populate("company", "name industry");

    return res.status(201).json(populated);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// READ ALL: GET /api/devices?zone=...&status=online
exports.getDevices = async (req, res) => {
  try {
    const { zone, status } = req.query;

    const q = {
      company: req.user.company,
    };

    if (zone) q.zone = zone;
    if (status) q.status = status;

    const devices = await Device.find(q)
      .sort({ createdAt: -1 })
      .populate("zone", "_id name")
      .populate("company", "name industry");

    return res.status(200).json(devices);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// READ ONE: GET /api/devices/:id
exports.getDeviceById = async (req, res) => {
  try {
    const device = await Device.findOne({
      _id: req.params.id,
      company: req.user.company,
    })
      .populate("zone", "_id name")
      .populate("company", "name industry");

    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    return res.status(200).json(device);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// READ ONE by deviceId: GET /api/devices/by-device-id/:deviceId
exports.getDeviceByDeviceId = async (req, res) => {
  try {
    const device = await Device.findOne({
      deviceId: req.params.deviceId,
      company: req.user.company,
    })
      .populate("zone", "_id name")
      .populate("company", "name industry");

    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    return res.status(200).json(device);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// UPDATE: PUT /api/devices/:id
exports.updateDevice = async (req, res) => {
  try {
    const { deviceId, name, zone, sensors, status, description } = req.body;

    if (deviceId) {
      const exists = await Device.findOne({
        deviceId: deviceId.trim(),
        company: req.user.company,
        _id: { $ne: req.params.id },
      });

      if (exists) {
        return res.status(409).json({ message: "deviceId already used" });
      }
    }

    if (zone !== undefined) {
      const zoneExists = await Zone.findOne({
        _id: zone,
        company: req.user.company,
      });

      if (!zoneExists) {
        return res.status(404).json({ message: "Zone not found" });
      }
    }

    const update = {};
    if (deviceId !== undefined) update.deviceId = deviceId.trim();
    if (name !== undefined) update.name = name;
    if (zone !== undefined) update.zone = zone;
    if (Array.isArray(sensors)) update.sensors = sensors;
    if (status !== undefined) update.status = status;
    if (description !== undefined) update.description = description;

    const device = await Device.findOneAndUpdate(
      {
        _id: req.params.id,
        company: req.user.company,
      },
      update,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("zone", "_id name")
      .populate("company", "name industry");

    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    return res.status(200).json(device);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// DELETE: DELETE /api/devices/:id
exports.deleteDevice = async (req, res) => {
  try {
    const device = await Device.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company,
    });

    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    return res.status(200).json({ message: "Device deleted" });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

exports.getDeviceSensors = async (req, res) => {
  try {
    const { id } = req.params;

    const device = await Device.findOne({
      _id: id,
      company: req.user.company,
    }).lean();

    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    const sensors = await Sensor.find({
      device: id,
      company: req.user.company,
    })
      .select("name device type status unit threshold zone createdAt lastSeen")
      .populate("zone", "name")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ items: sensors });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

exports.restartDevice = async (req, res) => {
  try {
    const { id } = req.params;

    const device = await Device.findOne({
      _id: id,
      company: req.user.company,
    });

    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    const result = await publishDeviceCommand(device.deviceId, "restart");

    return res.status(200).json({
      message: "Restart command sent successfully",
      topic: result.topic,
      command: result.message,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to send restart command",
      error: error.message,
    });
  }
};