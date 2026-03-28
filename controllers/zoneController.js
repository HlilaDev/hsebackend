const Zone = require("../models/zoneModel");
const Device = require("../models/deviceModel");
const Company = require("../models/companyModel");
const Employee = require("../models/employeeModel");
const Sensor = require("../models/sensorModel");
const Alert = require("../models/alertModel");

function getUserCompanyId(req) {
  return req.user?.company?._id || req.user?.company || null;
}

// CREATE ZONE
exports.createZone = async (req, res) => {
  try {
    const { name, description, riskLevel, roi, ppeRules, isActive } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const companyId = getUserCompanyId(req);

    if (!companyId) {
      return res.status(400).json({
        message: "Connected user is not linked to any company",
      });
    }

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Zone name is required" });
    }

    const normalizedName = String(name).trim();

    const companyExists = await Company.findById(companyId);
    if (!companyExists) {
      return res.status(400).json({ message: "Invalid user company" });
    }

    const existingZone = await Zone.findOne({
      name: normalizedName,
      company: companyId,
    });

    if (existingZone) {
      return res.status(400).json({
        message: "Zone already exists for this company",
      });
    }

    if (roi && (roi.x1 >= roi.x2 || roi.y1 >= roi.y2)) {
      return res.status(400).json({ message: "Invalid ROI coordinates" });
    }

    const zone = await Zone.create({
      name: normalizedName,
      description: description ? String(description).trim() : "",
      riskLevel: riskLevel || "medium",
      roi,
      ppeRules,
      isActive: isActive !== undefined ? isActive : true,
      company: companyId,
      createdBy: req.user._id,
    });

    const populatedZone = await Zone.findById(zone._id).populate(
      "company",
      "_id name industry"
    );

    res.status(201).json(populatedZone);
  } catch (err) {
    res.status(500).json({
      message: "Create zone failed",
      error: err.message,
    });
  }
};

// LIST ZONES
exports.listZones = async (req, res) => {
  try {
    const { isActive, page = 1, limit = 20 } = req.query;

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const companyId = getUserCompanyId(req);
    const filter = {};

    if (companyId) {
      filter.company = companyId;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const [zones, total] = await Promise.all([
      Zone.find(filter)
        .populate("company", "_id name industry")
        .skip(skip)
        .limit(limitNumber)
        .sort({ createdAt: -1 }),
      Zone.countDocuments(filter),
    ]);

    const zoneIds = zones.map((z) => z._id);

    const [employeeCounts, deviceCounts, sensorCounts, alertCounts] = await Promise.all([
      Employee.aggregate([
        { $match: { zone: { $in: zoneIds } } },
        { $group: { _id: "$zone", count: { $sum: 1 } } },
      ]),
      Device.aggregate([
        { $match: { zone: { $in: zoneIds } } },
        { $group: { _id: "$zone", count: { $sum: 1 } } },
      ]),
      Sensor.aggregate([
        { $match: { zone: { $in: zoneIds } } },
        { $group: { _id: "$zone", count: { $sum: 1 } } },
      ]),
      Alert.aggregate([
        { $match: { zone: { $in: zoneIds } } },
        { $group: { _id: "$zone", count: { $sum: 1 } } },
      ]),
    ]);

    const toMap = (items) =>
      items.reduce((acc, item) => {
        acc[String(item._id)] = item.count;
        return acc;
      }, {});

    const employeeMap = toMap(employeeCounts);
    const deviceMap = toMap(deviceCounts);
    const sensorMap = toMap(sensorCounts);
    const alertMap = toMap(alertCounts);

    const items = zones.map((zone) => {
      const id = String(zone._id);

      return {
        ...zone.toObject(),
        employeesCount: employeeMap[id] || 0,
        devicesCount: deviceMap[id] || 0,
        sensorsCount: sensorMap[id] || 0,
        alertsCount: alertMap[id] || 0,
      };
    });

    res.json({
      items,
      total,
      page: pageNumber,
      pages: Math.ceil(total / limitNumber),
    });
  } catch (err) {
    res.status(500).json({
      message: "List zones failed",
      error: err.message,
    });
  }
};

// GET ZONE BY ID
exports.getZoneById = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const companyId = getUserCompanyId(req);

    const filter = { _id: req.params.id };
    if (companyId) {
      filter.company = companyId;
    }

    const zone = await Zone.findOne(filter).populate(
      "company",
      "_id name industry"
    );

    if (!zone) {
      return res.status(404).json({ message: "Zone not found" });
    }

    res.json(zone);
  } catch (err) {
    res.status(500).json({
      message: "Get zone failed",
      error: err.message,
    });
  }
};

// UPDATE ZONE
exports.updateZone = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const companyId = getUserCompanyId(req);
    const updates = { ...req.body };

    delete updates.company;

    if (updates.name) {
      updates.name = String(updates.name).trim();
    }

    const filter = { _id: req.params.id };
    if (companyId) {
      filter.company = companyId;
    }

    const currentZone = await Zone.findOne(filter);
    if (!currentZone) {
      return res.status(404).json({ message: "Zone not found" });
    }

    if (updates.name) {
      const exists = await Zone.findOne({
        _id: { $ne: req.params.id },
        company: currentZone.company,
        name: updates.name,
      });

      if (exists) {
        return res.status(400).json({
          message: "Zone name already exists for this company",
        });
      }
    }

    if (updates.roi && (updates.roi.x1 >= updates.roi.x2 || updates.roi.y1 >= updates.roi.y2)) {
      return res.status(400).json({ message: "Invalid ROI coordinates" });
    }

    const zone = await Zone.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).populate("company", "_id name industry");

    res.json(zone);
  } catch (err) {
    res.status(500).json({
      message: "Update zone failed",
      error: err.message,
    });
  }
};

// UPDATE PPE RULES
exports.updateZoneRules = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const companyId = getUserCompanyId(req);
    const { ppeRules, roi } = req.body;

    const filter = { _id: req.params.id };
    if (companyId) {
      filter.company = companyId;
    }

    const foundZone = await Zone.findOne(filter);
    if (!foundZone) {
      return res.status(404).json({ message: "Zone not found" });
    }

    if (roi && (roi.x1 >= roi.x2 || roi.y1 >= roi.y2)) {
      return res.status(400).json({ message: "Invalid ROI coordinates" });
    }

    const updateData = {
      $inc: { configVersion: 1 },
    };

    if (ppeRules) {
      updateData.$set = { ...updateData.$set, ppeRules };
    }

    if (roi) {
      updateData.$set = { ...updateData.$set, roi };
    }

    const zone = await Zone.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate("company", "_id name industry");

    res.json(zone);
  } catch (err) {
    res.status(500).json({
      message: "Update rules failed",
      error: err.message,
    });
  }
};

// GET CONFIG FOR DEVICE
exports.getZoneConfig = async (req, res) => {
  try {
    const zone = await Zone.findById(req.params.id).select(
      "roi ppeRules riskLevel isActive configVersion updatedAt company"
    );

    if (!zone) {
      return res.status(404).json({ message: "Zone not found" });
    }

    res.json({
      zoneId: zone._id,
      roi: zone.roi,
      ppeRules: zone.ppeRules,
      riskLevel: zone.riskLevel,
      isActive: zone.isActive,
      version: zone.configVersion,
      updatedAt: zone.updatedAt,
      company: zone.company,
    });
  } catch (err) {
    res.status(500).json({
      message: "Get config failed",
      error: err.message,
    });
  }
};

// DELETE ZONE
exports.deleteZone = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const companyId = getUserCompanyId(req);

    const filter = { _id: req.params.id };
    if (companyId) {
      filter.company = companyId;
    }

    const zone = await Zone.findOneAndDelete(filter);

    if (!zone) {
      return res.status(404).json({ message: "Zone not found" });
    }

    res.json({ message: "Zone deleted successfully" });
  } catch (err) {
    res.status(500).json({
      message: "Delete zone failed",
      error: err.message,
    });
  }
};

// GET DEVICES BY ZONE
exports.getDevicesByZone = async (req, res) => {
  try {
    const { zoneId } = req.params;
    const companyId = getUserCompanyId(req);

    const filter = { _id: zoneId };
    if (companyId) {
      filter.company = companyId;
    }

    const zone = await Zone.findOne(filter).select("_id name company");
    if (!zone) {
      return res.status(404).json({ message: "Zone not found" });
    }

    const devices = await Device.find({
      zone: zoneId,
      company: zone.company,
    })
      .select(
        "_id name deviceId status zone sensors lastSeen description createdAt updatedAt"
      )
      .sort({ createdAt: -1 });

    res.json(devices);
  } catch (err) {
    res.status(500).json({
      message: "Get devices by zone failed",
      error: err.message,
    });
  }
};