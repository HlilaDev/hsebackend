require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const User = require("../models/userModel");
const connectDB = require("../config/db");

async function createOrUpdateSuperAdmin() {
  try {
    await connectDB();

    const email = process.env.SUPERADMIN_EMAIL;
    const password = process.env.SUPERADMIN_PASSWORD;
    const firstName = process.env.SUPERADMIN_FIRSTNAME || "Super";
    const lastName = process.env.SUPERADMIN_LASTNAME || "Admin";

    if (!email || !password) {
      throw new Error(
        "SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD are required in .env"
      );
    }

    if (String(password).length < 6) {
      throw new Error("SUPERADMIN_PASSWORD must be at least 6 characters");
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const superAdmins = await User.find({ role: "superAdmin" }).select("+password");

    if (superAdmins.length > 1) {
      throw new Error(
        "Multiple superAdmin accounts found. Clean duplicates first."
      );
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);

    if (superAdmins.length === 1) {
      const existingSuperAdmin = superAdmins[0];

      existingSuperAdmin.firstName = String(firstName).trim();
      existingSuperAdmin.lastName = String(lastName).trim();
      existingSuperAdmin.email = normalizedEmail;
      existingSuperAdmin.password = hashedPassword;
      existingSuperAdmin.company = null;
      existingSuperAdmin.role = "superAdmin";

      await existingSuperAdmin.save();

      console.log("Global super admin updated successfully");
      console.log({
        id: existingSuperAdmin._id,
        email: existingSuperAdmin.email,
        role: existingSuperAdmin.role,
      });

      await mongoose.connection.close();
      process.exit(0);
    }

    const user = await User.create({
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "superAdmin",
      company: null,
    });

    console.log("Global super admin created successfully");
    console.log({
      id: user._id,
      email: user.email,
      role: user.role,
    });

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Super admin script error:", error.message);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  }
}

createOrUpdateSuperAdmin();