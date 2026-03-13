const UserNotification = require('../models/UserNotificationModel');

exports.getMyNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const company = req.user.company;

    const notifications = await UserNotification.find({
      user: userId,
      company,
      isDeleted: false,
    })
      .populate({
        path: 'notification',
        populate: [
          { path: 'zone', select: '_id name' },
          { path: 'device', select: '_id name deviceId status' },
          { path: 'rule', select: '_id name metric operator threshold severity' },
          { path: 'actor', select: '_id firstName lastName email' },
        ],
      })
      .sort({ createdAt: -1 });

    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch user notifications',
      error: error.message,
    });
  }
};

exports.getMyUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const company = req.user.company;

    const count = await UserNotification.countDocuments({
      user: userId,
      company,
      isDeleted: false,
      isRead: false,
    });

    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch unread count',
      error: error.message,
    });
  }
};

exports.markMyNotificationAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const company = req.user.company;
    const { id } = req.params;

    const item = await UserNotification.findOneAndUpdate(
      {
        _id: id,
        user: userId,
        company,
        isDeleted: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
      { new: true }
    ).populate({
      path: 'notification',
      populate: [
        { path: 'zone', select: '_id name' },
        { path: 'device', select: '_id name deviceId status' },
        { path: 'rule', select: '_id name metric operator threshold severity' },
        { path: 'actor', select: '_id firstName lastName email' },
      ],
    });

    if (!item) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to mark notification as read',
      error: error.message,
    });
  }
};

exports.markAllMyNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const company = req.user.company;

    await UserNotification.updateMany(
      {
        user: userId,
        company,
        isDeleted: false,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    res.status(200).json({
      message: 'All notifications marked as read',
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to mark all notifications as read',
      error: error.message,
    });
  }
};

exports.deleteMyNotification = async (req, res) => {
  try {
    const userId = req.user._id;
    const company = req.user.company;
    const { id } = req.params;

    const item = await UserNotification.findOneAndUpdate(
      {
        _id: id,
        user: userId,
        company,
        isDeleted: false,
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json({
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to delete notification',
      error: error.message,
    });
  }
};
