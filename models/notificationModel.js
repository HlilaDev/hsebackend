const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
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

    // type principal de notification
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

    // action métier plus précise
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

    isRead: {
      type: Boolean,
      default: false,
    },

    // destinataire si notification ciblée
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },



    // utilisateur qui a généré l'action
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // références métier possibles
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

    // données supplémentaires flexibles
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);