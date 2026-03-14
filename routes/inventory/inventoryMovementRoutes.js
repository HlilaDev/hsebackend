const express = require("express");
const router = express.Router();
const controller = require("../../controllers/inventory/inventoryMovementController");

router.post("/", controller.createInventoryMovement);
router.get("/", controller.getAllInventoryMovements);
router.get("/:id", controller.getInventoryMovementById);
router.delete("/:id", controller.deleteInventoryMovement);

module.exports = router;