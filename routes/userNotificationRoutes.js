const express = require('express');
const router = express.Router();

const {
  getMyNotifications,
  getMyUnreadCount,
  markMyNotificationAsRead,
  markAllMyNotificationsAsRead,
  deleteMyNotification,
} = require('../controllers/UserNotificationController');

const { protect } = require('../middlewares/authMiddleware');

router.get('/', protect, getMyNotifications);
router.get('/unread-count', protect, getMyUnreadCount);
router.patch('/:id/read', protect, markMyNotificationAsRead);
router.patch('/read-all', protect, markAllMyNotificationsAsRead);
router.patch('/:id/delete', protect, deleteMyNotification);

module.exports = router;
