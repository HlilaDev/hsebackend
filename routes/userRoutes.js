const express = require("express");
const router = express.Router();

const {
  createUser,
  getUsers,
  getUserById,
  getTeam,
  updateUser,
  deleteUser,
} = require("../controllers/userController");

const { protect } = require("../middlewares/protect");

// IMPORTANT:
// mettre /team AVANT /:id
// sinon "team" sera capturé comme un id
router.get("/team", protect, getTeam);

router.get("/", protect, getUsers);
router.get("/:id", protect, getUserById);

router.post("/", protect, createUser);
router.put("/:id", protect, updateUser);
router.delete("/:id", protect, deleteUser);

module.exports = router;