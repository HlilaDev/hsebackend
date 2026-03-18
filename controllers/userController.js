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

// helper: extract company id safely
const extractCompanyId = (value) => {
  if (!value) return "";
  if (typeof value === "object") {
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
  }
  return String(value);
};

// helper: compare company ids safely
const sameCompany = (a, b) => {
  return extractCompanyId(a) === extractCompanyId(b);
};

// helper: sanitize returned user
const getSafeUserById = async (id) => {
  return User.findById(id)
    .select("-password")
    .populate("company", "_id name industry");
};

const ADMIN_MANAGED_ROLES = ["supervisor", "manager", "agent"];
const SUPERVISOR_TEAM_ROLES = ["manager", "agent"];

// CREATE USER
exports.createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, company } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({
        message: "First name, last name, email, password and role are required",
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

    let companyToAssign = null;

    // superAdmin => can create only admin
    if (req.user.role === "superAdmin") {
      if (role !== "admin") {
        return res.status(403).json({
          message: "Super admin can only create admin accounts",
        });
      }

      if (!company) {
        return res.status(400).json({
          message: "Company is required when creating an admin",
        });
      }

      const companyExists = await Company.findById(company);
      if (!companyExists) {
        return res.status(404).json({ message: "Company not found" });
      }

      companyToAssign = companyExists._id;
    }

    // admin => can create only supervisor / manager / agent in same company
    else if (req.user.role === "admin") {
      if (!req.user.company) {
        return res.status(400).json({
          message: "Connected admin is not linked to any company",
        });
      }

      if (!ADMIN_MANAGED_ROLES.includes(role)) {
        return res.status(403).json({
          message: "Admin can only create supervisor, manager or agent accounts",
        });
      }

      const adminCompanyId = extractCompanyId(req.user.company);

      const companyExists = await Company.findById(adminCompanyId);
      if (!companyExists) {
        return res.status(400).json({
          message: "Invalid connected admin company",
        });
      }

      companyToAssign = adminCompanyId;
    }

    // supervisor / manager / agent => cannot create users
    else {
      return res.status(403).json({
        message: "You are not allowed to create users",
      });
    }

    const hashed = await bcrypt.hash(String(password), 10);

    const user = await User.create({
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      email: normalizedEmail,
      password: hashed,
      role,
      company: companyToAssign,
    });

    const safeUser = await getSafeUserById(user._id);

    res.status(201).json({
      message: "User created successfully",
      user: safeUser,
    });
  } catch (error) {
    res.status(500).json({
      message: "Create user failed",
      error: error.message,
    });
  }
};

// GET ALL USERS
exports.getUsers = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let filter = {};

    if (req.user.role === "superAdmin") {
      filter = {};
    } else if (req.user.role === "admin") {
      if (!req.user.company) {
        return res.status(400).json({
          message: "Connected admin is not linked to any company",
        });
      }

      const adminCompanyId = extractCompanyId(req.user.company);
      filter = { company: adminCompanyId };
    } else {
      return res.status(403).json({
        message: "You are not allowed to view users",
      });
    }

    const users = await User.find(filter)
      .select("-password")
      .populate("company", "_id name industry")
      .sort({ createdAt: -1 });

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({
      message: "Get users failed",
      error: error.message,
    });
  }
};

// GET USER BY ID
exports.getUserById = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("company", "_id name industry");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.user.role === "superAdmin") {
      return res.status(200).json(user);
    }

    if (req.user.role === "admin") {
      if (!req.user.company) {
        return res.status(400).json({
          message: "Connected admin is not linked to any company",
        });
      }

      if (!sameCompany(user.company, req.user.company)) {
        return res.status(403).json({
          message: "Access denied: user does not belong to your company",
        });
      }

      return res.status(200).json(user);
    }

    if (req.user.role === "supervisor") {
      if (!req.user.company) {
        return res.status(400).json({
          message: "Connected supervisor is not linked to any company",
        });
      }

      if (!sameCompany(user.company, req.user.company)) {
        return res.status(403).json({
          message: "Access denied: user does not belong to your company",
        });
      }

      if (!SUPERVISOR_TEAM_ROLES.includes(user.role)) {
        return res.status(403).json({
          message: "Supervisor can only view manager or agent accounts",
        });
      }

      return res.status(200).json(user);
    }

    return res.status(403).json({
      message: "You are not allowed to view this user",
    });
  } catch (error) {
    res.status(500).json({
      message: "Get user failed",
      error: error.message,
    });
  }
};

// GET TEAM FOR SUPERVISOR
exports.getTeam = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!req.user.company) {
      return res.status(400).json({
        message: "Connected user is not linked to any company",
      });
    }

    const companyId =
      typeof req.user.company === "object" && req.user.company._id
        ? req.user.company._id
        : req.user.company;

    let allowedRoles = [];

    if (req.user.role === "supervisor") {
      allowedRoles = ["manager", "agent"];
    } else if (req.user.role === "manager") {
      allowedRoles = ["agent"];
    } else if (req.user.role === "admin") {
      allowedRoles = ["supervisor", "manager", "agent"];
    } else if (req.user.role === "superAdmin") {
      allowedRoles = ["admin", "supervisor", "manager", "agent"];
    } else {
      return res.status(403).json({
        message: "You are not allowed to access team members",
      });
    }

    const team = await User.find({
      company: companyId,
      role: { $in: allowedRoles },
    })
      .select("-password")
      .populate("company", "_id name industry")
      .sort({ role: 1, createdAt: -1 });

    return res.status(200).json({
      message: "Team fetched successfully",
      items: team,
      count: team.length,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Get team failed",
      error: error.message,
    });
  }
};

// UPDATE USER
exports.updateUser = async (req, res) => {
  try {
    const id = req.params.id;

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const existingUser = await User.findById(id);

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.user.role === "superAdmin") {
      // superAdmin can manage all users
    } else if (req.user.role === "admin") {
      if (!req.user.company) {
        return res.status(400).json({
          message: "Connected admin is not linked to any company",
        });
      }

      if (!sameCompany(existingUser.company, req.user.company)) {
        return res.status(403).json({
          message: "Access denied: user does not belong to your company",
        });
      }

      if (!ADMIN_MANAGED_ROLES.includes(existingUser.role)) {
        return res.status(403).json({
          message:
            "Admin can only update supervisor, manager or agent accounts",
        });
      }
    } else {
      return res.status(403).json({
        message: "You are not allowed to update users",
      });
    }

    const allowedFields =
      req.user.role === "superAdmin"
        ? ["firstName", "lastName", "email", "role", "password", "company"]
        : ["firstName", "lastName", "email", "role", "password"];

    const updates = pick(req.body, allowedFields);

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

    if (updates.role !== undefined) {
      if (req.user.role === "superAdmin") {
        if (!["admin", "supervisor", "manager", "agent"].includes(updates.role)) {
          return res.status(403).json({
            message: "Invalid target role",
          });
        }
      }

      if (req.user.role === "admin") {
        if (!ADMIN_MANAGED_ROLES.includes(updates.role)) {
          return res.status(403).json({
            message: "Admin can only assign supervisor, manager or agent roles",
          });
        }
      }
    }

    if (updates.company !== undefined) {
      if (req.user.role !== "superAdmin") {
        return res.status(403).json({
          message: "Only super admin can change user company",
        });
      }

      const companyExists = await Company.findById(updates.company);
      if (!companyExists) {
        return res.status(404).json({ message: "Company not found" });
      }
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
    res.status(500).json({
      message: "Update user failed",
      error: error.message,
    });
  }
};

// DELETE USER
exports.deleteUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.user.role === "superAdmin") {
      if (user.role === "superAdmin") {
        return res.status(403).json({
          message: "Super admin account cannot be deleted from this route",
        });
      }

      await User.findByIdAndDelete(req.params.id);

      return res.status(200).json({
        message: "User deleted successfully",
      });
    }

    if (req.user.role === "admin") {
      if (!req.user.company) {
        return res.status(400).json({
          message: "Connected admin is not linked to any company",
        });
      }

      if (!sameCompany(user.company, req.user.company)) {
        return res.status(403).json({
          message: "Access denied: user does not belong to your company",
        });
      }

      if (!ADMIN_MANAGED_ROLES.includes(user.role)) {
        return res.status(403).json({
          message:
            "Admin can only delete supervisor, manager or agent accounts",
        });
      }

      await User.findByIdAndDelete(req.params.id);

      return res.status(200).json({
        message: "User deleted successfully",
      });
    }

    return res.status(403).json({
      message: "You are not allowed to delete users",
    });
  } catch (error) {
    res.status(500).json({
      message: "Delete user failed",
      error: error.message,
    });
  }
};