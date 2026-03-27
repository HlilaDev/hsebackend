const Observation = require("../models/observationModel");
const Notification = require("../models/notificationModel");
const UserNotification = require("../models/UserNotificationModel");
const User = require("../models/userModel");
const { getIo } = require("../socket/socket");

const MANAGEMENT_ROLES = ["manager", "supervisor", "admin", "superAdmin"];
const ASSIGN_ROLES = ["manager", "supervisor", "admin", "superAdmin"];

function getCompanyId(user) {
  return user?.company?._id || user?.company || null;
}

function isSameId(a, b) {
  return String(a || "") === String(b || "");
}

function canManageObservation(role) {
  return MANAGEMENT_ROLES.includes(role);
}

function canAssignObservation(role) {
  return ASSIGN_ROLES.includes(role);
}

function getUserDisplayName(user) {
  if (!user) return "Utilisateur";
  return (
    user.fullName ||
    user.name ||
    `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
    user.email ||
    "Utilisateur"
  );
}

function getNotificationSeverityFromObservation(severity) {
  if (severity === "critical") return "critical";
  if (severity === "high") return "warning";
  return "info";
}

function normalizeImages(input) {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      if (typeof item === "string") {
        const url = item.trim();
        if (!url) return null;
        return {
          url,
          uploadedAt: new Date(),
        };
      }

      if (item && typeof item === "object") {
        const url = String(item.url || "").trim();
        if (!url) return null;
        return {
          url,
          uploadedAt: item.uploadedAt ? new Date(item.uploadedAt) : new Date(),
        };
      }

      return null;
    })
    .filter(Boolean);
}

function populateObservation(query) {
  return query
    .populate("zone", "_id name")
    .populate("reportedBy", "_id fullName firstName lastName name email role")
    .populate("company", "_id name")
    .populate("assignedTo", "_id fullName firstName lastName name email role")
    .populate("assignedBy", "_id fullName firstName lastName name email role")
    .populate("resolvedBy", "_id fullName firstName lastName name email role")
    .populate("validatedBy", "_id fullName firstName lastName name email role");
}

function belongsToUserCompany(req, observation) {
  if (req.user?.role === "superAdmin") return true;

  const userCompanyId = getCompanyId(req.user);
  if (!userCompanyId) return true;

  return isSameId(observation.company?._id || observation.company, userCompanyId);
}

function canAgentAccessObservation(req, observation) {
  if (req.user?.role !== "agent") return true;

  const selfId = req.user?._id;
  const isReporter = isSameId(
    observation.reportedBy?._id || observation.reportedBy,
    selfId
  );
  const isAssigned = isSameId(
    observation.assignedTo?._id || observation.assignedTo,
    selfId
  );

  return isReporter || isAssigned;
}

async function createObservationNotification({
  observation,
  companyId,
  recipients = "managers", // "managers" | "assignedAgent" | [userIds]
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
        assignedTo: observation.assignedTo?._id || observation.assignedTo || null,
        assignedBy: observation.assignedBy?._id || observation.assignedBy || null,
        resolvedBy: observation.resolvedBy?._id || observation.resolvedBy || null,
        validatedBy:
          observation.validatedBy?._id || observation.validatedBy || null,
      },
    });

    let users = [];

    if (Array.isArray(recipients)) {
      const ids = [...new Set(recipients.filter(Boolean).map((id) => String(id)))];

      if (ids.length) {
        users = await User.find({
          _id: { $in: ids },
          company: finalCompanyId,
        }).select("_id firstName lastName fullName email role");
      }
    } else if (recipients === "assignedAgent") {
      const assignedUserId =
        observation.assignedTo?._id || observation.assignedTo || null;

      if (assignedUserId) {
        users = await User.find({
          _id: assignedUserId,
          company: finalCompanyId,
        }).select("_id firstName lastName fullName email role");
      }
    } else {
      users = await User.find({
        company: finalCompanyId,
        role: { $in: ["manager", "supervisor", "admin"] },
      }).select("_id firstName lastName fullName email role");
    }

    if (!users.length) {
      return notification;
    }

    const rows = users.map((user) => ({
      notification: notification._id,
      user: user._id,
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
          { path: "actor", select: "_id fullName firstName lastName email role" },
          {
            path: "observation",
            populate: [
              { path: "zone", select: "_id name" },
              {
                path: "reportedBy",
                select: "_id firstName lastName fullName email role",
              },
              {
                path: "assignedTo",
                select: "_id firstName lastName fullName email role",
              },
              {
                path: "assignedBy",
                select: "_id firstName lastName fullName email role",
              },
              {
                path: "resolvedBy",
                select: "_id firstName lastName fullName email role",
              },
              {
                path: "validatedBy",
                select: "_id firstName lastName fullName email role",
              },
            ],
          },
        ],
      })
      .populate("user", "_id firstName lastName fullName email role");

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
    const companyId = getCompanyId(req.user);

    if (!companyId) {
      return res.status(400).json({
        message: "User company is required to create an observation",
      });
    }

    const payload = {
      title: req.body.title,
      description: req.body.description,
      severity: req.body.severity,
      status: "open",
      zone: req.body.zone,
      reportedBy: req.user?._id,
      images: normalizeImages(req.body.images),
      company: companyId,
      assignedTo: null,
      assignedBy: null,
      assignedAt: null,
      resolutionComment: "",
      resolutionImages: [],
      resolvedAt: null,
      resolvedBy: null,
      validationComment: "",
      validatedAt: null,
      validatedBy: null,
    };

    const doc = await Observation.create(payload);

    const populated = await populateObservation(
      Observation.findById(doc._id)
    );

    const reporterName = getUserDisplayName(populated.reportedBy);

    await createObservationNotification({
      observation: populated,
      companyId: populated.company?._id || populated.company,
      recipients: "managers",
      type: "observation",
      action: "created",
      title: "Nouvelle observation",
      message: `${reporterName} a émis une observation : "${populated.title}".`,
      severity: getNotificationSeverityFromObservation(populated.severity),
      actor: req.user?._id || populated.reportedBy?._id || null,
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
      assignedTo,
      q,
      scope,
      page = 1,
      limit = 20,
      sort = "-createdAt",
    } = req.query;

    const andFilters = [];
    const userRole = req.user?.role;
    const companyId = getCompanyId(req.user);

    if (userRole !== "superAdmin" && companyId) {
      andFilters.push({ company: companyId });
    }

    if (zone) andFilters.push({ zone });
    if (status) andFilters.push({ status });
    if (severity) andFilters.push({ severity });
    if (reportedBy) andFilters.push({ reportedBy });
    if (assignedTo) andFilters.push({ assignedTo });

    if (q) {
      andFilters.push({
        $or: [
          { title: { $regex: q, $options: "i" } },
          { description: { $regex: q, $options: "i" } },
          { resolutionComment: { $regex: q, $options: "i" } },
          { validationComment: { $regex: q, $options: "i" } },
        ],
      });
    }

    if (userRole === "agent") {
      let accessFilter = {
        $or: [{ reportedBy: req.user._id }, { assignedTo: req.user._id }],
      };

      if (scope === "reported") {
        accessFilter = { reportedBy: req.user._id };
      } else if (scope === "assigned") {
        accessFilter = { assignedTo: req.user._id };
      }

      andFilters.push(accessFilter);
    }

    const filter = andFilters.length ? { $and: andFilters } : {};
    const currentPage = Math.max(Number(page) || 1, 1);
    const currentLimit = Math.max(Number(limit) || 20, 1);
    const skip = (currentPage - 1) * currentLimit;

    const [items, total] = await Promise.all([
      populateObservation(
        Observation.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(currentLimit)
      ),
      Observation.countDocuments(filter),
    ]);

    res.json({
      items,
      meta: {
        total,
        page: currentPage,
        limit: currentLimit,
        pages: Math.ceil(total / currentLimit) || 1,
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
    const doc = await populateObservation(Observation.findById(req.params.id));

    if (!doc) {
      return res.status(404).json({ message: "Observation not found" });
    }

    if (!belongsToUserCompany(req, doc)) {
      return res.status(403).json({
        message: "You are not allowed to access this observation",
      });
    }

    if (!canAgentAccessObservation(req, doc)) {
      return res.status(403).json({
        message: "You are not allowed to access this observation",
      });
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
    if (!canManageObservation(req.user?.role)) {
      return res.status(403).json({
        message: "Only management roles can update observations",
      });
    }

    const existing = await Observation.findById(req.params.id);

    if (!existing) {
      return res.status(404).json({ message: "Observation not found" });
    }

    if (!belongsToUserCompany(req, existing)) {
      return res.status(403).json({
        message: "You are not allowed to update this observation",
      });
    }

    const previousStatus = existing.status;
    const previousSeverity = existing.severity;

    const payload = {};

    if (req.body.title !== undefined) payload.title = req.body.title;
    if (req.body.description !== undefined)
      payload.description = req.body.description;
    if (req.body.severity !== undefined) payload.severity = req.body.severity;
    if (req.body.status !== undefined) payload.status = req.body.status;
    if (req.body.zone !== undefined) payload.zone = req.body.zone;

    if (!Object.keys(payload).length) {
      return res.status(400).json({
        message: "No allowed fields provided for update",
      });
    }

    const doc = await populateObservation(
      Observation.findByIdAndUpdate(req.params.id, payload, {
        new: true,
        runValidators: true,
      })
    );

    if (!doc) {
      return res.status(404).json({ message: "Observation not found" });
    }

    if (payload.status && payload.status !== previousStatus) {
      await createObservationNotification({
        observation: doc,
        companyId: doc.company?._id || doc.company,
        recipients: "managers",
        type: "observation",
        action: "status_changed",
        title: "Statut d’observation mis à jour",
        message: `L’observation "${doc.title}" a changé de statut : ${previousStatus} → ${doc.status}.`,
        severity: getNotificationSeverityFromObservation(doc.severity),
        actor: req.user?._id || null,
      });
    }

    if (payload.severity && payload.severity !== previousSeverity) {
      await createObservationNotification({
        observation: doc,
        companyId: doc.company?._id || doc.company,
        recipients: "managers",
        type: "observation",
        action: "severity_changed",
        title: "Sévérité d’observation mise à jour",
        message: `L’observation "${doc.title}" a changé de sévérité : ${previousSeverity} → ${doc.severity}.`,
        severity: getNotificationSeverityFromObservation(doc.severity),
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

exports.assignObservation = async (req, res) => {
  try {
    const { assignedTo } = req.body;

    if (!assignedTo) {
      return res.status(400).json({ message: "assignedTo is required" });
    }

    if (!canAssignObservation(req.user?.role)) {
      return res.status(403).json({
        message: "Only management roles can assign observations",
      });
    }

    const observation = await Observation.findById(req.params.id);

    if (!observation) {
      return res.status(404).json({ message: "Observation not found" });
    }

    if (!belongsToUserCompany(req, observation)) {
      return res.status(403).json({
        message: "You cannot assign an observation from another company",
      });
    }

    if (observation.status === "closed") {
      return res.status(400).json({
        message: "Closed observation cannot be assigned",
      });
    }

    const targetUser = await User.findById(assignedTo).select(
      "_id firstName lastName fullName email role company"
    );

    if (!targetUser) {
      return res.status(404).json({ message: "Assigned user not found" });
    }

    if (targetUser.role !== "agent") {
      return res.status(400).json({
        message: "Observation can only be assigned to an agent",
      });
    }

    if (!isSameId(targetUser.company, getCompanyId(req.user))) {
      return res.status(400).json({
        message: "Assigned agent must belong to the same company",
      });
    }

    observation.assignedTo = targetUser._id;
    observation.assignedBy = req.user._id;
    observation.assignedAt = new Date();
    observation.status = "in_progress";

    await observation.save();

    const populated = await populateObservation(
      Observation.findById(observation._id)
    );

    const managerName = getUserDisplayName(populated.assignedBy);

    await createObservationNotification({
      observation: populated,
      companyId: populated.company?._id || populated.company,
      recipients: [targetUser._id],
      type: "observation",
      action: "assigned_to_you",
      title: "Nouvelle observation assignée",
      message: `L’observation "${populated.title}" vous a été assignée par ${managerName}.`,
      severity: getNotificationSeverityFromObservation(populated.severity),
      actor: req.user?._id || null,
    });

    res.json(populated);
  } catch (err) {
    res.status(500).json({
      message: "Assign observation failed",
      error: err.message,
    });
  }
};

exports.submitObservationResolution = async (req, res) => {
  try {
    if (req.user?.role !== "agent") {
      return res.status(403).json({
        message: "Only assigned agent can submit a resolution",
      });
    }

    const observation = await Observation.findById(req.params.id);

    if (!observation) {
      return res.status(404).json({ message: "Observation not found" });
    }

    if (!belongsToUserCompany(req, observation)) {
      return res.status(403).json({
        message: "You are not allowed to update this observation",
      });
    }

    if (!isSameId(observation.assignedTo, req.user?._id)) {
      return res.status(403).json({
        message: "Only the assigned agent can submit a resolution",
      });
    }

    if (observation.status === "closed") {
      return res.status(400).json({
        message: "Closed observation cannot be resolved again",
      });
    }

    const resolutionComment = String(
      req.body.resolutionComment || ""
    ).trim();
    const resolutionImages = normalizeImages(req.body.resolutionImages);

    if (!resolutionComment && !resolutionImages.length) {
      return res.status(400).json({
        message:
          "resolutionComment or at least one resolution image is required",
      });
    }

    observation.resolutionComment = resolutionComment;
    observation.resolutionImages = resolutionImages;
    observation.resolvedAt = new Date();
    observation.resolvedBy = req.user._id;
    observation.status = "pending_validation";

    await observation.save();

    const populated = await populateObservation(
      Observation.findById(observation._id)
    );

    const agentName = getUserDisplayName(populated.resolvedBy);

    await createObservationNotification({
      observation: populated,
      companyId: populated.company?._id || populated.company,
      recipients: "managers",
      type: "observation",
      action: "resolution_submitted",
      title: "Traitement soumis pour validation",
      message: `${agentName} a marqué l’observation "${populated.title}" comme traitée.`,
      severity: getNotificationSeverityFromObservation(populated.severity),
      actor: req.user?._id || null,
    });

    res.json(populated);
  } catch (err) {
    res.status(500).json({
      message: "Submit observation resolution failed",
      error: err.message,
    });
  }
};

exports.validateObservationResolution = async (req, res) => {
  try {
    if (!canManageObservation(req.user?.role)) {
      return res.status(403).json({
        message: "Only management roles can validate observations",
      });
    }

    const observation = await Observation.findById(req.params.id);

    if (!observation) {
      return res.status(404).json({ message: "Observation not found" });
    }

    if (!belongsToUserCompany(req, observation)) {
      return res.status(403).json({
        message: "You are not allowed to validate this observation",
      });
    }

    if (observation.status !== "pending_validation") {
      return res.status(400).json({
        message: "Only observations pending validation can be closed",
      });
    }

    observation.status = "closed";
    observation.validationComment = String(
      req.body.validationComment || ""
    ).trim();
    observation.validatedAt = new Date();
    observation.validatedBy = req.user._id;

    await observation.save();

    const populated = await populateObservation(
      Observation.findById(observation._id)
    );

    await createObservationNotification({
      observation: populated,
      companyId: populated.company?._id || populated.company,
      recipients: populated.assignedTo?._id
        ? [populated.assignedTo._id]
        : [],
      type: "observation",
      action: "resolution_validated",
      title: "Observation validée et fermée",
      message: `Votre traitement de l’observation "${populated.title}" a été validé.`,
      severity: getNotificationSeverityFromObservation(populated.severity),
      actor: req.user?._id || null,
    });

    res.json(populated);
  } catch (err) {
    res.status(500).json({
      message: "Validate observation failed",
      error: err.message,
    });
  }
};

exports.rejectObservationResolution = async (req, res) => {
  try {
    if (!canManageObservation(req.user?.role)) {
      return res.status(403).json({
        message: "Only management roles can reject observations",
      });
    }

    const observation = await Observation.findById(req.params.id);

    if (!observation) {
      return res.status(404).json({ message: "Observation not found" });
    }

    if (!belongsToUserCompany(req, observation)) {
      return res.status(403).json({
        message: "You are not allowed to reject this observation",
      });
    }

    if (observation.status !== "pending_validation") {
      return res.status(400).json({
        message: "Only observations pending validation can be rejected",
      });
    }

    const validationComment = String(
      req.body.validationComment || ""
    ).trim();

    if (!validationComment) {
      return res.status(400).json({
        message: "validationComment is required when rejecting a resolution",
      });
    }

    observation.status = "reopened";
    observation.validationComment = validationComment;
    observation.validatedAt = new Date();
    observation.validatedBy = req.user._id;

    await observation.save();

    const populated = await populateObservation(
      Observation.findById(observation._id)
    );

    await createObservationNotification({
      observation: populated,
      companyId: populated.company?._id || populated.company,
      recipients: populated.assignedTo?._id
        ? [populated.assignedTo._id]
        : [],
      type: "observation",
      action: "resolution_rejected",
      title: "Traitement à reprendre",
      message: `Le traitement de l’observation "${populated.title}" a été refusé. Motif : ${validationComment}`,
      severity: getNotificationSeverityFromObservation(populated.severity),
      actor: req.user?._id || null,
    });

    res.json(populated);
  } catch (err) {
    res.status(500).json({
      message: "Reject observation failed",
      error: err.message,
    });
  }
};

exports.addObservationImage = async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || !String(url).trim()) {
      return res.status(400).json({ message: "url is required" });
    }

    const existing = await Observation.findById(req.params.id);

    if (!existing) {
      return res.status(404).json({ message: "Observation not found" });
    }

    if (!belongsToUserCompany(req, existing) || !canAgentAccessObservation(req, existing)) {
      return res.status(403).json({
        message: "You are not allowed to modify this observation",
      });
    }

    const doc = await populateObservation(
      Observation.findByIdAndUpdate(
        req.params.id,
        {
          $push: {
            images: {
              url: String(url).trim(),
              uploadedAt: new Date(),
            },
          },
        },
        { new: true }
      )
    );

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
    const doc = await Observation.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ message: "Observation not found" });
    }

    if (!belongsToUserCompany(req, doc)) {
      return res.status(403).json({
        message: "You are not allowed to delete this observation",
      });
    }

    if (canManageObservation(req.user?.role)) {
      await Observation.findByIdAndDelete(req.params.id);
      return res.json({ message: "Observation deleted" });
    }

    if (req.user?.role === "agent") {
      const isReporter = isSameId(doc.reportedBy, req.user?._id);

      if (!isReporter) {
        return res.status(403).json({
          message: "Agent can only delete their own observations",
        });
      }

      if (doc.status !== "open" || doc.assignedTo) {
        return res.status(400).json({
          message:
            "Assigned or processed observation cannot be deleted by the agent",
        });
      }

      await Observation.findByIdAndDelete(req.params.id);
      return res.json({ message: "Observation deleted" });
    }

    return res.status(403).json({
      message: "You are not allowed to delete this observation",
    });
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

    if (req.user?.role === "agent" && !isSameId(agentId, req.user?._id)) {
      return res.status(403).json({
        message: "You are not allowed to access this count",
      });
    }

    const andFilters = [{ reportedBy: agentId }];
    const companyId = getCompanyId(req.user);

    if (req.user?.role !== "superAdmin" && companyId) {
      andFilters.push({ company: companyId });
    }

    const filter = { $and: andFilters };
    const totalCount = await Observation.countDocuments(filter);

    res.json({ totalCount });
  } catch (err) {
    res.status(500).json({
      message: "Failed to get observations count for agent",
      error: err.message,
    });
  }
};