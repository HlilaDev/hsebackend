const User = require("../models/userModel");
const bcrypt = require("bcryptjs");

// ✅ helper: pick only allowed fields
const pick = (obj, keys) => {
  const out = {};
  keys.forEach((k) => {
    if (obj[k] !== undefined) out[k] = obj[k];
  });
  return out;
};

// ✅ Créer un utilisateur (hash password)
exports.createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // email unique check (optional but better message)
    const exists = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (exists) return res.status(400).json({ message: "Email already exists" });

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      firstName,
      lastName,
      email: String(email).toLowerCase().trim(),
      password: hashed,
      role,
    });

    const safe = await User.findById(user._id).select("-password");

    res.status(201).json({
      message: "User created successfully",
      user: safe,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ Récupérer tous les utilisateurs
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Récupérer un utilisateur par ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ UPDATE user (EDIT)
exports.updateUser = async (req, res) => {
  try {
    const id = req.params.id;

    // Only allow these fields
    const updates = pick(req.body, ["firstName", "lastName", "email", "role", "password"]);

    // normalize email
    if (updates.email) {
      updates.email = String(updates.email).toLowerCase().trim();

      const exists = await User.findOne({ email: updates.email, _id: { $ne: id } });
      if (exists) return res.status(400).json({ message: "Email already exists" });
    }

    // hash password if provided
    if (updates.password) {
      if (String(updates.password).length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      updates.password = await bcrypt.hash(String(updates.password), 10);
    } else {
      delete updates.password; // don’t overwrite with empty
    }

    const user = await User.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ Supprimer un utilisateur
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};