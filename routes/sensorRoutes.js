const router = require("express").Router();
const c = require("../controllers/sensorController");

router.post("/", c.createSensor);
router.get("/", c.getSensors);
router.get("/:id", c.getSensorById);
router.put("/:id", c.updateSensor);
router.patch("/:id/status", c.updateSensorStatus);
router.delete("/:id", c.deleteSensor);

module.exports = router;