const mongoose = require("mongoose");
const Reading = require("../models/readingModel");
const Device = require("../models/deviceModel");

exports.getReadings = async (req, res) => {
  try {
    const {
      device,
      zone,
      sensorType,
      from,
      to,
      page = 1,
      limit = 20
    } = req.query;

    const filter = {};

    if (device) filter.device = device;
    if (zone) filter.zone = zone;
    if (sensorType) filter.sensorType = sensorType;

    if (from || to) {
      filter.ts = {};
      if (from) filter.ts.$gte = new Date(from);
      if (to) filter.ts.$lte = new Date(to);
    }

    const pageNum = Math.max(parseInt(page, 10), 1);
    const limitNum = Math.max(parseInt(limit, 10), 1);
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      Reading.find(filter)
        .populate("device", "deviceId name status")
        .populate("zone", "name")
        .sort({ ts: -1 })
        .skip(skip)
        .limit(limitNum),
      Reading.countDocuments(filter)
    ]);

    res.json({
      items,
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des readings", error: error.message });
  }
};

exports.getLatestReadingByDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;

    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({ message: "Device introuvable" });
    }

    const reading = await Reading.findOne({ device: device._id })
      .populate("device", "deviceId name status")
      .populate("zone", "name")
      .sort({ ts: -1 });

    if (!reading) {
      return res.status(404).json({ message: "Aucune lecture trouvée pour ce device" });
    }

    res.json(reading);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération de la dernière lecture", error: error.message });
  }
};

exports.getHistoryByDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { sensorType, from, to, limit = 100 } = req.query;

    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({ message: "Device introuvable" });
    }

    const filter = { device: device._id };

    if (sensorType) filter.sensorType = sensorType;

    if (from || to) {
      filter.ts = {};
      if (from) filter.ts.$gte = new Date(from);
      if (to) filter.ts.$lte = new Date(to);
    }

    const items = await Reading.find(filter)
      .sort({ ts: -1 })
      .limit(Math.max(parseInt(limit, 10), 1));

    res.json(items);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération de l'historique", error: error.message });
  }
};

exports.getLatestReadingsByZone = async (req, res) => {
  try {
    const { zoneId } = req.params;

    const zoneObjectId = new mongoose.Types.ObjectId(zoneId);

    const items = await Reading.aggregate([
      { $match: { zone: zoneObjectId } },
      { $sort: { ts: -1 } },
      {
        $group: {
          _id: "$device",
          latest: { $first: "$$ROOT" }
        }
      },
      {
        $replaceRoot: { newRoot: "$latest" }
      },
      { $sort: { ts: -1 } }
    ]);

    const populated = await Reading.populate(items, [
      { path: "device", select: "deviceId name status" },
      { path: "zone", select: "name" }
    ]);

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des dernières lectures par zone", error: error.message });
  }
};