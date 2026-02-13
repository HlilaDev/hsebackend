const express = require("express");
const router = express.Router();

const userRoutes = require("./userRoutes");
const authRoutes = require("./authRoutes");
const zoneRoutes = require("./zoneRoutes");
const deviceRoutes = require("./deviceRoutes");
const observationRoutes = require("./observationRoutes");
const incidentEventRoutes = require("./incidentEventRoutes");
const reportRoutes = require("./reportRoutes");
const employeeRoutes = require("./employeeRoutes");
const trainingRoutes = require("./trainingRoutes");

router.use("/users", userRoutes);
router.use("/auth", authRoutes);
router.use("/zones", zoneRoutes);
router.use("/devices", deviceRoutes);
router.use("/observations", observationRoutes);
router.use("/incidentEvents", incidentEventRoutes);
router.use("/reports", reportRoutes);
router.use("/employees", employeeRoutes);
router.use("/trainings", trainingRoutes);

module.exports = router;

