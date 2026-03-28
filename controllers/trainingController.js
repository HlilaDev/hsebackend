const Training = require("../models/trainingModel");
const Employee = require("../models/employeeModel");

// CREATE
exports.createTraining = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!req.user.company) {
      return res.status(400).json({
        message: "Connected user is not linked to any company",
      });
    }

    const payload = {
      title: req.body.title,
      description: req.body.description,
      company: req.user.company,
      category: req.body.category,
      provider: req.body.provider,
      location: req.body.location,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      status: req.body.status || "scheduled",
      participants: Array.isArray(req.body.participants) ? req.body.participants : [],
      createdBy: req.user._id,
    };

    const doc = await Training.create(payload);

    const populated = await Training.findById(doc._id)
      .populate("company", "name")
      .populate("createdBy", "firstName lastName role")
      .populate("participants.employee", "fullName employeeId department jobTitle");

    return res.status(201).json(populated);
  } catch (err) {
    return res.status(500).json({
      message: "Create training failed",
      error: err.message,
    });
  }
};

// LIST
exports.listTrainings = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!req.user.company) {
      return res.status(400).json({
        message: "Connected user is not linked to any company",
      });
    }

    const {
      category,
      status,
      provider,
      employee,
      q,
      from,
      to,
      page = 1,
      limit = 20,
      sort = "-startDate",
    } = req.query;

    const filter = {
      company: req.user.company,
    };

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
        .populate("company", "name")
        .populate("createdBy", "firstName lastName email role")
        .populate("participants.employee", "fullName employeeId department jobTitle")
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Training.countDocuments(filter),
    ]);

    return res.json({
      items,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: "List trainings failed",
      error: err.message,
    });
  }
};

// GET BY ID
exports.getTrainingById = async (req, res) => {
  try {
    const doc = await Training.findOne({
      _id: req.params.id,
      company: req.user.company,
    })
      .populate("company", "name")
      .populate("createdBy", "firstName lastName email role")
      .populate("participants.employee", "fullName employeeId department jobTitle");

    if (!doc) {
      return res.status(404).json({ message: "Training not found" });
    }

    return res.json(doc);
  } catch (err) {
    return res.status(500).json({
      message: "Get training failed",
      error: err.message,
    });
  }
};

// UPDATE
exports.updateTraining = async (req, res) => {
  try {
    const existing = await Training.findOne({
      _id: req.params.id,
      company: req.user.company,
    });

    if (!existing) {
      return res.status(404).json({ message: "Training not found" });
    }

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
      .populate("company", "name")
      .populate("createdBy", "firstName lastName email role")
      .populate("participants.employee", "fullName employeeId department jobTitle");

    return res.json(doc);
  } catch (err) {
    return res.status(500).json({
      message: "Update training failed",
      error: err.message,
    });
  }
};

// ADD PARTICIPANT
exports.addParticipant = async (req, res) => {
  try {
    const { employee, status = "planned", score, validUntil, note } = req.body;

    if (!employee) {
      return res.status(400).json({ message: "employee is required" });
    }

    const employeeExists = await Employee.findOne({
      _id: employee,
      company: req.user.company,
    });

    if (!employeeExists) {
      return res.status(400).json({
        message: "Invalid employee for this company",
      });
    }

    const training = await Training.findOne({
      _id: req.params.id,
      company: req.user.company,
    });

    if (!training) {
      return res.status(404).json({ message: "Training not found" });
    }

    const alreadyExists = training.participants.some(
      (p) => String(p.employee) === String(employee)
    );

    if (alreadyExists) {
      return res.status(409).json({
        message: "Employee already added to this training",
      });
    }

    const doc = await Training.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          participants: { employee, status, score, validUntil, note },
        },
      },
      { new: true, runValidators: true }
    )
      .populate("company", "name")
      .populate("createdBy", "firstName lastName email role")
      .populate("participants.employee", "fullName employeeId department jobTitle");

    return res.json(doc);
  } catch (err) {
    return res.status(500).json({
      message: "Add participant failed",
      error: err.message,
    });
  }
};

// UPDATE PARTICIPANT
exports.updateParticipant = async (req, res) => {
  try {
    const { participantId } = req.params;

    const training = await Training.findOne({
      _id: req.params.id,
      company: req.user.company,
    });

    if (!training) {
      return res.status(404).json({ message: "Training not found" });
    }

    const updates = {};
    if (req.body.status !== undefined) updates["participants.$.status"] = req.body.status;
    if (req.body.score !== undefined) updates["participants.$.score"] = req.body.score;
    if (req.body.validUntil !== undefined) updates["participants.$.validUntil"] = req.body.validUntil;
    if (req.body.note !== undefined) updates["participants.$.note"] = req.body.note;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No participant fields provided to update",
      });
    }

    const doc = await Training.findOneAndUpdate(
      {
        _id: req.params.id,
        company: req.user.company,
        "participants._id": participantId,
      },
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate("company", "name")
      .populate("createdBy", "firstName lastName email role")
      .populate("participants.employee", "fullName employeeId department jobTitle");

    if (!doc) {
      return res.status(404).json({ message: "Training/participant not found" });
    }

    return res.json(doc);
  } catch (err) {
    return res.status(500).json({
      message: "Update participant failed",
      error: err.message,
    });
  }
};

// REMOVE PARTICIPANT
exports.removeParticipant = async (req, res) => {
  try {
    const { participantId } = req.params;

    const training = await Training.findOne({
      _id: req.params.id,
      company: req.user.company,
    });

    if (!training) {
      return res.status(404).json({ message: "Training not found" });
    }

    const doc = await Training.findByIdAndUpdate(
      req.params.id,
      { $pull: { participants: { _id: participantId } } },
      { new: true }
    )
      .populate("company", "name")
      .populate("createdBy", "firstName lastName email role")
      .populate("participants.employee", "fullName employeeId department jobTitle");

    return res.json(doc);
  } catch (err) {
    return res.status(500).json({
      message: "Remove participant failed",
      error: err.message,
    });
  }
};

// DELETE
exports.deleteTraining = async (req, res) => {
  try {
    const doc = await Training.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company,
    });

    if (!doc) {
      return res.status(404).json({ message: "Training not found" });
    }

    return res.json({ message: "Training deleted" });
  } catch (err) {
    return res.status(500).json({
      message: "Delete training failed",
      error: err.message,
    });
  }
};