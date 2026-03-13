const express = require("express");
const router = express.Router();
const zoneController = require("../controllers/zoneController");
const { protect } = require("../middlewares/protect");

router.post("/", protect, zoneController.createZone);
router.get("/", protect, zoneController.listZones);
router.get("/:id", protect, zoneController.getZoneById);
router.put("/:id", protect, zoneController.updateZone);
router.patch("/:id/rules", protect, zoneController.updateZoneRules);
router.get("/:id/config", protect, zoneController.getZoneConfig);
router.delete("/:id", protect, zoneController.deleteZone);
router.get("/:zoneId/devices", protect, zoneController.getDevicesByZone);

module.exports = router;