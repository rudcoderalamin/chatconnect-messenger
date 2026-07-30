const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // One-to-one OR group — exactly one of these is set
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', index: true },

    messageType: {
      type: String,
      enum: [
        'text', 'image', 'video', 'audio', 'document',
        'location', 'contact', 'voice_note', 'sticker', 'gif',
      ],
      default: 'text',
    },

    text: { type: String },
    mediaUrl: { type: String },
    mediaMeta: {
      fileName: String,
      fileSize: Number,
      duration: Number, // for audio/video/voice notes
      width: Number,
      height: Number,
    },
    location: {
      lat: Number,
      lng: Number,
    },
    sharedContact: {
      name: String,
      phone: String,
    },

    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    forwarded: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent',
    },
    deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // "delete for me"
    deletedForEveryone: { type: Boolean, default: false },

    pinned: { type: Boolean, default: false },
    starredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ group: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
