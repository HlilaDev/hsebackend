const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: [
        'alert',
        'report',
        'observation',
        'incident',
        'audit',
        'training',
        'device',
        'system',
      ],
      default: 'alert',
    },

    action: {
      type: String,
      default: 'created',
      trim: true,
    },

    severity: {
      type: String,
      enum: ['info', 'success', 'warning', 'critical'],
      default: 'info',
    },

    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    alert: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Alert',
      default: null,
    },

    report: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report',
      default: null,
    },

    observation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Observation',
      default: null,
    },

    incident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      default: null,
    },

    audit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Audit',
      default: null,
    },

    training: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Training',
      default: null,
    },

    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zone',
      default: null,
    },

    device: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      default: null,
    },

    rule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AlertRule',
      default: null,
    },

    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
