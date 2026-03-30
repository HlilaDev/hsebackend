const express = require("express");
const router = express.Router();

const {
  getPpeAlerts,
  getPpeAlertById,
  updatePpeAlertStatus,
  deletePpeAlert,
  getPpeAlertStats,
  uploadPpeAlertSnapshot,
} = require("../controllers/ppeAlertController");

const { ppeSnapshotUpload } = require("../middlewares/upload");

router.get("/", getPpeAlerts);
router.get("/stats", getPpeAlertStats);
router.get("/:id", getPpeAlertById);
router.patch("/:id/status", updatePpeAlertStatus);
router.delete("/:id", deletePpeAlert);

router.post(
  "/upload-snapshot",
  ppeSnapshotUpload.single("snapshot"),
  uploadPpeAlertSnapshot
);

module.exports = router;