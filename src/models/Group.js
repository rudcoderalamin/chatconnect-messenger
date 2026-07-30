const mongoose = require('mongoose');

const groupMemberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    muted: { type: Boolean, default: false },
  },
  { _id: false }
);

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    photo: { type: String, default: '' },
    description: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [groupMemberSchema],
  },
  { timestamps: true }
);

groupSchema.methods.isAdmin = function (userId) {
  const m = this.members.find((mem) => mem.user.toString() === userId.toString());
  return !!m && m.role === 'admin';
};

module.exports = mongoose.model('Group', groupSchema);
