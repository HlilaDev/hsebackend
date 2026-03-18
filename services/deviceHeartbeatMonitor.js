const Device = require("../models/deviceModel");
const User = require("../models/userModel");
const Notification = require("../models/notificationModel");
const UserNotification = require("../models/UserNotificationModel");
const { getIo } = require("../socket/socket");

const OFFLINE_TIMEOUT_MS = 2 * 60 * 1000; // 2 min

async function createNotificationForUsers({
  company,
  title,
  message,
  type = "device",
  action,
  severity,
  device,
  zone,
  meta = {},
  userIds = [],
}) {
  if (!company || !userIds.length) return null;

  const notification = await Notification.create({
    company,
    title,
    message,
    type,
    action,
    severity,
    device,
    zone,
    meta,
  });

  const rows = userIds.map((userId) => ({
    notification: notification._id,
    user: userId,
    company,
  }));

  await UserNotification.insertMany(rows);

  const fullNotification = await Notification.findById(notification._id)
    .populate("zone", "_id name")
    .populate("device", "_id name deviceId status");

  const io = getIo();
  if (io) {
    for (const userId of userIds) {
      io.to(`user:${userId}`).emit("notification:new", {
        notification: fullNotification,
      });
    }
  }

  return fullNotification;
}

async function getRecipientsForDevice(device) {
  if (!device.company) return [];

  const companyId = device.company?._id || device.company;

  const users = await User.find({
    company: companyId,
    role: { $in: ["admin", "manager"] },
  }).select("_id");

  return users.map((u) => u._id);
}

async function resolveOfflineNotifications(device) {
  await Notification.updateMany(
    {
      device: device._id,
      action: "offline",
      "meta.resolved": { $ne: true },
    },
    {
      $set: {
        "meta.resolved": true,
        "meta.resolvedAt": new Date(),
      },
    }
  );
}

async function markDeviceOnline(deviceId, extraData = {}) {
  const existingDevice = await Device.findOne({ deviceId })
    .populate("zone", "_id name")
    .populate("company", "_id name");

  if (!existingDevice) return null;

  const wasOffline = existingDevice.status === "offline";

  existingDevice.status = extraData.status || "online";
  existingDevice.lastSeen = extraData.lastSeen || new Date();

  if (extraData.ipAddress !== undefined) {
    existingDevice.ipAddress = extraData.ipAddress;
  }

  if (extraData.macAddress !== undefined) {
    existingDevice.macAddress = extraData.macAddress;
  }

  if (extraData.firmware !== undefined) {
    existingDevice.firmware = extraData.firmware;
  }

  if (extraData.uptime !== undefined) {
    existingDevice.uptime = extraData.uptime;
  }

  if (extraData.memoryUsage !== undefined) {
    existingDevice.memoryUsage = extraData.memoryUsage;
  }

  if (extraData.cpuTemp !== undefined) {
    existingDevice.cpuTemp = extraData.cpuTemp;
  }

  if (extraData.networkType !== undefined) {
    existingDevice.networkType = extraData.networkType;
  }

  if (extraData.signal !== undefined) {
    existingDevice.signal = extraData.signal;
  }

  await existingDevice.save();

  if (wasOffline) {
    await resolveOfflineNotifications(existingDevice);

    const userIds = await getRecipientsForDevice(existingDevice);

    await createNotificationForUsers({
      company: existingDevice.company?._id || existingDevice.company,
      title: "Device reconnecté",
      message: `Le device ${existingDevice.name || existingDevice.deviceId} est de nouveau en ligne.`,
      type: "device",
      action: "online",
      severity: "success",
      device: existingDevice._id,
      zone: existingDevice.zone?._id || null,
      userIds,
      meta: {
        deviceId: existingDevice.deviceId,
        reconnectedAt: new Date(),
      },
    });

    const io = getIo();
    if (io) {
      io.emit("device:online", {
        _id: existingDevice._id,
        deviceId: existingDevice.deviceId,
        name: existingDevice.name,
        status: existingDevice.status,
        lastSeen: existingDevice.lastSeen,
        zone: existingDevice.zone,
        ipAddress: existingDevice.ipAddress || "",
        macAddress: existingDevice.macAddress || "",
        firmware: existingDevice.firmware || "",
        uptime: existingDevice.uptime || 0,
        memoryUsage: existingDevice.memoryUsage || 0,
        cpuTemp: existingDevice.cpuTemp || 0,
        networkType: existingDevice.networkType || "",
        signal: existingDevice.signal || 0,
      });
    }
  }

  return existingDevice;
}

async function checkOfflineDevices() {
  try {
    const limitDate = new Date(Date.now() - OFFLINE_TIMEOUT_MS);

    const devices = await Device.find({
      status: "online",
      lastSeen: { $lt: limitDate },
    })
      .populate("zone", "_id name")
      .populate("company", "_id name");

    for (const device of devices) {
      device.status = "offline";
      await device.save();

      const existingNotification = await Notification.findOne({
        company: device.company?._id || device.company,
        device: device._id,
        action: "offline",
        "meta.resolved": { $ne: true },
      });

      if (!existingNotification) {
        const userIds = await getRecipientsForDevice(device);

        await createNotificationForUsers({
          company: device.company?._id || device.company,
          title: "Device hors ligne",
          message: `Le device ${device.name || device.deviceId} dans la zone ${
            device.zone?.name || "N/A"
          } ne répond plus.`,
          type: "device",
          action: "offline",
          severity: "critical",
          device: device._id,
          zone: device.zone?._id || null,
          userIds,
          meta: {
            deviceId: device.deviceId,
            lastSeen: device.lastSeen,
            resolved: false,
          },
        });

        const io = getIo();
        if (io) {
          io.emit("device:offline", {
            _id: device._id,
            deviceId: device.deviceId,
            name: device.name,
            status: "offline",
            lastSeen: device.lastSeen,
            zone: device.zone,
            ipAddress: device.ipAddress || "",
            macAddress: device.macAddress || "",
            firmware: device.firmware || "",
            uptime: device.uptime || 0,
            memoryUsage: device.memoryUsage || 0,
            cpuTemp: device.cpuTemp || 0,
            networkType: device.networkType || "",
            signal: device.signal || 0,
          });
        }
      }
    }
  } catch (error) {
    console.error("❌ checkOfflineDevices error:", error.message);
  }
}

function startDeviceHeartbeatMonitor() {
  setInterval(checkOfflineDevices, 30 * 1000);
}

module.exports = {
  startDeviceHeartbeatMonitor,
  checkOfflineDevices,
  markDeviceOnline,
};