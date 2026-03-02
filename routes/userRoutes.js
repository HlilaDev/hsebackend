const express = require("express");
const router = express.Router();

const {
  createUser,
  getUsers,
  getUserById,
  updateUser,   // ✅ add
  deleteUser
} = require("../controllers/userController");

// Routes
router.post("/", createUser);
router.get("/", getUsers);
router.get("/:id", getUserById);
router.put("/:id", updateUser);   // ✅ EDIT route
router.delete("/:id", deleteUser);

module.exports = router;