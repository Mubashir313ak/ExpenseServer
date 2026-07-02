'use strict';

/**
 * Operational error with an attached HTTP status code.
 *
 * Controllers throw these for expected failures (bad input, not found, etc.).
 * The centralized error handler uses `statusCode` to build the response and
 * distinguishes these from unexpected programming errors.
 */
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg = 'Bad request') {
    return new ApiError(400, msg);
  }

  static unauthorized(msg = 'Unauthorized') {
    return new ApiError(401, msg);
  }

  static forbidden(msg = 'Forbidden') {
    return new ApiError(403, msg);
  }

  static notFound(msg = 'Resource not found') {
    return new ApiError(404, msg);
  }

  static conflict(msg = 'Conflict') {
    return new ApiError(409, msg);
  }
}

module.exports = ApiError;
