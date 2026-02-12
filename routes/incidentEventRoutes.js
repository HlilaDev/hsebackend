const router = require("express").Router();
const c = require("../controllers/incidentEventController");

router.post("/", c.createIncidentEvent);
router.get("/", c.listIncidentEvents);
router.get("/:id", c.getIncidentEventById);
router.patch("/:id", c.updateIncidentEvent);
router.patch("/:id/resolve", c.resolveIncidentEvent);
router.delete("/:id", c.deleteIncidentEvent);

module.exports = router;
