const express = require('express');
const router = express.Router();

const {
  createNotificationForUsers,
  getCompanyNotifications,
  getNotificationById,
  deleteNotificationGlobal,
} = require('../controllers/notificationController');

const { protect } = require('../middlewares/authMiddleware');

router.post('/dispatch', protect, createNotificationForUsers);
router.get('/', protect, getCompanyNotifications);
router.get('/:id', protect, getNotificationById);
router.delete('/:id', protect, deleteNotificationGlobal);

module.exports = router;
