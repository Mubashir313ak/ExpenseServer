'use strict';

const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Runs after a set of express-validator chains. If any validation failed it
 * aggregates the messages into a single 400 response so clients get a clear,
 * consistent `{ error: "..." }` payload.
 */
function validate(req, _res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const message = errors
    .array()
    .map((e) => e.msg)
    .join(', ');

  return next(ApiError.badRequest(message));
}

module.exports = validate;
