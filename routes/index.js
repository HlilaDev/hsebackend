const express = require("express");
const router = express.Router();

const userRoutes = require("./userRoutes");
const authRoutes = require("./authRoutes");
const zoneRoutes = require("./zoneRoutes");
const deviceRoutes = require("./deviceRoutes");

router.use("/users", userRoutes);
router.use("/auth", authRoutes);
router.use("/zones", zoneRoutes);
router.use("/devices", deviceRoutes);

module.exports = router;

