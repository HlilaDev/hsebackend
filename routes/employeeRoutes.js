const router = require("express").Router();
const c = require("../controllers/employeeController");

router.post("/", c.createEmployee);
router.get("/", c.listEmployees);
router.get("/:id", c.getEmployeeById);
router.put("/:id", c.updateEmployee);
router.patch("/:id/disable", c.disableEmployee);
router.delete("/:id", c.deleteEmployee);

module.exports = router;
