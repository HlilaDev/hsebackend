const Training = require("../models/trainingModel");

// Create
exports.createTraining = async (req, res) => {
  try {
    const payload = {
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      provider: req.body.provider,
      location: req.body.location,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      status: req.body.status || "scheduled",
      participants: Array.isArray(req.body.participants) ? req.body.participants : [],
      // createdBy = user app (si tu as auth middleware, remplace req.body.createdBy par req.user._id)
      createdBy: req.user?._id || req.body.createdBy,
    };

    if (!payload.createdBy) {
      return res.status(400).json({ message: "createdBy is required (req.user._id or body.createdBy)" });
    }

    const doc = await Training.create(payload);

    const populated = await Training.findById(doc._id)
      .populate("createdBy", "name email")
      .populate("participants.employee", "fullName employeeId department jobTitle");

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: "Create training failed", error: err.message });
  }
};

// List (filters + pagination + search)
exports.listTrainings = async (req, res) => {
  try {
    const {
      category,
      status,
      provider,
      employee, // filter by participant employeeId (ObjectId)
      q,
      from, // startDate >= from
      to,   // startDate <= to
      page = 1,
      limit = 20,
      sort = "-startDate",
    } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (provider) filter.provider = { $regex: provider, $options: "i" };
    if (employee) filter["participants.employee"] = employee;

    if (from || to) {
      filter.startDate = {};
      if (from) filter.startDate.$gte = new Date(from);
      if (to) filter.startDate.$lte = new Date(to);
    }

    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { provider: { $regex: q, $options: "i" } },
        { location: { $regex: q, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Training.find(filter)
        .populate("createdBy", "name email")
        .populate("participants.employee", "fullName employeeId department jobTitle")
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Training.countDocuments(filter),
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
    res.status(500).json({ message: "List trainings failed", error: err.message });
  }
};

// Get by id
exports.getTrainingById = async (req, res) => {
  try {
    const doc = await Training.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("participants.employee", "fullName employeeId department jobTitle");

    if (!doc) return res.status(404).json({ message: "Training not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: "Get training failed", error: err.message });
  }
};

// Update (whitelist)
exports.updateTraining = async (req, res) => {
  try {
    const updates = {
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      provider: req.body.provider,
      location: req.body.location,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      status: req.body.status,
    };

    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    const doc = await Training.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    })
      .populate("createdBy", "name email")
      .populate("participants.employee", "fullName employeeId department jobTitle");

    if (!doc) return res.status(404).json({ message: "Training not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: "Update training failed", error: err.message });
  }
};

// Add participant (employee) to training
exports.addParticipant = async (req, res) => {
  try {
    const { employee, status = "planned", score, validUntil, note } = req.body;
    if (!employee) return res.status(400).json({ message: "employee is required" });

    // prevent duplicates
    const exists = await Training.findOne({
      _id: req.params.id,
      "participants.employee": employee,
    });
    if (exists) return res.status(409).json({ message: "Employee already added to this training" });

    const doc = await Training.findByIdAndUpdate(
      req.params.id,
      { $push: { participants: { employee, status, score, validUntil, note } } },
      { new: true, runValidators: true }
    )
      .populate("createdBy", "name email")
      .populate("participants.employee", "fullName employeeId department jobTitle");

    if (!doc) return res.status(404).json({ message: "Training not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: "Add participant failed", error: err.message });
  }
};

// Update participant (status/score/validUntil/note)
exports.updateParticipant = async (req, res) => {
  try {
    const { participantId } = req.params; // id of subdocument in participants array
    const updates = {};
    if (req.body.status !== undefined) updates["participants.$.status"] = req.body.status;
    if (req.body.score !== undefined) updates["participants.$.score"] = req.body.score;
    if (req.body.validUntil !== undefined) updates["participants.$.validUntil"] = req.body.validUntil;
    if (req.body.note !== undefined) updates["participants.$.note"] = req.body.note;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No participant fields provided to update" });
    }

    const doc = await Training.findOneAndUpdate(
      { _id: req.params.id, "participants._id": participantId },
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate("createdBy", "name email")
      .populate("participants.employee", "fullName employeeId department jobTitle");

    if (!doc) return res.status(404).json({ message: "Training/participant not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: "Update participant failed", error: err.message });
  }
};

// Remove participant
exports.removeParticipant = async (req, res) => {
  try {
    const { participantId } = req.params;

    const doc = await Training.findByIdAndUpdate(
      req.params.id,
      { $pull: { participants: { _id: participantId } } },
      { new: true }
    )
      .populate("createdBy", "name email")
      .populate("participants.employee", "fullName employeeId department jobTitle");

    if (!doc) return res.status(404).json({ message: "Training not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: "Remove participant failed", error: err.message });
  }
};

// Delete training
exports.deleteTraining = async (req, res) => {
  try {
    const doc = await Training.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Training not found" });
    res.json({ message: "Training deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete training failed", error: err.message });
  }
};
