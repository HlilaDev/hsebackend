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
const sensorsRoutes = require("./sensorRoutes");
const sensorDataRoutes = require("./sensorDataRoutes");
const auditRoutes = require("./auditRoutes");
const alertRoutes = require("./alertRoutes");
const alertRuleRoutes = require("./alertRuleRoutes");
const notificationRoutes = require('./notificationRoutes');
const useNotificationRoutes = require('./userNotificationRoutes');
const companyRoutes = require("./companyRoutes");
const inventoryRoutes = require("./inventory");
const displayMessageRoutes = require("./displayMessageRoutes");
const checklistRoutes = require("./checklistRoutes");
const ppeAlertRoutes = require("./ppeAlertRoutes");


router.use("/display-messages", displayMessageRoutes);
router.use("/companies", companyRoutes);
router.use("/users", userRoutes);
router.use("/auth", authRoutes);
router.use("/zones", zoneRoutes);
router.use("/devices", deviceRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/observations", observationRoutes);
router.use("/incidentEvents", incidentEventRoutes);
router.use("/reports", reportRoutes);
router.use("/employees", employeeRoutes);
router.use("/trainings", trainingRoutes);
router.use("/audits", auditRoutes);
router.use("/alerts", alertRoutes);
router.use("/alert-rules", alertRuleRoutes);
router.use('/notifications', notificationRoutes);
router.use('/user-notifications', useNotificationRoutes);
router.use("/checklists", checklistRoutes);



router.use("/ppe-alerts", ppeAlertRoutes);

router.use("/sensors", sensorsRoutes);
router.use("/sensor-data", sensorDataRoutes);
router.use("/readings", require("./readingRoutes"));

module.exports = router;

