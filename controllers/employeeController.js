const Employee = require("../models/employeeModel");

// Create
exports.createEmployee = async (req, res) => {
  try {
    const payload = {
      fullName: req.body.fullName,
      employeeId: req.body.employeeId,
      department: req.body.department,
      jobTitle: req.body.jobTitle,
      zone: req.body.zone,
      phone: req.body.phone,
      hireDate: req.body.hireDate,
      isActive: req.body.isActive ?? true,
    };

    const doc = await Employee.create(payload);

    const populated = await Employee.findById(doc._id).populate("zone");
    res.status(201).json(populated);
  } catch (err) {
    // duplicate key (employeeId unique)
    if (err.code === 11000) {
      return res.status(400).json({ message: "employeeId already exists" });
    }
    res.status(500).json({ message: "Create employee failed", error: err.message });
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

    const filter = {};
    if (zone) filter.zone = zone;
    if (department) filter.department = department;
    if (jobTitle) filter.jobTitle = jobTitle;

    // isActive can be "true" / "false"
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
    res.status(500).json({ message: "List employees failed", error: err.message });
  }
};

// Get by id
exports.getEmployeeById = async (req, res) => {
  try {
    const doc = await Employee.findById(req.params.id).populate("zone");
    if (!doc) return res.status(404).json({ message: "Employee not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: "Get employee failed", error: err.message });
  }
};

// Update (whitelist)
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

    // remove undefined fields
    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    const doc = await Employee.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).populate("zone");

    if (!doc) return res.status(404).json({ message: "Employee not found" });
    res.json(doc);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "employeeId already exists" });
    }
    res.status(500).json({ message: "Update employee failed", error: err.message });
  }
};

// Soft delete (disable employee)
exports.disableEmployee = async (req, res) => {
  try {
    const doc = await Employee.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).populate("zone");

    if (!doc) return res.status(404).json({ message: "Employee not found" });
    res.json({ message: "Employee disabled", employee: doc });
  } catch (err) {
    res.status(500).json({ message: "Disable employee failed", error: err.message });
  }
};

// Hard delete (optional)
exports.deleteEmployee = async (req, res) => {
  try {
    const doc = await Employee.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Employee not found" });
    res.json({ message: "Employee deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete employee failed", error: err.message });
  }
};
