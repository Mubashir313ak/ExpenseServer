'use strict';

const express = require('express');
const cors = require('cors');

const { assertConfig } = require('./config');
const { connectDB } = require('./db');
const asyncHandler = require('./utils/asyncHandler');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const summaryRoutes = require('./routes/summaryRoutes');

// Fail fast at startup if required env vars are missing.
assertConfig();

const app = express();

// Behind API Gateway / load balancers we sit behind a proxy.
app.set('trust proxy', true);
app.disable('x-powered-by');

app.use(cors()); // allow all origins for now
app.use(express.json({ limit: '1mb' }));

// Deploy/alias smoke-test route. Deliberately placed BEFORE the DB middleware so
// it responds even if MongoDB is unreachable — useful for confirming that a
// dev/prod deployment and its API Gateway alias are wired up correctly.
app.get('/api/ping', (_req, res) => {
  res.json({
    message: 'pong',
    environment: process.env.NODE_ENV || 'development',
    region: process.env.AWS_REGION || null,
    lambdaVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION || null,
    timestamp: new Date().toISOString(),
  });
});

// Ensure a live DB connection before any route runs. On Lambda warm starts the
// cached connection is reused, so this is effectively free after the first hit.
app.use(
  asyncHandler(async (_req, _res, next) => {
    await connectDB();
    next();
  })
);

// Lightweight health check (no DB dependency beyond the middleware above).
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/summary', summaryRoutes);

// 404 for anything unmatched, then the centralized error handler last.
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
