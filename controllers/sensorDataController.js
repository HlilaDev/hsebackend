const SensorData = require("../models/sensorDataModel");
const Sensor = require("../models/sensorModel");

// POST /api/sensor-data
// body: { sensorId, value, recordedAt? }
exports.createSensorData = async (req, res) => {
  try {
    const { sensorId, value, recordedAt } = req.body;

    if (!sensorId || value === undefined) {
      return res.status(400).json({ message: "sensorId and value are required." });
    }

    const sensor = await Sensor.findById(sensorId);
    if (!sensor) return res.status(404).json({ message: "Sensor not found." });

    // alert logic
    const threshold = sensor.threshold;
    const isAlert = typeof threshold === "number" ? Number(value) > threshold : false;

    const data = await SensorData.create({
      sensor: sensor._id,
      value: Number(value),
      unit: sensor.unit ?? null,
      isAlert,
      recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
    });

    // update sensor lastSeen + status
    await Sensor.findByIdAndUpdate(sensor._id, {
      lastSeen: new Date(),
      status: "online",
    });

    return res.status(201).json(data);
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/sensor-data?sensorId=...&from=...&to=...&limit=...&page=...
exports.getSensorData = async (req, res) => {
  try {
    const { sensorId, from, to, limit = 50, page = 1, alertsOnly } = req.query;

    const filter = {};
    if (sensorId) filter.sensor = sensorId;

    if (from || to) {
      filter.recordedAt = {};
      if (from) filter.recordedAt.$gte = new Date(from);
      if (to) filter.recordedAt.$lte = new Date(to);
    }

    if (alertsOnly === "1" || alertsOnly === "true") filter.isAlert = true;

    const lim = Math.min(Number(limit), 200);
    const skip = (Number(page) - 1) * lim;

    const [items, total] = await Promise.all([
      SensorData.find(filter)
        .populate("sensor", "name type deviceId zone threshold unit")
        .sort({ recordedAt: -1 })
        .skip(skip)
        .limit(lim),
      SensorData.countDocuments(filter),
    ]);

    return res.json({
      total,
      page: Number(page),
      limit: lim,
      items,
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/sensor-data/latest?sensorId=...
exports.getLatestSensorData = async (req, res) => {
  try {
    const { sensorId } = req.query;
    if (!sensorId) return res.status(400).json({ message: "sensorId required." });

    const latest = await SensorData.findOne({ sensor: sensorId })
      .sort({ recordedAt: -1 })
      .populate("sensor", "name type deviceId zone threshold unit");

    if (!latest) return res.status(404).json({ message: "No data found." });
    return res.json(latest);
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/sensor-data/stats?sensorId=...&from=...&to=...
// simple stats: min/max/avg/count
exports.getSensorDataStats = async (req, res) => {
  try {
    const { sensorId, from, to } = req.query;
    if (!sensorId) return res.status(400).json({ message: "sensorId required." });

    const match = { sensor: sensorId };
    if (from || to) {
      match.recordedAt = {};
      if (from) match.recordedAt.$gte = new Date(from);
      if (to) match.recordedAt.$lte = new Date(to);
    }

    const stats = await SensorData.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$sensor",
          count: { $sum: 1 },
          min: { $min: "$value" },
          max: { $max: "$value" },
          avg: { $avg: "$value" },
          alerts: { $sum: { $cond: ["$isAlert", 1, 0] } },
        },
      },
    ]);

    return res.json(stats[0] || { count: 0, min: null, max: null, avg: null, alerts: 0 });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};