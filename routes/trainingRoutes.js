const router = require("express").Router();
const c = require("../controllers/trainingController");

router.post("/", c.createTraining);
router.get("/", c.listTrainings);
router.get("/:id", c.getTrainingById);
router.put("/:id", c.updateTraining);
router.delete("/:id", c.deleteTraining);

// participants
router.post("/:id/participants", c.addParticipant);
router.patch("/:id/participants/:participantId", c.updateParticipant);
router.delete("/:id/participants/:participantId", c.removeParticipant);

module.exports = router;
