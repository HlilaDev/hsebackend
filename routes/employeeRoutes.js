const router = require("express").Router();
const c = require("../controllers/employeeController");

router.post("/", c.createEmployee);
router.get("/", c.listEmployees);
router.get("/:id", c.getEmployeeById);
router.put("/:id", c.updateEmployee);
router.patch("/:id/disable", c.disableEmployee);
router.delete("/:id", c.deleteEmployee);
//to add to api
router.get("/by-zone/:zoneId", c.getEmployeesByZone);
module.exports = router;
