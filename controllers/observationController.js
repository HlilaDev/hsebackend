const Observation = require("../models/observationModel");
const Notification = require("../models/notificationModel");
const UserNotification = require("../models/UserNotificationModel");
const User = require("../models/userModel");
const { getIo } = require("../socket/socket");

async function createObservationNotification({
  observation,
  companyId,
  type = "observation",
  action = "created",
  title,
  message,
  severity = "info",
  actor = null,
}) {
  try {
    const finalCompanyId =
      companyId || observation.company?._id || observation.company || null;

    if (!finalCompanyId) {
      console.error("Observation notification skipped: company missing");
      return null;
    }

    const notification = await Notification.create({
      title,
      message,
      type,
      action,
      severity,
      company: finalCompanyId,
      actor,
      observation: observation._id,
      zone: observation.zone?._id || observation.zone || null,
      meta: {
        observationId: observation._id,
        observationStatus: observation.status,
        observationSeverity: observation.severity,
      },
    });

    const managers = await User.find({
      company: finalCompanyId,
      role: "manager",
    }).select("_id firstName lastName fullName email");

    if (!managers.length) {
      return notification;
    }

    const rows = managers.map((manager) => ({
      notification: notification._id,
      user: manager._id,
      company: finalCompanyId,
      isRead: false,
      isDeleted: false,
    }));

    await UserNotification.insertMany(rows, { ordered: false });

    const userNotifications = await UserNotification.find({
      notification: notification._id,
      company: finalCompanyId,
    })
      .populate({
        path: "notification",
        populate: [
          { path: "zone", select: "_id name" },
          { path: "actor", select: "_id fullName firstName lastName email" },
          { path: "observation" },
        ],
      })
      .populate("user", "_id firstName lastName fullName email");

    const io = getIo();

    if (io) {
      for (const item of userNotifications) {
        io.to(`user:${item.user._id}`).emit("notification:new", item);
      }
    }

    return userNotifications;
  } catch (err) {
    console.error("Create observation notification failed:", err);
    return null;
  }
}

exports.createObservation = async (req, res) => {
  try {
    const payload = {
      title: req.body.title,
      description: req.body.description,
      severity: req.body.severity,
      status: req.body.status,
      zone: req.body.zone,
      reportedBy: req.body.reportedBy || req.user?._id,
      images: req.body.images || [],
      company: req.body.company || req.user?.company?._id || req.user?.company,
    };

    const doc = await Observation.create(payload);

    const populated = await Observation.findById(doc._id)
      .populate("zone", "_id name")
      .populate("reportedBy", "fullName firstName lastName name email")
      .populate("company", "_id name");

    const reporterName =
      populated.reportedBy?.fullName ||
      populated.reportedBy?.name ||
      `${populated.reportedBy?.firstName || ""} ${populated.reportedBy?.lastName || ""}`.trim() ||
      "Un agent";

    await createObservationNotification({
      observation: populated,
      companyId: populated.company?._id || populated.company,
      type: "observation",
      action: "created",
      title: "Nouvelle observation",
      message: `${reporterName} a émis une observation : "${populated.title}".`,
      severity:
        populated.severity === "critical"
          ? "critical"
          : populated.severity === "high"
          ? "warning"
          : "info",
      actor:
        req.user?._id ||
        populated.reportedBy?._id ||
        populated.reportedBy ||
        null,
    });

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({
      message: "Create observation failed",
      error: err.message,
    });
  }
};

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
    if (req.user?.company) filter.company = req.user.company._id || req.user.company;

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
        .populate("company", "_id name")
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

exports.getObservationById = async (req, res) => {
  try {
    const doc = await Observation.findById(req.params.id)
      .populate("zone", "_id name")
      .populate("reportedBy", "fullName firstName lastName name email")
      .populate("company", "_id name");

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
      .populate("reportedBy", "fullName firstName lastName name email")
      .populate("company", "_id name");

    if (!doc) {
      return res.status(404).json({ message: "Observation not found" });
    }

    if (req.body.status && req.body.status !== previousStatus) {
      await createObservationNotification({
        observation: doc,
        companyId: doc.company?._id || doc.company,
        type: "observation",
        action: "status_changed",
        title: "Statut d’observation mis à jour",
        message: `L’observation "${doc.title}" a changé de statut : ${previousStatus} → ${doc.status}.`,
        severity:
          doc.severity === "critical"
            ? "critical"
            : doc.severity === "high"
            ? "warning"
            : "info",
        actor: req.user?._id || null,
      });
    }

    if (req.body.severity && req.body.severity !== previousSeverity) {
      await createObservationNotification({
        observation: doc,
        companyId: doc.company?._id || doc.company,
        type: "observation",
        action: "severity_changed",
        title: "Sévérité d’observation mise à jour",
        message: `L’observation "${doc.title}" a changé de sévérité : ${previousSeverity} → ${doc.severity}.`,
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
      .populate("reportedBy", "fullName firstName lastName name email")
      .populate("company", "_id name");

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