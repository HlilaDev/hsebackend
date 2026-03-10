const Company = require("../models/companyModel");
const Zone = require("../models/zoneModel");


// ===============================
// ✅ CREATE COMPANY
// ===============================
exports.createCompany = async (req, res) => {
  try {
    const { name, industry, address, contacts, logoUrl, isActive } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Company name is required" });
    }

    const exists = await Company.findOne({ name: name.trim() });
    if (exists) {
      return res.status(400).json({ message: "Company already exists" });
    }

    const company = await Company.create({
      name: name.trim(),
      industry,
      address,
      contacts,
      logoUrl,
      isActive,
    });

    res.status(201).json(company);
  } catch (error) {
    res.status(500).json({
      message: "Create company failed",
      error: error.message,
    });
  }
};


// ===============================
// ✅ LIST COMPANIES
// ===============================
exports.listCompanies = async (req, res) => {
  try {
    const { page = 1, limit = 20, q, isActive } = req.query;

    const filter = {};

    if (q) {
      filter.name = { $regex: q, $options: "i" };
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [companies, total] = await Promise.all([
      Company.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),

      Company.countDocuments(filter),
    ]);

    res.json({
      items: companies,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    res.status(500).json({
      message: "List companies failed",
      error: error.message,
    });
  }
};


// ===============================
// ✅ GET COMPANY BY ID
// ===============================
exports.getCompanyById = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.json(company);
  } catch (error) {
    res.status(500).json({
      message: "Get company failed",
      error: error.message,
    });
  }
};


// ===============================
// ✅ UPDATE COMPANY
// ===============================
exports.updateCompany = async (req, res) => {
  try {
    if (req.body.name) {
      const exists = await Company.findOne({
        name: req.body.name.trim(),
        _id: { $ne: req.params.id },
      });

      if (exists) {
        return res.status(400).json({
          message: "Company name already used",
        });
      }
    }

    const company = await Company.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.json(company);
  } catch (error) {
    res.status(500).json({
      message: "Update company failed",
      error: error.message,
    });
  }
};


// ===============================
// ✅ DELETE COMPANY
// ===============================
exports.deleteCompany = async (req, res) => {
  try {
    // 🔒 empêcher suppression si des zones existent
    const zonesCount = await Zone.countDocuments({
      company: req.params.id,
    });

    if (zonesCount > 0) {
      return res.status(400).json({
        message: "Cannot delete company: zones exist",
        zonesCount,
      });
    }

    const company = await Company.findByIdAndDelete(req.params.id);

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.json({ message: "Company deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Delete company failed",
      error: error.message,
    });
  }
};