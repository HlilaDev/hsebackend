const Employee = require("../models/employeeModel");

// Create
exports.createEmployee = async (req, res) => {
  try {
    const payload = {
      fullName: req.body.fullName,
      employeeId: req.body.employeeId,
      department: req.body.department,
      company: req.user.company,
      jobTitle: req.body.jobTitle,
      zone: req.body.zone,
      phone: req.body.phone,
      hireDate: req.body.hireDate,
      isActive: req.body.isActive ?? true,
    };

    const doc = await Employee.create(payload);

    const populated = await Employee.findOne({
      _id: doc._id,
      company: req.user.company,
    })
      .populate("zone")
      .populate("company", "name industry");

    res.status(201).json(populated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "employeeId already exists" });
    }

    res.status(500).json({
      message: "Create employee failed",
      error: err.message,
    });
  }
};

// List (filters + pagination + search)
exports.listEmployees = async (req, res) => {
  try {
    const {
      zone,
      department,
      jobTitle,
      isActive,
      q,
      page = 1,
      limit = 20,
      sort = "fullName",
    } = req.query;

    const filter = {
      company: req.user.company,
    };

    if (zone) filter.zone = zone;
    if (department) filter.department = department;
    if (jobTitle) filter.jobTitle = jobTitle;

    if (isActive !== undefined) {
      if (isActive === "true") filter.isActive = true;
      if (isActive === "false") filter.isActive = false;
    }

    if (q) {
      filter.$or = [
        { fullName: { $regex: q, $options: "i" } },
        { employeeId: { $regex: q, $options: "i" } },
        { department: { $regex: q, $options: "i" } },
        { jobTitle: { $regex: q, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Employee.find(filter)
        .populate("zone")
        .populate("company", "name industry")
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Employee.countDocuments(filter),
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
      message: "List employees failed",
      error: err.message,
    });
  }
};

// Get by id
exports.getEmployeeById = async (req, res) => {
  try {
    const doc = await Employee.findOne({
      _id: req.params.id,
      company: req.user.company,
    })
      .populate("zone")
      .populate("company", "name industry")
      .populate("trainings")
      .populate({
        path: "activeInventoryAssignments",
        populate: [
          {
            path: "inventoryItem",
            select:
              "name category subCategory inventoryCode status condition unit imageUrl quantity",
          },
          {
            path: "zone",
            select: "name",
          },
          {
            path: "assignedBy",
            select: "firstName lastName email",
          },
          {
            path: "returnedBy",
            select: "firstName lastName email",
          },
        ],
      });

    if (!doc) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json(doc);
  } catch (err) {
    res.status(500).json({
      message: "Get employee failed",
      error: err.message,
    });
  }
};

// Update
exports.updateEmployee = async (req, res) => {
  try {
    const updates = {
      fullName: req.body.fullName,
      employeeId: req.body.employeeId,
      department: req.body.department,
      jobTitle: req.body.jobTitle,
      zone: req.body.zone,
      phone: req.body.phone,
      hireDate: req.body.hireDate,
      isActive: req.body.isActive,
    };

    Object.keys(updates).forEach((key) => {
      if (updates[key] === undefined) delete updates[key];
    });

    const doc = await Employee.findOneAndUpdate(
      {
        _id: req.params.id,
        company: req.user.company,
      },
      updates,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("zone")
      .populate("company", "name industry");

    if (!doc) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json(doc);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "employeeId already exists" });
    }

    res.status(500).json({
      message: "Update employee failed",
      error: err.message,
    });
  }
};

// Soft delete
exports.disableEmployee = async (req, res) => {
  try {
    const doc = await Employee.findOneAndUpdate(
      {
        _id: req.params.id,
        company: req.user.company,
      },
      { isActive: false },
      { new: true }
    )
      .populate("zone")
      .populate("company", "name industry");

    if (!doc) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json({
      message: "Employee disabled",
      employee: doc,
    });
  } catch (err) {
    res.status(500).json({
      message: "Disable employee failed",
      error: err.message,
    });
  }
};

// Hard delete
exports.deleteEmployee = async (req, res) => {
  try {
    const doc = await Employee.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company,
    });

    if (!doc) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json({ message: "Employee deleted" });
  } catch (err) {
    res.status(500).json({
      message: "Delete employee failed",
      error: err.message,
    });
  }
};

// Get employees by zone
exports.getEmployeesByZone = async (req, res) => {
  try {
    const { zoneId } = req.params;

    const employees = await Employee.find({
      zone: zoneId,
      company: req.user.company,
    })
      .select("_id fullName department jobTitle isActive")
      .sort({ fullName: 1 });

    res.json(employees);
  } catch (err) {
    res.status(500).json({
      message: "Get employees by zone failed",
      error: err.message,
    });
  }
};