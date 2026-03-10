const Notification = require('../models/notificationModel');

exports.getNotifications = async (req, res) => {
  try {
    const company = req.user.company;

    const notifications = await Notification.find({ company })
      .populate('zone', '_id name')
      .populate('device', '_id name deviceId status')
      .populate('rule', '_id name metric operator threshold severity')
      .sort({ createdAt: -1 });

    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch notifications',
      error: error.message,
    });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const company = req.user.company;

    const count = await Notification.countDocuments({
      company,
      read: false,
    });

    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch unread count',
      error: error.message,
    });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const company = req.user.company;
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, company },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json(notification);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to mark notification as read',
      error: error.message,
    });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const company = req.user.company;

    await Notification.updateMany(
      { company, read: false },
      { $set: { read: true } }
    );

    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to mark all notifications as read',
      error: error.message,
    });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const company = req.user.company;
    const { id } = req.params;

    const deleted = await Notification.findOneAndDelete({
      _id: id,
      company,
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to delete notification',
      error: error.message,
    });
  }
};