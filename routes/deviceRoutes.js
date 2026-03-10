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
  getDevicesByZone
} = require("../controllers/deviceController");

router.post("/", createDevice);  //api post device localhost:3000/devices/ methode / url 
router.get("/", getDevices);  //api get device localhost:3000/devices/ methode / url 

router.get("/by-device-id/:deviceId", getDeviceByDeviceId); 
router.post("/:id/restart", restartDevice);
router.get('/:id/sensors', getDeviceSensors);
router.get("/:id", getDeviceById); // get localhost:300/devices/123


router.put("/:id", updateDevice);
router.delete("/:id", deleteDevice);



module.exports = router;
