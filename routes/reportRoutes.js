// routes/reportRoutes.js
const router = require("express").Router();
const c = require("../controllers/reportController");

router.post("/", c.createReport);
router.get("/", c.listReports);
router.get("/:id", c.getReportById);
router.patch("/:id", c.updateReport);
router.patch("/:id/metrics", c.updateReportMetrics);
router.delete("/:id", c.deleteReport);

module.exports = router;
