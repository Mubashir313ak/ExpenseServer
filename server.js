'use strict';

const app = require('./app');
const { config } = require('./config');
const { connectDB } = require('./db');

/**
 * Local development entry point. Establishes the DB connection up front (so a
 * cold DB doesn't slow the first request) and then starts listening.
 */
async function start() {
  try {
    await connectDB();
    app.listen(config.port, () => {
      console.log(`API listening on http://localhost:${config.port} and db connected`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();

// Surface unexpected failures instead of dying silently.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});
