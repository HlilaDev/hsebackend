const express = require("express");
const router = express.Router();

const { protect } = require("../../middlewares/protect");

const inventoryItemRoutes = require("./inventoryRoutes");
const inventoryMovementRoutes = require("./inventoryMovementRoutes");
const inventoryAssignmentRoutes = require("./inventoryAssignmentRoutes");
const inventoryInspectionRoutes = require("./inventoryInspectionRoutes");

router.use(protect);

router.use("/items", inventoryItemRoutes);
router.use("/movements", inventoryMovementRoutes);
router.use("/assignments", inventoryAssignmentRoutes);
router.use("/inspections", inventoryInspectionRoutes);

module.exports = router;