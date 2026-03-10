const express = require("express");
const router = express.Router();
const readingController = require("../controllers/readingController");

router.get("/", readingController.getReadings);
router.get("/latest/device/:deviceId", readingController.getLatestReadingByDevice);
router.get("/history/device/:deviceId", readingController.getHistoryByDevice);
router.get("/latest/zone/:zoneId", readingController.getLatestReadingsByZone);

module.exports = router;