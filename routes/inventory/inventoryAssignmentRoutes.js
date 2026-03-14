const express = require("express");
const router = express.Router();
const controller = require("../../controllers/inventory/inventoryAssignmentController");

router.post("/", controller.createInventoryAssignment);
router.get("/", controller.getAllInventoryAssignments);
router.get("/:id", controller.getInventoryAssignmentById);
router.patch("/:id/return", controller.returnInventoryAssignment);
router.patch("/:id/status", controller.updateInventoryAssignmentStatus);
router.delete("/:id", controller.deleteInventoryAssignment);

module.exports = router;