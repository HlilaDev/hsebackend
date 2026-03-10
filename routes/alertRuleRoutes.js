const express = require("express");
const router = express.Router();

const alertRuleController = require("../controllers/alertRuleController");

router.post("/", alertRuleController.createAlertRule);
router.get("/", alertRuleController.listAlertRules);
router.get("/:id", alertRuleController.getAlertRuleById);
router.put("/:id", alertRuleController.updateAlertRule);
router.patch("/:id/toggle", alertRuleController.toggleAlertRule);
router.delete("/:id", alertRuleController.deleteAlertRule);

module.exports = router;