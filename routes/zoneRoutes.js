const express = require("express");
const router = express.Router();

const {
  createZone,
  getZones,
  getZoneById,
  updateZone,
  deleteZone
} = require("../controllers/zoneController");

router.post("/", createZone);
router.get("/", getZones);
router.get("/:id", getZoneById);
router.put("/:id", updateZone);
router.delete("/:id", deleteZone);

module.exports = router;
