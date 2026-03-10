const express = require("express");
const router = express.Router();

const alertController = require("../controllers/alertController");

router.get("/", alertController.listAlerts);
router.get("/:id", alertController.getAlertById);
router.patch("/:id/read", alertController.markAsRead);
router.patch("/:id/acknowledge", alertController.acknowledgeAlert);
router.patch("/:id/resolve", alertController.resolveAlert);
router.delete("/:id", alertController.deleteAlert);

module.exports = router;