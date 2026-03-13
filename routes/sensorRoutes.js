const router = require("express").Router();
const c = require("../controllers/sensorController");
const { protect } = require("../middlewares/authMiddleware");


router.post("/",protect, c.createSensor);
router.get("/",protect, c.getSensors);
router.get("/:id",protect, c.getSensorById);
router.put("/:id",protect, c.updateSensor);
router.patch("/:id/status",protect, c.updateSensorStatus);
router.delete("/:id",protect, c.deleteSensor);

module.exports = router;