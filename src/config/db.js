const mongoose = require('mongoose');
const dns = require('dns');

// Force reliable public DNS resolvers. Some ISPs/routers fail to resolve
// MongoDB's special SRV DNS records (used in mongodb+srv:// URLs) even
// though normal websites work fine. Setting this explicitly fixes that
// without needing to change Windows/router network settings.
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[DB] MongoDB connected');
  } catch (err) {
    console.error('[DB] Connection error:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;