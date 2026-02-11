const Zone = require("../models/zoneModel");

// CREATE: POST /api/zones
exports.createZone = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }

    const exists = await Zone.findOne({ name: name.trim() });
    if (exists) {
      return res.status(409).json({ message: "Zone already exists" });
    }

    const zone = await Zone.create({
      name: name.trim(),
      description: description || ""
    });

    return res.status(201).json(zone);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// READ ALL: GET /api/zones
exports.getZones = async (req, res) => {
  try {
    const zones = await Zone.find().sort({ createdAt: -1 });
    return res.status(200).json(zones);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// READ ONE: GET /api/zones/:id
exports.getZoneById = async (req, res) => {
  try {
    const zone = await Zone.findById(req.params.id);
    if (!zone) return res.status(404).json({ message: "Zone not found" });
    return res.status(200).json(zone);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// UPDATE: PUT /api/zones/:id
exports.updateZone = async (req, res) => {
  try {
    const { name, description } = req.body;

    // optional: avoid name duplicates
    if (name) {
      const exists = await Zone.findOne({
        name: name.trim(),
        _id: { $ne: req.params.id }
      });
      if (exists) {
        return res.status(409).json({ message: "Zone name already used" });
      }
    }

    const zone = await Zone.findByIdAndUpdate(
      req.params.id,
      {
        ...(name ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description } : {})
      },
      { returnDocument: "after", runValidators: true }
    );

    if (!zone) return res.status(404).json({ message: "Zone not found" });

    return res.status(200).json(zone);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

// DELETE: DELETE /api/zones/:id
exports.deleteZone = async (req, res) => {
  try {
    const zone = await Zone.findByIdAndDelete(req.params.id);
    if (!zone) return res.status(404).json({ message: "Zone not found" });

    return res.status(200).json({ message: "Zone deleted" });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};
