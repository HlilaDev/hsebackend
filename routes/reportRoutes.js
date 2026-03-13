const router = require("express").Router();
const c = require("../controllers/reportController");
const {protect} = require("../middlewares/protect");
const authorizeRoles = require("../middlewares/authorizeRoles");
const uploadReportPdf = require("../middlewares/uploadReportPdf");



router.post(
  "/",
  protect,
  authorizeRoles("admin", "manager"),
  uploadReportPdf.single("pdf"),
  c.createReport
);

router.get(
  "/",
  protect,
  authorizeRoles("admin", "manager", "agent"),
  c.listReports
);

router.get(
  "/:id",
  protect,
  authorizeRoles("admin", "manager", "agent"),
  c.getReportById
);

router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "manager"),
  uploadReportPdf.single("pdf"),
  c.updateReport
);

router.put(
  "/:id/metrics",
  protect,
  authorizeRoles("admin", "manager"),
  c.updateReportMetrics
);

router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "manager"),
  c.deleteReport
);

module.exports = router;