const express = require("express");
const router = express.Router();

const auditController = require("../controllers/auditController");

// Create audit
router.post("/", auditController.createAudit);

// List audits
router.get("/", auditController.listAudits);

// Get one audit by id
router.get("/:id", auditController.getAuditById);

// Update audit
router.put("/:id", auditController.updateAudit);

// Delete audit
router.delete("/:id", auditController.deleteAudit);

// Findings
router.post("/:id/findings", auditController.addFinding);
router.put("/:id/findings/:findingId", auditController.updateFinding);
router.delete("/:id/findings/:findingId", auditController.removeFinding);

module.exports = router;