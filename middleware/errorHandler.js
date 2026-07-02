'use strict';

const { config } = require('../config');

/**
 * 404 handler for unmatched routes. Placed after all routes.
 */
function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

/**
 * Centralized error handler. Every thrown/forwarded error lands here and is
 * translated into a consistent `{ error: "message" }` JSON response.
 *
 * It normalizes the common failure modes (validation, duplicate key, bad
 * ObjectId, JWT) into appropriate HTTP status codes and hides internal details
 * for unexpected errors in production.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Mongoose schema validation errors -> 400 with a readable message.
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  }

  // Invalid ObjectId (e.g. /transactions/not-an-id) -> 400.
  else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for "${err.path}"`;
  }

  // Duplicate unique key (e.g. email already taken) -> 409.
  else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A record with that ${field} already exists`;
  }

  // JWT errors that reach here (should mostly be caught in auth middleware).
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  }

  // Log unexpected (non-operational) server errors for observability.
  if (statusCode >= 500) {
    console.error('[error]', err);
  }

  const body = { error: message };
  if (config.env === 'development' && statusCode >= 500) {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
}

module.exports = { errorHandler, notFoundHandler };
