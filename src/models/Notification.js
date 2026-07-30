const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    type: {
      type: String,
      enum: ['message', 'call', 'group', 'system'],
      default: 'system',
    },
    isRead: { type: Boolean, default: false },
    data: { type: mongoose.Schema.Types.Mixed }, // extra payload (chatId, callId, etc.)
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
