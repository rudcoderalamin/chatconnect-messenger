const mongoose = require('mongoose');

const callSchema = new mongoose.Schema(
  {
    caller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['voice', 'video'], required: true },
    status: {
      type: String,
      enum: ['ringing', 'accepted', 'rejected', 'missed', 'ended'],
      default: 'ringing',
    },
    duration: { type: Number, default: 0 }, // seconds
    startedAt: { type: Date },
    endedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Call', callSchema);
