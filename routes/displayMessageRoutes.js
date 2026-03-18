const express = require("express");
const router = express.Router();

const {
  createDisplayMessage,
  getDisplayMessages,
  getDisplayMessageById,
  updateDisplayMessage,
  deleteDisplayMessage,
  publishDisplayMessage,
  cancelDisplayMessage,
} = require("../controllers/displayMessageController");

const { protect } = require("../middlewares/protect");
const authorizeRoles = require("../middlewares/authorizeRoles");

router.get("/", protect, getDisplayMessages);
router.get("/:id", protect, getDisplayMessageById);

router.post("/", protect, authorizeRoles("manager", "supervisor"), createDisplayMessage);
router.put("/:id", protect, authorizeRoles("manager", "supervisor"), updateDisplayMessage);
router.delete("/:id", protect, authorizeRoles("manager", "supervisor"), deleteDisplayMessage);

router.patch("/:id/publish", protect, authorizeRoles("manager", "supervisor"), publishDisplayMessage);
router.patch("/:id/cancel", protect, authorizeRoles("manager", "supervisor"), cancelDisplayMessage);

module.exports = router;