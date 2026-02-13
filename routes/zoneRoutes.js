const express = require("express");
const router = express.Router();

const zoneController = require("../controllers/zoneController");


// 🔹 CREATE ZONE
router.post("/", zoneController.createZone);


// 🔹 LIST ZONES (pagination + filters)
router.get("/", zoneController.listZones);


// 🔹 GET ONE ZONE
router.get("/:id", zoneController.getZoneById);


// 🔹 UPDATE ZONE (general info)
router.patch("/:id", zoneController.updateZone);


// 🔹 UPDATE PPE RULES + ROI (incrément configVersion)
router.patch("/:id/rules", zoneController.updateZoneRules);


// 🔹 GET CONFIG (Polling Raspberry)
router.get("/:id/config", zoneController.getZoneConfig);


// 🔹 DELETE ZONE
router.delete("/:id", zoneController.deleteZone);


module.exports = router;
