const Zone = require("../models/zoneModel");


// ✅ CREATE ZONE
exports.createZone = async (req, res) => {
  try {
    const {
      name,
      description,
      riskLevel,
      roi,
      ppeRules,
      company
    } = req.body;

    // ✅ Vérification obligatoire
    if (!name) {
      return res.status(400).json({ message: "Zone name is required" });
    }

    // ✅ Vérifier unicité du nom dans une entreprise
    const existingZone = await Zone.findOne({ name, company });
    if (existingZone) {
      return res.status(400).json({ message: "Zone already exists for this company" });
    }

    // ✅ Validation ROI
    if (roi && (roi.x1 >= roi.x2 || roi.y1 >= roi.y2)) {
      return res.status(400).json({ message: "Invalid ROI coordinates" });
    }

    const zone = new Zone({
      name,
      description,
      riskLevel,
      roi,
      ppeRules,
      company,
    });

    await zone.save();

    res.status(201).json(zone);

  } catch (err) {
    res.status(500).json({ message: "Create zone failed", error: err.message });
  }
};


// ✅ LIST ZONES (pagination + filtre)
exports.listZones = async (req, res) => {
  try {
    const { company, isActive, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (company) filter.company = company;
    if (isActive !== undefined)
      filter.isActive = isActive === "true";

    const skip = (page - 1) * limit;

    const [zones, total] = await Promise.all([
      Zone.find(filter)
        .populate("company")
        .skip(Number(skip))
        .limit(Number(limit))
        .sort("-createdAt"),
      Zone.countDocuments(filter),
    ]);

    res.json({
      items: zones,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ message: "List zones failed", error: err.message });
  }
};


// ✅ GET ZONE BY ID
exports.getZoneById = async (req, res) => {
  try {
    const zone = await Zone.findById(req.params.id).populate("company");
    if (!zone) return res.status(404).json({ message: "Zone not found" });

    res.json(zone);
  } catch (err) {
    res.status(500).json({ message: "Get zone failed", error: err.message });
  }
};


// ✅ UPDATE ZONE (général)
exports.updateZone = async (req, res) => {
  try {
    const zone = await Zone.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!zone) return res.status(404).json({ message: "Zone not found" });

    res.json(zone);
  } catch (err) {
    res.status(500).json({ message: "Update zone failed", error: err.message });
  }
};


// ✅ UPDATE PPE RULES (incrémente version)
exports.updateZoneRules = async (req, res) => {
  try {
    const { ppeRules, roi } = req.body;

    const updateData = {
      $inc: { configVersion: 1 },
    };

    if (ppeRules) updateData.$set = { ...updateData.$set, ppeRules };
    if (roi) updateData.$set = { ...updateData.$set, roi };

    const zone = await Zone.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!zone) return res.status(404).json({ message: "Zone not found" });

    res.json(zone);
  } catch (err) {
    res.status(500).json({ message: "Update rules failed", error: err.message });
  }
};


// ✅ GET CONFIG POUR RASPBERRY (polling)
exports.getZoneConfig = async (req, res) => {
  try {
    const zone = await Zone.findById(req.params.id).select(
      "roi ppeRules riskLevel isActive configVersion updatedAt"
    );

    if (!zone)
      return res.status(404).json({ message: "Zone not found" });

    res.json({
      zoneId: zone._id,
      roi: zone.roi,
      ppeRules: zone.ppeRules,
      riskLevel: zone.riskLevel,
      isActive: zone.isActive,
      version: zone.configVersion,
      updatedAt: zone.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ message: "Get config failed", error: err.message });
  }
};


// ✅ DELETE ZONE
exports.deleteZone = async (req, res) => {
  try {
    const zone = await Zone.findByIdAndDelete(req.params.id);
    if (!zone) return res.status(404).json({ message: "Zone not found" });

    res.json({ message: "Zone deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Delete zone failed", error: err.message });
  }
};
