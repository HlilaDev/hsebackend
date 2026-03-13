const router = require("express").Router();
const c = require("../controllers/trainingController");
const {protect}  = require("../middlewares/protect");
const authorizeRoles = require("../middlewares/authorizeRoles");

// lecture
router.get(
  "/",
  protect,
  authorizeRoles("admin", "manager", "agent"),
  c.listTrainings
);

router.get(
  "/:id",
  protect,
  authorizeRoles("admin", "manager", "agent"),
  c.getTrainingById
);

// manager/admin seulement
router.post(
  "/",
  protect,
  authorizeRoles("admin", "manager"),
  c.createTraining
);

router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "manager"),
  c.updateTraining
);

router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "manager"),
  c.deleteTraining
);

// participants
router.post(
  "/:id/participants",
  protect,
  authorizeRoles("admin", "manager"),
  c.addParticipant
);

router.patch(
  "/:id/participants/:participantId",
  protect,
  authorizeRoles("admin", "manager"),
  c.updateParticipant
);

router.delete(
  "/:id/participants/:participantId",
  protect,
  authorizeRoles("admin", "manager"),
  c.removeParticipant
);

module.exports = router;