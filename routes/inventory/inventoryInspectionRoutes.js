const express = require("express");
const router = express.Router();
const controller = require("../../controllers/inventory/inventoryInspectionController");

router.post("/", controller.createInventoryInspection);
router.get("/", controller.getAllInventoryInspections);
router.get("/:id", controller.getInventoryInspectionById);
router.put("/:id", controller.updateInventoryInspection);
router.delete("/:id", controller.deleteInventoryInspection);

module.exports = router;