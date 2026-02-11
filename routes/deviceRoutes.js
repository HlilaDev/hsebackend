const express = require("express");
const router = express.Router();

const {
  createDevice,
  getDevices,
  getDeviceById,
  getDeviceByDeviceId,
  updateDevice,
  deleteDevice
} = require("../controllers/deviceController");

router.post("/", createDevice);
router.get("/", getDevices);

router.get("/by-device-id/:deviceId", getDeviceByDeviceId);
router.get("/:id", getDeviceById);

router.put("/:id", updateDevice);
router.delete("/:id", deleteDevice);

module.exports = router;
