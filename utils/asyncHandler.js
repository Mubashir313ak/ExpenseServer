'use strict';

/**
 * Wraps an async Express handler so that any rejected promise is forwarded to
 * `next()` (and therefore the centralized error handler) instead of crashing
 * the process or hanging the request. Lets controllers use plain
 * async/await + throw without repeating try/catch boilerplate everywhere.
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
