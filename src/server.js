require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');

const app = require('./app');
const connectDB = require('./config/db');
require('./config/redis'); // initializes Redis connection

const socketAuthMiddleware = require('./sockets/socketAuth');
const { initChatSocket } = require('./sockets/chatSocket');

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || '*',
      credentials: true,
    },
  });

  io.use(socketAuthMiddleware);
  initChatSocket(io);

  server.listen(PORT, () => {
    console.log(`[Server] ChatConnect backend running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
