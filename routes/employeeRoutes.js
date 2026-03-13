const router = require("express").Router();
const c = require("../controllers/employeeController");
const { protect } = require("../middlewares/authMiddleware");

router.post("/", protect, c.createEmployee);
router.get("/", protect, c.listEmployees);
router.get("/by-zone/:zoneId", protect, c.getEmployeesByZone);
router.get("/:id", protect, c.getEmployeeById);
router.put("/:id", protect, c.updateEmployee);
router.patch("/:id/disable", protect, c.disableEmployee);
router.delete("/:id", protect, c.deleteEmployee);

module.exports = router;