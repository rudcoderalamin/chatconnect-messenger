const Message = require('../models/Message');

/**
 * GET /api/messages/:userId?page=1&limit=30
 * One-to-one chat history between logged-in user and :userId
 */
async function getOneToOneHistory(req, res) {
  try {
    const { userId } = req.params;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 30);
    const me = req.user._id;

    const messages = await Message.find({
      $or: [
        { sender: me, receiver: userId },
        { sender: userId, receiver: me },
      ],
      deletedFor: { $ne: me },
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('replyTo');

    return res.status(200).json({ messages: messages.reverse(), page, limit });
  } catch (err) {
    console.error('[getOneToOneHistory]', err);
    return res.status(500).json({ message: 'Failed to fetch chat history' });
  }
}

/**
 * GET /api/messages/group/:groupId?page=1&limit=30
 */
async function getGroupHistory(req, res) {
  try {
    const { groupId } = req.params;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 30);
    const me = req.user._id;

    const messages = await Message.find({
      group: groupId,
      deletedFor: { $ne: me },
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('replyTo')
      .populate('sender', 'name photo phone');

    return res.status(200).json({ messages: messages.reverse(), page, limit });
  } catch (err) {
    console.error('[getGroupHistory]', err);
    return res.status(500).json({ message: 'Failed to fetch group chat history' });
  }
}

/**
 * PUT /api/messages/:id/delete
 * body: { forEveryone: boolean }
 */
async function deleteMessage(req, res) {
  try {
    const { id } = req.params;
    const { forEveryone } = req.body;
    const me = req.user._id;

    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    if (forEveryone) {
      if (message.sender.toString() !== me.toString()) {
        return res.status(403).json({ message: 'Only the sender can delete for everyone' });
      }
      message.deletedForEveryone = true;
      message.text = '';
      message.mediaUrl = '';
    } else {
      if (!message.deletedFor.includes(me)) {
        message.deletedFor.push(me);
      }
    }

    await message.save();
    return res.status(200).json({ message: 'Message deleted' });
  } catch (err) {
    console.error('[deleteMessage]', err);
    return res.status(500).json({ message: 'Failed to delete message' });
  }
}

/**
 * PUT /api/messages/:id/star
 */
async function toggleStar(req, res) {
  try {
    const { id } = req.params;
    const me = req.user._id;
    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    const idx = message.starredBy.findIndex((u) => u.toString() === me.toString());
    if (idx >= 0) {
      message.starredBy.splice(idx, 1);
    } else {
      message.starredBy.push(me);
    }
    await message.save();
    return res.status(200).json({ starred: idx < 0 });
  } catch (err) {
    console.error('[toggleStar]', err);
    return res.status(500).json({ message: 'Failed to update star' });
  }
}

/**
 * PUT /api/messages/:id/pin
 */
async function togglePin(req, res) {
  try {
    const { id } = req.params;
    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    message.pinned = !message.pinned;
    await message.save();
    return res.status(200).json({ pinned: message.pinned });
  } catch (err) {
    console.error('[togglePin]', err);
    return res.status(500).json({ message: 'Failed to update pin' });
  }
}

/**
 * GET /api/messages/search?query=hello&chatWith=:userId
 */
async function searchMessages(req, res) {
  try {
    const { query, chatWith, groupId } = req.query;
    const me = req.user._id;
    if (!query) return res.status(400).json({ message: 'Search query is required' });

    const filter = {
      text: { $regex: query, $options: 'i' },
      deletedFor: { $ne: me },
    };

    if (chatWith) {
      filter.$or = [
        { sender: me, receiver: chatWith },
        { sender: chatWith, receiver: me },
      ];
    } else if (groupId) {
      filter.group = groupId;
    }

    const results = await Message.find(filter).sort({ createdAt: -1 }).limit(50);
    return res.status(200).json({ results });
  } catch (err) {
    console.error('[searchMessages]', err);
    return res.status(500).json({ message: 'Search failed' });
  }
}

module.exports = {
  getOneToOneHistory,
  getGroupHistory,
  deleteMessage,
  toggleStar,
  togglePin,
  searchMessages,
};
