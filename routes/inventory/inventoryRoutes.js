const express = require("express");
const router = express.Router();
const inventoryController = require("../../controllers/inventory/inventoryController");

router.post("/", inventoryController.createInventoryItem);
router.get("/", inventoryController.getAllInventoryItems);
router.get("/stats", inventoryController.getInventoryStats);
router.get("/expired", inventoryController.getExpiredInventoryItems);
router.get("/low-stock", inventoryController.getLowStockInventoryItems);
router.get("/:id", inventoryController.getInventoryItemById);
router.put("/:id", inventoryController.updateInventoryItem);
router.patch("/:id/status", inventoryController.updateInventoryItemStatus);
router.patch("/:id/assign", inventoryController.assignInventoryItem);
router.patch("/:id/unassign", inventoryController.unassignInventoryItem);
router.delete("/:id", inventoryController.deleteInventoryItem);

module.exports = router;