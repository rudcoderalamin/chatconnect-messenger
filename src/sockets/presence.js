const redisClient = require('../config/redis');

const ONLINE_SET_KEY = 'online_users';

async function markOnline(userId) {
  await redisClient.sadd(ONLINE_SET_KEY, userId);
}

async function markOffline(userId) {
  await redisClient.srem(ONLINE_SET_KEY, userId);
}

async function isOnline(userId) {
  const result = await redisClient.sismember(ONLINE_SET_KEY, userId);
  return result === 1;
}

async function getOnlineUsers() {
  return redisClient.smembers(ONLINE_SET_KEY);
}

module.exports = { markOnline, markOffline, isOnline, getOnlineUsers };
