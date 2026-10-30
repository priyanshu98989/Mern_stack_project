const mongoose = require('mongoose');
const env = require('./env');
const logger = require('./logger');

let connected = false;
let replicaSet = false;

async function connectDB(uri = env.MONGODB_URI) {
  if (mongoose.connection.readyState === 1) {
    connected = true;
    return mongoose.connection;
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: env.MONGO_MAX_POOL,
    autoIndex: !env.isProd,
  });
  connected = true;
  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    replicaSet = Boolean(hello.setName);
  } catch (e) {
    replicaSet = false;
  }
  logger.info({ replicaSet }, '[db] connected');
  if (!replicaSet) {
    logger.warn(
      '[db] MongoDB is standalone: transactions are unavailable. Using idempotent compensating writes.'
    );
  }
  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.disconnect();
  connected = false;
}

function isConnected() {
  return connected && mongoose.connection.readyState === 1;
}

function hasTransactions() {
  return replicaSet;
}

module.exports = { connectDB, disconnectDB, isConnected, hasTransactions };
