const router = require("express").Router();
const c = require("../controllers/observationController");
const { protect } = require("../middlewares/protect");

router.post("/", protect, c.createObservation);
router.get("/", protect, c.listObservations);
router.get("/:id", protect, c.getObservationById);
router.patch("/:id", protect, c.updateObservation);
router.post("/:id/images", protect, c.addObservationImage);
router.delete("/:id", protect, c.deleteObservation);
router.get("/agent/:agentId/count", protect, c.getObservationsCountByAgent);

module.exports = router;