const User = require("../models/userModel");
const Company = require("../models/companyModel");
const bcrypt = require("bcryptjs");

// helper: pick only allowed fields
const pick = (obj, keys) => {
  const out = {};
  keys.forEach((k) => {
    if (obj[k] !== undefined) out[k] = obj[k];
  });
  return out;
};

// helper: compare company ids safely
const sameCompany = (a, b) => String(a || "") === String(b || "");

// CREATE USER
exports.createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!req.user.company) {
      return res.status(400).json({
        message: "Connected admin is not linked to any company",
      });
    }

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        message: "First name, last name, email and password are required",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const companyId = req.user.company;

    const companyExists = await Company.findById(companyId);
    if (!companyExists) {
      return res.status(400).json({ message: "Invalid connected user company" });
    }

    const hashed = await bcrypt.hash(String(password), 10);

    const user = await User.create({
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      email: normalizedEmail,
      password: hashed,
      role,
      company: companyId, // same company as connected admin
    });

    const safeUser = await User.findById(user._id)
      .select("-password")
      .populate("company", "_id name industry");

    res.status(201).json({
      message: "User created successfully",
      user: safeUser,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// GET ALL USERS
exports.getUsers = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!req.user.company) {
      return res.status(400).json({
        message: "Connected user is not linked to any company",
      });
    }

    const users = await User.find({ company: req.user.company })
      .select("-password")
      .populate("company", "_id name industry")
      .sort({ createdAt: -1 });

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET USER BY ID
exports.getUserById = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!req.user.company) {
      return res.status(400).json({
        message: "Connected user is not linked to any company",
      });
    }

    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("company", "_id name industry");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!sameCompany(user.company?._id || user.company, req.user.company)) {
      return res.status(403).json({
        message: "Access denied: user does not belong to your company",
      });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE USER
exports.updateUser = async (req, res) => {
  try {
    const id = req.params.id;

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!req.user.company) {
      return res.status(400).json({
        message: "Connected user is not linked to any company",
      });
    }

    const existingUser = await User.findById(id);

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!sameCompany(existingUser.company, req.user.company)) {
      return res.status(403).json({
        message: "Access denied: user does not belong to your company",
      });
    }

    // company is intentionally excluded
    const updates = pick(req.body, [
      "firstName",
      "lastName",
      "email",
      "role",
      "password",
    ]);

    if (updates.firstName !== undefined) {
      updates.firstName = String(updates.firstName).trim();
    }

    if (updates.lastName !== undefined) {
      updates.lastName = String(updates.lastName).trim();
    }

    if (updates.email !== undefined) {
      updates.email = String(updates.email).toLowerCase().trim();

      const emailExists = await User.findOne({
        email: updates.email,
        _id: { $ne: id },
      });

      if (emailExists) {
        return res.status(400).json({ message: "Email already exists" });
      }
    }

    if (updates.password !== undefined) {
      if (String(updates.password).length < 6) {
        return res.status(400).json({
          message: "Password must be at least 6 characters",
        });
      }

      updates.password = await bcrypt.hash(String(updates.password), 10);
    }

    const user = await User.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })
      .select("-password")
      .populate("company", "_id name industry");

    res.status(200).json({
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// DELETE USER
exports.deleteUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!req.user.company) {
      return res.status(400).json({
        message: "Connected user is not linked to any company",
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!sameCompany(user.company, req.user.company)) {
      return res.status(403).json({
        message: "Access denied: user does not belong to your company",
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};