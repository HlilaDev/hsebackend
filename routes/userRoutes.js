const express = require("express");
const router = express.Router();

const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require("../controllers/userController");

const {protect} = require("../middlewares/protect");
const authorizeRoles = require("../middlewares/authorizeRoles");

// Routes
router.post("/", protect,   authorizeRoles("superAdmin", "admin"), createUser);
router.get("/", protect,   authorizeRoles("superAdmin", "admin"), getUsers);
router.get("/:id", protect,   authorizeRoles("superAdmin", "admin"), getUserById);
router.put("/:id", protect,   authorizeRoles("superAdmin", "admin"), updateUser);
router.delete("/:id", protect,   authorizeRoles("superAdmin", "admin"), deleteUser);

module.exports = router;