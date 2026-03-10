// controllers/sensorController.js
const mongoose = require("mongoose");
const Sensor = require("../models/sensorModel");
const Device = require("../models/deviceModel");
const Zone = require("../models/zoneModel"); // optionnel, mais gardé si tu l'utilises ailleurs

// POST /api/sensors
exports.createSensor = async (req, res) => {
  try {
    let { name, device, type, threshold, unit } = req.body;

    // Nettoyage agressif du nom
    if (typeof name !== "string") {
      return res.status(400).json({ message: "Le nom doit être une chaîne de caractères." });
    }

    name = name.trim().replace(/\s+/g, " "); // remplace multiples espaces par un seul

    if (!name || name.length < 2) {
      return res.status(400).json({ message: "Le nom doit contenir au moins 2 caractères valides." });
    }

    if (!mongoose.isValidObjectId(device)) {
      return res.status(400).json({ message: "ID de device invalide." });
    }

    const deviceDoc = await Device.findById(device);
    if (!deviceDoc) {
      return res.status(404).json({ message: "Device introuvable." });
    }

    if (!deviceDoc.zone) {
      return res.status(400).json({
        message: "Ce device n'est rattaché à aucune zone. Associez une zone d'abord.",
      });
    }

    const zoneId = deviceDoc.zone; // déjà ObjectId normalement

    console.log(`[CREATE SENSOR] Tentative pour device=${device}, name="${name}"`);

    const created = await Sensor.create({
      name,
      device,
      type,
      zone: zoneId,
      threshold: threshold ?? null,
      unit: unit ?? null,
      status: "offline",
    });

    // Optionnel : ajouter au tableau sensors du device
    await Device.findByIdAndUpdate(device, { $addToSet: { sensors: created._id } });

    const populated = await Sensor.findById(created._id)
      .populate("zone", "name")
      .populate("device", "name deviceId");

    return res.status(201).json(populated);
  } catch (err) {
    console.error("[CREATE SENSOR ERROR]", {
      body: req.body,
      nameReceived: req.body.name,
      error: err.message,
      code: err.code,
      stack: err.stack?.substring(0, 400),
    });

    if (err.code === 11000) {
      return res.status(409).json({
        message: `Un capteur nommé "${req.body.name?.trim() || "(vide)"}" existe déjà pour ce device.`,
        field: "name",
        code: "duplicate_sensor_name",
      });
    }

    return res.status(500).json({
      message: "Erreur serveur lors de la création du capteur",
      error: err.message,
    });
  }
};

// other methods remain good — no change needed

// GET /api/sensors?zone=...&type=...&status=...&q=...&device=...
exports.getSensors = async (req, res) => {
  try {
    const { zone, type, status, q, device } = req.query;

    const filter = {};
    if (zone) filter.zone = zone;
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (device) filter.device = device;
    if (q) filter.name = { $regex: q, $options: "i" };

    const sensors = await Sensor.find(filter)
      .populate("zone", "name")
      .populate("device", "name deviceId");

    return res.json(sensors);
  } catch (err) {
    console.error("❌ getSensors error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/sensors/:id
exports.getSensorById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid sensor id format." });
    }

    const sensor = await Sensor.findById(id)
      .populate("zone", "name")
      .populate("device", "name deviceId");

    if (!sensor) return res.status(404).json({ message: "Sensor not found." });

    return res.json(sensor);
  } catch (err) {
    console.error("❌ getSensorById error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// PUT /api/sensors/:id
exports.updateSensor = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid sensor id format." });
    }

    const allowed = ["name", "type", "threshold", "unit", "status"];
    const updates = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (updates.name) updates.name = String(updates.name).trim();

    const sensor = await Sensor.findByIdAndUpdate(id, updates, { new: true })
      .populate("zone", "name")
      .populate("device", "name deviceId");

    if (!sensor) return res.status(404).json({ message: "Sensor not found." });

    return res.json(sensor);
  } catch (err) {
    console.error("❌ updateSensor error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// PATCH /api/sensors/:id/status
exports.updateSensorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid sensor id format." });
    }

    if (!["online", "offline", "maintenance"].includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    const sensor = await Sensor.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!sensor) return res.status(404).json({ message: "Sensor not found." });

    return res.json(sensor);
  } catch (err) {
    console.error("❌ updateSensorStatus error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// DELETE /api/sensors/:id
exports.deleteSensor = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid sensor id format." });
    }

    const sensor = await Sensor.findById(id);
    if (!sensor) return res.status(404).json({ message: "Sensor not found." });

    // retirer la ref du device
    await Device.findByIdAndUpdate(sensor.device, {
      $pull: { sensors: sensor._id },
    });

    await Sensor.findByIdAndDelete(id);

    return res.json({ message: "Sensor deleted." });
  } catch (err) {
    console.error("❌ deleteSensor error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};