const router = require("express").Router();
const c = require("../controllers/sensorDataController");

router.post("/", c.createSensorData);
router.get("/", c.getSensorData);
router.get("/latest", c.getLatestSensorData);
router.get("/stats", c.getSensorDataStats);

module.exports = router;