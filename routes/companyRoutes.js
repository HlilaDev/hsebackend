const express = require("express");
const router = express.Router();

const companyController = require("../controllers/companyController");
const {protect} = require("../middlewares/protect");
const authorizeRoles = require("../middlewares/authorizeRoles");

router.post(
  "/",
  protect,
  authorizeRoles("superAdmin"),
  companyController.createCompany
);

router.get(
  "/",
  protect,
  authorizeRoles("superAdmin"),
  companyController.listCompanies
);

router.get(
  "/:id",
  protect,
  authorizeRoles("superAdmin"),
  companyController.getCompanyById
);

router.put(
  "/:id",
  protect,
  authorizeRoles("superAdmin"),
  companyController.updateCompany
);

router.delete(
  "/:id",
  protect,
  authorizeRoles("superAdmin"),
  companyController.deleteCompany
);

module.exports = router;