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
