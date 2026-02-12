const router = require("express").Router();
const c = require("../controllers/observationController");

router.post("/", c.createObservation);
router.get("/", c.listObservations);
router.get("/:id", c.getObservationById);
router.patch("/:id", c.updateObservation);
router.post("/:id/images", c.addObservationImage);
router.delete("/:id", c.deleteObservation);

module.exports = router;
