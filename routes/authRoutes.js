const express = require("express");
const router = express.Router();

const {
  register,
  login,
  logout,
  me,
} = require("../controllers/authController");

const { protect } = require("../middlewares/authMiddleware");

// Auth routes
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

// Protected route
router.get("/me", protect, me);

module.exports = router;