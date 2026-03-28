const express = require("express");
const router = express.Router();

const {
  createChecklistTemplate,
  getChecklistTemplates,
  getChecklistTemplateById,
  updateChecklistTemplate,
  deleteChecklistTemplate,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
} = require("../controllers/checklist/checklistTemplateController");

const {
  startChecklistExecution,
  getChecklistExecutions,
  getChecklistExecutionById,
  saveChecklistResponse,
  completeChecklistExecution,
  updateChecklistExecution,
} = require("../controllers/checklist/checklistExecutionController");

const { protect } = require("../middlewares/authMiddleware");

// Templates
router.post("/templates", protect, createChecklistTemplate);
router.get("/templates", protect, getChecklistTemplates);
router.get("/templates/:id", protect, getChecklistTemplateById);
router.put("/templates/:id", protect, updateChecklistTemplate);
router.delete("/templates/:id", protect, deleteChecklistTemplate);

router.post("/templates/:id/items", protect, addChecklistItem);
router.put("/items/:itemId", protect, updateChecklistItem);
router.delete("/items/:itemId", protect, deleteChecklistItem);

// Executions
router.post("/executions", protect, startChecklistExecution);
router.get("/executions", protect, getChecklistExecutions);
router.get("/executions/:id", protect, getChecklistExecutionById);
router.put("/executions/:id", protect, updateChecklistExecution);
router.post("/executions/:executionId/responses", protect, saveChecklistResponse);
router.put("/executions/:id/complete", protect, completeChecklistExecution);

module.exports = router;