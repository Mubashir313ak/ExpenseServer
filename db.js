'use strict';

const mongoose = require('mongoose');
const { config } = require('./config');

/**
 * Connection caching for AWS Lambda.
 *
 * Lambda freezes and reuses the execution context between invocations. If we
 * open a new MongoDB connection on every request we quickly exhaust the
 * connection pool of the cluster and add latency to every call. Instead we
 * cache the connection promise on the module scope (which survives across warm
 * invocations) and reuse it.
 *
 * We store the *promise* (not just the connection) so that concurrent calls
 * during a cold start all await the same in-flight connection attempt rather
 * than racing to create several connections.
 */
let cached = global.__mongooseCache;
if (!cached) {
  cached = global.__mongooseCache = { conn: null, promise: null };
}

// Fail fast on the first bad query rather than buffering forever.
mongoose.set('bufferCommands', false);
mongoose.set('strictQuery', true);

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      // Keep the pool small: many concurrent Lambda containers each hold their
      // own pool, so a large per-container pool can overwhelm the cluster.
      maxPoolSize: 10,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose
      .connect(config.mongoUri, opts)
      .then((m) => m.connection);
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    // Reset so a later invocation can retry instead of caching a failure.
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}

module.exports = { connectDB, mongoose };
