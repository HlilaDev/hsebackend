const express = require("express");
const router = express.Router();

const {
  createCompany,
  listCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
} = require("../controllers/companyController");

// CREATE
router.post("/", createCompany);

// LIST
router.get("/", listCompanies);

// GET BY ID
router.get("/:id", getCompanyById);

// UPDATE
router.put("/:id", updateCompany);

// DELETE
router.delete("/:id", deleteCompany);

module.exports = router;