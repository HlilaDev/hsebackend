const Observation = require("../models/observationModel");
const Notification = require("../models/notificationModel");
const { getIo } = require("../socket/socket");

// helper
async function createObservationNotification({
  observation,
  type = "observation",
  action = "created",
  title,
  message,
  severity = "info",
  actor = null,
}) {
  try {
    const notification = await Notification.create({
      title,
      message,
      type,
      action,
      severity,
      isRead: false,
      user: null,
      company: observation.company || null,
      actor,
      observation: observation._id,
      zone: observation.zone?._id || observation.zone || null,
      meta: {
        observationId: observation._id,
        observationStatus: observation.status,
        observationSeverity: observation.severity,
      },
    });

    const populatedNotification = await Notification.findById(notification._id)
      .populate("zone", "_id name")
      .populate("actor", "_id fullName firstName lastName email")
      .populate("observation");

    try {
      getIo().emit("notification:new", populatedNotification);
    } catch (socketErr) {
      console.error("Socket emit notification:new failed:", socketErr.message);
    }

    return populatedNotification;
  } catch (err) {
    console.error("Create observation notification failed:", err.message);
    return null;
  }
}

// Create
exports.createObservation = async (req, res) => {
  try {
    const payload = {
      title: req.body.title,
      description: req.body.description,
      severity: req.body.severity,
      status: req.body.status,
      zone: req.body.zone,
      reportedBy: req.body.reportedBy,
      images: req.body.images || [],
      company: req.body.company || req.user?.company || null,
    };

    const doc = await Observation.create(payload);

    const populated = await Observation.findById(doc._id)
      .populate("zone", "_id name")
      .populate("reportedBy", "fullName firstName lastName name email");

    await createObservationNotification({
      observation: populated,
      type: "observation",
      action: "created",
      title: "New observation submitted",
      message: `A new observation "${populated.title}" has been submitted.`,
      severity:
        populated.severity === "critical"
          ? "critical"
          : populated.severity === "high"
          ? "warning"
          : "info",
      actor: req.user?._id || populated.reportedBy?._id || populated.reportedBy || null,
    });

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({
      message: "Create observation failed",
      error: err.message,
    });
  }
};

// List (filters + pagination)
exports.listObservations = async (req, res) => {
  try {
    const {
      zone,
      status,
      severity,
      reportedBy,
      q,
      page = 1,
      limit = 20,
      sort = "-createdAt",
    } = req.query;

    const filter = {};
    if (zone) filter.zone = zone;
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (reportedBy) filter.reportedBy = reportedBy;
    if (req.user?.company) filter.company = req.user.company;

    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Observation.find(filter)
        .populate("zone", "_id name")
        .populate("reportedBy", "fullName firstName lastName name email")
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Observation.countDocuments(filter),
    ]);

    res.json({
      items,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({
      message: "List observations failed",
      error: err.message,
    });
  }
};

// Get by id
exports.getObservationById = async (req, res) => {
  try {
    const doc = await Observation.findById(req.params.id)
      .populate("zone", "_id name")
      .populate("reportedBy", "fullName firstName lastName name email");

    if (!doc) {
      return res.status(404).json({ message: "Observation not found" });
    }

    res.json(doc);
  } catch (err) {
    res.status(500).json({
      message: "Get observation failed",
      error: err.message,
    });
  }
};

// Update
exports.updateObservation = async (req, res) => {
  try {
    const existing = await Observation.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Observation not found" });
    }

    const previousStatus = existing.status;
    const previousSeverity = existing.severity;

    const doc = await Observation.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("zone", "_id name")
      .populate("reportedBy", "fullName firstName lastName name email");

    if (!doc) {
      return res.status(404).json({ message: "Observation not found" });
    }

    // notification si status changé
    if (req.body.status && req.body.status !== previousStatus) {
      await createObservationNotification({
        observation: doc,
        type: "observation",
        action: "status_changed",
        title: "Observation status updated",
        message: `Observation "${doc.title}" status changed from ${previousStatus} to ${doc.status}.`,
        severity:
          doc.severity === "critical"
            ? "critical"
            : doc.severity === "high"
            ? "warning"
            : "info",
        actor: req.user?._id || null,
      });
    }

    // notification si severity changée
    if (req.body.severity && req.body.severity !== previousSeverity) {
      await createObservationNotification({
        observation: doc,
        type: "observation",
        action: "severity_changed",
        title: "Observation severity updated",
        message: `Observation "${doc.title}" severity changed from ${previousSeverity} to ${doc.severity}.`,
        severity:
          doc.severity === "critical"
            ? "critical"
            : doc.severity === "high"
            ? "warning"
            : "info",
        actor: req.user?._id || null,
      });
    }

    res.json(doc);
  } catch (err) {
    res.status(500).json({
      message: "Update observation failed",
      error: err.message,
    });
  }
};

// Add image
exports.addObservationImage = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ message: "url is required" });
    }

    const doc = await Observation.findByIdAndUpdate(
      req.params.id,
      { $push: { images: { url, uploadedAt: new Date() } } },
      { new: true }
    )
      .populate("zone", "_id name")
      .populate("reportedBy", "fullName firstName lastName name email");

    if (!doc) {
      return res.status(404).json({ message: "Observation not found" });
    }

    res.json(doc);
  } catch (err) {
    res.status(500).json({
      message: "Add image failed",
      error: err.message,
    });
  }
};

// Delete
exports.deleteObservation = async (req, res) => {
  try {
    const doc = await Observation.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: "Observation not found" });
    }

    res.json({ message: "Observation deleted" });
  } catch (err) {
    res.status(500).json({
      message: "Delete observation failed",
      error: err.message,
    });
  }
};

// get nb total of observation by agent
exports.getObservationsCountByAgent = async (req, res) => {
  try {
    const agentId = req.params.agentId;
    const totalCount = await Observation.countDocuments({ reportedBy: agentId });

    res.json({ totalCount });
  } catch (err) {
    res.status(500).json({
      message: "Failed to get observations count for agent",
      error: err.message,
    });
  }
};