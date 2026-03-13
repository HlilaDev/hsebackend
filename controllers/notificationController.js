const Notification = require('../models/notificationModel');
const UserNotification = require('../models/UserNotificationModel');

exports.createNotificationForUsers = async (req, res) => {
  try {
    const company = req.user.company;
    const actor = req.user._id;

    const {
      title,
      message,
      type,
      action,
      severity,
      alert,
      report,
      observation,
      incident,
      audit,
      training,
      zone,
      device,
      rule,
      meta,
      userIds,
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        message: 'title and message are required',
      });
    }

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        message: 'userIds must be a non-empty array',
      });
    }

    const notification = await Notification.create({
      company,
      title,
      message,
      type,
      action,
      severity,
      actor,
      alert: alert || null,
      report: report || null,
      observation: observation || null,
      incident: incident || null,
      audit: audit || null,
      training: training || null,
      zone: zone || null,
      device: device || null,
      rule: rule || null,
      meta: meta || {},
    });

    const rows = userIds.map((userId) => ({
      notification: notification._id,
      user: userId,
      company,
    }));

    await UserNotification.insertMany(rows);

    const created = await Notification.findById(notification._id)
      .populate('zone', '_id name')
      .populate('device', '_id name deviceId status')
      .populate('rule', '_id name metric operator threshold severity')
      .populate('actor', '_id firstName lastName email');

    res.status(201).json({
      message: 'Notification dispatched successfully',
      notification: created,
      recipients: userIds.length,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to dispatch notification',
      error: error.message,
    });
  }
};

exports.getCompanyNotifications = async (req, res) => {
  try {
    const company = req.user.company;

    const notifications = await Notification.find({ company })
      .populate('zone', '_id name')
      .populate('device', '_id name deviceId status')
      .populate('rule', '_id name metric operator threshold severity')
      .populate('actor', '_id firstName lastName email')
      .sort({ createdAt: -1 });

    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch company notifications',
      error: error.message,
    });
  }
};

exports.getNotificationById = async (req, res) => {
  try {
    const company = req.user.company;
    const { id } = req.params;

    const notification = await Notification.findOne({
      _id: id,
      company,
    })
      .populate('zone', '_id name')
      .populate('device', '_id name deviceId status')
      .populate('rule', '_id name metric operator threshold severity')
      .populate('actor', '_id firstName lastName email');

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json(notification);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch notification',
      error: error.message,
    });
  }
};

exports.deleteNotificationGlobal = async (req, res) => {
  try {
    const company = req.user.company;
    const { id } = req.params;

    const notification = await Notification.findOne({
      _id: id,
      company,
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await UserNotification.deleteMany({ notification: notification._id });
    await Notification.deleteOne({ _id: notification._id });

    res.status(200).json({
      message: 'Notification deleted globally',
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to delete notification globally',
      error: error.message,
    });
  }
};
