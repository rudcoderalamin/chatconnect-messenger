const Message = require('../models/Message');
const User = require('../models/User');
const Call = require('../models/Call');
const { markOnline, markOffline } = require('./presence');

/**
 * Maps a userId to the set of socket ids currently connected for that user
 * (a user can have multiple devices/tabs open at once).
 */
const userSockets = new Map();

function addUserSocket(userId, socketId) {
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId).add(socketId);
}

function removeUserSocket(userId, socketId) {
  const set = userSockets.get(userId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) userSockets.delete(userId);
}

function isUserConnected(userId) {
  return userSockets.has(userId);
}

function initChatSocket(io) {
  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`[Socket] Connected: user=${userId} socket=${socket.id}`);

    // Join a personal room so we can emit to this user from anywhere (e.g. REST controllers)
    socket.join(`user:${userId}`);
    addUserSocket(userId, socket.id);

    await markOnline(userId);
    await User.findByIdAndUpdate(userId, { online: true });
    socket.broadcast.emit('presence:update', { userId, online: true });

    // ---------- Messaging ----------

    socket.on('message:send', async (payload, ack) => {
      try {
        const {
          receiverId,
          groupId,
          messageType = 'text',
          text,
          mediaUrl,
          mediaMeta,
          location,
          sharedContact,
          replyTo,
        } = payload;

        const message = await Message.create({
          sender: userId,
          receiver: receiverId || undefined,
          group: groupId || undefined,
          messageType,
          text,
          mediaUrl,
          mediaMeta,
          location,
          sharedContact,
          replyTo: replyTo || null,
          status: 'sent',
        });

        const populated = await message.populate('replyTo');

        if (receiverId) {
          io.to(`user:${receiverId}`).emit('message:new', populated);
          if (isUserConnected(receiverId)) {
            message.status = 'delivered';
            message.deliveredTo.push(receiverId);
            await message.save();
            io.to(`user:${userId}`).emit('message:status', {
              messageId: message._id,
              status: 'delivered',
            });
          }
        } else if (groupId) {
          io.to(`group:${groupId}`).emit('message:new', populated);
        }

        if (ack) ack({ success: true, message: populated });
      } catch (err) {
        console.error('[socket message:send]', err);
        if (ack) ack({ success: false, error: 'Failed to send message' });
      }
    });

    socket.on('message:read', async ({ messageIds, chatWith }) => {
      try {
        await Message.updateMany(
          { _id: { $in: messageIds } },
          { $set: { status: 'read' }, $addToSet: { readBy: userId } }
        );
        if (chatWith) {
          io.to(`user:${chatWith}`).emit('message:status', {
            messageIds,
            status: 'read',
            readBy: userId,
          });
        }
      } catch (err) {
        console.error('[socket message:read]', err);
      }
    });

    // ---------- Typing / Recording indicators ----------

    socket.on('typing:start', ({ chatWith, groupId }) => {
      const target = groupId ? `group:${groupId}` : `user:${chatWith}`;
      socket.to(target).emit('typing:start', { userId, groupId });
    });

    socket.on('typing:stop', ({ chatWith, groupId }) => {
      const target = groupId ? `group:${groupId}` : `user:${chatWith}`;
      socket.to(target).emit('typing:stop', { userId, groupId });
    });

    socket.on('recording:start', ({ chatWith, groupId }) => {
      const target = groupId ? `group:${groupId}` : `user:${chatWith}`;
      socket.to(target).emit('recording:start', { userId, groupId });
    });

    socket.on('recording:stop', ({ chatWith, groupId }) => {
      const target = groupId ? `group:${groupId}` : `user:${chatWith}`;
      socket.to(target).emit('recording:stop', { userId, groupId });
    });

    // ---------- Group rooms ----------

    socket.on('group:join', (groupId) => socket.join(`group:${groupId}`));
    socket.on('group:leave', (groupId) => socket.leave(`group:${groupId}`));

    // ---------- Voice / Video calling (WebRTC signaling) ----------

    socket.on('call:invite', async ({ receiverId, callType, offer }) => {
      const call = await Call.create({
        caller: userId,
        receiver: receiverId,
        type: callType,
        status: 'ringing',
        startedAt: new Date(),
      });
      io.to(`user:${receiverId}`).emit('call:incoming', {
        callId: call._id,
        callerId: userId,
        callType,
        offer,
      });
    });

    socket.on('call:accept', async ({ callId, answer }) => {
      const call = await Call.findByIdAndUpdate(callId, { status: 'accepted' }, { new: true });
      if (call) {
        io.to(`user:${call.caller}`).emit('call:accepted', { callId, answer });
      }
    });

    socket.on('call:reject', async ({ callId }) => {
      const call = await Call.findByIdAndUpdate(callId, { status: 'rejected' }, { new: true });
      if (call) {
        io.to(`user:${call.caller}`).emit('call:rejected', { callId });
      }
    });

    socket.on('call:ice-candidate', ({ targetUserId, candidate }) => {
      io.to(`user:${targetUserId}`).emit('call:ice-candidate', { candidate, fromUserId: userId });
    });

    socket.on('call:end', async ({ callId, duration }) => {
      const call = await Call.findByIdAndUpdate(
        callId,
        { status: 'ended', duration, endedAt: new Date() },
        { new: true }
      );
      if (call) {
        const otherParty = call.caller.toString() === userId ? call.receiver : call.caller;
        io.to(`user:${otherParty}`).emit('call:ended', { callId, duration });
      }
    });

    // ---------- Disconnect ----------

    socket.on('disconnect', async () => {
      console.log(`[Socket] Disconnected: user=${userId} socket=${socket.id}`);
      removeUserSocket(userId, socket.id);

      // Only mark offline if this was the user's last connected socket
      if (!isUserConnected(userId)) {
        await markOffline(userId);
        await User.findByIdAndUpdate(userId, { online: false, lastSeen: new Date() });
        socket.broadcast.emit('presence:update', { userId, online: false, lastSeen: new Date() });
      }
    });
  });
}

module.exports = { initChatSocket };
