const router = require("express").Router();
const c = require("../controllers/trainingController");
const {protect}  = require("../middlewares/protect");
const authorizeRoles = require("../middlewares/authorizeRoles");

// lecture
router.get(
  "/",
  protect,
  authorizeRoles("supervisor", "manager", "agent"),
  c.listTrainings
);

router.get(
  "/:id",
  protect,
  authorizeRoles("supervisor", "manager", "agent"),
  c.getTrainingById
);

// manager/admin seulement
router.post(
  "/",
  protect,
  authorizeRoles( "manager"),
  c.createTraining
);

router.put(
  "/:id",
  protect,
  authorizeRoles( "manager", "agent"),
  c.updateTraining
);

router.delete(
  "/:id",
  protect,
  authorizeRoles( "manager"),
  c.deleteTraining
);

// participants
router.post(
  "/:id/participants",
  protect,
  authorizeRoles( "manager", "agent"),
  c.addParticipant
);

router.patch(
  "/:id/participants/:participantId",
  protect,
  authorizeRoles( "manager", "agent"),
  c.updateParticipant
);

router.delete(
  "/:id/participants/:participantId",
  protect,
  authorizeRoles( "manager"),
  c.removeParticipant
);

module.exports = router;