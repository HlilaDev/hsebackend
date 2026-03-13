const express = require("express");
const router = express.Router();

const {
  createDevice,
  getDevices,
  getDeviceById,
  getDeviceByDeviceId,
  updateDevice,
  deleteDevice,
  getDeviceSensors,
  restartDevice,
  getDevicesByZone,
} = require("../controllers/deviceController");

const { protect } = require("../middlewares/authMiddleware");

router.post("/", protect, createDevice);
router.get("/", protect, getDevices);

router.get("/by-device-id/:deviceId", protect, getDeviceByDeviceId);
router.post("/:id/restart", protect, restartDevice);
router.get("/:id/sensors", protect, getDeviceSensors);

router.get("/:id", protect, getDeviceById);
router.put("/:id", protect, updateDevice);
router.delete("/:id", protect, deleteDevice);

module.exports = router;